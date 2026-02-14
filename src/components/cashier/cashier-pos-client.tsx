'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Receipt, Clock, CreditCard, X } from 'lucide-react';
import { PendingOrdersList } from './pending-orders-list';
import { UnpaidBillsList } from './unpaid-bills-list';
import { OrderDetailPanel } from './order-detail-panel';
import { PaymentForm } from './payment-form';
import { DiscountSelector } from './discount-selector';
import { ReceiptPreview } from './receipt-preview';
import { useRealtimePendingOrders } from '@/hooks/use-realtime-pending-orders';
import { useRealtimeUnpaidBills } from '@/hooks/use-realtime-unpaid-bills';
import {
  processCashPayment,
  cancelExpiredOrders,
} from '@/services/payment-service';
import { generateBIRReceipt } from '@/services/bir-service';
import { EXPIRY_POLL_INTERVAL_MS } from '@/lib/constants/payment-methods';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import type { CashierOrder, BIRReceiptData } from '@/types/payment';

interface CashierPosClientProps {
  initialOrders: CashierOrder[];
  initialUnpaidBills: CashierOrder[];
  cashierId: string;
  cashierName: string;
  isPayMongoEnabled: boolean;
}

type ViewState = 'payment' | 'receipt';
type QueueTab = 'pending' | 'unpaid';

/**
 * Main cashier POS orchestrator - Terminal Command Center theme
 */
export function CashierPosClient({
  initialOrders,
  initialUnpaidBills,
  cashierId,
  cashierName,
  isPayMongoEnabled,
}: CashierPosClientProps) {
  const { orders: realtimePendingOrders, isLoading: isPendingLoading } = useRealtimePendingOrders();
  const { orders: realtimeUnpaidBills, isLoading: isUnpaidLoading } = useRealtimeUnpaidBills();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [viewState, setViewState] = useState<ViewState>('payment');
  const [receiptData, setReceiptData] = useState<BIRReceiptData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<QueueTab>('pending');
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Use realtime orders once loaded, otherwise initial server-fetched orders
  const pendingOrders = isPendingLoading ? initialOrders : realtimePendingOrders;
  const unpaidBills = isUnpaidLoading ? initialUnpaidBills : realtimeUnpaidBills;

  // Get the current list based on active tab
  const orders = activeTab === 'pending' ? pendingOrders : unpaidBills;

  // Derive effective selected order: auto-fallback to first if selection is stale
  const effectiveSelectedId = useMemo(() => {
    if (selectedOrderId && orders.find((o) => o.id === selectedOrderId)) {
      return selectedOrderId;
    }
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
          cashierName,
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
        const receiptResult = await generateBIRReceipt(selectedOrder.id);
        if (receiptResult.success) {
          setReceiptData(receiptResult.data);
          setViewState('receipt');
        }
      }
    },
    [selectedOrder, cashierId, cashierName]
  );

  const handleNewTransaction = useCallback(() => {
    setViewState('payment');
    setReceiptData(null);
    const currentOrders = activeTab === 'pending' ? pendingOrders : unpaidBills;
    setSelectedOrderId(currentOrders.length > 0 ? currentOrders[0].id : null);
  }, [activeTab, pendingOrders, unpaidBills]);

  const handleDiscountApplied = useCallback(() => {
    toast.success('Discount applied — order total updated');
  }, []);

  const handleTabChange = useCallback((tab: QueueTab) => {
    setActiveTab(tab);
    setSelectedOrderId(null);
    setViewState('payment');
    setReceiptData(null);
  }, []);

  // Payment form component (reused in panel and sheet)
  const paymentContent = selectedOrder && viewState === 'payment' ? (
    <PaymentForm
      order={selectedOrder}
      onPaymentComplete={(methodOrId, amountTendered) => {
        handlePaymentComplete(methodOrId, amountTendered);
        setIsSheetOpen(false);
      }}
      isPayMongoEnabled={isPayMongoEnabled}
      cashierId={cashierId}
    />
  ) : null;

  return (
    <div className="pos-three-panel">
      {/* Left panel: Order queue with tab toggle */}
      <div className="pos-queue-panel">
        {/* Tab toggle */}
        <div className="pos-queue-tabs">
          <button
            onClick={() => handleTabChange('pending')}
            className={cn(
              'pos-queue-tab',
              activeTab === 'pending' && 'pos-queue-tab-active'
            )}
          >
            Pending
            {pendingOrders.length > 0 && (
              <span className="pos-queue-tab-count">
                {pendingOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabChange('unpaid')}
            className={cn(
              'pos-queue-tab',
              activeTab === 'unpaid' && 'pos-queue-tab-active'
            )}
          >
            Unpaid Bills
            {unpaidBills.length > 0 && (
              <span className="pos-queue-tab-count">
                {unpaidBills.length}
              </span>
            )}
          </button>
        </div>

        {/* Order list based on active tab */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'pending' ? (
            <PendingOrdersList
              orders={pendingOrders}
              selectedOrderId={effectiveSelectedId}
              onSelectOrder={(id) => {
                setSelectedOrderId(id);
                setViewState('payment');
                setReceiptData(null);
                setIsSheetOpen(false);
              }}
            />
          ) : (
            <UnpaidBillsList
              orders={unpaidBills}
              selectedOrderId={effectiveSelectedId}
              onSelectOrder={(id) => {
                setSelectedOrderId(id);
                setViewState('payment');
                setReceiptData(null);
                setIsSheetOpen(false);
              }}
            />
          )}
        </div>
      </div>

      {/* Center panel: Order details + Discount */}
      <div className="pos-order-panel pos-scrollbar">
        {viewState === 'receipt' && receiptData ? (
          <div className="max-w-md mx-auto space-y-6">
            <ReceiptPreview receipt={receiptData} />
            <button
              onClick={handleNewTransaction}
              className="pos-btn-confirm w-full"
            >
              Next Transaction
            </button>
          </div>
        ) : selectedOrder ? (
          <div className="space-y-4">
            <OrderDetailPanel order={selectedOrder} />

            <DiscountSelector
              orderId={selectedOrder.id}
              subtotal={selectedOrder.subtotal}
              currentDiscount={selectedOrder.discount_amount || 0}
              onDiscountApplied={handleDiscountApplied}
            />

            {/* Mobile/Tablet: Button to open payment sheet */}
            <button
              className="pos-payment-sheet-trigger"
              onClick={() => setIsSheetOpen(true)}
            >
              <CreditCard className="w-5 h-5" />
              Process Payment
            </button>
          </div>
        ) : (
          <div className="pos-empty-state">
            <div className="pos-empty-icon">
              {orders.length === 0 ? (
                <Clock className="w-10 h-10" />
              ) : (
                <Receipt className="w-10 h-10" />
              )}
            </div>
            <div className="pos-empty-title">
              {orders.length === 0 ? 'Awaiting Orders' : 'Select an Order'}
            </div>
            <p className="pos-empty-description">
              {orders.length === 0
                ? 'New orders will appear here when customers are ready to pay.'
                : 'Choose an order from the queue to process payment.'}
            </p>
          </div>
        )}
      </div>

      {/* Right panel: Payment calculator (desktop only) */}
      <div className="pos-payment-panel pos-scrollbar">
        <div className="pos-payment-panel-header">
          <div className="pos-payment-panel-title">Payment</div>
        </div>
        <div className="pos-payment-panel-content">
          {selectedOrder && viewState === 'payment' ? (
            paymentContent
          ) : viewState === 'receipt' ? (
            <div className="p-6 text-center">
              <div className="pos-empty-icon mx-auto mb-4">
                <Receipt className="w-8 h-8" />
              </div>
              <p className="text-sm text-[var(--pos-text-muted)]">
                Payment complete. View receipt in main panel.
              </p>
            </div>
          ) : (
            <div className="p-6 text-center">
              <div className="pos-empty-icon mx-auto mb-4">
                <CreditCard className="w-8 h-8" />
              </div>
              <p className="text-sm text-[var(--pos-text-muted)]">
                Select an order to process payment.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile/Tablet: Payment sheet overlay */}
      <div
        className={cn(
          'pos-sheet-overlay',
          isSheetOpen && 'pos-sheet-overlay-visible'
        )}
        onClick={() => setIsSheetOpen(false)}
      />

      {/* Mobile/Tablet: Payment sheet panel */}
      <div
        className={cn(
          'pos-sheet-panel',
          isSheetOpen && 'pos-sheet-panel-visible'
        )}
      >
        <div className="pos-sheet-header">
          <span className="pos-sheet-title">Payment</span>
          <button
            className="pos-sheet-close"
            onClick={() => setIsSheetOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="pos-sheet-content pos-scrollbar">
          {paymentContent}
        </div>
      </div>
    </div>
  );
}
