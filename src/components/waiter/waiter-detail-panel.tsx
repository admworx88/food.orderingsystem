'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Phone, MapPin, AlertTriangle, Check, Clock, ChefHat, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import { updateItemToServed } from '@/services/order-service';
import type { OrderItemStatus } from '@/lib/constants/item-status';
import type { WaiterOrder, WaiterOrderItem } from '@/hooks/use-realtime-waiter-orders';

interface WaiterDetailPanelProps {
  order: WaiterOrder;
  onClose: () => void;
  onItemServed: (itemId: string, newStatus: OrderItemStatus) => void;
  viewFilter: 'ready' | 'preparing' | 'recent';
}

const ORDER_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  dine_in: { label: 'DINE-IN', icon: '🍽' },
  room_service: { label: 'ROOM SERVICE', icon: '🛎' },
  takeout: { label: 'TAKEOUT', icon: '📦' },
};

/**
 * Status icon indicator for item rows
 */
function ItemStatusIcon({ status }: { status: OrderItemStatus }) {
  const iconClasses = {
    pending: 'waiter-detail-item-icon waiter-detail-item-icon-pending',
    preparing: 'waiter-detail-item-icon waiter-detail-item-icon-preparing',
    ready: 'waiter-detail-item-icon waiter-detail-item-icon-ready',
    served: 'waiter-detail-item-icon waiter-detail-item-icon-served',
  };

  return (
    <div className={iconClasses[status]}>
      {status === 'served' ? (
        <Check className="w-4 h-4" />
      ) : status === 'ready' ? (
        <ChefHat className="w-4 h-4" />
      ) : (
        <Clock className="w-3.5 h-3.5" />
      )}
    </div>
  );
}

/**
 * Item action component - renders SERVE button or SERVED badge
 */
function ItemAction({
  item,
  onServe,
  showServeButtons,
}: {
  item: WaiterOrderItem;
  onServe: (itemId: string) => void;
  showServeButtons: boolean;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const isReady = item.status === 'ready';
  const isServed = item.status === 'served';

  const handleServe = async () => {
    if (!isReady || isUpdating) return;

    setIsUpdating(true);
    const result = await updateItemToServed(item.id);

    if (result.success) {
      onServe(item.id);
      if (result.data.orderCompleted) {
        toast.success('Order complete!');
      }
    } else {
      toast.error(result.error || 'Failed to mark item as served');
    }

    setIsUpdating(false);
  };

  // Ready items: show explicit SERVE button (only in Ready/Preparing tabs)
  if (isReady && showServeButtons) {
    return (
      <button
        onClick={handleServe}
        disabled={isUpdating}
        className="waiter-detail-serve-btn"
        aria-label={`Mark ${item.item_name} as served`}
      >
        {isUpdating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Check className="w-4 h-4" />
            <span>SERVE</span>
          </>
        )}
      </button>
    );
  }

  // Served items: show SERVED badge
  if (isServed) {
    return (
      <span className="waiter-detail-served-badge">
        <Check className="w-3 h-3" />
        SERVED
      </span>
    );
  }

  // Preparing: show status text
  if (item.status === 'preparing') {
    return (
      <span className="waiter-detail-preparing-text">
        preparing
      </span>
    );
  }

  return null;
}

/**
 * Right panel showing full order details in split-panel layout.
 * Replaces the bottom sheet overlay with an inline panel.
 */
export function WaiterDetailPanel({
  order,
  onClose,
  onItemServed,
  viewFilter,
}: WaiterDetailPanelProps) {
  const orderType = ORDER_TYPE_LABELS[order.order_type] || ORDER_TYPE_LABELS.takeout;

  const location =
    order.order_type === 'dine_in'
      ? `Table ${order.table_number}`
      : order.order_type === 'room_service'
        ? `Room ${order.room_number}`
        : 'Pickup Counter';

  // Calculate totals (assuming 12% VAT and 10% service charge)
  const subtotal = order.order_items.reduce(
    (sum, item) => sum + (item.unit_price * item.quantity),
    0
  );

  // Add addon prices to subtotal
  const addonTotal = order.order_items.reduce(
    (sum, item) =>
      sum +
      item.order_item_addons.reduce(
        (addonSum, addon) => addonSum + (addon.additional_price || 0),
        0
      ),
    0
  );

  const adjustedSubtotal = subtotal + addonTotal;
  const taxAmount = adjustedSubtotal * 0.12;
  const serviceCharge = adjustedSubtotal * 0.10;

  // Show SERVE buttons in Ready and Preparing tabs, not in Recent
  const showServeButtons = viewFilter !== 'recent';

  // Get row style class based on item status
  const getRowClass = (status: OrderItemStatus) => {
    switch (status) {
      case 'ready':
        return 'waiter-detail-item-row waiter-detail-item-row-ready';
      case 'served':
        return 'waiter-detail-item-row waiter-detail-item-row-served';
      case 'preparing':
        return 'waiter-detail-item-row waiter-detail-item-row-preparing';
      default:
        return 'waiter-detail-item-row waiter-detail-item-row-pending';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{
        duration: 0.35,
        ease: [0.4, 0, 0.2, 1],
      }}
      className="waiter-detail-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 220px)',
        background: 'var(--waiter-surface, #ffffff)',
        border: '1px solid var(--waiter-border, #e8e4de)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      {/* Back button */}
      <button
        type="button"
        onClick={onClose}
        className="waiter-detail-back-btn"
        aria-label="Close detail panel"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '0.75rem 1rem',
          margin: '1rem',
          marginBottom: 0,
          fontSize: '0.875rem',
          fontWeight: 500,
          color: 'var(--waiter-text-secondary, #5c574f)',
          background: 'transparent',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          width: 'fit-content',
        }}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {/* Panel content */}
      <div
        className="waiter-detail-content"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 1.5rem 1.5rem',
        }}
      >
        {/* Header */}
        <AnimatePresence mode="wait">
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="waiter-detail-header"
          >
            <h2 className="waiter-detail-order-number">
              Order #{order.order_number}
            </h2>

            <div className="waiter-detail-meta">
              <span className="waiter-detail-badge">
                {orderType.icon} {orderType.label}
              </span>
              <span className="waiter-detail-location">
                <MapPin className="w-3.5 h-3.5" />
                {location}
              </span>
            </div>

            {order.guest_phone && (
              <div className="flex items-center gap-2 mt-3 text-sm text-[var(--waiter-text-muted)]">
                <Phone className="w-4 h-4" />
                <span className="font-mono">{order.guest_phone}</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Divider */}
        <div className="waiter-divider mx-0 my-4" />

        {/* Items list */}
        <AnimatePresence mode="wait">
          <motion.div
            key={order.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, delay: 0.05 }}
            className="waiter-detail-items"
          >
            {order.order_items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className={getRowClass(item.status)}
              >
                {/* Status Icon */}
                <ItemStatusIcon status={item.status} />

                {/* Item Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'flex-shrink-0 text-sm font-bold',
                      item.status === 'served' ? 'text-[var(--waiter-text-muted)]' : 'text-[var(--waiter-text)]'
                    )}>
                      {item.quantity}x
                    </span>
                    <span className={cn(
                      'text-sm font-medium',
                      item.status === 'served'
                        ? 'text-[var(--waiter-text-muted)] line-through'
                        : 'text-[var(--waiter-text)]'
                    )}>
                      {item.item_name}
                    </span>
                  </div>

                  {/* Addons */}
                  {item.order_item_addons.length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {item.order_item_addons.map((addon) => (
                        <p
                          key={addon.id}
                          className={cn(
                            'text-xs pl-6',
                            item.status === 'served'
                              ? 'text-[var(--waiter-text-muted)]'
                              : 'text-[var(--waiter-text-secondary)]'
                          )}
                        >
                          + {addon.addon_name}
                          {addon.additional_price > 0 && (
                            <span className="ml-1 opacity-60">
                              ({formatCurrency(addon.additional_price)})
                            </span>
                          )}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Special instructions */}
                  {item.special_instructions && (
                    <div className="mt-2 flex items-start gap-2 px-2.5 py-2 rounded-lg bg-[var(--waiter-preparing-light)] border border-[rgba(217,119,6,0.2)]">
                      <AlertTriangle className="w-3.5 h-3.5 text-[var(--waiter-preparing)] mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-[var(--waiter-preparing)] font-medium">
                        {item.special_instructions}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Button / Status Badge */}
                <ItemAction
                  item={item}
                  onServe={(itemId) => onItemServed(itemId, 'served')}
                  showServeButtons={showServeButtons}
                />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Divider */}
        <div className="waiter-divider mx-0 my-4" />

        {/* Totals */}
        <AnimatePresence mode="wait">
          <motion.div
            key={order.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="waiter-detail-totals"
          >
            <div className="waiter-detail-total-row">
              <span>Subtotal</span>
              <span>{formatCurrency(adjustedSubtotal)}</span>
            </div>

            {order.discount_amount != null && order.discount_amount > 0 && (
              <div className="waiter-detail-total-row waiter-detail-total-discount">
                <span>Discount</span>
                <span>-{formatCurrency(order.discount_amount)}</span>
              </div>
            )}

            <div className="waiter-detail-total-row">
              <span>VAT (12%)</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>

            <div className="waiter-detail-total-row">
              <span>Service Charge (10%)</span>
              <span>{formatCurrency(serviceCharge)}</span>
            </div>

            <div className="waiter-detail-total-row waiter-detail-total-final">
              <span>Total</span>
              <span className="waiter-detail-total-value">{formatCurrency(order.total_amount)}</span>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Order special instructions */}
        {order.special_instructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.15 }}
            className="waiter-detail-notes"
          >
            <div className="waiter-detail-notes-label">
              Order Notes
            </div>
            <p className="waiter-detail-notes-text">
              {order.special_instructions}
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
