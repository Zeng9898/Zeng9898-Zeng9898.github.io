import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import owlIntroGif from '../assets/owl_intro.gif';
import { useAuth } from '../context/AuthContext';
import { API_BASE, buildApiHeaders } from '../lib/api';
import { DEFAULT_LEVEL_ID, getLevelConfig, type QuestionConfig } from '../data/levels';
// TODO: 替換成實際的貓頭鷹陪伴 GIF（可與 owl_intro.gif 不同，建議用待機動作）
const OWL_HINT_GIF = owlIntroGif;

type ChatMessage = {
  id: string;
  role: 'ai' | 'student';
  text: string;
  isLoading?: boolean;
};

type InitApiMessage = {
  id?: number;
  role?: string;
  text?: string;
};

type InitConversationResult = {
  conversationId: string;
  messages: ChatMessage[];
  phase: string;
  step: number;
  stage: string;
  hintLevel: number | null;
  requiresRestatement: boolean | null;
};

type EntryStage = 'intro' | 'scenario' | 'chat';

/** 根據題目設定取初始訊息陣列 */
function makeInitialMessages(cfg: QuestionConfig): ChatMessage[] {
  return [{ id: '1', role: 'ai', text: cfg.initialMessage }];
}

function mapApiMessages(messages: InitApiMessage[], fallbackMessages: ChatMessage[]): ChatMessage[] {
  const normalized = messages
    .filter((msg): msg is Required<Pick<InitApiMessage, 'role' | 'text'>> & InitApiMessage => {
      return typeof msg.role === 'string' && typeof msg.text === 'string' && msg.text.trim().length > 0;
    })
    .map((msg, index) => ({
      id: typeof msg.id === 'number' ? `db-${msg.id}` : `restored-${index}`,
      role: msg.role === 'assistant' ? 'ai' as const : msg.role === 'student' ? 'student' as const : null,
      text: msg.text,
    }))
    .filter((msg): msg is ChatMessage => msg.role !== null);

  return normalized.length > 0 ? normalized : fallbackMessages;
}

const STEPS_PER_SET = 7;
const DOCTOR_GIF_SRC = owlIntroGif;

const PHASE_LABEL: Record<string, string> = {
  diagnosis: '診斷',
  apprenticeship: '師徒',
};
const STAGE_LABEL: Record<string, string> = {
  claim: '主張',
  evidence: '證據',
  reasoning: '推理',
  revise: '修正',
};

/** 論證完成後的流程階段 */
type FlowStage = 'chat' | 'between-sets' | 'next-scenario' | 'settling' | 'result' | 'reflection';

// ──────────────────────────────────────────────────────────────────────────────

export default function ArgumentChatPage() {
  const { token, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedLevel = getLevelConfig(searchParams.get('levelId') ?? DEFAULT_LEVEL_ID);
  const activeQuestionConfigs = selectedLevel.questions;
  const totalSets = activeQuestionConfigs.length;
  const totalSteps = STEPS_PER_SET * totalSets;
  const stepProgress = (value: number) => Math.round((value / totalSteps) * 100);
  const questionIds = activeQuestionConfigs.map((cfg) => cfg.id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [progress, setProgress] = useState(0);
  const [isBumping, setIsBumping] = useState(false);
  const [showBonus, setShowBonus] = useState<number | null>(null);
  const [bonusVisible, setBonusVisible] = useState(false);

  const [conversationIdsByQuestion, setConversationIdsByQuestion] = useState<Record<number, string | null>>(
    () => Object.fromEntries(questionIds.map((id) => [id, null])) as Record<number, string | null>
  );
  // 各題完整聊天記錄（切題或結算時快照）
  const [messagesByQuestion, setMessagesByQuestion] = useState<Record<number, ChatMessage[]>>(
    () => Object.fromEntries(questionIds.map((id) => [id, []])) as Record<number, ChatMessage[]>
  );
  const [phase, setPhase] = useState('');
  const [step, setStep] = useState(0);
  const [stage, setStage] = useState('');
  const [hintLevel, setHintLevel] = useState<number | null>(null);
  const [requiresRestatement, setRequiresRestatement] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [entryStage, setEntryStage] = useState<EntryStage>('intro');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [scenarioExpanded, setScenarioExpanded] = useState(false);
  const [flowStage, setFlowStage] = useState<FlowStage>('chat');
  const [currentSet, setCurrentSet] = useState(1);
  const currentQuestionConfig = activeQuestionConfigs[currentSet - 1] ?? activeQuestionConfigs[0];
  const questionIndex = currentQuestionConfig.id;
  const [owlHint, setOwlHint] = useState('試著說說看你的想法吧！');
  const [activeHistoryTab, setActiveHistoryTab] = useState<string>(`topic-${activeQuestionConfigs[0].id}`);
  const [isOwlSpeaking, setIsOwlSpeaking] = useState(false);
  const [lightboxImageSrc, setLightboxImageSrc] = useState<string | null>(null);
  const owlSpeakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 反思聊天
  const [reflectionMessages, setReflectionMessages] = useState<ChatMessage[]>([]);
  const [reflectionConversationId, setReflectionConversationId] = useState<string | null>(null);
  const [reflectionInput, setReflectionInput] = useState('');
  const [reflectionIsLoading, setReflectionIsLoading] = useState(false);
  const reflectionChatRef = useRef<HTMLDivElement>(null);
  const reflectionInputRef = useRef<HTMLInputElement>(null);

  const chatStreamRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isChatStage = entryStage === 'chat';
  const isArgumentChatActive = isChatStage && flowStage === 'chat';
  const isChatOrBetween = isChatStage && (flowStage === 'chat' || flowStage === 'between-sets');
  const renderedMessages = !isChatOrBetween
    ? []
    : isLoading && flowStage === 'chat'
      ? [...messages, { id: 'loading', role: 'ai' as const, text: '', isLoading: true }]
      : messages;

  const initializeQuestionConversation = async (cfg: QuestionConfig) => {
    const existingConversationId = conversationIdsByQuestion[cfg.id];
    const existingMessages = messagesByQuestion[cfg.id] ?? [];
    if (existingConversationId && existingMessages.length > 0) {
      return {
        conversationId: existingConversationId,
        messages: existingMessages,
        phase: '',
        step: 0,
        stage: '',
        hintLevel: null,
        requiresRestatement: null,
      } satisfies InitConversationResult;
    }

    const res = await fetch(`${API_BASE}/api/chat/init`, {
      method: 'POST',
      headers: buildApiHeaders(token),
      body: JSON.stringify({
        questionIndex: cfg.id,
        openingMessage: cfg.initialMessage,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      logout();
      navigate('/', { replace: true });
      throw new Error('登入已失效');
    }
    if (!res.ok || data.error || typeof data.conversationId !== 'string') {
      throw new Error(typeof data.error === 'string' ? data.error : '初始化題目失敗');
    }

    const fallbackMessages = makeInitialMessages(cfg);
    const restoredMessages = mapApiMessages(
      Array.isArray(data.messages) ? data.messages as InitApiMessage[] : [],
      fallbackMessages,
    );

    setConversationIdsByQuestion((prev) => ({
      ...prev,
      [cfg.id]: data.conversationId,
    }));
    setMessagesByQuestion((prev) => ({
      ...prev,
      [cfg.id]: restoredMessages,
    }));
    return {
      conversationId: data.conversationId,
      messages: restoredMessages,
      phase: typeof data.phase === 'string' ? data.phase : '',
      step: typeof data.step === 'number' ? data.step : 0,
      stage: typeof data.stage === 'string' ? data.stage : '',
      hintLevel: typeof data.hintLevel === 'number' ? data.hintLevel : null,
      requiresRestatement: typeof data.requiresRestatement === 'boolean' ? data.requiresRestatement : null,
    } satisfies InitConversationResult;
  };

  useEffect(() => {
    if (!isBumping) return;
    const t = setTimeout(() => setIsBumping(false), 250);
    return () => clearTimeout(t);
  }, [isBumping]);

  useEffect(() => {
    if (showBonus == null) {
      setBonusVisible(false);
      return;
    }
    setBonusVisible(false);
    const showId = requestAnimationFrame(() => setBonusVisible(true));
    const hideId = setTimeout(() => setShowBonus(null), 800);
    return () => {
      cancelAnimationFrame(showId);
      clearTimeout(hideId);
    };
  }, [showBonus]);

  useEffect(() => {
    if (!lightboxImageSrc) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxImageSrc(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImageSrc]);

  useEffect(() => {
    const el = chatStreamRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isChatStage || flowStage !== 'chat') return;
    const setThreshold = Math.round((currentSet * STEPS_PER_SET / totalSteps) * 100);
    if (progress >= setThreshold) {
      if (currentSet < totalSets) {
        setFlowStage('between-sets');
      } else {
        setFlowStage('settling');
      }
    }
  }, [isChatStage, flowStage, progress, currentSet, totalSets, totalSteps]);

  // 結算中約 3 秒後顯示結果卡，同時快照最後一題的聊天記錄供反思頁使用
  useEffect(() => {
    if (flowStage !== 'settling') return;
    setMessagesByQuestion((prev) => ({ ...prev, [questionIndex]: messages }));
    const id = setTimeout(() => setFlowStage('result'), 3000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowStage]);

  // 反思聊天 auto-scroll
  useEffect(() => {
    const el = reflectionChatRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [reflectionMessages, reflectionIsLoading]);

  // 進入反思時自動觸發 AI 說第一句話
  useEffect(() => {
    if (flowStage !== 'reflection') return;
    // 已有訊息代表已初始化過（如切換 tab 再回來）
    if (reflectionMessages.length > 0) return;
    const trigger = async () => {
      setReflectionIsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/reflection`, {
          method: 'POST',
          headers: buildApiHeaders(token),
          body: JSON.stringify({ userMessage: '（反思開始）', conversationId: null }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          logout();
          navigate('/', { replace: true });
          return;
        }
        if (!res.ok || data.error) return;
        setReflectionConversationId(data.conversationId ?? null);
        if (typeof data.assistantMessage === 'string' && data.assistantMessage.trim()) {
          setReflectionMessages([{ id: 'r-init', role: 'ai', text: data.assistantMessage }]);
        }
      } catch {
        // 靜默失敗，學生可手動輸入
      } finally {
        setReflectionIsLoading(false);
        requestAnimationFrame(() => reflectionInputRef.current?.focus());
      }
    };
    trigger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowStage]);

  const handleReflectionSend = async () => {
    const text = reflectionInput.trim();
    if (!text || reflectionIsLoading) return;
    setReflectionInput('');
    setReflectionMessages((prev) => [
      ...prev,
      { id: `rs-${Date.now()}`, role: 'student', text },
    ]);
    setReflectionIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reflection`, {
        method: 'POST',
        headers: buildApiHeaders(token),
        body: JSON.stringify({ userMessage: text, conversationId: reflectionConversationId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        logout();
        navigate('/', { replace: true });
        return;
      }
      if (!res.ok || data.error) {
        const errMsg = typeof data.error === 'string' ? data.error : '請求失敗';
        setReflectionMessages((prev) => [
          ...prev,
          { id: `re-${Date.now()}`, role: 'ai', text: `錯誤：${errMsg}` },
        ]);
        return;
      }
      setReflectionConversationId(data.conversationId ?? reflectionConversationId);
      if (typeof data.assistantMessage === 'string' && data.assistantMessage.trim()) {
        setReflectionMessages((prev) => [
          ...prev,
          { id: `ra-${Date.now()}`, role: 'ai', text: data.assistantMessage },
        ]);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '網路錯誤';
      setReflectionMessages((prev) => [
        ...prev,
        { id: `re-${Date.now()}`, role: 'ai', text: `錯誤：${errMsg}` },
      ]);
    } finally {
      setReflectionIsLoading(false);
    }
  };

  const handleReflectionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleReflectionSend();
    }
  };

  const applyStepProgress = (newStep: number, prevStep: number) => {
    const offset = (currentSet - 1) * STEPS_PER_SET;
    const globalNew = offset + newStep;
    const globalPrev = offset + prevStep;
    if (globalNew <= globalPrev) return; // step 只進不退（step state 已保證，這是第二道防線）
    const newProgress = stepProgress(globalNew);
    setProgress((prev) => Math.max(prev, newProgress)); // 第三道防線：progress 本身也只進不退
    setIsBumping(true);
    setShowBonus(globalNew - globalPrev);
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text) return;
    if (!isArgumentChatActive) return;
    if (isLoading) return;
    setInputValue('');
    setErrorText('');

    // DEV 快捷：輸入「過關」觸發結算流程（dots → 結果卡 → 反思）
    if (import.meta.env.DEV && text === '過關') {
      setProgress(100);
      setCurrentSet(totalSets); // 確保結算判斷為最終組
      setFlowStage('settling');
      return;
    }
    setMessages((prev) => [
      ...prev,
      { id: String(Date.now()), role: 'student' as const, text },
    ]);
    setIsLoading(true);
    const chatUrl = `${API_BASE}/api/chat`;
    if (import.meta.env.DEV) {
      console.log('[chat] 請求 URL:', chatUrl, '| API_BASE:', API_BASE || '(空字串)');
    }
    try {
      const res = await fetch(chatUrl, {
        method: 'POST',
        headers: buildApiHeaders(token),
        body: JSON.stringify({
          userMessage: text,
          questionIndex,
          conversationId: conversationIdsByQuestion[questionIndex],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        logout();
        navigate('/', { replace: true });
        return;
      }
      if (!res.ok || data.error) {
        const errMsg = typeof data.error === 'string' ? data.error : '請求失敗';
        setMessages((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, role: 'ai' as const, text: `錯誤：${errMsg}` },
        ]);
        setErrorText(errMsg);
        return;
      }
      setConversationIdsByQuestion((prev) => ({
        ...prev,
        [questionIndex]: data.conversationId ?? prev[questionIndex],
      }));
      const newPhase = typeof data.phase === 'string' ? data.phase : '';
      const rawStep = typeof data.step === 'number' && data.step >= 1 && data.step <= STEPS_PER_SET ? data.step : step;
      const newStep = rawStep > step ? rawStep : step; // step state 只進不退
      const newStage = typeof data.stage === 'string' ? data.stage : '';
      setPhase(newPhase);
      setStep(newStep);
      setStage(newStage);
      setHintLevel(typeof data.hintLevel === 'number' ? data.hintLevel : null);
      setRequiresRestatement(typeof data.requiresRestatement === 'boolean' ? data.requiresRestatement : null);
      if (typeof data.feedback === 'string' && data.feedback.trim()) {
        const newHint = data.feedback.trim();
        setOwlHint((prev) => {
          if (prev === newHint) return prev;
          if (owlSpeakTimerRef.current) clearTimeout(owlSpeakTimerRef.current);
          setIsOwlSpeaking(true);
          owlSpeakTimerRef.current = setTimeout(() => setIsOwlSpeaking(false), 450);
          return newHint;
        });
      }
      applyStepProgress(newStep, step);
      const assistantText = typeof data.assistantMessage === 'string' ? data.assistantMessage : '';
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now() + 1), role: 'ai' as const, text: assistantText || '(無回覆內容)' },
      ]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '網路錯誤';
      const url = `${API_BASE || '(同源)'}/api/chat`;
      const displayMsg = errMsg === 'Failed to fetch' || errMsg.includes('fetch')
        ? `網路連線失敗，請確認後端已啟動 (${url})`
        : `錯誤：${errMsg}`;
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'ai' as const, text: displayMsg },
      ]);
      setErrorText(displayMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEnterScenario = () => {
    setEntryStage('scenario');
  };

  const handleStartChallenge = async () => {
    const initialCfg = activeQuestionConfigs[0];
    setErrorText('');
    try {
      const init = await initializeQuestionConversation(initialCfg);
      setEntryStage('chat');
      setFlowStage('chat');
      setScenarioExpanded(false);
      setMessages(init.messages);
      setPhase(init.phase);
      setStep(init.step);
      setStage(init.stage);
      setHintLevel(init.hintLevel);
      setRequiresRestatement(init.requiresRestatement);
      setProgress(stepProgress(init.step));
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : '初始化題目失敗');
    }
  };

  const handleNextSet = () => {
    setFlowStage('next-scenario');
  };

  const handleStartNextChallenge = async () => {
    const nextSet = currentSet + 1;
    const nextCfg = activeQuestionConfigs[nextSet - 1] ?? activeQuestionConfigs[activeQuestionConfigs.length - 1];
    setErrorText('');
    try {
      const init = await initializeQuestionConversation(nextCfg);
      // 切題前先快照當前題的聊天記錄
      setMessagesByQuestion((prev) => ({ ...prev, [questionIndex]: messages }));
      setCurrentSet(nextSet);
      setStep(init.step);
      setPhase(init.phase);
      setStage(init.stage);
      setHintLevel(init.hintLevel);
      setRequiresRestatement(init.requiresRestatement);
      setProgress(stepProgress(((nextSet - 1) * STEPS_PER_SET) + init.step));
      setFlowStage('chat');
      setMessages(init.messages);
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : '初始化題目失敗');
    }
  };

  const renderScenarioImage = (
    cfg: Pick<QuestionConfig, 'scenarioImage' | 'scenarioImageClassName' | 'scenarioImageZoomable'>,
    defaultSizeClassName: string,
    wrapperClassName = '',
    sizeClassNameOverride?: string,
    forceZoomable = false,
  ) => {
    if (!cfg.scenarioImage) return null;

    const imageClassName = `${wrapperClassName} block w-full h-auto rounded-xl border border-white/10 ${
      sizeClassNameOverride ?? cfg.scenarioImageClassName ?? defaultSizeClassName
    }`.trim();

    const isZoomable = forceZoomable || cfg.scenarioImageZoomable === true;

    if (!isZoomable) {
      return <img src={cfg.scenarioImage} alt="情境圖表" className={imageClassName} />;
    }

    return (
      <button
        type="button"
        onClick={() => setLightboxImageSrc(cfg.scenarioImage ?? null)}
        className="group relative cursor-zoom-in"
      >
        <img
          src={cfg.scenarioImage}
          alt="情境圖表，點擊可放大"
          className={imageClassName}
        />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-xl bg-black/45 px-3 py-2 text-xs text-white/90 opacity-0 transition-opacity group-hover:opacity-100">
          點擊放大
        </span>
      </button>
    );
  };

  return (
    <div className="h-screen bg-[#0f1d20] flex flex-col overflow-hidden">
      <div className="max-w-4xl w-full mx-auto px-4 md:px-6 flex flex-col flex-1 min-h-0">
        {/* 1) TopBar */}
        <header className="flex items-center justify-between pt-8 pb-6 shrink-0">
          <button
            type="button"
            onClick={() => setShowLeaveModal(true)}
            className="p-2 -m-2 text-white/50 hover:text-white/50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-white rounded cursor-pointer"
            aria-label="關閉"
          >
            <span className="text-xl font-bold">✕</span>
          </button>
          <div className="flex-1 flex items-center gap-3 mx-4 min-w-0">
            <div
              className={`flex-1 min-w-0 h-4 rounded-full bg-white/20 overflow-visible relative transition-transform duration-200 ease-out origin-center ${isBumping ? 'scale-y-150 drop-shadow-[0_0_10px_rgba(88,204,2,0.8)]' : 'scale-y-100'
                }`}
            >
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full overflow-hidden transition-[width] duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-[#58CC02] rounded-full" />
                  <div className="absolute top-1 left-0 right-0 h-1 rounded-full bg-white/40" aria-hidden />
                </div>
              </div>
              {showBonus != null && (
                <span
                  className={`absolute bottom-full left-0 translate-x-1 mb-1 z-10 text-[#58CC02] font-bold text-sm tabular-nums transition-all duration-200 ease-out drop-shadow-[0_0_8px_rgba(88,204,2,0.6)] whitespace-nowrap ${bonusVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                    }`}
                  style={{ left: `${progress}%` }}
                >
                  +{showBonus}
                </span>
              )}
            </div>
            <div className="flex flex-col items-end shrink-0 min-w-20 gap-0.5">
              <span className="text-white/90 text-base font-bold tabular-nums">{progress}%</span>
              {(phase || step > 0) && (
                <span className="text-white/60 text-xs">
                  {PHASE_LABEL[phase] || phase || '—'} {step > 0 ? `${step}/${STEPS_PER_SET}` : ''}
                </span>
              )}
              {stage ? (
                <span className="text-white/50 text-xs">stage: {STAGE_LABEL[stage] || stage}</span>
              ) : null}
              {(hintLevel != null || requiresRestatement === true) && (
                <span className="text-white/40 text-xs">
                  {hintLevel != null ? `hint ${hintLevel}` : ''}
                  {hintLevel != null && requiresRestatement === true ? ' · ' : ''}
                  {requiresRestatement === true ? '需重述' : ''}
                </span>
              )}
              {conversationIdsByQuestion[questionIndex] ? (
                <span className="text-white/30 text-xs max-w-28 truncate" title={conversationIdsByQuestion[questionIndex] ?? ''}>
                  {conversationIdsByQuestion[questionIndex]}
                </span>
              ) : null}
            </div>
          </div>
        </header>

        {/* 2) 中間：導入頁 / 情境說明頁 / 聊天區 */}
        <div className="flex-1 min-h-0 relative flex flex-col">
          {entryStage === 'intro' && (
            <div className="absolute inset-0 flex items-center justify-center px-6 pb-16 animate-[fade-in_0.7s_ease-out_forwards]">
              <div className="w-full max-w-3xl">
                {/* 手機：上下堆疊（泡泡在上、貓頭鷹在下）；桌面：左右並排 */}
                <div className="mx-auto flex flex-col items-center md:flex-row md:items-end md:justify-center md:gap-5">
                  {/* 泡泡：手機有向下箭頭，桌面有向左箭頭 */}
                  <div className="relative mb-2 w-full max-w-sm rounded-[24px] border border-white/15 bg-transparent px-5 py-4 md:order-2 md:mb-6 md:max-w-[400px] md:w-auto">
                    {/* 手機：向下箭頭，指向貓頭鷹 */}
                    <div
                      className="absolute bottom-[-8px] left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-white/15 bg-[#0f1d20] md:hidden"
                      aria-hidden
                    />
                    {/* 桌面：向左箭頭，指向貓頭鷹 */}
                    <div
                      className="absolute bottom-6 left-[-8px] hidden h-4 w-4 rotate-45 border-b border-l border-white/15 bg-[#0f1d20] md:block"
                      aria-hidden
                    />
                    <p className="text-base font-semibold leading-7 text-white/95 md:text-lg md:leading-8">
                      這關跟水溶液有關，準備好要開始了嗎？準備好就點擊開始。
                    </p>
                  </div>
                  {/* 貓頭鷹：手機置中，桌面在左 */}
                  <img
                    src={DOCTOR_GIF_SRC}
                    alt="貓頭鷹博士"
                    className="mt-2 h-28 w-28 shrink-0 object-contain md:order-1 md:mt-0 md:h-32 md:w-32"
                  />
                </div>
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={handleEnterScenario}
                    className="min-w-[220px] rounded-xl bg-[#58CC02] px-8 py-3.5 text-white font-semibold shadow-[0_4px_0_0_#3d9a02] hover:opacity-90 active:translate-y-[3px] active:shadow-[0_1px_0_0_#3d9a02] focus-visible:outline focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1d20] transition-opacity"
                  >
                    開始挑戰
                  </button>
                </div>
              </div>
            </div>
          )}

          {entryStage === 'scenario' && (
            <div className="absolute inset-0 overflow-y-auto px-4 pb-12 pt-6 animate-[fade-in_0.35s_ease-out_forwards]">
              <div className="mx-auto w-full max-w-4xl text-center">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white/95">
                  論證情境
                </h1>
                <p className="mt-7 text-lg md:text-xl leading-9 md:leading-10 text-white/85 whitespace-pre-line">
                  {activeQuestionConfigs[0].scenarioText}
                </p>
                <div className="mt-6 flex justify-center">
                  {renderScenarioImage(activeQuestionConfigs[0], 'max-w-[340px] md:max-w-[420px]')}
                </div>
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={handleStartChallenge}
                    className="min-w-[280px] rounded-xl bg-[#58CC02] px-8 py-3.5 text-white font-semibold shadow-[0_4px_0_0_#3d9a02] hover:opacity-90 active:translate-y-[3px] active:shadow-[0_1px_0_0_#3d9a02] focus-visible:outline focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1d20] transition-opacity"
                  >
                    我已閱讀完成，開始挑戰
                  </button>
                </div>
                {errorText ? (
                  <p className="mt-4 text-red-300 text-sm" role="alert">{errorText}</p>
                ) : null}
              </div>
            </div>
          )}

          {/* 查看情境：僅在已開始挑戰後顯示，progress 下方、聊天區上方 */}
          {entryStage === 'chat' && flowStage === 'chat' && (
            <div className="shrink-0 flex flex-col mt-1.5 mb-2 animate-[fade-in_0.7s_ease-out_forwards]">
              <button
                type="button"
                onClick={() => setScenarioExpanded((v) => !v)}
                className="self-start rounded-xl bg-[#4A9EFF] text-white font-semibold py-2 px-4 shadow-[0_4px_0_0_#2563eb] hover:opacity-90 active:opacity-95 focus-visible:outline focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1d20] transition-opacity flex items-center gap-2"
                aria-expanded={scenarioExpanded}
                aria-controls="scenario-panel"
              >
                <span>{scenarioExpanded ? '收起情境' : '查看情境'}</span>
                <span
                  className={`inline-block transition-transform duration-200 ${scenarioExpanded ? 'rotate-180' : ''}`}
                  aria-hidden
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                </span>
              </button>
              <div
                id="scenario-panel"
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out overflow-hidden ${scenarioExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                role="region"
                aria-label="論證情境"
              >
                <div className="min-h-0">
                  <div className="mt-2 rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-left">
                    {(() => {
                      const cfg = currentQuestionConfig;
                      const compactScenarioText = cfg.scenarioText.replace(/\n{2,}/g, '\n');
                      return (
                        <>
                          <p className="text-xs md:text-sm leading-6 md:leading-7 text-white/90 whitespace-pre-line">
                            {compactScenarioText}
                          </p>
                          <div className="mt-3">
                            {renderScenarioImage(cfg, 'max-w-[300px] md:max-w-[380px]', '', 'max-w-[220px] md:max-w-[300px]', true)}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 聊天區（開始後淡入；between-sets 時保持可見） */}
          <section
            ref={chatStreamRef}
            className={`flex-1 flex flex-col gap-3 pb-32 min-h-0 overflow-y-auto transition-all duration-700 ease-out ${isChatOrBetween
              ? 'opacity-100 translate-y-0'
              : 'pointer-events-none opacity-0 translate-y-2'
              }`}
            aria-hidden={!isChatOrBetween}
          >
            {renderedMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'ai'
                    ? 'bg-white/15 text-white rounded-bl-md'
                    : 'bg-[#58CC02]/90 text-white rounded-br-md'
                    }`}
                >
                  {msg.isLoading ? (
                    <div
                      className="flex items-center gap-2 py-1"
                      aria-label="論證小幫手回覆中"
                      aria-live="polite"
                    >
                      <span className="text-sm md:text-base leading-relaxed text-white/90 mr-2">
                        論證小幫手思考中
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-white/80 animate-[dot-pulse_1.2s_ease-in-out_infinite]"
                          style={{ animationDelay: '0ms' }}
                        />
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-white/80 animate-[dot-pulse_1.2s_ease-in-out_infinite]"
                          style={{ animationDelay: '240ms' }}
                        />
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-white/80 animate-[dot-pulse_1.2s_ease-in-out_infinite]"
                          style={{ animationDelay: '480ms' }}
                        />
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm md:text-base leading-relaxed">{msg.text}</p>
                  )}
                </div>
              </div>
            ))}
          </section>


          {/* 論證完成結果卡 */}
          {entryStage === 'chat' && flowStage === 'result' && (
            <div className="absolute inset-0 flex items-center justify-center px-4">
              <div className="w-full max-w-lg rounded-2xl bg-white/10 border border-white/15 px-6 py-6 shadow-xl animate-[fade-in_0.3s_ease-out_forwards] transform translate-y-4 transition-transform duration-300 ease-out">
                <h2 className="text-2xl font-bold text-white mb-3">過關成功</h2>
                <p className="text-sm leading-relaxed text-white/85">
                  你已經順利完成這次挑戰，成功闖過這一關的科學論證任務。接下來進入反思，回顧你的推理歷程，整理這次解題時找到的重要想法與線索。
                </p>
                <button
                  type="button"
                  onClick={() => { setFlowStage('reflection'); setProgress(0); }}
                  className="mt-6 w-full rounded-xl bg-[#F5C451] text-[#3b2b12] font-semibold py-3.5 shadow-[0_4px_0_0_rgba(180,129,27,0.9)] hover:brightness-105 focus-visible:outline focus-visible:ring-2 focus-visible:ring-white transition"
                >
                  進入反思
                </button>
              </div>
            </div>
          )}

          {/* 下一題情境說明：以絕對層疊在聊天區上方 */}
          {entryStage === 'chat' && flowStage === 'next-scenario' && (
            <div className="absolute inset-0 overflow-y-auto px-4 pb-32 pt-6 bg-[#0f1d20] animate-[fade-in_0.35s_ease-out_forwards] z-10">
              <div className="mx-auto w-full max-w-4xl text-center">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">
                  題組 {currentSet + 1} / {totalSets}
                </p>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white/95">
                  論證情境
                </h1>
                {(() => {
                  const cfg = activeQuestionConfigs[currentSet] ?? activeQuestionConfigs[activeQuestionConfigs.length - 1];
                  return (
                    <>
                      <p className="mt-7 text-lg md:text-xl leading-9 md:leading-10 text-white/85 whitespace-pre-line">
                        {cfg.scenarioText}
                      </p>
                      <div className="mt-6 flex justify-center">
                        {renderScenarioImage(cfg, 'max-w-[340px] md:max-w-[420px]')}
                      </div>
                    </>
                  );
                })()}
                <div className="mt-10 flex justify-center pb-4">
                  <button
                    type="button"
                    onClick={handleStartNextChallenge}
                    className="min-w-[280px] rounded-xl bg-[#58CC02] px-8 py-3.5 text-white font-semibold shadow-[0_4px_0_0_#3d9a02] hover:opacity-90 active:translate-y-[3px] active:shadow-[0_1px_0_0_#3d9a02] focus-visible:outline focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1d20] transition-opacity"
                  >
                    我已閱讀完成，開始挑戰
                  </button>
                </div>
                {errorText ? (
                  <p className="text-red-300 text-sm" role="alert">{errorText}</p>
                ) : null}
              </div>
            </div>
          )}

          {/* 反思：空白書本版型 */}
          {entryStage === 'chat' && flowStage === 'reflection' && (
            <div
              className="absolute top-0 bottom-0 flex items-start justify-center px-5 pt-5 pb-8 animate-[fade-in_0.35s_ease-out_forwards]"
              style={{ left: '50%', transform: 'translateX(-50%)', width: '100vw' }}
            >
              {/* 書本 wrapper */}
              <div
                className="relative w-full max-w-[1240px]"
                style={{ height: 'clamp(460px, 76vh, 660px)' }}
              >
                {/* 書本厚度：底部一整塊，貼合主體寬度與圓角 */}
                <div
                  className="pointer-events-none absolute rounded-[18px] bg-[#323f48]"
                  style={{ top: '8px', left: '0px', right: '0px', bottom: '-12px' }}
                  aria-hidden
                />

                {/* 書本主體 */}
                <div
                  className="relative h-full overflow-hidden rounded-[18px] bg-[#111a20]"
                  style={{
                    borderTop: '3.5px solid #323f48',
                    borderLeft: '3.5px solid #323f48',
                    borderRight: '3.5px solid #323f48',
                    borderBottom: '1.5px solid #323f48',
                  }}
                >
                  {/* 裝訂線：藍色垂直虛線，3px 寬，置中，上下留白 */}
                  <div
                    className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2"
                    style={{
                      top: '6%',
                      bottom: '6%',
                      width: '3px',
                      backgroundImage:
                        'repeating-linear-gradient(to bottom, #16B7F3 0, #16B7F3 14px, transparent 14px, transparent 26px)',
                    }}
                    aria-hidden
                  />

                  {/* 左頁 */}
                  <div className="absolute inset-y-0 left-0 right-1/2 flex flex-col">
                    {/* 左頁橫線（背景層） */}
                    <div
                      className="pointer-events-none absolute"
                      style={{
                        top: '100px',
                        bottom: '24px',
                        left: '36px',
                        right: '32px',
                        backgroundImage:
                          'repeating-linear-gradient(transparent 0, transparent calc(4rem - 1px), rgba(58,70,78,0.5) calc(4rem - 1px), rgba(58,70,78,0.5) 4rem)',
                      }}
                      aria-hidden
                    />
                    {/* 左頁標題 */}
                    <div className="relative z-10 flex items-center gap-3 px-8 pt-[22px] shrink-0">
                      <span className="text-white/38 text-xl leading-none" aria-hidden>←</span>
                      <h2 className="text-2xl font-semibold text-white/90 tracking-wide">回顧</h2>
                    </div>
                    {/* Tabs */}
                    <div className="relative z-10 flex items-center gap-5 px-8 pt-3 pb-2 shrink-0">
                      {activeQuestionConfigs.map((cfg) => {
                        const tabId = `topic-${cfg.id}`;
                        const isActive = activeHistoryTab === tabId;
                        return (
                          <button
                            key={tabId}
                            type="button"
                            onClick={() => setActiveHistoryTab(tabId)}
                            className={`pb-1 text-xs font-medium tracking-wide transition-colors ${isActive
                              ? 'border-b border-white/70 text-white/90'
                              : 'text-white/35 hover:text-white/60'
                              }`}
                          >
                            {cfg.title}
                          </button>
                        );
                      })}
                    </div>
                    {/* 對話紀錄 */}
                    <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-8 pb-5 pt-2 space-y-2">
                      {(() => {
                        const activeQIdx = parseInt(activeHistoryTab.replace('topic-', ''), 10);
                        const historyMsgs = messagesByQuestion[activeQIdx] ?? [];
                        if (historyMsgs.length === 0) {
                          return (
                            <p className="text-white/25 text-xs text-center mt-8">（尚無對話記錄）</p>
                          );
                        }
                        return historyMsgs.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}
                          >
                            <div
                              className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${msg.role === 'ai'
                                ? 'rounded-bl-md bg-[#182028] text-white/40'
                                : 'rounded-br-md bg-[#243a1a] text-white/45'
                                }`}
                            >
                              {msg.text}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* 右頁 */}
                  <div className="absolute inset-y-0 left-1/2 right-0 flex flex-col">
                    {/* 右頁橫線 */}
                    <div
                      className="pointer-events-none absolute"
                      style={{
                        top: '62px',
                        bottom: '60px',
                        left: '32px',
                        right: '36px',
                        backgroundImage:
                          'repeating-linear-gradient(transparent 0, transparent calc(4rem - 1px), rgba(58,70,78,0.5) calc(4rem - 1px), rgba(58,70,78,0.5) 4rem)',
                      }}
                      aria-hidden
                    />
                    {/* 右頁標題 */}
                    <div className="relative z-10 flex justify-end px-8 pt-[22px] shrink-0">
                      <h2
                        className="text-3xl font-bold tracking-wide"
                        style={{ color: '#f7c945', animation: 'reflection-breathe 2.8s ease-in-out infinite' }}
                      >
                        反思
                      </h2>
                    </div>
                    {/* 反思對話區 */}
                    <div
                      ref={reflectionChatRef}
                      className="relative z-10 min-h-0 flex-1 overflow-y-auto px-6 pt-2 pb-2 space-y-2"
                    >
                      {reflectionIsLoading && reflectionMessages.length === 0 ? (
                        <div className="flex justify-start">
                          <div className="rounded-2xl rounded-bl-md bg-[#182028] px-3 py-2 flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-white/30 animate-[dot-pulse_1.2s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-white/30 animate-[dot-pulse_1.2s_ease-in-out_infinite]" style={{ animationDelay: '240ms' }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-white/30 animate-[dot-pulse_1.2s_ease-in-out_infinite]" style={{ animationDelay: '480ms' }} />
                          </div>
                        </div>
                      ) : null}
                      {reflectionMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}
                        >
                          <div
                            className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${msg.role === 'ai'
                              ? 'rounded-bl-md bg-[#182028] text-white/80'
                              : 'rounded-br-md bg-[#2a4a1a] text-white/75'
                              }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      ))}
                      {reflectionIsLoading && reflectionMessages.length > 0 ? (
                        <div className="flex justify-start">
                          <div className="rounded-2xl rounded-bl-md bg-[#182028] px-3 py-2 flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-white/30 animate-[dot-pulse_1.2s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-white/30 animate-[dot-pulse_1.2s_ease-in-out_infinite]" style={{ animationDelay: '240ms' }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-white/30 animate-[dot-pulse_1.2s_ease-in-out_infinite]" style={{ animationDelay: '480ms' }} />
                          </div>
                        </div>
                      ) : null}
                    </div>
                    {/* 右頁輸入區 */}
                    <div className="relative z-10 shrink-0 flex items-center gap-3 px-6 py-4 border-t border-white/8">
                      <input
                        ref={reflectionInputRef}
                        type="text"
                        value={reflectionInput}
                        onChange={(e) => setReflectionInput(e.target.value)}
                        onKeyDown={handleReflectionKeyDown}
                        placeholder="說說你的想法..."
                        disabled={reflectionIsLoading}
                        className="flex-1 min-w-0 rounded-xl bg-white/8 px-5 py-4 text-base text-white/85 placeholder-white/25 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] focus:outline-none focus:ring-2 focus:ring-[#f7c945]/70 disabled:opacity-40"
                        aria-label="輸入反思內容"
                      />
                      <button
                        type="button"
                        onClick={handleReflectionSend}
                        disabled={reflectionIsLoading || !reflectionInput.trim()}
                        className="shrink-0 rounded-xl bg-[#FFE07A] px-6 py-4 text-base font-semibold text-[#1a1200] shadow-[0_4px_0_0_rgba(225,170,18,0.98)] hover:bg-[#FFEA98] active:translate-y-px active:shadow-none disabled:bg-[#F2D46A] disabled:text-[#4d3a09] disabled:shadow-[0_4px_0_0_rgba(171,127,12,0.78)] disabled:opacity-100 disabled:cursor-not-allowed transition-colors"
                      >
                        送出
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4) InputBar：開始前只顯示背景與框線，開始後 input 區淡入 */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-[#152A2E] border-t border-white/10 transition-[padding] duration-300 ${entryStage === 'chat' ? 'py-0' : 'py-2'}`}
      >
        <div
          className={`max-w-4xl w-full mx-auto px-4 md:px-6 overflow-hidden transition-all duration-700 ease-out ${entryStage === 'chat' && flowStage !== 'next-scenario' && flowStage !== 'reflection'
            ? 'max-h-40 opacity-100 py-4'
            : 'max-h-0 opacity-0 py-0'
            }`}
        >
          {flowStage === 'between-sets' ? (
            <div className="flex justify-center animate-[fade-in_0.4s_ease-out_forwards]">
              <button
                type="button"
                onClick={handleNextSet}
                className="w-full max-w-sm rounded-xl bg-[#58CC02] px-8 py-4 text-white text-lg font-bold shadow-[0_4px_0_0_#3d9a02] hover:opacity-90 active:translate-y-[3px] active:shadow-[0_1px_0_0_#3d9a02] focus-visible:outline focus-visible:ring-2 focus-visible:ring-white transition-opacity"
              >
                下一題
              </button>
            </div>
          ) : (
            <>
              {errorText ? (
                <p className="text-red-400 text-sm mb-2" role="alert">{errorText}</p>
              ) : null}
              <div className="flex gap-3 items-stretch">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="輸入你的想法..."
                  rows={2}
                  className="flex-1 min-w-0 resize-none rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white leading-6 placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#58CC02] focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label="輸入訊息"
                  disabled={entryStage !== 'chat' || flowStage !== 'chat'}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isLoading || entryStage !== 'chat' || flowStage !== 'chat'}
                  className="shrink-0 self-stretch rounded-xl bg-[#58CC02] text-white font-semibold px-6 shadow-[0_4px_0_0_#3d9a02] hover:opacity-90 active:translate-y-[3px] active:shadow-[0_1px_0_0_#3d9a02] focus-visible:outline focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60 disabled:cursor-not-allowed transition-opacity min-w-29 flex items-center justify-center box-border"
                >
                  <span className="flex min-h-6 items-center justify-center">
                    {flowStage === 'settling' ? (
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#1a3a05] animate-[dot-pulse_1.2s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-[#1a3a05] animate-[dot-pulse_1.2s_ease-in-out_infinite]" style={{ animationDelay: '240ms' }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-[#1a3a05] animate-[dot-pulse_1.2s_ease-in-out_infinite]" style={{ animationDelay: '480ms' }} />
                      </span>
                    ) : isLoading ? (
                      '送出中…'
                    ) : (
                      '送出'
                    )}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 貓頭鷹博士提示區：固定在右下角，input bar 正上方，只在正式聊天時顯示 */}
      {isArgumentChatActive && (
        <div
          className="fixed bottom-[88px] z-20 pointer-events-none animate-[fade-in_0.7s_ease-out_forwards]"
          style={{ right: 'max(0.5rem, calc((100vw - 56rem) / 2 + 0.75rem))' }}
        >
          <div className="relative">
            {/* 對話泡泡：absolute 定位在 owl 正上方，left-0 對齊 owl 左邊，往右延伸 */}
            <div
              className="absolute bottom-full left-0 mb-2 min-w-[160px] max-w-[220px] rounded-[20px] border border-white/15 bg-[#0f1d20] px-4 py-3 shadow-lg"
              style={isOwlSpeaking ? { animation: 'owl-pop 0.4s ease-out forwards' } : undefined}
            >
              {/* 向下尖角，左側，指向下方貓頭鷹 */}
              <div
                className="absolute bottom-[-7px] left-6 h-3 w-3 rotate-45 border-b border-r border-white/15 bg-[#0f1d20]"
                aria-hidden
              />
              <p className="text-sm font-semibold leading-6 text-white/90">{owlHint}</p>
            </div>
            {/* 貓頭鷹 GIF：位置由外層 fixed right 決定，不受泡泡影響 */}
            <img
              src={OWL_HINT_GIF}
              alt="貓頭鷹博士提示"
              className="h-16 w-16 object-contain"
              style={isOwlSpeaking ? { animation: 'owl-bounce 0.45s ease-out forwards' } : undefined}
            />
          </div>
        </div>
      )}

      {lightboxImageSrc && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 px-4 py-6"
          onClick={() => setLightboxImageSrc(null)}
          role="dialog"
          aria-modal="true"
          aria-label="放大圖片"
        >
          <div
            className="relative flex max-h-full max-w-5xl items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxImageSrc(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/55 px-3 py-1 text-sm font-semibold text-white hover:bg-black/75"
            >
              關閉
            </button>
            <img
              src={lightboxImageSrc}
              alt="放大情境圖表"
              className="max-h-[88vh] w-auto max-w-full rounded-2xl border border-white/15 bg-white shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* 離開確認 Modal */}
      {showLeaveModal && (
        <div
          className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-black/60 transition-opacity duration-500 cursor-pointer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-modal-title"
          onClick={() => setShowLeaveModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#1a2528]   p-6 shadow-xl opacity-0 animate-[fade-in_0.5s_ease-out_forwards] cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="leave-modal-title" className="text-white text-center text-lg font-semibold leading-relaxed mb-6">
              還沒結束喔，確定要離開嗎？
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="w-full rounded-xl bg-[#4A9EFF] text-white font-semibold py-3.5 shadow-[0_4px_0_0_#2563eb] hover:opacity-90 active:translate-y-[3px] active:shadow-[0_1px_0_0_#2563eb] focus-visible:outline focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a2528] transition-opacity"
              >
                繼續努力
              </button>
              <button
                type="button"
                onClick={() => navigate('/home')}
                className="w-full py-2.5 text-red-400 font-medium  focus-visible:outline focus-visible:ring-2 focus-visible:ring-red-400/50 rounded-lg transition-colors"
              >
                退出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
