'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/currency';
import { createCardPaymentIntent } from '@/services/payment-service';
import { toast } from 'sonner';

interface CardPaymentProps {
  orderId: string;
  totalAmount: number;
  onPaymentComplete: (paymentId: string) => void;
}

/**
 * Card payment flow: create payment intent, display instructions
 * for 3DS completion, wait for webhook confirmation.
 */
export function CardPayment({
  orderId,
  totalAmount,
  onPaymentComplete,
}: CardPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [clientKey, setClientKey] = useState<string | null>(null);

  async function handleInitiate() {
    setIsLoading(true);
    const result = await createCardPaymentIntent({ orderId, method: 'card' });
    setIsLoading(false);

    if (result.success) {
      setClientKey(result.data.clientKey);
      // In full implementation, mount PayMongo card form using clientKey
    } else {
      toast.error(result.error);
    }
  }

  if (clientKey) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-lg font-semibold">Card Payment In Progress</div>
        <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
        <p className="text-sm text-muted-foreground">
          Please complete the card payment in the terminal.
          The payment will be confirmed automatically via webhook.
        </p>
        <div className="flex animate-pulse items-center justify-center gap-2 text-blue-600">
          <div className="h-2 w-2 rounded-full bg-blue-600" />
          <span className="text-sm">Waiting for card authorization...</span>
        </div>
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
        {isLoading ? 'Initiating...' : 'Pay with Card'}
      </Button>
    </div>
  );
}
