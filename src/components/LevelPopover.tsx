import { useEffect, useRef, useState } from 'react';

export type LevelForPopover = {
  id: string;
  title: string;
  description: string;
  isCurrent?: boolean;
};

export type AnchorRect = { top: number; left: number; width: number; height: number };

type LevelPopoverProps = {
  level: LevelForPopover | null;
  anchorRect: AnchorRect | null;
  onClose: () => void;
};

const GAP_BELOW_BUTTON = 20;

export default function LevelPopover({ level, anchorRect, onClose }: LevelPopoverProps) {
  const [entered, setEntered] = useState(false);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!level) return;
    setEntered(false);
    const id = setTimeout(() => setEntered(true), 32);
    firstButtonRef.current?.focus();
    return () => clearTimeout(id);
  }, [level?.id]);

  useEffect(() => {
    if (!level) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [level, onClose]);

  if (!level) return null;

  const handleBackdropClick = () => onClose();
  const handleCardClick = (e: React.MouseEvent) => e.stopPropagation();

  const isAnchored = anchorRect != null;
  const cardPositionStyle = isAnchored
    ? {
      top: anchorRect.top + anchorRect.height + GAP_BELOW_BUTTON,
      left: anchorRect.left + anchorRect.width / 2,
    }
    : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-popover-title"
    >
      <div
        className="absolute inset-0 bg-black/15"
        aria-hidden
        onClick={handleBackdropClick}
      />
      <div
        onClick={handleCardClick}
        style={
          isAnchored
            ? {
              position: 'fixed' as const,
              top: cardPositionStyle?.top,
              left: cardPositionStyle?.left,
              transform: 'translateX(-50%)',
              zIndex: 10,
            }
            : undefined
        }
        className={`relative z-10 w-full max-w-[320px] rounded-2xl bg-[#FF4A2A] p-5 text-white shadow-lg transition-all duration-500 ease-out ${isAnchored ? 'origin-top overflow-hidden' : ''
          } ${isAnchored
            ? entered
              ? 'scale-y-100 opacity-100'
              : 'scale-y-[0.02] opacity-0'
            : entered
              ? 'translate-y-0 scale-100 opacity-100'
              : 'translate-y-1.5 scale-95 opacity-0'
          }`}
      >
        <h2 id="level-popover-title" className="text-xl font-bold mb-1">
          {level.title}
        </h2>
        <p className="text-white/95 text-sm mb-5 font-bold leading-relaxed">
          {level.description}
        </p>
        <div className="flex flex-col gap-3">
          <button
            ref={firstButtonRef}
            type="button"
            onClick={() => {
              console.log('start', level.id);
              onClose();
            }}
            className="w-full rounded-xl bg-white py-3 text-[#FF4A2A] font-semibold transition-opacity hover:opacity-90 active:opacity-95 focus-visible:outline focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#58CC02]"
          >
            開始練習
          </button>
          <button
            type="button"
            onClick={() => {
              console.log('promote', level.id);
              onClose();
            }}
            className="w-full rounded-xl bg-[#454545] py-3 text-white font-semibold transition-opacity hover:opacity-90 active:opacity-95 focus-visible:outline focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#58CC02]"
          >
            挑戰
          </button>
        </div>
      </div>
    </div>
  );
}
