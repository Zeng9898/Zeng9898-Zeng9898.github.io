import { useEffect, useRef, useState } from 'react';

const INITIAL_MESSAGES: { id: string; role: 'ai' | 'student'; text: string }[] = [
  { id: '1', role: 'ai', text: '請根據剛才的情境，提出你的論點：你覺得誰說得對？' },
];

const SCENARIO = {
  intro: `寒流來臨時，氣溫一下子降到攝氏 8 度，天氣變得好冷哦！大雄、小夫、胖虎在聊天時發現，說話時嘴巴前竟會呼出陣陣的白煙，對於這個有趣的現象，三人各自提出了不同的想法。`,
  question: '請問你覺得誰說得對？',
  claims: [
    { name: '小夫', text: '我覺得白煙是液態的小水滴。' },
    { name: '胖虎', text: '我認為白煙是固態的冰晶。' },
    { name: '大雄', text: '我認為白煙應該是氣態的水蒸氣。' },
  ],
} as const;

const TOTAL_STEPS = 9;
const STEP_PROGRESS = (s: number) => Math.round((s / TOTAL_STEPS) * 100);

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

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export default function ArgumentChatPage() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [progress, setProgress] = useState(0);
  const [isBumping, setIsBumping] = useState(false);
  const [showBonus, setShowBonus] = useState<number | null>(null);
  const [bonusVisible, setBonusVisible] = useState(false);

  const [threadId, setThreadId] = useState<string | null>(null);
  const [phase, setPhase] = useState('');
  const [step, setStep] = useState(0);
  const [stage, setStage] = useState('');
  const [hintLevel, setHintLevel] = useState<number | null>(null);
  const [requiresRestatement, setRequiresRestatement] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const chatStreamRef = useRef<HTMLDivElement>(null);

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
  }, [messages]);

  const applyStepProgress = (newStep: number, prevStep: number) => {
    const newProgress = STEP_PROGRESS(newStep);
    setProgress(newProgress);
    if (newStep > prevStep) {
      setIsBumping(true);
      setShowBonus(newStep - prevStep);
    }
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text) return;
    if (isLoading) return;
    setInputValue('');
    setErrorText('');
    setMessages((prev) => [
      ...prev,
      { id: String(Date.now()), role: 'student' as const, text },
    ]);
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: text, threadId }),
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
      setThreadId(data.threadId ?? threadId);
      const newPhase = typeof data.phase === 'string' ? data.phase : '';
      const newStep = typeof data.step === 'number' && data.step >= 1 && data.step <= 9 ? data.step : step;
      const newStage = typeof data.stage === 'string' ? data.stage : '';
      setPhase(newPhase);
      setStep(newStep);
      setStage(newStage);
      setHintLevel(typeof data.hintLevel === 'number' ? data.hintLevel : null);
      setRequiresRestatement(typeof data.requiresRestatement === 'boolean' ? data.requiresRestatement : null);
      applyStepProgress(newStep, step);
      const assistantText = typeof data.assistantMessage === 'string' ? data.assistantMessage : '';
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now() + 1), role: 'ai' as const, text: assistantText || '(無回覆內容)' },
      ]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '網路錯誤';
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'ai' as const, text: `錯誤：${errMsg}` },
      ]);
      setErrorText(errMsg);
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

  return (
    <div className="h-screen bg-[#0f1d20] flex flex-col overflow-hidden">
      <div className="max-w-4xl w-full mx-auto px-4 md:px-6 flex flex-col flex-1 min-h-0">
        {/* 1) TopBar */}
        <header className="flex items-center justify-between pt-8 pb-6 shrink-0">
          <button
            type="button"
            onClick={() => console.log('close')}
            className="p-2 -m-2 text-white/90 hover:text-white focus-visible:outline focus-visible:ring-2 focus-visible:ring-white rounded"
            aria-label="關閉"
          >
            <span className="text-xl font-bold">✕</span>
          </button>
          <div className="flex-1 flex items-center gap-3 mx-4 min-w-0">
            <div
              className={`flex-1 min-w-0 h-3.5 rounded-full bg-white/20 overflow-visible relative transition-transform duration-200 ease-out origin-center ${isBumping ? 'scale-y-150 drop-shadow-[0_0_10px_rgba(88,204,2,0.8)]' : 'scale-y-100'
                }`}
            >
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full overflow-hidden transition-[width] duration-300 ease-out"
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
              {threadId ? (
                <span className="text-white/30 text-xs max-w-28 truncate" title={threadId}>
                  {threadId}
                </span>
              ) : null}
            </div>
          </div>
        </header>

        {/* 2) 情境卡 */}
        <section className="shrink-0 mb-6">
          <div className="rounded-2xl bg-white/10 border border-white/20 p-5 md:p-6">
            <p className="text-white text-base leading-relaxed mb-4 whitespace-pre-line">
              {SCENARIO.intro}
            </p>
            <ul className="space-y-2 mb-4">
              {SCENARIO.claims.map(({ name, text }) => (
                <li
                  key={name}
                  className="rounded-lg bg-white/10 border border-white/15 px-3 py-2.5 text-white/95 text-sm"
                >
                  <span className="font-bold text-[#58CC02]">{name}的主張：</span>
                  <span className="ml-1">{text}</span>
                </li>
              ))}
            </ul>
            <p className="text-white font-semibold">{SCENARIO.question}</p>
          </div>
        </section>

        {/* 開發用：手動前進一步（測試進度條） */}
        {/* <div className="shrink-0 mb-2">
          <button
            type="button"
            onClick={() => {
              const next = Math.min(TOTAL_STEPS, step + 1);
              if (next > step) {
                setStep(next);
                applyStepProgress(next, step);
              }
            }}
            className="text-xs text-white/60 hover:text-white/80 border border-white/30 rounded-lg px-3 py-1.5"
          >
            [開發] step +1（{step}/{TOTAL_STEPS}）
          </button>
        </div> */}

        {/* 3) ChatStream */}
        <section
          ref={chatStreamRef}
          className="flex-1 flex flex-col gap-3 pb-32 min-h-0 overflow-y-auto"
        >
          {messages.map((msg) => (
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
                <p className="text-sm md:text-base leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* 4) InputBar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#152A2E] border-t border-white/10 pt-4">
        <div className="max-w-4xl w-full mx-auto px-4 md:px-6 py-5">
          {errorText ? (
            <p className="text-red-400 text-sm mb-2" role="alert">{errorText}</p>
          ) : null}
          <div className="flex gap-3 items-center">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="輸入你的想法..."
              className="flex-1 min-w-0 rounded-xl bg-white/10 border border-white/20 px-4 py-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#58CC02] focus:border-transparent"
              aria-label="輸入訊息"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isLoading}
              className="shrink-0 rounded-xl bg-[#58CC02] text-white font-semibold px-6 py-4 hover:opacity-90 focus-visible:outline focus-visible:ring-2 focus-visible:ring-white disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? '送出中…' : '送出'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
