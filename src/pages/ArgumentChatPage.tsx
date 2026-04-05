import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import owlIntroGif from '../assets/owl_intro.gif';
import chart13Img from '../assets/1-3chart.png';
// TODO: 替換成實際的貓頭鷹陪伴 GIF（可與 owl_intro.gif 不同，建議用待機動作）
const OWL_HINT_GIF = owlIntroGif;

type ChatMessage = {
  id: string;
  role: 'ai' | 'student';
  text: string;
  isLoading?: boolean;
};

type EntryStage = 'intro' | 'scenario' | 'chat';

type QuestionConfig = {
  id: number;
  title: string;
  initialMessage: string;
  scenarioText: string;
  scenarioImage?: string;
};

const QUESTION_CONFIGS: QuestionConfig[] = [
  {
    id: 0,
    title: '論證議題 1',
    initialMessage: `請根據剛才的情境，說說你的想法：糖水放到磅秤上秤重，糖水會變輕嗎？
    如果把這杯水放太陽下曬乾，砂糖還會出現嗎？`,
    scenarioText:
      '小華將 10 公克的砂糖加入 100 公克的水中，攪拌後砂糖完全消失不見了。\n小華把這杯糖水放到磅秤上秤重，並思考：糖水會變輕嗎？\n如果把這杯水放太陽下曬乾，砂糖還會出現嗎？',
  },
  {
    id: 1,
    title: '論證議題 2',
    initialMessage: `你判斷出現「溶解現象」的標準是什麼？哪些是溶解現象？這些物質能被取回嗎？
請提出你的主張並說明原因。`,
    scenarioText: `請判斷以下生活中處理食物的過程，哪些是「溶解現象」？
A.煮湯加鹽巴 B.熱湯加粗粒黑胡椒 C.把米煮成稀飯
D.在水中加維他命C錠 E.在豆漿中加入砂糖 F.奶茶加珍珠

CER 引導問題：你判斷出現「溶解現象」的標準是什麼？這些物質能被取回嗎？
請提出你的主張並說明原因。`,
  },
  {
    id: 2,
    title: '論證議題 3',
    initialMessage: '請對照圖甲與圖乙的數據趨勢，你覺得妹妹說「糖也跟著消失了」對嗎？你先說說你的想法，為什麼呢？',
    scenarioText:
      '初始條件：將一杯含有 10 克糖的 110 克糖水（含糖和水）放在陽光下。\n\n圖甲（折線圖）：X 軸為「曝曬天數」，Y 軸為「整杯糖水的總重量」，趨勢線逐日往下降。\n圖乙（折線圖）：X 軸為「曝曬天數」，Y 軸為「杯底析出固體砂糖重量」，前幾天為 0，接著逐日上升，最終停留在 10 克。\n\n妹妹看著圖甲的數據下降，哭著說：「陽光把我的糖水變不見了！裡面的糖也跟著消失了！」\n對照圖甲與圖乙的數據趨勢，你覺得妹妹說「糖也跟著消失了」對嗎？你先說說你的想法，為什麼呢？',
    scenarioImage: chart13Img,
  },
];

/** 根據 questionIndex 取初始訊息陣列 */
function makeInitialMessages(qIdx: number): ChatMessage[] {
  const cfg = QUESTION_CONFIGS[qIdx] ?? QUESTION_CONFIGS[0];
  return [{ id: '1', role: 'ai', text: cfg.initialMessage }];
}

// 三題組架構：每組 10 steps，共 30 steps = 100%
// 第二組 step 需加 10 的偏移、第三組加 20（由後端或前端題組計數器處理）
const STEPS_PER_SET = 10;
const TOTAL_SETS = 3;
const TOTAL_STEPS = STEPS_PER_SET * TOTAL_SETS; // 30
const STEP_PROGRESS = (s: number) => Math.round((s / TOTAL_STEPS) * 100);
// 每一組的進度閾值由 useEffect 動態計算：(currentSet * STEPS_PER_SET / TOTAL_STEPS) * 100

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

/** 假資料：論證結果分數與評語（之後可改為 API 回傳） */
const FAKE_RESULT = {
  claim: { score: 4, max: 5, label: '主張' },
  evidence: { score: 3, max: 5, label: '證據' },
  reasoning: { score: 4, max: 5, label: '推理' },
  overallComment: '你已能提出明確主張，若能讓證據與推理之間的連結更完整，論證會更有說服力。',
};

// 開發時未設定則用本地後端；production 由 .env.production 提供
const API_BASE = (import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? 'http://localhost:3000' : '')).replace(/\/$/, '');

// ──────────────────────────────────────────────────────────────────────────────

export default function ArgumentChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [progress, setProgress] = useState(0);
  const [isBumping, setIsBumping] = useState(false);
  const [showBonus, setShowBonus] = useState<number | null>(null);
  const [bonusVisible, setBonusVisible] = useState(false);

  const [conversationIdsByQuestion, setConversationIdsByQuestion] = useState<Record<number, string | null>>({
    0: null, 1: null, 2: null,
  });
  // 各題完整聊天記錄（切題或結算時快照）
  const [messagesByQuestion, setMessagesByQuestion] = useState<Record<number, ChatMessage[]>>({
    0: [], 1: [], 2: [],
  });
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
  // UI 1-based → API 0-based
  const questionIndex = currentSet - 1;
  const [owlHint, setOwlHint] = useState('試著說說看你的想法吧！');
  const [activeHistoryTab, setActiveHistoryTab] = useState<string>('topic-1');
  const [isOwlSpeaking, setIsOwlSpeaking] = useState(false);
  const owlSpeakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 反思聊天
  const [reflectionMessages, setReflectionMessages] = useState<ChatMessage[]>([]);
  const [reflectionConversationId, setReflectionConversationId] = useState<string | null>(null);
  const [reflectionInput, setReflectionInput] = useState('');
  const [reflectionIsLoading, setReflectionIsLoading] = useState(false);
  const reflectionChatRef = useRef<HTMLDivElement>(null);
  const reflectionInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const chatStreamRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isChatStage = entryStage === 'chat';
  const isArgumentChatActive = isChatStage && flowStage === 'chat';
  const isChatOrBetween = isChatStage && (flowStage === 'chat' || flowStage === 'between-sets');
  const renderedMessages = !isChatOrBetween
    ? []
    : isLoading && flowStage === 'chat'
      ? [...messages, { id: 'loading', role: 'ai' as const, text: '', isLoading: true }]
      : messages;

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
    const el = chatStreamRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isChatStage || flowStage !== 'chat') return;
    const setThreshold = Math.round((currentSet * STEPS_PER_SET / TOTAL_STEPS) * 100);
    if (progress >= setThreshold) {
      if (currentSet < TOTAL_SETS) {
        setFlowStage('between-sets');
      } else {
        setFlowStage('settling');
      }
    }
  }, [isChatStage, flowStage, progress, currentSet]);

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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userMessage: '（反思開始）', conversationId: null }),
        });
        const data = await res.json().catch(() => ({}));
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: text, conversationId: reflectionConversationId }),
      });
      const data = await res.json().catch(() => ({}));
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
    const newProgress = STEP_PROGRESS(globalNew);
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
      setCurrentSet(TOTAL_SETS); // 確保結算判斷為最終組
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: text,
          questionIndex,
          conversationId: conversationIdsByQuestion[questionIndex],
        }),
      });
      const data = await res.json().catch(() => ({}));
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEnterScenario = () => {
    setEntryStage('scenario');
  };

  const handleStartChallenge = () => {
    setEntryStage('chat');
    setFlowStage('chat');
    setScenarioExpanded(false);
    setMessages(makeInitialMessages(0));
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleNextSet = () => {
    setFlowStage('next-scenario');
  };

  const handleStartNextChallenge = () => {
    const nextSet = currentSet + 1;
    const nextQIdx = nextSet - 1;
    // 切題前先快照當前題的聊天記錄
    setMessagesByQuestion((prev) => ({ ...prev, [questionIndex]: messages }));
    setCurrentSet(nextSet);
    // 各題 conversationId 獨立保留，不互相清除
    setStep(0);
    setPhase('');
    setStage('');
    setHintLevel(null);
    setRequiresRestatement(null);
    setErrorText('');
    setFlowStage('chat');
    setMessages(makeInitialMessages(nextQIdx));
    requestAnimationFrame(() => inputRef.current?.focus());
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
                  {PHASE_LABEL[phase] || phase || '—'} {step > 0 ? `${step}/${TOTAL_STEPS}` : ''}
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
                  {QUESTION_CONFIGS[0].scenarioText}
                </p>
                {QUESTION_CONFIGS[0].scenarioImage && (
                  <img
                    src={QUESTION_CONFIGS[0].scenarioImage}
                    alt="情境圖表"
                    className="mt-6 mx-auto block w-full max-w-[480px] md:max-w-[600px] h-auto rounded-xl border border-white/10"
                  />
                )}
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={handleStartChallenge}
                    className="min-w-[280px] rounded-xl bg-[#58CC02] px-8 py-3.5 text-white font-semibold shadow-[0_4px_0_0_#3d9a02] hover:opacity-90 active:translate-y-[3px] active:shadow-[0_1px_0_0_#3d9a02] focus-visible:outline focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1d20] transition-opacity"
                  >
                    我已閱讀完成，開始挑戰
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 查看情境：僅在已開始挑戰後顯示，progress 下方、聊天區上方 */}
          {entryStage === 'chat' && flowStage === 'chat' && (
            <div className="shrink-0 flex flex-col mt-2 mb-3 animate-[fade-in_0.7s_ease-out_forwards]">
              <button
                type="button"
                onClick={() => setScenarioExpanded((v) => !v)}
                className="self-start rounded-xl bg-[#4A9EFF] text-white font-semibold py-2.5 px-5 shadow-[0_4px_0_0_#2563eb] hover:opacity-90 active:opacity-95 focus-visible:outline focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1d20] transition-opacity flex items-center gap-2"
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
                  <div className="mt-3 rounded-xl bg-white/10 border border-white/10 px-4 py-4 text-left">
                    {(() => {
                      const cfg = QUESTION_CONFIGS[questionIndex] ?? QUESTION_CONFIGS[0];
                      return (
                        <>
                          <p className="text-sm md:text-base leading-relaxed text-white/90 whitespace-pre-line">
                            {cfg.scenarioText}
                          </p>
                          {cfg.scenarioImage && (
                            <img
                              src={cfg.scenarioImage}
                              alt="情境圖表"
                              className="mt-4 block w-full max-w-[400px] md:max-w-[520px] h-auto rounded-lg border border-white/10"
                            />
                          )}
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
                <h2 className="text-2xl font-bold text-white mb-2">恭喜完成論證</h2>
                <p className="text-sm text-white/70 mb-4">你的科學論證能力表現如下：</p>
                <div className="space-y-2 text-sm text-white/90">
                  <div className="flex justify-between">
                    <span>{FAKE_RESULT.claim.label}</span>
                    <span className="tabular-nums font-semibold">
                      {FAKE_RESULT.claim.score} / {FAKE_RESULT.claim.max}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{FAKE_RESULT.evidence.label}</span>
                    <span className="tabular-nums font-semibold">
                      {FAKE_RESULT.evidence.score} / {FAKE_RESULT.evidence.max}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{FAKE_RESULT.reasoning.label}</span>
                    <span className="tabular-nums font-semibold">
                      {FAKE_RESULT.reasoning.score} / {FAKE_RESULT.reasoning.max}
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-white/85">
                  {FAKE_RESULT.overallComment}
                </p>
                <button
                  type="button"
                  onClick={() => { setFlowStage('reflection'); setProgress(0); }}
                  className="mt-6 w-full rounded-xl bg-[#F5C451] text-[#3b2b12] font-semibold py-3.5 shadow-[0_4px_0_0_rgba(180,129,27,0.9)] hover:brightness-105 focus-visible:outline focus-visible:ring-2 focus-visible:ring-white transition"
                >
                  進行反思
                </button>
              </div>
            </div>
          )}

          {/* 下一題情境說明：以絕對層疊在聊天區上方 */}
          {entryStage === 'chat' && flowStage === 'next-scenario' && (
            <div className="absolute inset-0 overflow-y-auto px-4 pb-32 pt-6 bg-[#0f1d20] animate-[fade-in_0.35s_ease-out_forwards] z-10">
              <div className="mx-auto w-full max-w-4xl text-center">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">
                  題組 {currentSet + 1} / {TOTAL_SETS}
                </p>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white/95">
                  論證情境
                </h1>
                {(() => {
                  const cfg = QUESTION_CONFIGS[currentSet] ?? QUESTION_CONFIGS[QUESTION_CONFIGS.length - 1];
                  return (
                    <>
                      <p className="mt-7 text-lg md:text-xl leading-9 md:leading-10 text-white/85 whitespace-pre-line">
                        {cfg.scenarioText}
                      </p>
                      {cfg.scenarioImage && (
                        <img
                          src={cfg.scenarioImage}
                          alt="情境圖表"
                          className="mt-6 mx-auto block w-full max-w-[480px] md:max-w-[600px] h-auto rounded-xl border border-white/10"
                        />
                      )}
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
                      {QUESTION_CONFIGS.map((cfg) => {
                        const tabId = `topic-${cfg.id + 1}`;
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
                        const activeQIdx = parseInt(activeHistoryTab.replace('topic-', ''), 10) - 1;
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
                    <div className="relative z-10 shrink-0 flex items-center gap-2 px-5 py-2 border-t border-white/8">
                      <input
                        ref={reflectionInputRef}
                        type="text"
                        value={reflectionInput}
                        onChange={(e) => setReflectionInput(e.target.value)}
                        onKeyDown={handleReflectionKeyDown}
                        placeholder="說說你的想法..."
                        disabled={reflectionIsLoading}
                        className="flex-1 min-w-0 bg-transparent text-sm text-white/80 placeholder-white/25 focus:outline-none disabled:opacity-40"
                        aria-label="輸入反思內容"
                      />
                      <button
                        type="button"
                        onClick={handleReflectionSend}
                        disabled={reflectionIsLoading || !reflectionInput.trim()}
                        className="shrink-0 rounded-lg bg-[#f7c945]/80 px-3 py-1.5 text-xs font-semibold text-[#1a1200] shadow-[0_2px_0_0_rgba(180,140,0,0.5)] hover:bg-[#f7c945] active:translate-y-px active:shadow-none disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
              <div className="flex gap-3 items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="輸入你的想法..."
                  className="flex-1 min-w-0 rounded-xl bg-white/10 border border-white/20 px-4 py-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#58CC02] focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label="輸入訊息"
                  disabled={entryStage !== 'chat' || flowStage !== 'chat'}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isLoading || entryStage !== 'chat' || flowStage !== 'chat'}
                  className="shrink-0 rounded-xl bg-[#58CC02] text-white font-semibold px-6 py-4 shadow-[0_4px_0_0_#3d9a02] hover:opacity-90 active:translate-y-[3px] active:shadow-[0_1px_0_0_#3d9a02] focus-visible:outline focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60 disabled:cursor-not-allowed transition-opacity min-w-29 min-h-14 flex items-center justify-center box-border"
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
          className="fixed bottom-[88px] z-20 flex flex-col items-end gap-1 animate-[fade-in_0.7s_ease-out_forwards] pointer-events-none"
          style={{ right: 'max(1rem, calc((100vw - 56rem) / 2 + 3.375rem))' }}
        >
          {/* 對話泡泡 */}
          <div
            className="relative max-w-[220px] rounded-[20px] border border-white/15 bg-[#0f1d20] px-4 py-3 shadow-lg"
            style={isOwlSpeaking ? { animation: 'owl-pop 0.4s ease-out forwards' } : undefined}
          >
            {/* 向下尖角，指向貓頭鷹 */}
            <div
              className="absolute bottom-[-8px] right-8 h-4 w-4 rotate-45 border-b border-r border-white/15 bg-[#0f1d20]"
              aria-hidden
            />
            <p className="text-sm font-semibold leading-6 text-white/90">{owlHint}</p>
          </div>
          {/* 貓頭鷹 GIF */}
          <img
            src={OWL_HINT_GIF}
            alt="貓頭鷹博士提示"
            className="h-16 w-16 object-contain"
            style={isOwlSpeaking ? { animation: 'owl-bounce 0.45s ease-out forwards' } : undefined}
          />
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
