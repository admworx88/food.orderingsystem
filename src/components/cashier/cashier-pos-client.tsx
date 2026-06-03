'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Receipt, Clock, CreditCard, Ban } from 'lucide-react';
import { PendingOrdersList } from './pending-orders-list';
import { OrderDetailPanel } from './order-detail-panel';
import { PaymentDialog } from './payment-dialog';
import { ReceiptPreview } from './receipt-preview';
import { VoidBillDialog } from './void-bill-dialog';
import { StartShiftGate } from './start-shift-gate';
import { useRealtimePendingOrders } from '@/hooks/use-realtime-pending-orders';
import { useRealtimeUnpaidBills } from '@/hooks/use-realtime-unpaid-bills';
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
  initialUnpaidBills: CashierOrder[];
  cashierId: string;
  cashierName: string;
  isPayMongoEnabled: boolean;
  kioskTheme?: boolean;
  kioskLocation?: string | null;
  initialSelectedOrderId?: string;
  hasOpenShift?: boolean;
}

type ViewState = 'payment' | 'receipt';

export function CashierPosClient({
  initialOrders,
  initialUnpaidBills,
  cashierId,
  cashierName,
  isPayMongoEnabled,
  kioskTheme,
  kioskLocation,
  initialSelectedOrderId,
  hasOpenShift = true,
}: CashierPosClientProps) {
  const { orders: pendingOrders, refetch: refetchPending } = useRealtimePendingOrders({ initialData: initialOrders, kioskLocation });
  const { orders: unpaidBills, refetch: refetchUnpaid } = useRealtimeUnpaidBills({ initialData: initialUnpaidBills, kioskLocation });
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(initialSelectedOrderId ?? null);
  const [viewState, setViewState] = useState<ViewState>('payment');
  const [receiptData, setReceiptData] = useState<BIRReceiptData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isVoidDialogOpen, setIsVoidDialogOpen] = useState(false);

  const orders = useMemo(() => [...pendingOrders, ...unpaidBills], [pendingOrders, unpaidBills]);

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
    async (methodOrId: string, amountTenderedOrChange?: number): Promise<boolean> => {
      if (!selectedOrder) return false;

      if (methodOrId === 'cash' && amountTenderedOrChange !== undefined) {
        const result = await processCashPayment({
          orderId: selectedOrder.id,
          amountTendered: amountTenderedOrChange,
          cashierId,
          cashierName,
        });

        if (result.success) {
          toast.success(
            `Payment received! Change: ${formatCurrency(result.data.changeGiven)}`
          );
          refetchPending();
          refetchUnpaid();

          const receiptResult = await generateBIRReceipt(selectedOrder.id);
          if (receiptResult.success) {
            setReceiptData(receiptResult.data);
            setViewState('receipt');
          } else {
            toast.error('Payment successful but receipt generation failed');
          }
          return true;
        } else {
          toast.error(result.error);
          return false;
        }
      } else {
        // Digital / reference-number payment — already processed, show success immediately
        refetchPending();
        refetchUnpaid();

        // Generate receipt in background so success dialog is not delayed
        generateBIRReceipt(selectedOrder.id).then((receiptResult) => {
          if (receiptResult.success) {
            setReceiptData(receiptResult.data);
            setViewState('receipt');
          }
        });
        return true;
      }
    },
    [selectedOrder, cashierId, cashierName, refetchPending, refetchUnpaid]
  );

  const handleNewTransaction = useCallback(() => {
    setViewState('payment');
    setReceiptData(null);
    setIsDialogOpen(false);
    setSelectedOrderId(orders.length > 0 ? orders[0].id : null);
  }, [orders]);

  const handleDiscountApplied = useCallback(() => {
    toast.success('Discount applied — order total updated');
  }, []);

  const handleVoided = useCallback(() => {
    setIsVoidDialogOpen(false);
    setViewState('payment');
    setReceiptData(null);
    refetchPending();
    refetchUnpaid();
  }, [refetchPending, refetchUnpaid]);

  if (hasOpenShift === false) {
    return <StartShiftGate />;
  }

  return (
    <div className="pos-two-panel">
      {/* Left panel: Order queue */}
      <div className="pos-queue-panel">
        <div className="flex-1 overflow-hidden">
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
