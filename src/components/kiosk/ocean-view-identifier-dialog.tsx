'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Hash, User, ArrowRight, Delete } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface OceanViewIdentifierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (tableNumber: string | null, guestName: string | null) => void;
}

type Mode = 'table' | 'name';

export function OceanViewIdentifierDialog({
  open,
  onOpenChange,
  onConfirm,
}: OceanViewIdentifierDialogProps) {
  const [mode, setMode] = useState<Mode>('table');
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInputValue('');
    }
  }, [open]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInputValue('');
    if (open && mode === 'name') setTimeout(() => inputRef.current?.focus(), 50);
  }, [mode, open]);

  const canContinue = inputValue.trim().length > 0;

  const handleConfirm = () => {
    if (!canContinue || loading) return;
    setLoading(true);
    onConfirm(
      mode === 'table' ? inputValue.trim() : null,
      mode === 'name'  ? inputValue.trim() : null,
    );
  };

  const handleNumPad = (digit: string) => {
    if (inputValue.length >= 4) return;
    setInputValue((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setInputValue((prev) => prev.slice(0, -1));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') onOpenChange(false);
  };

  if (!open) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
        <div className="flex flex-col items-center gap-3 bg-white rounded-2xl px-10 py-8">
          <Image src="/burger-loading-white.gif" alt="Loading…" width={120} height={120} unoptimized />
          <p className="text-stone-600 text-sm font-semibold tracking-wide">Loading menu…</p>
        </div>
      </div>
    );
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.60)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
    >
      {/* Dialog card */}
      <div className="relative w-full max-w-md bg-[#FEFCF9] rounded-3xl shadow-2xl overflow-hidden animate-scale-in">

        {/* Top brand stripe */}
        <div className="h-1 bg-gradient-to-r from-[#1A3D2B] via-orange-500 to-[#1A3D2B]" />

        {/* Close */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-stone-500" strokeWidth={2} />
        </button>

        <div className="px-6 pt-6 pb-7">
          {/* Heading */}
          <h2
            className="text-xl font-bold text-stone-800 mb-1"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Before You Start
          </h2>
          <p className="text-sm text-stone-500 mb-5 leading-relaxed">
            Help us identify your order. Enter your table number or your name.
          </p>

          {/* Mode toggle — segmented */}
          <div className="flex bg-stone-100 rounded-2xl p-1 mb-5 gap-1">
            {([
              { id: 'table', Icon: Hash,  label: 'Table Number' },
              { id: 'name',  Icon: User,  label: 'My Name'      },
            ] as { id: Mode; Icon: typeof Hash; label: string }[]).map(({ id, Icon, label }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2.5 py-4 text-base font-semibold rounded-xl transition-all duration-200',
                  mode === id
                    ? 'bg-white text-stone-800 shadow-sm'
                    : 'text-stone-500 hover:text-stone-700'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
                {label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="mb-4">
            {mode === 'table' ? (
              <>
                {/* Number display */}
                <div className="h-[72px] flex items-center justify-center rounded-2xl border-2 border-orange-400 bg-orange-50/30 select-none mb-3">
                  {inputValue ? (
                    <span className="text-5xl font-bold text-stone-900 tabular-nums tracking-tight">
                      {inputValue}
                    </span>
                  ) : (
                    <span className="text-base font-normal text-stone-400">e.g. 5 or A3</span>
                  )}
                </div>

                {/* Number pad */}
                <div className="grid grid-cols-3 gap-2">
                  {['1','2','3','4','5','6','7','8','9'].map((digit) => (
                    <button
                      key={digit}
                      onClick={() => handleNumPad(digit)}
                      className="h-12 rounded-xl bg-stone-100 hover:bg-orange-50 active:bg-orange-100 active:scale-95 text-xl font-bold text-stone-800 transition-all duration-100 border border-stone-200"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    onClick={handleBackspace}
                    className="h-12 rounded-xl bg-stone-100 hover:bg-red-50 active:bg-red-100 active:scale-95 transition-all duration-100 border border-stone-200 flex items-center justify-center"
                    aria-label="Backspace"
                  >
                    <Delete className="w-5 h-5 text-stone-500" strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => handleNumPad('0')}
                    className="h-12 rounded-xl bg-stone-100 hover:bg-orange-50 active:bg-orange-100 active:scale-95 text-xl font-bold text-stone-800 transition-all duration-100 border border-stone-200"
                  >
                    0
                  </button>
                  <div />
                </div>

                <p className="text-xs text-stone-400 mt-2 px-1">Enter the number on your table stand.</p>
              </>
            ) : (
              <>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. Juan dela Cruz"
                  className={cn(
                    'w-full px-5 h-[72px] text-lg text-stone-800 bg-white rounded-2xl',
                    'border-2 placeholder:text-stone-400 transition-all duration-150',
                    'focus:outline-none',
                    canContinue
                      ? 'border-orange-400 focus:ring-2 focus:ring-orange-400/30'
                      : 'border-stone-200 focus:border-orange-300 focus:ring-2 focus:ring-orange-300/20'
                  )}
                  autoCapitalize="words"
                  autoComplete="off"
                />
                <p className="text-xs text-stone-400 mt-2 px-1">We&apos;ll call your name when your order is ready.</p>
              </>
            )}
          </div>

          {/* CTA */}
          <button
            onClick={handleConfirm}
            disabled={!canContinue || loading}
            className={cn(
              'w-full h-14 flex items-center justify-center gap-2.5 text-base font-bold rounded-2xl transition-all duration-200 active:scale-[0.98]',
              canContinue && !loading
                ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            )}
          >
            {loading
              ? <span className="w-5 h-5 border-2 border-stone-300 border-t-stone-500 rounded-full animate-spin" />
              : <><span>Continue to Menu</span><ArrowRight className="w-5 h-5" strokeWidth={2.5} /></>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
