'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowRight, Waves, UtensilsCrossed, Fish, Umbrella, Heart,
  MapPin, Clock, Sparkles, Phone, AlignJustify,
} from 'lucide-react';
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

const FEATURES = [
  {
    icon: Waves,
    label: 'Ocean Views',
    desc: 'Breathtaking views all day long.',
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-500',
  },
  {
    icon: Fish,
    label: 'Fresh Seafood',
    desc: 'Daily catch from local fishermen',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-500',
  },
  {
    icon: Umbrella,
    label: 'Resort Dining',
    desc: 'Relaxed ambience and great food.',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-500',
  },
  {
    icon: Heart,
    label: 'Memorable Experience',
    desc: 'Perfect for every occasion.',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-500',
  },
];

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
    <div
      className={cn(
        'h-[100dvh] flex flex-row overflow-hidden transition-opacity duration-500',
        isMounted ? 'opacity-100' : 'opacity-0'
      )}
    >
      {/* ── LEFT PANEL ── */}
      {/*
        Flex column with 3 logical groups + 2 elastic spacers so content
        fills the full panel height without hard-coded margins that leave
        dead cream space on taller screens.
      */}
      <aside className="w-[272px] xl:w-[300px] flex-shrink-0 flex flex-col bg-[#FAF7F2] relative z-10 shadow-[6px_0_40px_rgba(0,0,0,0.10)]">

        {/* ── GROUP 1: Logo + Brand ── */}
        <div className="flex-shrink-0 px-8 pt-10 flex flex-col items-start">
          <button
            onClick={handleLogoTap}
            className="mb-4 active:scale-95 transition-transform cursor-default"
          >
            <Image
              src="/arenalogo.png"
              alt="Arena Blanca Resort"
              width={68}
              height={68}
              className="w-[60px] h-[60px] xl:w-[68px] xl:h-[68px] object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
            />
          </button>

          <h1
            className="text-[23px] xl:text-[26px] font-extrabold text-stone-900 leading-tight tracking-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Arena Blanca
          </h1>
          <p className="text-[9px] xl:text-[10px] font-bold tracking-[0.28em] text-stone-400 uppercase mt-1">
            Floating Restaurant
          </p>

          {/* Orange accent divider */}
          <div className="flex items-center gap-2 mt-4">
            <div className="w-10 h-[1.5px] bg-orange-400" />
            <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.5)]" />
            <div className="w-5 h-[1.5px] bg-orange-300/70" />
          </div>
        </div>

        {/* ── ELASTIC SPACER 1 ── */}
        <div className="flex-1 basis-0 min-h-[20px] max-h-[52px]" />

        {/* ── GROUP 2: Tagline + CTA ── */}
        <div className="flex-shrink-0 px-8">
          <h2
            className="text-[16px] xl:text-[17px] font-bold text-stone-800 leading-[1.35] mb-3"
          >
            Experience the Best<br />of the Sea
          </h2>
          <p className="text-[13px] xl:text-[14px] text-stone-400 leading-[1.65] mb-6">
            An exclusive dining experience<br />over the crystal-clear sea.
          </p>

          {/* CTA — rich amber glow shadow, pill, 52px tall */}
          <button
            onClick={handleStartOrder}
            className={cn(
              'w-full flex items-center gap-1.5 text-white rounded-full',
              'bg-orange-500 hover:bg-orange-600 active:scale-[0.97]',
              'pl-[6px] pr-[6px] py-[6px] min-h-[52px]',
              'shadow-[0_6px_28px_rgba(234,88,12,0.40),0_2px_8px_rgba(234,88,12,0.20)]',
              'hover:shadow-[0_8px_36px_rgba(234,88,12,0.50),0_3px_10px_rgba(234,88,12,0.25)]',
              'transition-all duration-200'
            )}
          >
            <div className="w-10 h-10 flex-shrink-0 rounded-full bg-white/22 flex items-center justify-center">
              <UtensilsCrossed className="w-[17px] h-[17px] text-white" strokeWidth={1.75} />
            </div>
            <span className="flex-1 text-center text-[14px] xl:text-[15px] font-semibold tracking-wide leading-none whitespace-nowrap">
              Start Your Order
            </span>
            <div className="w-10 h-10 flex-shrink-0 rounded-full bg-white/15 flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
          </button>
        </div>

        {/* ── ELASTIC SPACER 2 ── */}
        <div className="flex-1 basis-0 min-h-[20px] max-h-[44px]" />

        {/* ── GROUP 3: Feature list ── */}
        <div className="flex-shrink-0 px-8 pb-10 flex flex-col gap-[18px] xl:gap-5">
          {FEATURES.map(({ icon: Icon, label, desc, iconBg, iconColor }) => (
            <div key={label} className="flex items-center gap-3.5">
              <div
                className={cn(
                  'w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center',
                  'shadow-[0_2px_8px_rgba(0,0,0,0.08)]',
                  iconBg
                )}
              >
                <Icon className={cn('w-[18px] h-[18px]', iconColor)} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-stone-700 leading-tight">{label}</p>
                <p className="text-[12px] text-stone-400 leading-snug mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

      </aside>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 relative overflow-hidden">
        {/* Carousel backgrounds */}
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

        {/* Layered overlays — lighter base, heavier on left and bottom for text */}
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/5 to-transparent" />

        {/* Pill badge — top left */}
        <div className="absolute top-7 left-7 flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md bg-white/12 border border-white/18 shadow-[0_2px_16px_rgba(0,0,0,0.22)]">
          <AlignJustify className="w-3.5 h-3.5 text-white/80" strokeWidth={1.5} />
          <span className="text-white/90 text-[10px] font-semibold tracking-[0.24em] uppercase">
            Floating Restaurant
          </span>
        </div>

        {/* Hero headline — upper-center, left-aligned */}
        <div className="absolute left-9 top-[38%] -translate-y-1/2">
          <h2
            className="font-bold text-white leading-[0.92]"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(68px, 6.5vw, 96px)',
              textShadow: '0 4px 24px rgba(0,0,0,0.55), 0 1px 4px rgba(0,0,0,0.4)',
            }}
          >
            Ocean
          </h2>
          <h2
            className="font-bold leading-[0.92]"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(68px, 6.5vw, 96px)',
              color: '#3EC9BE',
              textShadow: '0 4px 24px rgba(0,0,0,0.45), 0 1px 4px rgba(0,0,0,0.35)',
            }}
          >
            View
          </h2>

          {/* Orange separator */}
          <div className="w-14 h-[2px] bg-orange-400 my-5 rounded-full shadow-[0_0_8px_rgba(251,146,60,0.6)]" />

          <p
            className="text-white/88 leading-[1.65] font-light"
            style={{
              fontSize: 'clamp(13px, 1.2vw, 16px)',
              maxWidth: '280px',
              textShadow: '0 1px 8px rgba(0,0,0,0.5)',
            }}
          >
            Dine above the paradise.<br />
            Memories that last a lifetime.
          </p>
        </div>

        {/* Bottom bar + Call Staff */}
        <div className="absolute bottom-5 left-5 right-5 flex items-stretch gap-3">
          {/* Info bar */}
          <div
            className="flex-1 flex items-center bg-white/93 backdrop-blur-xl rounded-2xl px-6 py-4"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)' }}
          >
            {/* Location */}
            <div className="flex-1 flex items-start gap-3">
              <MapPin className="w-[18px] h-[18px] text-orange-400 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
              <div>
                <p className="text-[13px] font-semibold text-stone-800 leading-tight">Arena Blanca Resort</p>
                <p className="text-[11px] text-stone-400 leading-[1.5] mt-0.5">
                  Brgy. Saavedra, Moalboal<br />Cebu, Philippines
                </p>
              </div>
            </div>

            <div className="w-px h-10 bg-stone-200/80 mx-4 flex-shrink-0" />

            {/* Hours */}
            <div className="flex-1 flex items-start gap-3">
              <Clock className="w-[18px] h-[18px] text-orange-400 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
              <div>
                <p className="text-[13px] font-semibold text-stone-800 leading-tight">Open Daily</p>
                <p className="text-[11px] text-stone-400 mt-0.5">8:00 AM – 10:00 PM</p>
              </div>
            </div>

            <div className="w-px h-10 bg-stone-200/80 mx-4 flex-shrink-0" />

            {/* Experience */}
            <div className="flex-1 flex items-start gap-3">
              <Sparkles className="w-[18px] h-[18px] text-orange-400 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
              <div>
                <p className="text-[13px] font-semibold text-stone-800 leading-tight">Best Experience</p>
                <p className="text-[11px] text-stone-400 leading-[1.5] mt-0.5">
                  Lunch, Sunset<br />&amp; Dinner
                </p>
              </div>
            </div>
          </div>

          {/* Call Staff button */}
          <button
            className={cn(
              'flex-shrink-0 flex items-center gap-2.5',
              'bg-white/93 backdrop-blur-xl hover:bg-white active:scale-[0.97]',
              'text-stone-700 px-5 py-4 rounded-2xl',
              'transition-all duration-200 min-h-[48px]',
            )}
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)' }}
          >
            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
              <Phone className="w-[15px] h-[15px] text-stone-600" strokeWidth={1.75} />
            </div>
            <span className="text-[13px] font-semibold whitespace-nowrap text-stone-700">Call Staff</span>
          </button>
        </div>

        {/* Carousel indicators */}
        <div className="absolute bottom-[92px] right-6 flex items-center gap-1.5">
          {CAROUSEL_IMAGES.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'h-0.5 rounded-full transition-all duration-500',
                index === currentIndex
                  ? 'w-7 bg-white shadow-[0_0_6px_rgba(255,255,255,0.6)]'
                  : 'w-3 bg-white/35 hover:bg-white/55'
              )}
            />
          ))}
        </div>
      </div>

      <KioskAdminOverlay isOpen={adminOverlayOpen} onClose={() => setAdminOverlayOpen(false)} />
    </div>
  );
}
