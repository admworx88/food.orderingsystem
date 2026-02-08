'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/currency';
import { createGcashPayment } from '@/services/payment-service';
import { toast } from 'sonner';

interface GcashPaymentProps {
  orderId: string;
  totalAmount: number;
  onPaymentComplete: (paymentId: string) => void;
}

/**
 * GCash payment flow: initiate source, show checkout URL,
 * wait for realtime confirmation via webhook.
 */
export function GcashPayment({
  orderId,
  totalAmount,
  onPaymentComplete,
}: GcashPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  async function handleInitiate() {
    setIsLoading(true);
    const result = await createGcashPayment({ orderId, method: 'gcash' });
    setIsLoading(false);

    if (result.success) {
      setCheckoutUrl(result.data.checkoutUrl);
      // Open checkout URL in new window
      window.open(result.data.checkoutUrl, '_blank');
    } else {
      toast.error(result.error);
    }
  }

  if (checkoutUrl) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-lg font-semibold">Waiting for GCash Payment...</div>
        <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
        <p className="text-sm text-muted-foreground">
          A GCash checkout window has been opened.
          The payment will be confirmed automatically.
        </p>
        <div className="flex animate-pulse items-center justify-center gap-2 text-blue-600">
          <div className="h-2 w-2 rounded-full bg-blue-600" />
          <span className="text-sm">Listening for payment confirmation...</span>
        </div>
        <Button
          variant="outline"
          onClick={() => window.open(checkoutUrl, '_blank')}
        >
          Re-open GCash Checkout
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <div className="text-sm text-muted-foreground">Amount Due</div>
      <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
      <Button
        className="w-full"
        onClick={handleInitiate}
        disabled={isLoading}
      >
        {isLoading ? 'Initiating...' : 'Pay with GCash'}
      </Button>
    </div>
  );
}
