import { useState } from 'react';
import levelImage from '../assets/level.png';
import LevelPopover, { type LevelForPopover, type AnchorRect } from './LevelPopover';

const LEVEL_NODES: (LevelForPopover & { label: string })[] = [
  { id: '1', label: '開始', title: '開始', description: '完成傳奇挑戰，展示你的實力。', isCurrent: true },
  { id: '2', label: '認識水溶液', title: '認識水溶液', description: '認識常見水溶液的性質與用途。' },
  { id: '3', label: '濃度與溶解度', title: '濃度與溶解度', description: '理解濃度計算與溶解度的概念。' },
  { id: '4', label: '酸鹼與指示劑', title: '酸鹼與指示劑', description: '學習酸鹼性質與指示劑的變化。' },
  { id: '5', label: '中和反應', title: '中和反應', description: '認識酸與鹼的中和反應與應用。' },
  { id: '6', label: '複習一', title: '複習一', description: '複習水溶液單元重點。' },
  { id: '7', label: '氧化還原', title: '氧化還原', description: '理解氧化與還原的基本概念。' },
  { id: '8', label: '電解質', title: '電解質', description: '認識電解質與非電解質。' },
  { id: '9', label: '單元挑戰', title: '單元挑戰', description: '挑戰本單元綜合題目。' },
];

export default function PathMap() {
  const [selectedLevel, setSelectedLevel] = useState<LevelForPopover | null>(null);
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);

  const handleLevelClick = (node: LevelForPopover & { label: string }, e: React.MouseEvent<HTMLButtonElement>) => {
    if (selectedLevel?.id === node.id) {
      setSelectedLevel(null);
      setAnchorRect(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchorRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    setSelectedLevel({ id: node.id, title: node.title, description: node.description, isCurrent: node.isCurrent });
  };

  const handleClose = () => {
    setSelectedLevel(null);
    setAnchorRect(null);
  };

  return (
    <div className="relative py-8">
      {/* 垂直中心線 */}
      <div
        className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-px bg-[#d4c9b8]/50"
        aria-hidden
      />
      <div className="relative z-10 flex flex-col gap-10">
        {LEVEL_NODES.map((node, index) => (
          <div
            key={node.id}
            className={`flex w-full ${index % 2 === 0 ? 'justify-end pr-[52%]' : 'justify-start pl-[52%]'}`}
          >
            <button
              type="button"
              onClick={(e) => handleLevelClick(node, e)}
              className="relative flex flex-col items-center gap-1 bg-transparent focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#2c2416] focus-visible:ring-offset-2 rounded-full cursor-pointer"
            >
              {/* 黑色只做為圖片「下方」的陰影層，不覆蓋 level */}
              <span
                className="absolute top-[10px] left-1/2 -translate-x-1/2 w-23 h-22 rounded-full bg-[#C32D1C] shrink-0 pointer-events-none"
                aria-hidden
              />
              <span className="relative z-10 flex flex-col items-center gap-1 rounded-full transition-[transform_0.15s_cubic-bezier(0.34,1.56,0.64,1)] hover:translate-y-[2px] active:translate-y-[4.8px]">
                <span className="w-23 h-23 rounded-full overflow-hidden bg-transparent flex items-center justify-center shrink-0">
                  <img
                    src={levelImage}
                    alt=""
                    className="w-full h-full object-contain"
                    aria-hidden
                  />
                </span>
              </span>
            </button>
            {node.label && (
              <span className="text-xs text-[#5c5348] font-medium max-w-[80px] text-center leading-tight">
                {node.label}
              </span>
            )}
          </div>
        ))}
      </div>
      <LevelPopover
        key={selectedLevel?.id ?? 'closed'}
        level={selectedLevel}
        anchorRect={anchorRect}
        onClose={handleClose}
      />
    </div>
  );
}
