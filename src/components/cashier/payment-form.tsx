'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
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

/**
 * Payment form with tabs: Cash / GCash / Card.
 * GCash and Card tabs are hidden if PayMongo is not configured.
 * All tabs are disabled if the order has expired.
 */
export function PaymentForm({
  order,
  onPaymentComplete,
  isPayMongoEnabled,
  cashierId,
}: PaymentFormProps) {
  const [activeTab, setActiveTab] = useState('cash');
  const isExpired = order.expires_at && new Date(order.expires_at) < new Date();

  if (isExpired) {
    return (
      <Card className="p-6 text-center">
        <p className="text-lg font-semibold text-red-600">Order Expired</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This order has passed the 15-minute payment window.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="cash" className="flex-1">
            Cash
          </TabsTrigger>
          {isPayMongoEnabled && (
            <>
              <TabsTrigger value="gcash" className="flex-1">
                GCash
              </TabsTrigger>
              <TabsTrigger value="card" className="flex-1">
                Card
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="cash" className="mt-4">
          <CashCalculator
            totalAmount={order.total_amount}
            onConfirm={(amountTendered) => {
              // Parent handles the actual payment processing
              onPaymentComplete('cash', amountTendered);
            }}
            isProcessing={false}
          />
        </TabsContent>

        {isPayMongoEnabled && (
          <>
            <TabsContent value="gcash" className="mt-4">
              <GcashPayment
                orderId={order.id}
                totalAmount={order.total_amount}
                onPaymentComplete={onPaymentComplete}
              />
            </TabsContent>

            <TabsContent value="card" className="mt-4">
              <CardPayment
                orderId={order.id}
                totalAmount={order.total_amount}
                onPaymentComplete={onPaymentComplete}
              />
            </TabsContent>
          </>
        )}
      </Tabs>
    </Card>
  );
}
