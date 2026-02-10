'use client';

import { useEffect, useCallback, useState } from 'react';
import { Phone, MapPin, AlertTriangle, Check, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import type { WaiterOrder } from '@/hooks/use-realtime-waiter-orders';

interface WaiterOrderDetailSheetProps {
  order: WaiterOrder;
  onClose: () => void;
}

const ORDER_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  dine_in: { label: 'DINE-IN', icon: '🍽' },
  room_service: { label: 'ROOM SERVICE', icon: '🛎' },
  takeout: { label: 'TAKEOUT', icon: '📦' },
};

/**
 * Bottom sheet overlay showing full order details.
 * Slides up from bottom with backdrop dimming.
 */
export function WaiterOrderDetailSheet({ order, onClose }: WaiterOrderDetailSheetProps) {
  const [isClosing, setIsClosing] = useState(false);

  const orderType = ORDER_TYPE_LABELS[order.order_type] || ORDER_TYPE_LABELS.takeout;

  const location =
    order.order_type === 'dine_in'
      ? `Table ${order.table_number}`
      : order.order_type === 'room_service'
        ? `Room ${order.room_number}`
        : 'Pickup Counter';

  // Calculate totals (assuming 12% VAT and 10% service charge based on CLAUDE.md)
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

  // Handle close with animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    // Wait for animation to complete before calling onClose
    setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll when sheet is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleClose]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div
      className={`waiter-sheet-backdrop ${isClosing ? 'waiter-sheet-backdrop-closing' : ''}`}
      onClick={handleBackdropClick}
    >
      <div className={`waiter-sheet ${isClosing ? 'waiter-sheet-closing' : ''}`}>
        {/* Drag handle indicator */}
        <div className="waiter-sheet-handle">
          <div className="waiter-sheet-handle-bar" />
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="waiter-sheet-close"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Sheet content */}
        <div className="waiter-sheet-content">
          {/* Header */}
          <div className="waiter-sheet-header">
            <div className="waiter-sheet-order-number">
              Order #{order.order_number}
            </div>
            <div className="waiter-sheet-meta">
              <span className="waiter-sheet-badge">
                {orderType.icon} {orderType.label}
              </span>
              <span className="waiter-sheet-location">
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
          </div>

          {/* Items list */}
          <div className="waiter-sheet-items">
            {order.order_items.map((item) => (
              <div key={item.id} className="waiter-sheet-item-row">
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <Check className="w-4 h-4 text-[var(--waiter-served)] shrink-0" />
                    <span className="waiter-sheet-item-qty">{item.quantity}×</span>
                    <span className="waiter-sheet-item-name">{item.item_name}</span>
                  </div>

                  {/* Addons */}
                  {item.order_item_addons.length > 0 &&
                    item.order_item_addons.map((addon) => (
                      <div key={addon.id} className="waiter-sheet-item-addon">
                        + {addon.addon_name}
                        {addon.additional_price > 0 && (
                          <span className="ml-1 opacity-60">
                            ({formatCurrency(addon.additional_price)})
                          </span>
                        )}
                      </div>
                    ))}

                  {/* Special instructions */}
                  {item.special_instructions && (
                    <div className="waiter-sheet-item-note">
                      <AlertTriangle className="w-3 h-3" />
                      {item.special_instructions}
                    </div>
                  )}
                </div>
                <span className="waiter-sheet-item-price">
                  {formatCurrency(item.unit_price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="waiter-sheet-totals">
            <div className="waiter-sheet-total-row">
              <span>Subtotal</span>
              <span>{formatCurrency(adjustedSubtotal)}</span>
            </div>

            {order.discount_amount && order.discount_amount > 0 && (
              <div className="waiter-sheet-total-row waiter-sheet-total-discount">
                <span>Discount</span>
                <span>-{formatCurrency(order.discount_amount)}</span>
              </div>
            )}

            <div className="waiter-sheet-total-row">
              <span>VAT (12%)</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>

            <div className="waiter-sheet-total-row">
              <span>Service Charge (10%)</span>
              <span>{formatCurrency(serviceCharge)}</span>
            </div>

            <div className="waiter-sheet-total-row waiter-sheet-total-final">
              <span>Total</span>
              <span className="waiter-sheet-total-value">{formatCurrency(order.total_amount)}</span>
            </div>
          </div>

          {/* Order special instructions */}
          {order.special_instructions && (
            <div className="waiter-sheet-notes">
              <div className="waiter-sheet-notes-label">
                Order Notes
              </div>
              <p className="waiter-sheet-notes-text">
                {order.special_instructions}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
