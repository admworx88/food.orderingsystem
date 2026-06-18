'use client';

import { formatCurrency } from '@/lib/utils/currency';

interface CardPaymentProps {
  orderId: string;
  totalAmount: number;
  onPaymentComplete: (paymentId: string) => void;
}

/**
 * Card payment — digital gateway removed, pending replacement.
 */
export function CardPayment({ totalAmount }: CardPaymentProps) {
  return (
    <div className="space-y-4 text-center p-6">
      <div className="text-sm text-muted-foreground">Amount Due</div>
      <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Card payment gateway is not configured. Please contact your system administrator
        to set up a payment terminal integration.
      </div>
    </div>
  );
}
