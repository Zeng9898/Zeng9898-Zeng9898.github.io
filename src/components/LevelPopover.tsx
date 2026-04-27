import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export type LevelForPopover = {
  id: string;
  title: string;
  description: string;
  isCurrent?: boolean;
  isDisabled?: boolean;
};

export type AnchorRect = { top: number; left: number; width: number; height: number };

type LevelPopoverProps = {
  level: LevelForPopover | null;
  anchorRect: AnchorRect | null;
  onClose: () => void;
};

const GAP_FROM_BUTTON = 20;
const VIEWPORT_PADDING = 16;
const POPOVER_WIDTH = 320;

export default function LevelPopover({ level, anchorRect, onClose }: LevelPopoverProps) {
  const navigate = useNavigate();
  const [entered, setEntered] = useState(false);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!level) return;
    const id = setTimeout(() => setEntered(true), 32);
    firstButtonRef.current?.focus();
    return () => clearTimeout(id);
  }, [level]);

  useEffect(() => {
    if (!level) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [level, onClose]);

  useEffect(() => {
    if (!level) return;
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [level]);

  if (!level) return null;
  const isDisabled = level.isDisabled === true;

  const handleBackdropClick = () => onClose();
  const handleCardClick = (e: React.MouseEvent) => e.stopPropagation();

  const isAnchored = anchorRect != null;
  const shouldOpenAbove = isAnchored
    ? anchorRect.top > viewportSize.height - (anchorRect.top + anchorRect.height)
    : false;
  const halfPopoverWidth = Math.min(POPOVER_WIDTH, viewportSize.width - VIEWPORT_PADDING * 2) / 2;
  const anchoredLeft = isAnchored
    ? Math.min(
      Math.max(anchorRect.left + anchorRect.width / 2, VIEWPORT_PADDING + halfPopoverWidth),
      viewportSize.width - VIEWPORT_PADDING - halfPopoverWidth,
    )
    : undefined;
  const cardPositionStyle = isAnchored
    ? shouldOpenAbove
      ? {
        bottom: viewportSize.height - anchorRect.top + GAP_FROM_BUTTON,
        left: anchoredLeft,
        maxHeight: Math.max(180, anchorRect.top - GAP_FROM_BUTTON - VIEWPORT_PADDING),
      }
      : {
        top: anchorRect.top + anchorRect.height + GAP_FROM_BUTTON,
        left: anchoredLeft,
        maxHeight: Math.max(
          180,
          viewportSize.height - anchorRect.top - anchorRect.height - GAP_FROM_BUTTON - VIEWPORT_PADDING,
        ),
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
              bottom: cardPositionStyle?.bottom,
              left: cardPositionStyle?.left,
              maxHeight: cardPositionStyle?.maxHeight,
              transform: 'translateX(-50%)',
              zIndex: 10,
            }
            : undefined
        }
        className={`relative z-10 w-full max-w-[320px] rounded-2xl bg-[#FF4A2A] p-5 text-white shadow-lg transition-all duration-500 ease-out ${isAnchored ? `${shouldOpenAbove ? 'origin-bottom' : 'origin-top'} overflow-y-auto` : ''
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
              if (isDisabled) return;
              onClose();
              navigate(`/chat?levelId=${encodeURIComponent(level.id)}`);
            }}
            disabled={isDisabled}
            aria-disabled={isDisabled}
            className={`w-full rounded-xl py-3 font-semibold shadow-[0_4px_0_0_#d1d5db] transition-opacity focus-visible:outline focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#58CC02] ${
              isDisabled
                ? 'cursor-not-allowed bg-white/70 text-[#FF4A2A]/60 opacity-80'
                : 'bg-white text-[#FF4A2A] hover:opacity-90 active:translate-y-[3px] active:shadow-[0_1px_0_0_#d1d5db]'
            }`}
          >
            {isDisabled ? '目前停用' : '開始練習'}
          </button>
        </div>
      </div>
    </div>
  );
}
