'use client';

import { Phone, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { ExpirationCountdown } from './expiration-countdown';
import type { CashierOrder } from '@/types/payment';

interface OrderDetailPanelProps {
  order: CashierOrder;
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: 'Dine-in',
  room_service: 'Room Service',
  takeout: 'Takeout',
  ocean_view: 'Ocean View',
};

/**
 * Order detail view - Terminal Command Center theme
 */
export function OrderDetailPanel({ order }: OrderDetailPanelProps) {
  const promo = order.promo_codes;

  return (
    <div className="pos-detail-card">
      {/* Header */}
      <div className="pos-detail-header">
        <div className="flex items-start justify-between">
          <div>
            <div className="pos-detail-order-number">
              Order #{order.order_number}
            </div>
            <div className="pos-detail-meta">
              <span className="pos-order-badge">
                {ORDER_TYPE_LABELS[order.order_type] || order.order_type}
              </span>
              {order.table_number && (
                <span className="flex items-center gap-1 text-sm text-[var(--pos-text-secondary)]">
                  <MapPin className="w-3.5 h-3.5" />
                  Table {order.table_number}
                </span>
              )}
              {order.room_number && (
                <span className="flex items-center gap-1 text-sm text-[var(--pos-text-secondary)]">
                  <MapPin className="w-3.5 h-3.5" />
                  Room {order.room_number}
                </span>
              )}
            </div>
          </div>
          <ExpirationCountdown expiresAt={order.expires_at} />
        </div>

        {order.guest_phone && (
          <div className="flex items-center gap-2 mt-3 text-sm text-[var(--pos-text-muted)]">
            <Phone className="w-4 h-4" />
            <span>{order.guest_phone}</span>
          </div>
        )}
      </div>

      {/* Items list */}
      <div className="pos-items-list">
        {(order.order_items || []).map((item) => (
          <div key={item.id} className="pos-item-row">
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="pos-item-qty">{item.quantity}×</span>
                <span className="pos-item-name">{item.item_name}</span>
              </div>

              {/* Addons */}
              {(item.order_item_addons || []).map((addon) => (
                <div key={addon.id} className="pos-item-addon">
                  + {addon.addon_name}
                  {addon.additional_price > 0 && (
                    <span className="ml-1 text-[var(--pos-text-muted)]">
                      ({formatCurrency(addon.additional_price)})
                    </span>
                  )}
                </div>
              ))}

              {/* Special instructions */}
              {item.special_instructions && (
                <div className="pos-item-note">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  {item.special_instructions}
                </div>
              )}
            </div>
            <span className="pos-item-price">{formatCurrency(item.total_price)}</span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="pos-totals">
        <div className="pos-total-row">
          <span>Subtotal</span>
          <span>{formatCurrency(order.subtotal)}</span>
        </div>

        {order.discount_amount && order.discount_amount > 0 && (
          <div className="pos-total-row pos-total-discount">
            <span>
              Discount
              {promo && ` (${(promo as { code: string }).code})`}
            </span>
            <span>-{formatCurrency(order.discount_amount)}</span>
          </div>
        )}

        <div className="pos-total-row">
          <span>VAT (12%)</span>
          <span>{formatCurrency(order.tax_amount)}</span>
        </div>

        <div className="pos-total-row">
          <span>Service Charge (10%)</span>
          <span>{formatCurrency(order.service_charge || 0)}</span>
        </div>

        <div className="pos-total-row pos-total-row-final">
          <span>Total</span>
          <span className="pos-total-value">{formatCurrency(order.total_amount)}</span>
        </div>
      </div>

      {/* Special instructions */}
      {order.special_instructions && (
        <div className="px-5 py-4 border-t border-[var(--pos-border)]">
          <div className="text-xs font-semibold text-[var(--pos-text-muted)] uppercase tracking-wider mb-2">
            Special Instructions
          </div>
          <p className="text-sm text-[var(--pos-text-secondary)]">
            {order.special_instructions}
          </p>
        </div>
      )}
    </div>
  );
}
