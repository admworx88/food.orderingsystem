'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  UtensilsCrossed, Leaf, ChefHat, ArrowRight, Waves, Sparkles,
  UserCircle2, RefreshCw,
} from 'lucide-react';
import { KioskAdminOverlay } from '@/components/kiosk/kiosk-admin-overlay';
import { EmployeePinDialog } from '@/components/kiosk/employee-pin-dialog';
import { useStaffSessionStore } from '@/stores/staff-session-store';
import { cn } from '@/lib/utils';

interface KioskWelcomeClientProps {}

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
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  show: (delay: number = 0) => ({
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut', delay },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.82 },
  show: (delay: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.55, ease: [0.34, 1.4, 0.64, 1], delay },
  }),
};

const dividerVariant = {
  hidden: { opacity: 0, scaleX: 0 },
  show: {
    opacity: 1,
    scaleX: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.45 },
  },
};

export function KioskWelcomeClient(_props: KioskWelcomeClientProps) {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [adminOverlayOpen, setAdminOverlayOpen] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const { session, clearSession } = useStaffSessionStore();
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

  return (
    <div
      className={cn(
        'h-[100dvh] relative bg-[#FEF7EE] overflow-hidden transition-opacity duration-500',
        mounted ? 'opacity-100' : 'opacity-0'
      )}
    >
      {/* ── Food photo — absolutely positioned ── */}
      <motion.div
        className="absolute inset-y-0 right-0 w-[520px] xl:w-[600px] 2xl:w-[660px] pointer-events-none"
        initial={{ opacity: 0, x: 220 }}
        animate={mounted ? { opacity: 1, x: 0 } : { opacity: 0, x: 220 }}
        transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
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
      <main className="relative h-full flex flex-col items-center justify-center py-8 pl-24 xl:pl-32 pr-[500px] xl:pr-[580px] 2xl:pr-[640px]">
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
                className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-orange-50/80 border border-orange-100/60"
                variants={fadeUp}
                initial="hidden"
                animate={mounted ? 'show' : 'hidden'}
                custom={0.5 + index * 0.08}
              >
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
          <motion.button
            onClick={handleStartOrder}
            className="w-full flex items-center bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white pl-1.5 pr-1.5 py-1.5 rounded-full shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all duration-200"
            variants={fadeUp}
            initial="hidden"
            animate={mounted ? 'show' : 'hidden'}
            custom={0.75}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <div className="w-12 h-12 flex-shrink-0 rounded-full bg-white/20 flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <span className="flex-1 text-center text-[17px] font-bold tracking-wide pr-2">Start Your Order</span>
            {session ? (
              <div
                className="flex items-center gap-1.5 bg-white/20 rounded-full pl-2 pr-1 py-1 max-w-[140px]"
                onClick={(e) => { e.stopPropagation(); clearSession(); }}
                title="Click to change employee"
              >
                <UserCircle2 className="w-4 h-4 text-white flex-shrink-0" strokeWidth={1.75} />
                <span className="text-xs font-semibold text-white truncate">{session.full_name}</span>
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-3 h-3 text-white" strokeWidth={2} />
                </div>
              </div>
            ) : (
              <div
                className="w-12 h-12 flex-shrink-0 rounded-full bg-white/25 flex items-center justify-center"
                onClick={(e) => { e.stopPropagation(); setPinDialogOpen(true); }}
                title="Employee sign-in"
              >
                <ArrowRight className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
            )}
          </motion.button>

          {/* Add to existing */}
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate={mounted ? 'show' : 'hidden'}
            custom={0.9}
          >
            <Link
              href="/add-items"
              className="mt-4 inline-flex items-center gap-1.5 text-stone-400 hover:text-orange-500 text-sm font-medium transition-colors"
            >
              <span className="text-base font-bold leading-none">+</span>
              <span>Add to Existing Order</span>
            </Link>
          </motion.div>

        </div>
      </main>

      <KioskAdminOverlay isOpen={adminOverlayOpen} onClose={() => setAdminOverlayOpen(false)} />
      <EmployeePinDialog open={pinDialogOpen} onOpenChange={setPinDialogOpen} />
    </div>
  );
}
