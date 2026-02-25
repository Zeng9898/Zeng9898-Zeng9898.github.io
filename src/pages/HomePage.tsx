import SideNav from '../components/SideNav';
import PathMap from '../components/PathMap';
import argumentationIcon from '../assets/indicator_argumentation.png';
import reflectionIcon from '../assets/indicator_reflection.png';
import streakIcon from '../assets/indicator_streak.png';

const STAT_CARDS = [
  { label: '已完成論證次數', value: '0', icon: argumentationIcon },
  { label: '已完成反思次數', value: '0', icon: reflectionIcon },
  { label: '連續練習天數', value: '0', icon: streakIcon },
];

export default function HomePage() {
  return (
    <div className="h-screen flex bg-[#F7EAD0] overflow-hidden">
      <SideNav />
      <div className="flex-1 flex justify-center min-w-0 min-h-0">
        <div className="w-[1056px] flex shrink-0 min-h-0">
          <main className="flex-[0_0_60%] min-w-0 min-h-0 flex flex-col overflow-y-auto">
            {/* Sticky 標題卡 header */}
            <div className="sticky top-0 z-20 shrink-0 px-6 pt-6 pb-4 md:px-8 md:pt-8 md:pb-5">
              <div className="rounded-2xl bg-[#FF4A2A] text-white shadow-[0_4px_14px_rgba(255,74,42,0.35)] px-5 py-4 flex items-center justify-between gap-4 backdrop-blur-sm">
                <div className="min-w-0">
                  <p className="text-sm opacity-90">第 1 單元 · 第 1 部分</p>
                  <h2 className="text-xl font-bold truncate">水溶液</h2>
                </div>
                <button
                  type="button"
                  onClick={() => console.log('指南')}
                  className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 active:bg-white/40 transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#FF4A2A]"
                >
                  <span className="text-sm font-semibold">指南</span>
                </button>
              </div>
            </div>
            {/* 關卡路徑（可滾動內容） */}
            <div className="flex-1 min-h-0 px-6 pb-12 md:px-8">
              <PathMap />
            </div>
          </main>
          <aside className="flex-[0_0_40%] shrink-0 p-4 overflow-hidden">
            <div className="flex flex-col gap-4">
              {STAT_CARDS.map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl bg-[#F7EAD0] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border-2 border-[#d4c9b8]"
                >
                  {'icon' in card && card.icon ? (
                    <div className="flex items-center gap-6 mx-2">
                      <span className="w-12 h-12 shrink-0 flex items-center justify-center">
                        <img
                          src={card.icon}
                          alt=""
                          className="w-full h-full object-contain"
                          aria-hidden
                        />
                      </span>
                      <div className="min-w-0">
                        <p className="text-base text-[#454545] mb-2 font-bold tracking-wide">{card.label}</p>
                        <p className="text-3xl font-bold text-[#454545] tracking-wide">{card.value}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-base text-[#454545] mb-2 font-bold tracking-wide">{card.label}</p>
                      <p className="text-3xl font-bold text-[#454545] tracking-wide">{card.value}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
