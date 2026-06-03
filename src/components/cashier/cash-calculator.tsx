'use client';

import { useState, useCallback } from 'react';
import { Delete, Check, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { CASH_QUICK_AMOUNTS } from '@/lib/constants/payment-methods';
import { cn } from '@/lib/utils';

interface CashCalculatorProps {
  totalAmount: number;
  originalAmount?: number;
  onConfirm: (amountTendered: number) => void;
  isProcessing: boolean;
}

export function CashCalculator({ totalAmount, originalAmount, onConfirm, isProcessing }: CashCalculatorProps) {
  const [inputValue, setInputValue] = useState('');

  const amountTendered = parseFloat(inputValue) || 0;
  const changeAmount = amountTendered - totalAmount;
  const isValid = amountTendered >= totalAmount;

  const appendDigit = useCallback((digit: string) => {
    setInputValue((prev) => {
      if (digit === '.' && prev.includes('.')) return prev;
      if (prev.includes('.') && prev.split('.')[1].length >= 2) return prev;
      if (prev.length >= 10) return prev;
      return prev + digit;
    });
  }, []);

  const backspace = useCallback(() => setInputValue((prev) => prev.slice(0, -1)), []);
  const clear = useCallback(() => setInputValue(''), []);
  const selectQuickAmount = useCallback((amount: number) => setInputValue(amount.toString()), []);

  const handleConfirm = useCallback(() => {
    if (isValid && !isProcessing) onConfirm(amountTendered);
  }, [isValid, isProcessing, amountTendered, onConfirm]);

  return (
    <div className="flex flex-col h-full bg-[#FAF7F2]">

      {/* ── Main row: displays + numpad ── */}
      <div className="flex flex-1 min-h-0 gap-0">

        {/* Left: amount cards + quick select */}
        <div className="flex-1 flex flex-col gap-3 p-5 min-w-0">

          {/* Amount Due */}
          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600/70 mb-1">Amount Due</p>
            {originalAmount && originalAmount > totalAmount && (
              <p className="text-[16px] font-bold text-emerald-500/60 tabular-nums line-through leading-none mb-0.5">
                {formatCurrency(originalAmount)}
              </p>
            )}
            <p className="text-[30px] font-black text-emerald-700 tabular-nums leading-none">
              {formatCurrency(totalAmount)}
            </p>
          </div>

          {/* Cash Tendered */}
          <div className={cn(
            'rounded-2xl px-4 py-3 border transition-colors duration-150',
            inputValue ? 'bg-orange-50 border-orange-200' : 'bg-white border-stone-200'
          )}>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-400 mb-1">Cash Tendered</p>
            <p className={cn(
              'text-[30px] font-black tabular-nums leading-none transition-colors duration-150',
              inputValue ? 'text-orange-600' : 'text-stone-300'
            )}>
              {inputValue ? formatCurrency(amountTendered) : '₱0.00'}
            </p>
          </div>

          {/* Change */}
          <div className={cn(
            'rounded-2xl px-4 py-3 border transition-colors duration-150',
            isValid ? 'bg-blue-50 border-blue-100' : 'bg-white border-stone-100'
          )}>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-400 mb-1">Change</p>
            <p className={cn(
              'text-[26px] font-black tabular-nums leading-none transition-colors duration-150',
              isValid ? 'text-blue-600' : 'text-stone-300'
            )}>
              {isValid ? formatCurrency(changeAmount) : '—'}
            </p>
          </div>

          {/* Quick select */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-400 mb-2">Quick Select</p>
            <div className="grid grid-cols-3 gap-1.5">
              {CASH_QUICK_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => selectQuickAmount(amount)}
                  className="h-9 rounded-xl bg-white border border-stone-200 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 text-[12px] font-bold text-stone-600 transition-all duration-150 active:scale-95 shadow-sm"
                >
                  {formatCurrency(amount)}
                </button>
              ))}
              <button
                onClick={() => selectQuickAmount(Math.ceil(totalAmount))}
                className="col-span-3 h-9 rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-400 hover:bg-emerald-50 text-[12px] font-bold text-emerald-600 transition-all duration-150 active:scale-95"
              >
                Exact · {formatCurrency(totalAmount)}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Numpad */}
        <div className="w-[260px] flex-shrink-0 p-4 border-l border-stone-200 flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((key) => (
              <button
                key={key}
                onClick={() => appendDigit(key)}
                className="h-[64px] rounded-2xl bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 active:scale-95 active:bg-stone-100 text-[26px] font-bold text-stone-800 transition-all duration-100 shadow-sm"
              >
                {key}
              </button>
            ))}
            <button
              onClick={() => appendDigit('.')}
              className="h-[64px] rounded-2xl bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 active:scale-95 text-[26px] font-bold text-stone-800 transition-all duration-100 shadow-sm"
            >
              .
            </button>
            <button
              onClick={() => appendDigit('0')}
              className="h-[64px] rounded-2xl bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 active:scale-95 text-[26px] font-bold text-stone-800 transition-all duration-100 shadow-sm"
            >
              0
            </button>
            <button
              onClick={backspace}
              className="h-[64px] rounded-2xl bg-white border border-stone-200 hover:border-red-200 hover:bg-red-50 active:scale-95 text-stone-400 hover:text-red-500 transition-all duration-100 flex items-center justify-center shadow-sm"
              aria-label="Backspace"
            >
              <Delete className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Action row ── */}
      <div className="flex gap-2 px-4 pb-4 pt-3 flex-shrink-0 border-t border-stone-200 bg-white">
        <button
          onClick={clear}
          className="h-12 px-5 rounded-2xl border-2 border-stone-200 hover:border-stone-300 text-[14px] font-bold text-stone-500 hover:text-stone-700 transition-all duration-150 flex-shrink-0"
        >
          Clear
        </button>
        <button
          onClick={handleConfirm}
          disabled={!isValid || isProcessing}
          className={cn(
            'flex-1 h-12 rounded-2xl text-[15px] font-black transition-all duration-150 flex items-center justify-center gap-2',
            isValid && !isProcessing
              ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white shadow-lg shadow-emerald-500/25'
              : 'bg-stone-100 text-stone-300 cursor-not-allowed'
          )}
        >
          {isProcessing ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Processing…</>
          ) : (
            <><Check className="w-4 h-4" strokeWidth={3} />Confirm Payment</>
          )}
        </button>
      </div>
    </div>
  );
}
