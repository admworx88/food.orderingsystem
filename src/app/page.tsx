import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/80 via-white to-orange-50/50">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-amber-200/30 to-orange-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-amber-100/40 to-yellow-100/30 rounded-full blur-3xl" />
      </div>

      <div className="relative min-h-screen flex flex-col items-center justify-center text-center px-8">
        {/* Hero content */}
        <div className="max-w-2xl mx-auto animate-fade-in-up">
          {/* Logo */}
          <div className="w-20 h-20 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-2xl shadow-amber-500/40">
            <span className="text-white font-bold text-3xl">OF</span>
          </div>

          {/* Decorative food icons */}
          <div className="flex justify-center gap-4 mb-8">
            <span className="text-5xl animate-bounce animation-delay-100">🍜</span>
            <span className="text-5xl animate-bounce animation-delay-200">🍛</span>
            <span className="text-5xl animate-bounce animation-delay-300">🥘</span>
          </div>

          {/* Welcome text */}
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4 tracking-tight">
            Welcome to
            <span className="block mt-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent">
              OrderFlow
            </span>
          </h1>

          <p className="text-xl text-gray-600 mb-12 max-w-md mx-auto leading-relaxed">
            Fresh, delicious Filipino & international cuisine prepared just for you.
          </p>

          {/* Start Order CTA */}
          <Link
            href="/menu"
            className="group inline-flex items-center gap-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-12 py-6 rounded-3xl shadow-2xl shadow-amber-500/40 hover:shadow-amber-500/50 active:scale-95 transition-all duration-200"
          >
            <span className="text-2xl font-bold tracking-wide">Start Your Order</span>
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          {/* Order type hints */}
          <div className="flex justify-center gap-8 mt-16">
            <div className="flex items-center gap-3 text-gray-600">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <span className="text-xl">🍽️</span>
              </div>
              <span className="font-medium">Dine-in</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <span className="text-xl">🛎️</span>
              </div>
              <span className="font-medium">Room Service</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <span className="text-xl">🥡</span>
              </div>
              <span className="font-medium">Takeout</span>
            </div>
          </div>
        </div>

        {/* Bottom decorative wave */}
        <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-amber-100/50 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
