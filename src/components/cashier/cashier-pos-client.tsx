'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Receipt, Clock, CreditCard, Ban } from 'lucide-react';
import { PendingOrdersList } from './pending-orders-list';
import { UnpaidBillsList } from './unpaid-bills-list';
import { OrderDetailPanel } from './order-detail-panel';
import { PaymentDialog } from './payment-dialog';
import { ReceiptPreview } from './receipt-preview';
import { VoidBillDialog } from './void-bill-dialog';
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
  kioskTheme?: boolean;
  kioskLocation?: string | null;
  initialSelectedOrderId?: string;
}

type ViewState = 'payment' | 'receipt';
type QueueTab = 'pending' | 'unpaid';

export function CashierPosClient({
  initialOrders,
  initialUnpaidBills,
  cashierId,
  cashierName,
  isPayMongoEnabled,
  kioskTheme,
  kioskLocation,
  initialSelectedOrderId,
}: CashierPosClientProps) {
  const { orders: pendingOrders, refetch: refetchPending } = useRealtimePendingOrders({ initialData: initialOrders, kioskLocation });
  const { orders: unpaidBills, refetch: refetchUnpaid } = useRealtimeUnpaidBills({ initialData: initialUnpaidBills, kioskLocation });
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(initialSelectedOrderId ?? null);
  const [viewState, setViewState] = useState<ViewState>('payment');
  const [receiptData, setReceiptData] = useState<BIRReceiptData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<QueueTab>('pending');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isVoidDialogOpen, setIsVoidDialogOpen] = useState(false);

  const orders = activeTab === 'pending' ? pendingOrders : unpaidBills;

  const effectiveSelectedId = useMemo(() => {
    if (selectedOrderId && orders.find((o) => o.id === selectedOrderId)) {
      return selectedOrderId;
    }
    return orders.length > 0 ? orders[0].id : null;
  }, [selectedOrderId, orders]);

  const selectedOrder = effectiveSelectedId
    ? orders.find((o) => o.id === effectiveSelectedId) || null
    : null;

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
          // Immediately flush paid order from queue without waiting for realtime
          if (activeTab === 'pending') refetchPending();
          else refetchUnpaid();

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
      } else {
        // Digital / reference-number payment
        if (activeTab === 'pending') refetchPending();
        else refetchUnpaid();

        const receiptResult = await generateBIRReceipt(selectedOrder.id);
        if (receiptResult.success) {
          setReceiptData(receiptResult.data);
          setViewState('receipt');
        }
      }
    },
    [selectedOrder, cashierId, cashierName, activeTab, refetchPending, refetchUnpaid]
  );

  const handleNewTransaction = useCallback(() => {
    setViewState('payment');
    setReceiptData(null);
    setIsDialogOpen(false);
    const currentOrders = activeTab === 'pending' ? pendingOrders : unpaidBills;
    setSelectedOrderId(currentOrders.length > 0 ? currentOrders[0].id : null);
  }, [activeTab, pendingOrders, unpaidBills]);

  const handleDiscountApplied = useCallback(() => {
    toast.success('Discount applied — order total updated');
  }, []);

  const handleVoided = useCallback(() => {
    setIsVoidDialogOpen(false);
    setViewState('payment');
    setReceiptData(null);
    if (activeTab === 'pending') refetchPending();
    else refetchUnpaid();
  }, [activeTab, refetchPending, refetchUnpaid]);

  const handleTabChange = useCallback((tab: QueueTab) => {
    setActiveTab(tab);
    setSelectedOrderId(null);
    setViewState('payment');
    setReceiptData(null);
    setIsDialogOpen(false);
  }, []);

  return (
    <div className="pos-two-panel">
      {/* Left panel: Order queue */}
      <div className="pos-queue-panel">
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

        <div className="flex-1 overflow-hidden">
          {activeTab === 'pending' ? (
            <PendingOrdersList
              orders={pendingOrders}
              selectedOrderId={effectiveSelectedId}
              onSelectOrder={(id) => {
                setSelectedOrderId(id);
                setViewState('payment');
                setReceiptData(null);
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
              }}
            />
          )}
        </div>
      </div>

      {/* Center panel: Order detail */}
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

            <button
              className="pos-process-payment-btn"
              onClick={() => setIsDialogOpen(true)}
            >
              <CreditCard className="w-5 h-5" />
              Process Payment
            </button>

            <button
              onClick={() => setIsVoidDialogOpen(true)}
              className="w-full h-11 rounded-xl border border-red-800/50 bg-red-900/20 hover:bg-red-900/35 text-red-400 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Ban className="w-4 h-4" strokeWidth={2} />
              Void Bill
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

      {/* Payment + Discount dialog */}
      <PaymentDialog
        order={selectedOrder}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onPaymentComplete={handlePaymentComplete}
        onDiscountApplied={handleDiscountApplied}
        isPayMongoEnabled={isPayMongoEnabled}
        cashierId={cashierId}
        kioskTheme={kioskTheme}
      />

      {/* Void Bill dialog */}
      <VoidBillDialog
        order={selectedOrder}
        isOpen={isVoidDialogOpen}
        onClose={() => setIsVoidDialogOpen(false)}
        onVoided={handleVoided}
        cashierId={cashierId}
        cashierName={cashierName}
      />
    </div>
  );
}
