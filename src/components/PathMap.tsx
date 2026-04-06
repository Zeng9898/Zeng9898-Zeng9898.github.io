import { useState, useEffect } from 'react';
import levelImage from '../assets/level.png';
import LevelPopover, { type LevelForPopover, type AnchorRect } from './LevelPopover';

const LEVEL_NODES: (LevelForPopover & { label: string })[] = [
  { id: '1', label: '第一次科學論證', title: '第一次科學論證', description: '', isCurrent: true },
];

export default function PathMap() {
  const [selectedLevel, setSelectedLevel] = useState<LevelForPopover | null>(null);
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

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
    <div
      className={`relative py-8 transition-opacity duration-2500 ease-out ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
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
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={(e) => handleLevelClick(node, e)}
                className="relative flex flex-col items-center gap-1 bg-transparent focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#2c2416] focus-visible:ring-offset-2 rounded-full cursor-pointer"
              >
                {/* 圖片下方陰影層 */}
                <span
                  className="absolute top-[10px] left-1/2 -translate-x-1/2 w-23 h-22 rounded-full bg-[#C32D1C] shrink-0 pointer-events-none"
                  aria-hidden
                />
                <span className="relative z-10 flex flex-col items-center gap-1 rounded-full hover:translate-y-[2px] active:translate-y-[4.8px]">
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
                <span className="text-sm font-bold text-[#3b2f22] tracking-wide bg-[#e8ddd0] px-3 py-0.5 rounded-full shadow-sm">
                  {node.label}
                </span>
              )}
            </div>
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
