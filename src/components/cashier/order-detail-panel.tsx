'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
};

/**
 * Right panel top section: full order breakdown with items, addons,
 * promo, subtotal/discount/VAT/service/total, guest phone, order type.
 */
export function OrderDetailPanel({ order }: OrderDetailPanelProps) {
  const promo = order.promo_codes;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Order #{order.order_number}</h3>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="outline">
              {ORDER_TYPE_LABELS[order.order_type] || order.order_type}
            </Badge>
            {order.table_number && (
              <span className="text-sm text-muted-foreground">Table {order.table_number}</span>
            )}
            {order.room_number && (
              <span className="text-sm text-muted-foreground">Room {order.room_number}</span>
            )}
          </div>
        </div>
        <ExpirationCountdown expiresAt={order.expires_at} />
      </div>

      {order.guest_phone && (
        <div className="mt-2 text-sm text-muted-foreground">
          Phone: {order.guest_phone}
        </div>
      )}

      <Separator className="my-3" />

      {/* Items list */}
      <div className="space-y-2">
        {(order.order_items || []).map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <div className="flex-1">
              <div className="font-medium">
                {item.quantity}x {item.item_name}
              </div>
              {(item.order_item_addons || []).map((addon) => (
                <div key={addon.id} className="ml-4 text-xs text-muted-foreground">
                  + {addon.addon_name}
                  {addon.additional_price > 0 && ` (${formatCurrency(addon.additional_price)})`}
                </div>
              ))}
              {item.special_instructions && (
                <div className="ml-4 text-xs italic text-amber-600">
                  Note: {item.special_instructions}
                </div>
              )}
            </div>
            <span className="font-medium">{formatCurrency(item.total_price)}</span>
          </div>
        ))}
      </div>

      <Separator className="my-3" />

      {/* Price breakdown */}
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(order.subtotal)}</span>
        </div>
        {order.discount_amount && order.discount_amount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>
              Discount
              {promo && ` (${(promo as { code: string }).code})`}
            </span>
            <span>-{formatCurrency(order.discount_amount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">VAT (12%)</span>
          <span>{formatCurrency(order.tax_amount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Service Charge (10%)</span>
          <span>{formatCurrency(order.service_charge || 0)}</span>
        </div>
        <Separator className="my-1" />
        <div className="flex justify-between text-base font-bold">
          <span>Total</span>
          <span>{formatCurrency(order.total_amount)}</span>
        </div>
      </div>

      {order.special_instructions && (
        <>
          <Separator className="my-3" />
          <div className="text-sm">
            <span className="font-medium">Special Instructions: </span>
            <span className="text-muted-foreground">{order.special_instructions}</span>
          </div>
        </>
      )}
    </Card>
  );
}
