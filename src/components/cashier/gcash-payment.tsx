'use client';

import { formatCurrency } from '@/lib/utils/currency';

interface GcashPaymentProps {
  orderId: string;
  totalAmount: number;
  onPaymentComplete: (paymentId: string) => void;
}

/**
 * GCash payment — digital gateway removed, pending replacement.
 * Use ManualEwalletPayment tab to record a GCash reference number manually.
 */
export function GcashPayment({ totalAmount }: GcashPaymentProps) {
  return (
    <div className="space-y-4 text-center p-6">
      <div className="text-sm text-muted-foreground">Amount Due</div>
      <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Digital payment gateway is not configured. Use the <strong>Manual GCash</strong> option
        to enter a reference number instead.
      </div>
    </div>
  );
}
