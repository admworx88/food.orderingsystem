import Link from 'next/link';
import { ChevronRight, Utensils, Clock, Sparkles } from 'lucide-react';

export default function KioskWelcomePage() {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-white to-stone-50 px-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-amber-200/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-2xl w-full text-center">
        {/* Logo */}
        <div className="mb-8 animate-scale-in">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-2xl shadow-amber-500/30 mb-6">
            <Utensils className="w-12 h-12 text-white" strokeWidth={2} />
          </div>
          <h1 className="text-5xl font-bold text-stone-800 mb-3 tracking-tight font-display">
            Welcome to OrderFlow
          </h1>
          <p className="text-xl text-stone-500 font-medium">
            Your Hotel Restaurant Dining Experience
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-3 gap-4 mb-12 animate-fade-in-up animation-delay-200">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-stone-200/50 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-3 mx-auto">
              <Utensils className="w-6 h-6 text-amber-600" strokeWidth={2} />
            </div>
            <h3 className="text-sm font-semibold text-stone-700 mb-1">Browse Menu</h3>
            <p className="text-xs text-stone-500">Explore our curated selection</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-stone-200/50 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-3 mx-auto">
              <Clock className="w-6 h-6 text-amber-600" strokeWidth={2} />
            </div>
            <h3 className="text-sm font-semibold text-stone-700 mb-1">Quick Service</h3>
            <p className="text-xs text-stone-500">Fast and efficient ordering</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-stone-200/50 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-3 mx-auto">
              <Sparkles className="w-6 h-6 text-amber-600" strokeWidth={2} />
            </div>
            <h3 className="text-sm font-semibold text-stone-700 mb-1">Premium Quality</h3>
            <p className="text-xs text-stone-500">Freshly prepared dishes</p>
          </div>
        </div>

        {/* CTA Button */}
        <Link
          href="/menu"
          className="inline-flex items-center gap-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-12 py-6 rounded-2xl text-xl font-bold shadow-2xl shadow-amber-500/30 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all animate-fade-in-up animation-delay-400 group"
        >
          <span>Start Your Order</span>
          <ChevronRight className="w-7 h-7 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
        </Link>

        {/* Helper text */}
        <p className="mt-8 text-sm text-stone-400 animate-fade-in animation-delay-600">
          Tap anywhere to begin • Available for dine-in, room service & takeout
        </p>
      </div>

      {/* Footer info */}
      <div className="absolute bottom-8 left-0 right-0 text-center animate-fade-in animation-delay-700">
        <p className="text-xs text-stone-400">
          Operating Hours: 6:00 AM - 11:00 PM Daily
        </p>
      </div>
    </div>
  );
}
