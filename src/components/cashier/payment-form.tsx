'use client';

import { useState } from 'react';
import { Banknote, Smartphone, CreditCard, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CashCalculator } from './cash-calculator';
import { GcashPayment } from './gcash-payment';
import { CardPayment } from './card-payment';
import type { CashierOrder } from '@/types/payment';

interface PaymentFormProps {
  order: CashierOrder;
  onPaymentComplete: (paymentId: string, changeGiven?: number) => void;
  isPayMongoEnabled: boolean;
  cashierId: string;
}

type PaymentTab = 'cash' | 'gcash' | 'card';

/**
 * Payment form - Terminal Command Center theme
 */
export function PaymentForm({
  order,
  onPaymentComplete,
  isPayMongoEnabled,
  cashierId,
}: PaymentFormProps) {
  const [activeTab, setActiveTab] = useState<PaymentTab>('cash');
  const isExpired = order.expires_at && new Date(order.expires_at) < new Date();

  if (isExpired) {
    return (
      <div className="pos-payment-section">
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--pos-red-glow)] flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-[var(--pos-red)]" />
          </div>
          <p className="text-lg font-semibold text-[var(--pos-red)]">Order Expired</p>
          <p className="mt-2 text-sm text-[var(--pos-text-muted)]">
            This order has passed the 15-minute payment window.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pos-payment-section">
      {/* Payment method tabs */}
      <div className="pos-payment-tabs">
        <button
          onClick={() => setActiveTab('cash')}
          className={cn(
            'pos-payment-tab',
            activeTab === 'cash' && 'pos-payment-tab-active'
          )}
        >
          <Banknote className="w-4 h-4 inline mr-2" />
          Cash
        </button>

        {isPayMongoEnabled && (
          <>
            <button
              onClick={() => setActiveTab('gcash')}
              className={cn(
                'pos-payment-tab',
                activeTab === 'gcash' && 'pos-payment-tab-active'
              )}
            >
              <Smartphone className="w-4 h-4 inline mr-2" />
              GCash
            </button>

            <button
              onClick={() => setActiveTab('card')}
              className={cn(
                'pos-payment-tab',
                activeTab === 'card' && 'pos-payment-tab-active'
              )}
            >
              <CreditCard className="w-4 h-4 inline mr-2" />
              Card
            </button>
          </>
        )}
      </div>

      {/* Payment content */}
      <div>
        {activeTab === 'cash' && (
          <CashCalculator
            totalAmount={order.total_amount}
            onConfirm={(amountTendered) => {
              onPaymentComplete('cash', amountTendered);
            }}
            isProcessing={false}
          />
        )}

        {isPayMongoEnabled && activeTab === 'gcash' && (
          <div className="p-6">
            <GcashPayment
              orderId={order.id}
              totalAmount={order.total_amount}
              onPaymentComplete={onPaymentComplete}
            />
          </div>
        )}

        {isPayMongoEnabled && activeTab === 'card' && (
          <div className="p-6">
            <CardPayment
              orderId={order.id}
              totalAmount={order.total_amount}
              onPaymentComplete={onPaymentComplete}
            />
          </div>
        )}
      </div>
    </div>
  );
}
