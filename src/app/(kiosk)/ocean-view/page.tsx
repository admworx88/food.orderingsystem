'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight, Waves } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { cn } from '@/lib/utils';
import { KioskAdminOverlay } from '@/components/kiosk/kiosk-admin-overlay';

const CAROUSEL_IMAGES = [
  '/ocean-view/1.JPG',
  '/ocean-view/2.JPG',
  '/ocean-view/3.JPG',
  '/ocean-view/4.JPG',
];

const CAROUSEL_INTERVAL = 5000;

export default function OceanViewPage() {
  const router = useRouter();
  const { setOrderType } = useCartStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [adminOverlayOpen, setAdminOverlayOpen] = useState(false);
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [tapTimer, setTapTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoTap = () => {
    setLogoTapCount((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setAdminOverlayOpen(true);
        return 0;
      }
      return next;
    });
    if (tapTimer) clearTimeout(tapTimer);
    const timer = setTimeout(() => setLogoTapCount(0), 3000);
    setTapTimer(timer);
  };

  useEffect(() => {
    return () => { if (tapTimer) clearTimeout(tapTimer); };
  }, [tapTimer]);

  useEffect(() => {
    const t = setTimeout(() => setIsMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, CAROUSEL_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  const handleStartOrder = useCallback(() => {
    setOrderType('ocean_view');
    router.push('/menu');
  }, [setOrderType, router]);

  return (
    <div className="h-full relative overflow-hidden bg-stone-950">
      {/* Carousel */}
      {CAROUSEL_IMAGES.map((src, index) => (
        <div
          key={src}
          className={cn(
            'absolute inset-0 transition-opacity duration-1000',
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          )}
        >
          <Image
            src={src}
            alt={`Ocean View ${index + 1}`}
            fill
            className="object-cover"
            priority={index === 0}
          />
        </div>
      ))}

      {/* Strong uniform overlay — ensures WCAG 4.5:1 contrast on any photo */}
      <div className="absolute inset-0 bg-black/55" />
      {/* Bottom-weighted vignette for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />

      {/* Content — entrance fade */}
      <div
        className={cn(
          'relative z-10 h-full flex flex-col items-center justify-center px-6 text-center transition-all duration-700 ease-out',
          isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        )}
      >
        {/* Frosted glass card — guarantees legibility regardless of background photo */}
        <div className="flex flex-col items-center backdrop-blur-xl bg-black/30 border border-white/10 rounded-3xl px-10 py-10 max-w-lg w-full shadow-2xl">
          {/* Location pill */}
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-white/20 bg-white/5">
            <Waves className="w-3 h-3 text-amber-400" strokeWidth={2} />
            <span className="text-white/80 text-[11px] font-medium tracking-[0.18em] uppercase">
              Floating Restaurant · Arena Blanca
            </span>
          </div>

          {/* Logo */}
          <Image
            src="/arenalogo.png"
            alt="Arena Blanca Resort"
            width={72}
            height={72}
            className="w-16 h-16 rounded-2xl object-contain mb-4 shadow-2xl cursor-default"
            onClick={handleLogoTap}
          />

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-3 tracking-tight leading-none font-serif">
            Ocean View
          </h1>

          {/* Gold decorative divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-px bg-amber-400/70" />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <div className="w-10 h-px bg-amber-400/70" />
          </div>

          {/* Subtitle — full legibility */}
          <p className="text-sm sm:text-base text-white/80 font-light tracking-wide mb-8 leading-relaxed">
            An exclusive dining experience over the crystal-clear sea
          </p>

          {/* CTA */}
          <button
            onClick={handleStartOrder}
            className={cn(
              'group inline-flex items-center gap-3',
              'bg-gradient-to-r from-amber-500 to-amber-600 text-white',
              'px-10 py-4 rounded-full text-[15px] font-semibold tracking-wide w-full justify-center',
              'shadow-[0_0_35px_rgba(217,119,6,0.4)]',
              'hover:shadow-[0_0_55px_rgba(217,119,6,0.6)]',
              'hover:from-amber-400 hover:to-amber-500',
              'active:scale-[0.97] transition-all duration-300'
            )}
          >
            <span>Start Order</span>
            <ArrowRight
              className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200"
              strokeWidth={2}
            />
          </button>
        </div>

        {/* Trust signals — frosted pill for guaranteed legibility */}
        <div className="mt-5 backdrop-blur-md bg-black/40 border border-white/15 rounded-full px-5 py-2 flex items-center gap-3 text-white/80 text-[10px] tracking-[0.15em] uppercase">
          <span>Fresh Seafood</span>
          <span className="text-amber-400/70">·</span>
          <span>Ocean Views</span>
          <span className="text-amber-400/70">·</span>
          <span>Resort Dining</span>
        </div>
      </div>

      {/* Thin-line carousel indicators */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-2 z-10">
        {CAROUSEL_IMAGES.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={cn(
              'h-0.5 rounded-full transition-all duration-500',
              index === currentIndex
                ? 'w-8 bg-amber-400'
                : 'w-3 bg-white/30 hover:bg-white/50'
            )}
          />
        ))}
      </div>

      <KioskAdminOverlay isOpen={adminOverlayOpen} onClose={() => setAdminOverlayOpen(false)} />
    </div>
  );
}
