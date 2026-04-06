import heroImage from '../assets/hero.png';

type HeroProps = {
  onStartPractice: () => void;
};

export default function Hero({ onStartPractice }: HeroProps) {
  return (
    <section className="w-full max-w-5xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-col md:flex-row md:items-center gap-10">
        <div className="flex-1 min-w-0 max-w-md mx-auto md:mx-0 animate-[float_4s_ease-in-out_infinite]">
          <img
            src={heroImage}
            alt="Hero"
            className="w-full h-auto object-contain px-10"
          />
        </div>
        <div className="flex-1 flex flex-col gap-5">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            和小幫手一起練習科學論證，把想法說清楚
          </h1>
          <p className="text-gray-500 text-lg">
            主張、證據、推理一步一步，讓你的回答更有說服力。
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onStartPractice}
              className="w-full sm:w-auto text-center rounded-xl px-6 py-3 bg-[#D18D52] text-[#262a34] font-medium shadow-[0_4px_0_0_#a66b38] hover:brightness-110 active:translate-y-[3px] active:shadow-[0_1px_0_0_#a66b38] transition-[filter] focus-visible:outline focus-visible:ring-2 focus-visible:ring-white"
            >
              開始練習
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
