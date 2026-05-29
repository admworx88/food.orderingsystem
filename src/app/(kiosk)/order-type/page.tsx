'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight, BellRing } from 'lucide-react';
import { useCartStore, type OrderType } from '@/stores/cart-store';
import { ORDER_TYPE_CONFIG } from '@/lib/constants/order-types';
import { useKioskLocation } from '@/hooks/use-kiosk-location';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const ORDER_TYPE_IMAGES: Record<string, string> = {
  dine_in: '/dining.png',
  room_service: '/roomservice.png',
  takeout: '/takeout.png',
};

const fadeUp = (delay: number = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay },
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

  const handleOrderTypeSelect = useCallback((type: OrderType) => {
    setOrderType(type);
    const config = ORDER_TYPE_CONFIG[type];
    if (config.requiresTable || config.requiresRoom) {
      setDialogOpen(true);
    } else {
      router.push('/menu');
    }
  }, [setOrderType, router]);

  const needsTable = orderType ? ORDER_TYPE_CONFIG[orderType].requiresTable : false;
  const needsRoom = orderType ? ORDER_TYPE_CONFIG[orderType].requiresRoom : false;
  const inputValue = needsTable ? (tableNumber || '') : (roomNumber || '');
  const inputLabel = needsTable ? 'Table Number' : 'Room Number';
  const inputPlaceholder = needsTable ? 'Enter your table number' : 'Enter your room number';
  const dialogTitle = needsTable ? 'Enter Your Table Number' : 'Enter Your Room Number';
  const dialogDescription = needsTable
    ? 'Please provide your table number so we can deliver your order.'
    : 'Please provide your room number for delivery.';

  const canContinue = inputValue.trim().length > 0;

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (needsTable) setTableNumber(e.target.value);
    else setRoomNumber(e.target.value);
  }, [needsTable, setTableNumber, setRoomNumber]);

  const handleContinue = useCallback(() => {
    if (canContinue) { setDialogOpen(false); router.push('/menu'); }
  }, [canContinue, router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && canContinue) handleContinue();
  }, [canContinue, handleContinue]);

  const visibleTypes = Object.values(ORDER_TYPE_CONFIG).filter(
    (cfg) => location === 'restaurant' ? cfg.value !== 'ocean_view' : true
  );

  return (
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
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center pb-16 px-8 xl:px-12">

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
        <div className="text-center mb-8 xl:mb-10">
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
          'grid gap-4 xl:gap-5 w-full',
          visibleTypes.length === 3 ? 'grid-cols-3 max-w-3xl' : 'grid-cols-2 max-w-2xl'
        )}>
          {visibleTypes.map((config, index) => {
            const imgSrc = ORDER_TYPE_IMAGES[config.value];
            return (
              <motion.button
                key={config.value}
                onClick={() => handleOrderTypeSelect(config.value)}
                className="group flex flex-col items-center bg-white/70 backdrop-blur-sm rounded-3xl pt-5 pb-6 px-4 border border-stone-200/60 shadow-sm hover:shadow-lg active:scale-[0.97] transition-all duration-200"
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
                <div className="w-48 h-48 xl:w-52 xl:h-52 rounded-full bg-[#F8EDD8] flex items-center justify-center mb-4 flex-shrink-0">
                  {imgSrc ? (
                    <Image
                      src={imgSrc}
                      alt={config.label}
                      width={160}
                      height={160}
                      className="object-contain w-40 h-40 xl:w-44 xl:h-44"
                    />
                  ) : (
                    <span className="text-5xl">{config.icon}</span>
                  )}
                </div>

                {/* Orange accent line */}
                <div className="w-8 h-0.5 bg-orange-500 rounded-full mb-3" />

                {/* Label */}
                <h3 className="text-xl xl:text-2xl font-bold text-[#1C1917] mb-2 leading-tight">
                  {config.label}
                </h3>

                {/* Description */}
                <p className="text-stone-400 text-sm text-center leading-relaxed mb-5 min-h-[2.5rem]">
                  {config.description}
                </p>

                {/* Arrow button */}
                <div className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200',
                  'bg-[#F8EDD8] group-hover:bg-orange-500'
                )}>
                  <ArrowRight
                    className="w-8 h-8 text-orange-500 group-hover:text-white transition-colors duration-200"
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
          className="max-w-md sm:max-w-lg rounded-2xl border-stone-200 p-6 sm:p-8"
        >
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-stone-800 tracking-tight">
              {dialogTitle}
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base text-stone-500">
              {dialogDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 sm:mt-4">
            <Input
              id="location-input"
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={inputPlaceholder}
              className="h-28 sm:h-36 !py-0 flex items-center text-7xl sm:text-8xl lg:text-9xl font-bold text-center rounded-xl border-stone-300 focus-visible:border-amber-500 focus-visible:ring-amber-500/30 placeholder:text-stone-300 placeholder:text-2xl placeholder:font-normal leading-[7rem] sm:leading-[9rem]"
              autoFocus
            />
          </div>

          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className={cn(
              'mt-4 sm:mt-6 w-full inline-flex items-center justify-center gap-2 sm:gap-3',
              'bg-gradient-to-r from-orange-500 to-orange-600 text-white',
              'px-8 py-4 sm:py-5 rounded-xl sm:rounded-2xl',
              'text-base sm:text-lg font-bold',
              'shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40',
              'hover:scale-[1.02] active:scale-[0.98] transition-all',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100',
            )}
          >
            <span>Continue to Menu</span>
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
