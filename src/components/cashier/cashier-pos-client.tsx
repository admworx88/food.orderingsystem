'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { PendingOrdersList } from './pending-orders-list';
import { OrderDetailPanel } from './order-detail-panel';
import { PaymentForm } from './payment-form';
import { DiscountSelector } from './discount-selector';
import { ReceiptPreview } from './receipt-preview';
import { useRealtimePendingOrders } from '@/hooks/use-realtime-pending-orders';
import {
  processCashPayment,
  cancelExpiredOrders,
} from '@/services/payment-service';
import { generateBIRReceipt } from '@/services/bir-service';
import { EXPIRY_POLL_INTERVAL_MS } from '@/lib/constants/payment-methods';
import { formatCurrency } from '@/lib/utils/currency';
import type { CashierOrder, BIRReceiptData } from '@/types/payment';

interface CashierPosClientProps {
  initialOrders: CashierOrder[];
  cashierId: string;
  isPayMongoEnabled: boolean;
}

type ViewState = 'payment' | 'receipt';

/**
 * Main cashier POS orchestrator.
 * Split-panel: left = PendingOrdersList, right = OrderDetail + PaymentForm.
 * Manages selected order, payment flow, and receipt generation.
 */
export function CashierPosClient({
  initialOrders,
  cashierId,
  isPayMongoEnabled,
}: CashierPosClientProps) {
  const { orders: realtimeOrders, isLoading } = useRealtimePendingOrders();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [viewState, setViewState] = useState<ViewState>('payment');
  const [receiptData, setReceiptData] = useState<BIRReceiptData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Use realtime orders once loaded, otherwise initial server-fetched orders
  const orders = isLoading ? initialOrders : realtimeOrders;

  // Derive effective selected order: auto-fallback to first if selection is stale
  const effectiveSelectedId = useMemo(() => {
    if (selectedOrderId && orders.find((o) => o.id === selectedOrderId)) {
      return selectedOrderId;
    }
    // Auto-select first order if current selection is invalid
    return orders.length > 0 ? orders[0].id : null;
  }, [selectedOrderId, orders]);

  const selectedOrder = effectiveSelectedId
    ? orders.find((o) => o.id === effectiveSelectedId) || null
    : null;

  // Poll for expired orders every 60 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await cancelExpiredOrders();
      if (result.success && result.data.cancelledCount > 0) {
        toast.info(`${result.data.cancelledCount} expired order(s) cancelled`);
      }
    }, EXPIRY_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  const handlePaymentComplete = useCallback(
    async (methodOrId: string, amountTenderedOrChange?: number) => {
      if (!selectedOrder) return;

      // Cash payment
      if (methodOrId === 'cash' && amountTenderedOrChange !== undefined) {
        setIsProcessing(true);
        const result = await processCashPayment({
          orderId: selectedOrder.id,
          amountTendered: amountTenderedOrChange,
          cashierId,
        });
        setIsProcessing(false);

        if (result.success) {
          toast.success(
            `Payment received! Change: ${formatCurrency(result.data.changeGiven)}`
          );

          // Generate receipt
          const receiptResult = await generateBIRReceipt(selectedOrder.id);
          if (receiptResult.success) {
            setReceiptData(receiptResult.data);
            setViewState('receipt');
          } else {
            toast.error('Payment successful but receipt generation failed');
          }
        } else {
          toast.error(result.error);
        }
      }
      // Digital payment (webhook-confirmed — paymentId passed)
      else {
        // Receipt generation after webhook confirms payment
        const receiptResult = await generateBIRReceipt(selectedOrder.id);
        if (receiptResult.success) {
          setReceiptData(receiptResult.data);
          setViewState('receipt');
        }
      }
    },
    [selectedOrder, cashierId]
  );

  const handleNewTransaction = useCallback(() => {
    setViewState('payment');
    setReceiptData(null);
    setSelectedOrderId(orders.length > 0 ? orders[0].id : null);
  }, [orders]);

  const handleDiscountApplied = useCallback(() => {
    // Refetch will happen via realtime
    toast.success('Discount applied — order total updated');
  }, []);

  return (
    <div className="flex h-[calc(100vh-57px)]">
      {/* Left panel: Pending orders list */}
      <div className="w-80 flex-shrink-0 border-r bg-white">
        <PendingOrdersList
          orders={orders}
          selectedOrderId={effectiveSelectedId}
          onSelectOrder={(id) => {
            setSelectedOrderId(id);
            setViewState('payment');
            setReceiptData(null);
          }}
        />
      </div>

      {/* Right panel: Order details + Payment/Receipt */}
      <div className="flex-1 overflow-y-auto p-6">
        {viewState === 'receipt' && receiptData ? (
          <div className="mx-auto max-w-md space-y-4">
            <ReceiptPreview receipt={receiptData} />
            <button
              onClick={handleNewTransaction}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white font-semibold hover:bg-blue-700 transition-colors"
            >
              Next Transaction
            </button>
          </div>
        ) : selectedOrder ? (
          <div className="mx-auto max-w-lg space-y-4">
            <OrderDetailPanel order={selectedOrder} />

            <DiscountSelector
              orderId={selectedOrder.id}
              subtotal={selectedOrder.subtotal}
              currentDiscount={selectedOrder.discount_amount || 0}
              onDiscountApplied={handleDiscountApplied}
            />

            <PaymentForm
              order={selectedOrder}
              onPaymentComplete={handlePaymentComplete}
              isPayMongoEnabled={isPayMongoEnabled}
              cashierId={cashierId}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <div className="text-lg font-medium">No Order Selected</div>
              <p className="mt-1 text-sm">
                {orders.length === 0
                  ? 'Waiting for new orders...'
                  : 'Select an order from the left panel'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
