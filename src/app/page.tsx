import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#faf6f0]">
      {/* === Layered Background === */}

      {/* Base warm gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-amber-50 via-[#fdf8f0] to-orange-50/60" />

      {/* Subtle grain texture overlay */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Animated organic blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Top-right warm blob */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-amber-200/25 to-orange-300/15 blur-3xl animate-welcome-blob" />
        {/* Bottom-left cool blob */}
        <div className="absolute -bottom-40 -left-32 w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-amber-100/30 to-yellow-200/20 blur-3xl animate-welcome-blob-reverse" />
        {/* Center accent blob */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-gradient-to-r from-orange-100/15 via-amber-100/10 to-transparent blur-3xl animate-welcome-blob" />
      </div>

      {/* Animated wave at bottom */}
      <div className="fixed bottom-0 left-0 right-0 h-40 pointer-events-none overflow-hidden">
        <svg
          className="absolute bottom-0 w-[200%] h-full animate-welcome-wave"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0,60 C240,120 480,0 720,60 C960,120 1200,0 1440,60 L1440,120 L0,120 Z"
            fill="url(#wave-gradient)"
            opacity="0.4"
          />
          <path
            d="M0,80 C180,40 360,100 540,70 C720,40 900,100 1080,80 C1260,60 1440,90 1440,80 L1440,120 L0,120 Z"
            fill="url(#wave-gradient-2)"
            opacity="0.25"
          />
          <defs>
            <linearGradient id="wave-gradient" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.15" />
              <stop offset="50%" stopColor="#f97316" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="wave-gradient-2" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* === Main Content === */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-8">
        <div className="max-w-2xl mx-auto">

          {/* Animated Logo */}
          <div className="animate-fade-in-up mb-6">
            <div className="relative inline-block animate-welcome-float">
              {/* Glow ring behind logo */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-400/30 to-orange-400/20 blur-xl scale-125" />
              <Image
                src="/arenalogo.png"
                alt="Arena Blanca Resort"
                width={112}
                height={112}
                className="relative w-24 h-24 md:w-28 md:h-28 rounded-3xl object-contain animate-welcome-glow"
              />
            </div>
          </div>

          {/* Food showcase */}
          <div className="flex justify-center items-end gap-5 mb-8">
            <div className="animate-welcome-food-appear animation-delay-200">
              <div className="animate-welcome-food-hover" style={{ animationDelay: '0s' }}>
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/80 backdrop-blur-sm border border-amber-100/60 shadow-lg shadow-amber-900/5 flex items-center justify-center">
                  <span className="text-3xl md:text-4xl">🍜</span>
                </div>
              </div>
            </div>
            <div className="animate-welcome-food-appear animation-delay-400">
              <div className="animate-welcome-food-hover" style={{ animationDelay: '0.4s' }}>
                <div className="w-18 h-18 md:w-22 md:h-22 w-[4.5rem] h-[4.5rem] md:w-[5.5rem] md:h-[5.5rem] rounded-2xl bg-white/80 backdrop-blur-sm border border-amber-100/60 shadow-lg shadow-amber-900/5 flex items-center justify-center -mb-1">
                  <span className="text-4xl md:text-5xl">🍛</span>
                </div>
              </div>
            </div>
            <div className="animate-welcome-food-appear animation-delay-600">
              <div className="animate-welcome-food-hover" style={{ animationDelay: '0.8s' }}>
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/80 backdrop-blur-sm border border-amber-100/60 shadow-lg shadow-amber-900/5 flex items-center justify-center">
                  <span className="text-3xl md:text-4xl">🥘</span>
                </div>
              </div>
            </div>
          </div>

          {/* Welcome text */}
          <div className="animate-fade-in-up animation-delay-300">
            <h1 className="text-5xl md:text-6xl font-bold text-stone-800 mb-3 tracking-tight">
              Welcome to
              <span className="block mt-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent">
                Arena Blanca Resort
              </span>
            </h1>

            <p className="text-lg md:text-xl text-stone-500 mb-10 max-w-md mx-auto leading-relaxed font-medium">
              Restaurant &amp; Dining
            </p>
          </div>

          {/* Start Order CTA with shimmer */}
          <div className="animate-fade-in-up animation-delay-500">
            <Link
              href="/order-type"
              className="group relative inline-flex items-center gap-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-12 py-6 rounded-3xl shadow-2xl shadow-amber-500/40 hover:shadow-amber-500/50 active:scale-95 transition-all duration-200 overflow-hidden"
            >
              <div className="absolute inset-0 animate-welcome-shimmer" />
              <span className="relative text-2xl font-bold tracking-wide">Start Your Order</span>
              <div className="relative w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>

          {/* Add to existing order */}
          <div className="mt-6 animate-fade-in-up animation-delay-600">
            <Link
              href="/add-items"
              className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-semibold text-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Add to Existing Order</span>
            </Link>
          </div>

          {/* Order type hints */}
          <div className="flex justify-center gap-8 mt-12 animate-fade-in animation-delay-700">
            <div className="flex items-center gap-3 text-stone-500">
              <div className="w-10 h-10 rounded-xl bg-white/80 border border-stone-200/50 shadow-sm flex items-center justify-center">
                <span className="text-xl">🍽️</span>
              </div>
              <span className="font-medium text-sm">Dine-in</span>
            </div>
            <div className="flex items-center gap-3 text-stone-500">
              <div className="w-10 h-10 rounded-xl bg-white/80 border border-stone-200/50 shadow-sm flex items-center justify-center">
                <span className="text-xl">🛎️</span>
              </div>
              <span className="font-medium text-sm">Room Service</span>
            </div>
            <div className="flex items-center gap-3 text-stone-500">
              <div className="w-10 h-10 rounded-xl bg-white/80 border border-stone-200/50 shadow-sm flex items-center justify-center">
                <span className="text-xl">🥡</span>
              </div>
              <span className="font-medium text-sm">Takeout</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
