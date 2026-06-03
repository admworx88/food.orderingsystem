'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Banknote, CreditCard, AlertTriangle, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CashCalculator } from './cash-calculator';
import { GcashPayment } from './gcash-payment';
import { CardPayment } from './card-payment';
import { ManualEwalletPayment } from './manual-ewallet-payment';
import { BurgerLoader } from '@/components/shared/burger-loader';
import type { CashierOrder } from '@/types/payment';

interface PaymentFormProps {
  order: CashierOrder;
  onPaymentComplete: (paymentId: string, changeGiven?: number) => void;
  isPayMongoEnabled: boolean;
  cashierId: string;
}

type PaymentTab = 'cash' | 'gcash' | 'gotyme' | 'maya' | 'other_banks' | 'card';

const EWALLET_TABS: { key: PaymentTab; label: string; logo?: string }[] = [
  { key: 'gcash', label: 'GCash', logo: '/payments/GCash_Logo.png' },
  { key: 'gotyme', label: 'GoTyme', logo: '/payments/gotyme.jpg' },
  { key: 'maya', label: 'Maya', logo: '/payments/maya.jpg' },
  { key: 'other_banks', label: 'Other Banks' },
];

export function PaymentForm({
  order,
  onPaymentComplete,
  isPayMongoEnabled,
  cashierId,
}: PaymentFormProps) {
  const [activeTab, setActiveTab] = useState<PaymentTab>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const isExpired = order.expires_at && new Date(order.expires_at) < new Date();
  const discountAmount = order.discount_amount ?? 0;
  const originalAmount = discountAmount > 0 ? order.total_amount + discountAmount : undefined;

  const handlePaymentComplete = useCallback((paymentId: string, changeGiven?: number) => {
    setIsProcessing(true);
    onPaymentComplete(paymentId, changeGiven);
  }, [onPaymentComplete]);

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
    <>
    <BurgerLoader isLoading={isProcessing} message="Processing payment…" variant="light" />
    <div className="flex flex-col h-full">
      {/* Payment method tabs */}
      <div className="flex flex-shrink-0 border-b border-stone-200 bg-white px-3 pt-2 gap-1">
        {/* Cash */}
        <button
          onClick={() => setActiveTab('cash')}
          className={cn(
            'relative flex items-center gap-1.5 px-4 h-10 text-[13px] font-bold rounded-t-xl transition-all duration-150',
            activeTab === 'cash'
              ? 'text-emerald-700 bg-[#FAF7F2] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-emerald-600 after:rounded-t-full'
              : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'
          )}
        >
          <Banknote className="w-3.5 h-3.5" />
          Cash
        </button>

        {/* eWallet tabs */}
        {EWALLET_TABS.map(({ key, label, logo }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'relative flex items-center gap-1.5 px-4 h-10 text-[13px] font-bold rounded-t-xl transition-all duration-150',
              activeTab === key
                ? 'text-emerald-700 bg-[#FAF7F2] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-emerald-600 after:rounded-t-full'
                : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'
            )}
          >
            {logo ? (
              <div className="w-4 h-4 rounded overflow-hidden flex-shrink-0">
                <Image src={logo} alt={label} width={16} height={16} className="object-cover w-full h-full" />
              </div>
            ) : (
              <Landmark className="w-3.5 h-3.5 flex-shrink-0" />
            )}
            {label}
          </button>
        ))}

        {/* Card (PayMongo only) */}
        {isPayMongoEnabled && (
          <button
            onClick={() => setActiveTab('card')}
            className={cn(
              'relative flex items-center gap-1.5 px-4 h-10 text-[13px] font-bold rounded-t-xl transition-all duration-150',
              activeTab === 'card'
                ? 'text-emerald-700 bg-[#FAF7F2] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-emerald-600 after:rounded-t-full'
                : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'
            )}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Card
          </button>
        )}
      </div>

      {/* Payment content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'cash' && (
          <CashCalculator
            totalAmount={order.total_amount}
            originalAmount={originalAmount}
            onConfirm={(amountTendered) => handlePaymentComplete('cash', amountTendered)}
            isProcessing={false}
          />
        )}

        {/* GCash: PayMongo flow if enabled, manual fallback otherwise */}
        {activeTab === 'gcash' && (
          isPayMongoEnabled ? (
            <div className="p-6 overflow-y-auto h-full">
              <GcashPayment
                orderId={order.id}
                totalAmount={order.total_amount}
                onPaymentComplete={handlePaymentComplete}
              />
            </div>
          ) : (
            <ManualEwalletPayment
              orderId={order.id}
              totalAmount={order.total_amount}
              originalAmount={originalAmount}
              method="gcash"
              cashierId={cashierId}
              onPaymentComplete={handlePaymentComplete}
            />
          )
        )}

        {activeTab === 'gotyme' && (
          <ManualEwalletPayment
            orderId={order.id}
            totalAmount={order.total_amount}
            originalAmount={originalAmount}
            method="gotyme"
            cashierId={cashierId}
            onPaymentComplete={handlePaymentComplete}
          />
        )}

        {activeTab === 'maya' && (
          <ManualEwalletPayment
            orderId={order.id}
            totalAmount={order.total_amount}
            originalAmount={originalAmount}
            method="maya"
            cashierId={cashierId}
            onPaymentComplete={handlePaymentComplete}
          />
        )}

        {activeTab === 'other_banks' && (
          <ManualEwalletPayment
            orderId={order.id}
            totalAmount={order.total_amount}
            originalAmount={originalAmount}
            method="other_banks"
            cashierId={cashierId}
            onPaymentComplete={handlePaymentComplete}
          />
        )}

        {isPayMongoEnabled && activeTab === 'card' && (
          <div className="p-6 overflow-y-auto h-full">
            <CardPayment
              orderId={order.id}
              totalAmount={order.total_amount}
              onPaymentComplete={handlePaymentComplete}
            />
          </div>
        )}
      </div>
    </div>
    </>
  );
}
