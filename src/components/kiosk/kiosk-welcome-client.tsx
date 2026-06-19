'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  UtensilsCrossed, Leaf, ChefHat, ArrowRight, Waves, Sparkles,
  UserCircle2, RefreshCw, CreditCard, ClipboardList, Plus,
} from 'lucide-react';
import { KioskAdminOverlay } from '@/components/kiosk/kiosk-admin-overlay';
import { EmployeePinDialog } from '@/components/kiosk/employee-pin-dialog';
import { StaffSignOutDialog } from '@/components/kiosk/staff-signout-dialog';
import { BurgerLoader } from '@/components/shared/burger-loader';
import { useStaffSessionStore } from '@/stores/staff-session-store';
import { useKioskLocation } from '@/hooks/use-kiosk-location';
import { cn } from '@/lib/utils';


const BRAND_HIGHLIGHTS = [
  { icon: Leaf, label: 'Fresh Ingredients', desc: 'Locally sourced daily' },
  { icon: Sparkles, label: 'Signature Dishes', desc: 'Filipino & international' },
  { icon: Waves, label: 'Resort Dining', desc: 'Ocean-view experience' },
  { icon: ChefHat, label: 'Made to Order', desc: 'Cooked fresh for you' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  show: (delay: number = 0) => ({
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut' as const, delay },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.82 },
  show: (delay: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.55, ease: [0.34, 1.4, 0.64, 1] as [number, number, number, number], delay },
  }),
};

const dividerVariant = {
  hidden: { opacity: 0, scaleX: 0 },
  show: {
    opacity: 1,
    scaleX: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: 0.45 },
  },
};

export function KioskWelcomeClient() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [adminOverlayOpen, setAdminOverlayOpen] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);
  // useStaffSessionStore uses Zustand persist which reads localStorage synchronously.
  // Server renders session=null but client may already have a persisted session.
  // Guard with `mounted` so server+client initial renders match (hydration-safe).
  const sessionFromStore = useStaffSessionStore((s) => s.session);
  const session = mounted ? sessionFromStore : null;
  const { location } = useKioskLocation();
  const isOceanView = location === 'ocean_view';

  const showOrders = session?.role === 'waiter' || session?.role === 'cashier' || isOceanView;
  const showPayments = session?.role === 'cashier';
  const hasSideButtons = showOrders || showPayments;
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleLogoTap = useCallback(() => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 2500);
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      setAdminOverlayOpen(true);
    }
  }, []);

  const handleStartOrder = useCallback(() => {
    router.push('/order-type');
  }, [router]);

  const handleNavigate = useCallback((href: string) => {
    setIsNavigating(true);
    router.push(href);
  }, [router]);

  return (
    <div
      className={cn(
        'h-[100dvh] relative bg-[#FEF7EE] overflow-hidden transition-opacity duration-500',
        mounted ? 'opacity-100' : 'opacity-0'
      )}
    >
      <BurgerLoader isLoading={isNavigating} message="Loading…" />
      {/* ── Food doodle background ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <svg
          viewBox="0 0 1440 900"
          className="w-full h-full"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Fork — top left */}
          <g transform="translate(68, 82) rotate(18) scale(1.5)" stroke="#B45309" strokeWidth="2.5" opacity="0.12">
            <animateTransform attributeName="transform" type="translate" values="0,0; 0,-12; 0,0" keyTimes="0; 0.5; 1" calcMode="spline" keySplines="0.45 0 0.55 1; 0.45 0 0.55 1" dur="4.2s" begin="0s" repeatCount="indefinite" additive="sum" />
            <line x1="0" y1="0" x2="0" y2="30" />
            <line x1="-5" y1="0" x2="-5" y2="13" />
            <line x1="5" y1="0" x2="5" y2="13" />
            <line x1="-5" y1="13" x2="5" y2="13" />
            <line x1="0" y1="13" x2="0" y2="19" />
          </g>

          {/* Leaf — top left */}
          <g transform="translate(152, 46) rotate(-18) scale(1.5)" stroke="#B45309" strokeWidth="2" opacity="0.11">
            <animateTransform attributeName="transform" type="translate" values="0,0; 0,-10; 0,0" keyTimes="0; 0.5; 1" calcMode="spline" keySplines="0.45 0 0.55 1; 0.45 0 0.55 1" dur="5.0s" begin="0.7s" repeatCount="indefinite" additive="sum" />
            <path d="M0 22 C-11 8 -9 -8 0 -18 C9 -8 11 8 0 22" />
            <line x1="0" y1="-18" x2="0" y2="22" />
          </g>

          {/* Star — upper left */}
          <g transform="translate(275, 58) rotate(12) scale(1.5)" stroke="#B45309" strokeWidth="2" opacity="0.10">
            <animateTransform attributeName="transform" type="translate" values="0,0; 0,-11; 0,0" keyTimes="0; 0.5; 1" calcMode="spline" keySplines="0.45 0 0.55 1; 0.45 0 0.55 1" dur="3.7s" begin="1.4s" repeatCount="indefinite" additive="sum" />
            <path d="M0 -12 L2.8 -4 L10.6 -3.7 L4.6 1.4 L6.6 9.5 L0 4.8 L-6.6 9.5 L-4.6 1.4 L-10.6 -3.7 L-2.8 -4 Z" />
          </g>

          {/* Coffee cup — left */}
          <g transform="translate(48, 295) rotate(-8) scale(1.5)" stroke="#B45309" strokeWidth="2" opacity="0.11">
            <animateTransform attributeName="transform" type="translate" values="0,0; 0,-9; 0,0" keyTimes="0; 0.5; 1" calcMode="spline" keySplines="0.45 0 0.55 1; 0.45 0 0.55 1" dur="4.8s" begin="2.1s" repeatCount="indefinite" additive="sum" />
            <path d="M-10 2 L-10 18 Q-10 22 -6 22 L6 22 Q10 22 10 18 L10 2 Z" />
            <line x1="-12" y1="2" x2="12" y2="2" />
            <path d="M10 6 Q16 6 16 13 Q16 19 10 19" />
            <path d="M-3 -3 Q-1 -8 -3 -13" />
            <path d="M3 -3 Q5 -9 3 -14" />
          </g>

          {/* Spoon — left side */}
          <g transform="translate(115, 392) rotate(28) scale(1.5)" stroke="#B45309" strokeWidth="2" opacity="0.11">
            <animateTransform attributeName="transform" type="translate" values="0,0; 0,-13; 0,0" keyTimes="0; 0.5; 1" calcMode="spline" keySplines="0.45 0 0.55 1; 0.45 0 0.55 1" dur="5.5s" begin="2.8s" repeatCount="indefinite" additive="sum" />
            <ellipse cx="0" cy="0" rx="5" ry="8" />
            <line x1="0" y1="8" x2="0" y2="32" />
          </g>

          {/* Herb sprig — far left */}
          <g transform="translate(35, 492) rotate(-10) scale(1.4)" stroke="#B45309" strokeWidth="2" opacity="0.10">
            <animateTransform attributeName="transform" type="translate" values="0,0; 0,-10; 0,0" keyTimes="0; 0.5; 1" calcMode="spline" keySplines="0.45 0 0.55 1; 0.45 0 0.55 1" dur="4.0s" begin="0.5s" repeatCount="indefinite" additive="sum" />
            <line x1="0" y1="22" x2="0" y2="-20" />
            <ellipse cx="-7" cy="-4" rx="5" ry="3" transform="rotate(-35 -7 -4)" />
            <ellipse cx="7" cy="-4" rx="5" ry="3" transform="rotate(35 7 -4)" />
            <ellipse cx="-5" cy="-14" rx="4" ry="2.5" transform="rotate(-25 -5 -14)" />
            <ellipse cx="5" cy="-14" rx="4" ry="2.5" transform="rotate(25 5 -14)" />
          </g>

          {/* Knife — left lower */}
          <g transform="translate(90, 598) rotate(12) scale(1.4)" stroke="#B45309" strokeWidth="2" opacity="0.10">
            <animateTransform attributeName="transform" type="translate" values="0,0; 0,-9; 0,0" keyTimes="0; 0.5; 1" calcMode="spline" keySplines="0.45 0 0.55 1; 0.45 0 0.55 1" dur="5.2s" begin="1.2s" repeatCount="indefinite" additive="sum" />
            <path d="M0 -22 C3 -16 5 -12 5 -10 L5 6 L0 6 L0 28" />
          </g>

          {/* Leaf — bottom left */}
          <g transform="translate(62, 732) rotate(38) scale(1.5)" stroke="#B45309" strokeWidth="2" opacity="0.11">
            <animateTransform attributeName="transform" type="translate" values="0,0; 0,-11; 0,0" keyTimes="0; 0.5; 1" calcMode="spline" keySplines="0.45 0 0.55 1; 0.45 0 0.55 1" dur="3.9s" begin="1.9s" repeatCount="indefinite" additive="sum" />
            <path d="M0 20 C-9 7 -7 -7 0 -16 C7 -7 9 7 0 20" />
            <line x1="0" y1="-16" x2="0" y2="20" />
          </g>

          {/* Bowl — bottom left */}
          <g transform="translate(194, 832) rotate(-4) scale(1.5)" stroke="#B45309" strokeWidth="2.5" opacity="0.10">
            <animateTransform attributeName="transform" type="translate" values="0,0; 0,-10; 0,0" keyTimes="0; 0.5; 1" calcMode="spline" keySplines="0.45 0 0.55 1; 0.45 0 0.55 1" dur="4.5s" begin="2.6s" repeatCount="indefinite" additive="sum" />
            <path d="M-16 0 Q-16 18 0 18 Q16 18 16 0 Z" />
            <line x1="-18" y1="0" x2="18" y2="0" />
          </g>

          {/* Star — bottom center-left */}
          <g transform="translate(325, 858) rotate(-22) scale(1.5)" stroke="#B45309" strokeWidth="2" opacity="0.10">
            <animateTransform attributeName="transform" type="translate" values="0,0; 0,-12; 0,0" keyTimes="0; 0.5; 1" calcMode="spline" keySplines="0.45 0 0.55 1; 0.45 0 0.55 1" dur="5.8s" begin="3.3s" repeatCount="indefinite" additive="sum" />
            <path d="M0 -10 L2.4 -3.3 L9.5 -3.1 L4 1.2 L5.9 8.1 L0 4 L-5.9 8.1 L-4 1.2 L-9.5 -3.1 L-2.4 -3.3 Z" />
          </g>

          {/* Noodle wave — top center */}
          <g transform="translate(455, 50) rotate(3) scale(1.6)" stroke="#B45309" strokeWidth="2" opacity="0.09">
            <animateTransform attributeName="transform" type="translate" values="0,0; 0,-9; 0,0" keyTimes="0; 0.5; 1" calcMode="spline" keySplines="0.45 0 0.55 1; 0.45 0 0.55 1" dur="4.3s" begin="0.3s" repeatCount="indefinite" additive="sum" />
            <path d="M-18 0 C-18 -10 -6 -10 -6 0 C-6 10 6 10 6 0 C6 -10 18 -10 18 0" />
          </g>

          {/* Pizza slice — upper right edge */}
          <g transform="translate(835, 58) rotate(-12) scale(1.5)" stroke="#B45309" strokeWidth="2" opacity="0.11">
            <animateTransform attributeName="transform" type="translate" values="0,0; 0,-13; 0,0" keyTimes="0; 0.5; 1" calcMode="spline" keySplines="0.45 0 0.55 1; 0.45 0 0.55 1" dur="5.1s" begin="1.0s" repeatCount="indefinite" additive="sum" />
            <path d="M0 -20 L-14 12 L14 12 Z" />
            <path d="M-14 12 Q0 18 14 12" />
            <circle cx="0" cy="-2" r="2.5" />
            <circle cx="-5" cy="5" r="2" />
            <circle cx="6" cy="4" r="2" />
          </g>

          {/* Fork — right edge */}
          <g transform="translate(815, 150) rotate(-22) scale(1.5)" stroke="#B45309" strokeWidth="2.5" opacity="0.11">
            <animateTransform attributeName="transform" type="translate" values="0,0; 0,-11; 0,0" keyTimes="0; 0.5; 1" calcMode="spline" keySplines="0.45 0 0.55 1; 0.45 0 0.55 1" dur="3.6s" begin="1.7s" repeatCount="indefinite" additive="sum" />
            <line x1="0" y1="0" x2="0" y2="28" />
            <line x1="-5" y1="0" x2="-5" y2="12" />
            <line x1="5" y1="0" x2="5" y2="12" />
            <line x1="-5" y1="12" x2="5" y2="12" />
            <line x1="0" y1="12" x2="0" y2="18" />
          </g>

          {/* Small star — bottom center */}
          <g transform="translate(676, 862) rotate(-8) scale(1.5)" stroke="#B45309" strokeWidth="2" opacity="0.10">
            <animateTransform attributeName="transform" type="translate" values="0,0; 0,-10; 0,0" keyTimes="0; 0.5; 1" calcMode="spline" keySplines="0.45 0 0.55 1; 0.45 0 0.55 1" dur="4.7s" begin="2.4s" repeatCount="indefinite" additive="sum" />
            <path d="M0 -9 L2.2 -3 L8.6 -2.8 L3.6 1.1 L5.3 7.3 L0 3.6 L-5.3 7.3 L-3.6 1.1 L-8.6 -2.8 L-2.2 -3 Z" />
          </g>

          {/* Leaf — bottom right */}
          <g transform="translate(895, 792) rotate(-28) scale(1.5)" stroke="#B45309" strokeWidth="2" opacity="0.11">
            <animateTransform attributeName="transform" type="translate" values="0,0; 0,-12; 0,0" keyTimes="0; 0.5; 1" calcMode="spline" keySplines="0.45 0 0.55 1; 0.45 0 0.55 1" dur="5.4s" begin="3.1s" repeatCount="indefinite" additive="sum" />
            <path d="M0 18 C-8 6 -6 -7 0 -14 C6 -7 8 6 0 18" />
            <line x1="0" y1="-14" x2="0" y2="18" />
          </g>

          {/* Spoon — bottom right */}
          <g transform="translate(824, 860) rotate(14) scale(1.5)" stroke="#B45309" strokeWidth="2" opacity="0.10">
            <animateTransform attributeName="transform" type="translate" values="0,0; 0,-9; 0,0" keyTimes="0; 0.5; 1" calcMode="spline" keySplines="0.45 0 0.55 1; 0.45 0 0.55 1" dur="4.1s" begin="0.9s" repeatCount="indefinite" additive="sum" />
            <ellipse cx="0" cy="0" rx="5" ry="7" />
            <line x1="0" y1="7" x2="0" y2="26" />
          </g>

          {/* Noodle wave — bottom center */}
          <g transform="translate(554, 876) rotate(-5) scale(1.6)" stroke="#B45309" strokeWidth="2" opacity="0.09">
            <animateTransform attributeName="transform" type="translate" values="0,0; 0,-11; 0,0" keyTimes="0; 0.5; 1" calcMode="spline" keySplines="0.45 0 0.55 1; 0.45 0 0.55 1" dur="5.6s" begin="1.6s" repeatCount="indefinite" additive="sum" />
            <path d="M-15 0 C-15 -8 -5 -8 -5 0 C-5 8 5 8 5 0 C5 -8 15 -8 15 0" />
          </g>
        </svg>
      </div>

      {/* ── Food photo — absolutely positioned ── */}
      <motion.div
        className="absolute inset-y-0 right-0 w-[520px] xl:w-[600px] 2xl:w-[660px] pointer-events-none"
        initial={{ opacity: 0, x: 220 }}
        animate={mounted ? { opacity: 1, x: 0 } : { opacity: 0, x: 220 }}
        transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: 0.05 }}
      >
        <Image
          src="/restaurant_kiosk_bg.png"
          alt="Arena Blanca food"
          fill
          className="object-contain object-right"
          sizes="(max-width: 1280px) 420px, 560px"
          priority
        />
        <div
          className="absolute -top-20 -right-20 w-56 h-56 rounded-full pointer-events-none opacity-90"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.18) 0%, rgba(249,115,22,0.06) 55%, transparent 70%)' }}
        />
      </motion.div>

      {/* ── Gradient bridge ── */}
      <div className="absolute inset-y-0 right-[370px] xl:right-[440px] 2xl:right-[490px] w-[220px] bg-gradient-to-r from-[#FEF7EE] to-transparent pointer-events-none" />

      {/* ── Center welcome area ── */}
      <main className="relative h-full flex flex-col items-center justify-center py-8 pl-48 xl:pl-64 pr-[500px] xl:pr-[580px] 2xl:pr-[640px]">
        <div className="w-full max-w-xl flex flex-col items-center text-center">

          {/* Logo */}
          <motion.div
            className="mb-5"
            variants={scaleIn}
            initial="hidden"
            animate={mounted ? 'show' : 'hidden'}
            custom={0}
          >
            <button onClick={handleLogoTap}>
              <Image
                src="/arenalogo.png"
                alt="Arena Blanca Resort"
                width={80}
                height={80}
                className="w-16 h-16 xl:w-20 xl:h-20 rounded-2xl object-contain shadow-xl"
              />
            </button>
          </motion.div>

          {/* Script "Welcome to" */}
          <motion.p
            className="text-2xl xl:text-3xl text-orange-500 mb-1 leading-none"
            style={{ fontFamily: "'Dancing Script', cursive", fontWeight: 600 }}
            variants={fadeUp}
            initial="hidden"
            animate={mounted ? 'show' : 'hidden'}
            custom={0.15}
          >
            Welcome to
          </motion.p>

          {/* Main heading */}
          <motion.h1
            className="text-5xl xl:text-6xl font-bold text-[#1A3D2B] leading-none mb-2"
            style={{ fontFamily: "'Playfair Display', serif" }}
            variants={fadeUp}
            initial="hidden"
            animate={mounted ? 'show' : 'hidden'}
            custom={0.25}
          >
            Arena Blanca Resort
          </motion.h1>

          <motion.h2
            className="text-xl xl:text-2xl font-semibold text-[#2D5A3D] mb-6"
            style={{ fontFamily: "'Playfair Display', serif" }}
            variants={fadeUp}
            initial="hidden"
            animate={mounted ? 'show' : 'hidden'}
            custom={0.35}
          >
            Restaurant & Dining
          </motion.h2>

          {/* Gold divider */}
          <motion.div
            className="flex items-center gap-3 mb-6"
            variants={dividerVariant}
            initial="hidden"
            animate={mounted ? 'show' : 'hidden'}
            style={{ transformOrigin: 'center' }}
          >
            <div className="w-12 h-px bg-amber-400/60" />
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <div className="w-12 h-px bg-amber-400/60" />
          </motion.div>

          {/* Brand highlights — 2×2 grid */}
          <div className="w-full grid grid-cols-2 gap-3 mb-8">
            {BRAND_HIGHLIGHTS.map(({ icon: Icon, label, desc }, index) => (
              <motion.div
                key={label}
                className="relative overflow-hidden flex items-center gap-3 px-4 py-4 rounded-2xl bg-orange-50/80 border border-orange-100/60"
                variants={fadeUp}
                initial="hidden"
                animate={mounted ? 'show' : 'hidden'}
                custom={0.5 + index * 0.08}
              >
                {/* Shine sweep */}
                <motion.div
                  className="absolute top-0 h-full w-2/5 pointer-events-none"
                  style={{ background: 'linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.55) 50%, transparent 75%)', skewX: -15 }}
                  initial={{ x: '-150%' }}
                  animate={mounted ? { x: '400%' } : { x: '-150%' }}
                  transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 3.5 + index * 0.5, ease: 'easeInOut', delay: 1.4 + index * 0.25 }}
                />
                <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-orange-500" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[13px] font-semibold text-stone-700 leading-tight">{label}</p>
                  <p className="text-[11px] text-stone-400 leading-tight mt-0.5">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div
            className="w-full flex items-center gap-3"
            variants={fadeUp}
            initial="hidden"
            animate={mounted ? 'show' : 'hidden'}
            custom={0.75}
          >
            <motion.button
              onClick={handleStartOrder}
              className={cn(
                'relative overflow-hidden flex items-center bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white pl-1.5 pr-1.5 py-1.5 rounded-full shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all duration-200',
                hasSideButtons ? 'flex-1' : 'w-full'
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              {/* Shine sweep */}
              <motion.div
                className="absolute top-0 h-full w-1/3 pointer-events-none"
                style={{ background: 'linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.4) 50%, transparent 75%)', skewX: -15 }}
                initial={{ x: '-150%' }}
                animate={mounted ? { x: '450%' } : { x: '-150%' }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut', delay: 2.0 }}
              />
              <div className="w-12 h-12 flex-shrink-0 rounded-full bg-white/20 flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <span className="flex-1 text-center text-[17px] font-bold tracking-wide pr-2">Start Your Order</span>
              <div className="w-12 h-12 flex-shrink-0 rounded-full bg-white/25 flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
            </motion.button>

            {/* Side action buttons — stacked when both present */}
            {hasSideButtons && (
              <div className="flex-shrink-0 flex flex-row gap-2">
                {showOrders && (
                  <button
                    onClick={() => handleNavigate('/menu?view=orders')}
                    className="flex flex-col items-center justify-center gap-1 bg-white border-2 border-orange-400 hover:bg-orange-50 active:scale-[0.97] text-orange-500 px-4 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 h-[56px] min-w-[64px] cursor-default"
                  >
                    <ClipboardList className="w-5 h-5" strokeWidth={2} />
                    <span className="text-[13px] font-semibold whitespace-nowrap">Orders</span>
                  </button>
                )}
                {showPayments && (
                  <button
                    onClick={() => handleNavigate('/menu?view=payments')}
                    className="flex flex-col items-center justify-center gap-1 bg-white border-2 border-orange-400 hover:bg-orange-50 active:scale-[0.97] text-orange-500 px-4 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 h-[56px] min-w-[64px] cursor-default"
                  >
                    <CreditCard className="w-5 h-5" strokeWidth={2} />
                    <span className="text-[13px] font-semibold whitespace-nowrap">Payments</span>
                  </button>
                )}
              </div>
            )}
          </motion.div>

          {/* Add to existing */}
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate={mounted ? 'show' : 'hidden'}
            custom={0.9}
          >
            <button
              onClick={() => handleNavigate('/add-items')}
              className="mt-4 inline-flex items-center gap-1.5 min-h-[44px] px-4 text-stone-400 hover:text-orange-500 text-sm font-medium transition-colors cursor-default active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 flex-shrink-0" strokeWidth={2.5} />
              <span>Add to Existing Order</span>
            </button>
          </motion.div>

        </div>
      </main>

      {/* Employee chip — top-right */}
      <div className="absolute top-5 right-6 z-20">
        {session ? (
          <button
            onClick={() => setSignOutDialogOpen(true)}
            title="Click to sign out"
            className="flex items-center gap-1.5 bg-white border border-orange-200 hover:border-orange-400 text-stone-700 pl-1.5 pr-3 py-1.5 rounded-full shadow-md hover:shadow-lg transition-all duration-200"
          >
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <UserCircle2 className="w-4 h-4 text-orange-500" strokeWidth={1.75} />
            </div>
            <span className="text-[13px] font-semibold text-stone-700 whitespace-nowrap">{session.full_name}</span>
            <RefreshCw className="w-3 h-3 text-stone-400 flex-shrink-0" strokeWidth={2} />
          </button>
        ) : (
          <button
            onClick={() => setPinDialogOpen(true)}
            title="Employee sign-in"
            className="flex items-center gap-1.5 bg-white border border-stone-200 hover:border-orange-300 text-stone-500 hover:text-orange-500 pl-1.5 pr-3 py-1.5 rounded-full shadow-md hover:shadow-lg transition-all duration-200"
          >
            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
              <UserCircle2 className="w-4 h-4 text-stone-400" strokeWidth={1.75} />
            </div>
            <span className="text-[13px] font-medium">Staff Sign-in</span>
          </button>
        )}
      </div>

      <KioskAdminOverlay isOpen={adminOverlayOpen} onClose={() => setAdminOverlayOpen(false)} />
      <EmployeePinDialog open={pinDialogOpen} onOpenChange={setPinDialogOpen} kioskType="restaurant" />
      <StaffSignOutDialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen} kioskType="restaurant" />
    </div>
  );
}
