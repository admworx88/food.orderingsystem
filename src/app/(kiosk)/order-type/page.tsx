'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight, BellRing, Delete } from 'lucide-react';
import { toast } from 'sonner';
import { useCartStore, type OrderType } from '@/stores/cart-store';
import { ORDER_TYPE_CONFIG } from '@/lib/constants/order-types';
import { useKioskLocation } from '@/hooks/use-kiosk-location';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { BurgerLoader } from '@/components/shared/burger-loader';

const ORDER_TYPE_IMAGES: Record<string, string> = {
  dine_in: '/dining.png',
  room_service: '/roomservice.png',
  takeout: '/takeout.png',
};

const fadeUp = (delay: number = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay },
});

export default function OrderTypePage() {
  const router = useRouter();
  const {
    orderType,
    setOrderType,
    tableNumber,
    setTableNumber,
    roomNumber,
    setRoomNumber,
  } = useCartStore();

  const { location } = useKioskLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);


  const handleOrderTypeSelect = useCallback((type: OrderType) => {
    setOrderType(type);
    const config = ORDER_TYPE_CONFIG[type];
    if (config.requiresTable || config.requiresRoom) {
      setDialogOpen(true);
    } else {
      setIsNavigating(true);
      router.push('/menu');
    }
  }, [setOrderType, router]);

  const needsTable = orderType ? ORDER_TYPE_CONFIG[orderType].requiresTable : false;
  const inputValue = needsTable ? (tableNumber || '') : (roomNumber || '');
  const inputPlaceholder = needsTable ? 'Enter your table number' : 'Enter your room number';
  const dialogTitle = needsTable ? 'Enter Your Table Number' : 'Enter Your Room Number';
  const dialogDescription = needsTable
    ? 'Please provide your table number so we can deliver your order.'
    : 'Please provide your room number for delivery.';

  const canContinue = inputValue.trim().length > 0;

  const handleNumPad = useCallback((digit: string) => {
    if (inputValue.length >= 4) return;
    const next = inputValue + digit;
    if (needsTable) setTableNumber(next);
    else setRoomNumber(next);
  }, [inputValue, needsTable, setTableNumber, setRoomNumber]);

  const handleBackspace = useCallback(() => {
    const next = inputValue.slice(0, -1);
    if (needsTable) setTableNumber(next);
    else setRoomNumber(next);
  }, [inputValue, needsTable, setTableNumber, setRoomNumber]);

  const handleContinue = useCallback(async () => {
    if (!canContinue) return;
    setDialogOpen(false);
    setIsNavigating(true);
    router.push('/menu');
  }, [canContinue, router]);

  const visibleTypes = Object.values(ORDER_TYPE_CONFIG).filter(
    (cfg) => location === 'restaurant' ? cfg.value !== 'ocean_view' : true
  );

  return (
    <>
    <BurgerLoader isLoading={isNavigating} message="Loading menu…" />
    <div className="h-full bg-[#FEF7EE] relative overflow-hidden flex flex-col">

      {/* ── Decorative background blobs ── */}
      <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-amber-200/25 blur-2xl pointer-events-none" />
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-orange-200/20 blur-2xl pointer-events-none" />

      {/* ── Background food photos — slide in from sides ── */}
      <motion.div
        className="absolute inset-y-0 left-0 w-[420px] xl:w-[500px] pointer-events-none opacity-60"
        initial={{ opacity: 0, x: -120 }}
        animate={{ opacity: 0.6, x: 0 }}
        transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
      >
        <Image
          src="/ordertype_bg_left.png"
          alt=""
          fill
          className="object-cover object-top"
          sizes="500px"
        />
      </motion.div>

      <motion.div
        className="absolute inset-y-0 right-0 w-[420px] xl:w-[500px] pointer-events-none opacity-60"
        initial={{ opacity: 0, x: 120 }}
        animate={{ opacity: 0.6, x: 0 }}
        transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
      >
        <Image
          src="/ordertype_bg_right.png"
          alt=""
          fill
          className="object-cover object-top"
          sizes="500px"
        />
      </motion.div>

      {/* ── Main content ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center pb-12 px-4 sm:px-8 xl:px-12 overflow-y-auto scrollbar-hide">

        {/* Back button */}
        <motion.div
          className="absolute top-4 left-6 xl:top-6 xl:left-8"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 bg-[#FEF3E2] hover:bg-[#FDECD4] active:scale-[0.97] text-stone-700 hover:text-stone-900 px-6 py-3 rounded-full shadow-sm border border-orange-100/60 text-base font-semibold transition-all"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
            Back
          </Link>
        </motion.div>

        {/* Heading */}
        <div className="text-center mb-5 sm:mb-8 xl:mb-10">
          <motion.div
            className="flex items-center justify-center gap-3 mb-2"
            {...fadeUp(0.1)}
          >
            <div className="w-8 h-px bg-orange-400/60" />
            <p
              className="text-3xl xl:text-4xl text-orange-500 leading-none"
              style={{ fontFamily: "'Dancing Script', cursive", fontWeight: 600 }}
            >
              Welcome!
            </p>
            <div className="w-8 h-px bg-orange-400/60" />
          </motion.div>

          <motion.h1
            className="text-3xl xl:text-4xl 2xl:text-5xl font-extrabold text-[#1C1917] tracking-tight mb-2"
            {...fadeUp(0.2)}
          >
            How would you like to order?
          </motion.h1>

          <motion.p
            className="text-stone-400 text-base font-medium"
            {...fadeUp(0.28)}
          >
            Choose your dining experience
          </motion.p>
        </div>

        {/* Order type cards */}
        <div className={cn(
          'grid gap-3 sm:gap-4 xl:gap-5 w-full',
          visibleTypes.length === 3
            ? 'grid-cols-3 max-w-xl sm:max-w-2xl xl:max-w-3xl'
            : 'grid-cols-2 max-w-lg sm:max-w-xl xl:max-w-2xl'
        )}>
          {visibleTypes.map((config, index) => {
            const imgSrc = ORDER_TYPE_IMAGES[config.value];
            return (
              <motion.button
                key={config.value}
                onClick={() => handleOrderTypeSelect(config.value)}
                className="group flex flex-col items-center bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl pt-4 pb-5 px-3 sm:pt-5 sm:pb-6 sm:px-4 border border-stone-200/60 shadow-sm hover:shadow-lg active:scale-[0.97] transition-all duration-200"
                initial={{ opacity: 0, y: 36 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.35 + index * 0.1,
                }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.97 }}
              >
                {/* Circular illustration */}
                <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 xl:w-48 xl:h-48 rounded-full bg-[#F8EDD8] flex items-center justify-center mb-3 sm:mb-4 flex-shrink-0">
                  {imgSrc ? (
                    <Image
                      src={imgSrc}
                      alt={config.label}
                      width={160}
                      height={160}
                      className="object-contain w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 xl:w-40 xl:h-40"
                    />
                  ) : (
                    <span className="text-3xl sm:text-4xl xl:text-5xl">{config.icon}</span>
                  )}
                </div>

                {/* Orange accent line */}
                <div className="w-6 sm:w-8 h-0.5 bg-orange-500 rounded-full mb-2 sm:mb-3" />

                {/* Label */}
                <h3 className="text-base sm:text-lg xl:text-2xl font-bold text-[#1C1917] mb-1.5 sm:mb-2 leading-tight">
                  {config.label}
                </h3>

                {/* Description */}
                <p className="text-stone-400 text-xs sm:text-sm text-center leading-relaxed mb-4 sm:mb-5 min-h-[2rem] sm:min-h-[2.5rem]">
                  {config.description}
                </p>

                {/* Arrow button */}
                <div className={cn(
                  'w-11 h-11 sm:w-14 sm:h-14 xl:w-16 xl:h-16 rounded-full flex items-center justify-center transition-all duration-200',
                  'bg-[#F8EDD8] group-hover:bg-orange-500'
                )}>
                  <ArrowRight
                    className="w-5 h-5 sm:w-7 sm:h-7 xl:w-8 xl:h-8 text-orange-500 group-hover:text-white transition-colors duration-200"
                    strokeWidth={2.5}
                  />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Call Staff — bottom left ── */}
      <motion.button
        onClick={() => toast.success('Staff has been notified!', { duration: 3000 })}
        className="absolute bottom-6 left-6 z-20 flex items-center gap-2.5 bg-stone-800 hover:bg-stone-700 active:scale-[0.97] text-white pl-1.5 pr-5 py-1.5 rounded-full shadow-lg transition-all"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.65 }}
      >
        <div className="w-9 h-9 rounded-full bg-stone-700 flex items-center justify-center flex-shrink-0">
          <BellRing className="w-4 h-4 text-white" strokeWidth={2} />
        </div>
        <span className="text-sm font-semibold">Call Staff</span>
      </motion.button>

      {/* ── Table/Room Number Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          showCloseButton
          className="max-w-sm rounded-2xl border-stone-200 p-5 sm:p-6"
        >
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-stone-800 tracking-tight">
              {dialogTitle}
            </DialogTitle>
            <DialogDescription className="text-sm text-stone-500">
              {dialogDescription}
            </DialogDescription>
          </DialogHeader>

          {/* Number display */}
          <div className="mt-3 h-20 flex items-center justify-center rounded-xl border-2 border-amber-400 bg-amber-50/40 select-none">
            {inputValue ? (
              <span className="text-6xl font-bold text-stone-900 tabular-nums tracking-tight">
                {inputValue}
              </span>
            ) : (
              <span className="text-lg font-normal text-stone-300">{inputPlaceholder}</span>
            )}
          </div>

          {/* Number pad */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {['1','2','3','4','5','6','7','8','9'].map((digit) => (
              <button
                key={digit}
                onClick={() => handleNumPad(digit)}
                className="h-14 rounded-xl bg-stone-100 hover:bg-amber-50 active:bg-amber-100 active:scale-95 text-2xl font-bold text-stone-800 transition-all duration-100 border border-stone-200"
              >
                {digit}
              </button>
            ))}
            {/* Bottom row */}
            <button
              onClick={handleBackspace}
              className="h-14 rounded-xl bg-stone-100 hover:bg-red-50 active:bg-red-100 active:scale-95 transition-all duration-100 border border-stone-200 flex items-center justify-center"
              aria-label="Backspace"
            >
              <Delete className="w-5 h-5 text-stone-500" strokeWidth={2} />
            </button>
            <button
              onClick={() => handleNumPad('0')}
              className="h-14 rounded-xl bg-stone-100 hover:bg-amber-50 active:bg-amber-100 active:scale-95 text-2xl font-bold text-stone-800 transition-all duration-100 border border-stone-200"
            >
              0
            </button>
            <div />
          </div>

          {/* Continue button */}
          <button
            onClick={() => handleContinue()}
            disabled={!canContinue}
            className={cn(
              'mt-3 w-full inline-flex items-center justify-center gap-2',
              'bg-gradient-to-r from-orange-500 to-orange-600 text-white',
              'px-8 py-4 rounded-xl',
              'text-base font-bold',
              'shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40',
              'hover:scale-[1.02] active:scale-[0.98] transition-all',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100',
            )}
          >
            <span>Continue to Menu</span><ChevronRight className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
