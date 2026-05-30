'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Loader2, Check, Landmark } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { processManualEwalletPayment } from '@/services/payment-service';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type EwalletMethod = 'gcash' | 'gotyme' | 'maya' | 'other_banks';

interface ManualEwalletPaymentProps {
  orderId: string;
  totalAmount: number;
  method: EwalletMethod;
  cashierId: string;
  onPaymentComplete: (paymentId: string) => void;
}

const METHOD_META: Record<EwalletMethod, { label: string; logo?: string }> = {
  gcash: { label: 'GCash', logo: '/payments/GCash_Logo.png' },
  gotyme: { label: 'GoTyme', logo: '/payments/gotyme.jpg' },
  maya: { label: 'Maya', logo: '/payments/maya.jpg' },
  other_banks: { label: 'Other Banks' },
};

export function ManualEwalletPayment({
  orderId,
  totalAmount,
  method,
  cashierId,
  onPaymentComplete,
}: ManualEwalletPaymentProps) {
  const [referenceNumber, setReferenceNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const meta = METHOD_META[method];

  async function handleConfirm() {
    if (!referenceNumber.trim() || isProcessing) return;

    setIsProcessing(true);
    const result = await processManualEwalletPayment({
      orderId,
      method,
      referenceNumber: referenceNumber.trim(),
      cashierId,
    });
    setIsProcessing(false);

    if (result.success) {
      toast.success(`${meta.label} payment confirmed`);
      onPaymentComplete(result.data.paymentId);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#FAF7F2]">
      <div className="flex flex-col items-center gap-6 flex-1 justify-center px-10 py-8">
        {/* Logo / Icon */}
        {meta.logo ? (
          <div className="w-28 h-28 rounded-3xl overflow-hidden shadow-md border border-stone-200 bg-white flex items-center justify-center">
            <Image
              src={meta.logo}
              alt={meta.label}
              width={112}
              height={112}
              className="object-contain w-full h-full"
            />
          </div>
        ) : (
          <div className="w-28 h-28 rounded-3xl bg-stone-100 border border-stone-200 flex items-center justify-center shadow-sm">
            <Landmark className="w-12 h-12 text-stone-400" strokeWidth={1.5} />
          </div>
        )}

        {/* Amount */}
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-400 mb-2">
            Amount Due
          </p>
          <p className="text-[42px] font-black text-emerald-700 tabular-nums leading-none">
            {formatCurrency(totalAmount)}
          </p>
        </div>

        {/* Reference number input */}
        <div className="w-full max-w-[340px] space-y-2">
          <label htmlFor="ref-number" className="block text-[11px] font-bold uppercase tracking-[0.12em] text-stone-400">
            Reference Number
          </label>
          <input
            id="ref-number"
            type="text"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            placeholder="Enter transaction reference"
            className="w-full h-13 px-5 py-3.5 rounded-2xl border-2 border-stone-200 bg-white text-stone-800 font-semibold text-[15px] focus:outline-none focus:border-emerald-400 transition-colors placeholder:text-stone-300"
          />
        </div>
      </div>

      {/* Confirm button */}
      <div className="flex gap-3 px-8 pb-8 pt-5 flex-shrink-0 border-t border-stone-200 bg-white">
        <button
          onClick={handleConfirm}
          disabled={!referenceNumber.trim() || isProcessing}
          className={cn(
            'flex-1 h-13 py-3.5 rounded-2xl text-[15px] font-black transition-all duration-150 flex items-center justify-center gap-2',
            referenceNumber.trim() && !isProcessing
              ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white shadow-lg shadow-emerald-500/25'
              : 'bg-stone-100 text-stone-300 cursor-not-allowed'
          )}
        >
          {isProcessing ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Processing…</>
          ) : (
            <><Check className="w-4 h-4" strokeWidth={3} />Confirm {meta.label} Payment</>
          )}
        </button>
      </div>
    </div>
  );
}
