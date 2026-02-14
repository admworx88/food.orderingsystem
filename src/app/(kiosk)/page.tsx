import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Utensils, Clock, Sparkles, Plus } from 'lucide-react';
import { FullscreenToggle } from '@/components/kiosk/fullscreen-toggle';

export default function KioskWelcomePage() {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-white to-stone-50 px-4 sm:px-6 py-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 sm:top-20 left-5 sm:left-10 w-40 sm:w-64 h-40 sm:h-64 bg-amber-200/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 sm:bottom-20 right-5 sm:right-10 w-56 sm:w-96 h-56 sm:h-96 bg-amber-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-2xl w-full text-center">
        {/* Logo */}
        <div className="mb-6 sm:mb-8 animate-scale-in">
          <Image
            src="/arenalogo.png"
            alt="Arena Blanca Resort"
            width={96}
            height={96}
            className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl sm:rounded-3xl object-contain shadow-2xl mx-auto mb-4 sm:mb-6"
          />
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-stone-800 mb-2 sm:mb-3 tracking-tight font-display">
            Welcome to Arena Blanca Resort
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-stone-500 font-medium px-4">
            Restaurant &amp; Dining
          </p>
        </div>

        {/* Feature cards - stack on very small screens */}
        <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 sm:gap-4 mb-8 sm:mb-12 animate-fade-in-up animation-delay-200 px-2 sm:px-0">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-stone-200/50 shadow-sm flex xs:flex-col items-center xs:items-center gap-3 xs:gap-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-amber-100 flex items-center justify-center xs:mb-3 flex-shrink-0">
              <Utensils className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" strokeWidth={2} />
            </div>
            <div className="text-left xs:text-center">
              <h3 className="text-sm font-semibold text-stone-700 mb-0.5 xs:mb-1">Browse Menu</h3>
              <p className="text-xs text-stone-500">Explore our curated selection</p>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-stone-200/50 shadow-sm flex xs:flex-col items-center xs:items-center gap-3 xs:gap-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-amber-100 flex items-center justify-center xs:mb-3 flex-shrink-0">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" strokeWidth={2} />
            </div>
            <div className="text-left xs:text-center">
              <h3 className="text-sm font-semibold text-stone-700 mb-0.5 xs:mb-1">Quick Service</h3>
              <p className="text-xs text-stone-500">Fast and efficient ordering</p>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-stone-200/50 shadow-sm flex xs:flex-col items-center xs:items-center gap-3 xs:gap-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-amber-100 flex items-center justify-center xs:mb-3 flex-shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" strokeWidth={2} />
            </div>
            <div className="text-left xs:text-center">
              <h3 className="text-sm font-semibold text-stone-700 mb-0.5 xs:mb-1">Premium Quality</h3>
              <p className="text-xs text-stone-500">Freshly prepared dishes</p>
            </div>
          </div>
        </div>

        {/* CTA Button - responsive sizing */}
        <Link
          href="/order-type"
          className="inline-flex items-center gap-2 sm:gap-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-6 sm:px-8 md:px-12 py-4 sm:py-5 md:py-6 rounded-xl sm:rounded-2xl text-base sm:text-lg md:text-xl font-bold shadow-2xl shadow-amber-500/30 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all animate-fade-in-up animation-delay-400 group"
        >
          <span>Start Your Order</span>
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
        </Link>

        {/* Add to existing order */}
        <Link
          href="/add-items"
          className="mt-5 sm:mt-6 inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-semibold text-sm sm:text-base transition-colors animate-fade-in-up animation-delay-500"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
          <span>Add to Existing Order</span>
        </Link>

        {/* Helper text */}
        <p className="mt-4 sm:mt-6 text-xs sm:text-sm text-stone-400 animate-fade-in animation-delay-600 px-4">
          Tap anywhere to begin • Dine-in, room service, takeout & ocean view
        </p>
      </div>

      {/* Footer info */}
      <div className="absolute bottom-4 sm:bottom-8 left-0 right-0 flex items-center justify-center gap-3 animate-fade-in animation-delay-700 safe-area-inset-bottom">
        <p className="text-[10px] sm:text-xs text-stone-400">
          Operating Hours: 6:00 AM - 11:00 PM Daily
        </p>
        <FullscreenToggle variant="welcome" />
      </div>
    </div>
  );
}
