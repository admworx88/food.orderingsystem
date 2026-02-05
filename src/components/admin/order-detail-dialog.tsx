'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Eye,
  Clock,
  Phone,
  MapPin,
  UtensilsCrossed,
  CreditCard,
  Loader2,
  Package,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { getOrderDetails } from '@/services/order-service';
import { formatCurrency } from '@/lib/utils/currency';
import { format } from 'date-fns';
import type { Database } from '@/lib/supabase/types';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type OrderEvent = Database['public']['Tables']['order_events']['Row'];
type OrderItemAddon = Database['public']['Tables']['order_item_addons']['Row'];

type OrderWithDetails = Order & {
  order_items: (OrderItem & {
    order_item_addons: OrderItemAddon[];
  })[];
  order_events: OrderEvent[];
};

interface OrderDetailDialogProps {
  orderId: string;
  orderNumber: string;
  trigger?: React.ReactNode;
}

function getStatusBadgeVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'served':
      return 'default';
    case 'ready':
      return 'secondary';
    case 'preparing':
      return 'outline';
    case 'paid':
      return 'outline';
    case 'cancelled':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function getPaymentStatusBadgeVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'paid':
      return 'default';
    case 'processing':
      return 'outline';
    case 'refunded':
      return 'secondary';
    case 'expired':
    case 'unpaid':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function formatOrderType(type: string): string {
  switch (type) {
    case 'dine_in':
      return 'Dine In';
    case 'room_service':
      return 'Room Service';
    case 'takeout':
      return 'Takeout';
    default:
      return type;
  }
}

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatEventType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function OrderDetailDialog({
  orderId,
  orderNumber,
  trigger,
}: OrderDetailDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderWithDetails | null>(null);

  useEffect(() => {
    if (open && !order) {
      loadOrderDetails();
    }
  }, [open]);

  const loadOrderDetails = async () => {
    setLoading(true);
    try {
      const result = await getOrderDetails(orderId);
      if (result.success) {
        setOrder(result.data);
      } else {
        toast.error(result.error);
        setOpen(false);
      }
    } catch {
      toast.error('Failed to load order details');
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Order #{orderNumber}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Full order details and timeline
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : order ? (
          <div className="space-y-6 mt-4">
            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant={getStatusBadgeVariant(order.status)}>
                {formatStatus(order.status)}
              </Badge>
              <Badge variant={getPaymentStatusBadgeVariant(order.payment_status)}>
                {formatStatus(order.payment_status)}
              </Badge>
              <Badge variant="outline">{formatOrderType(order.order_type)}</Badge>
            </div>

            {/* Order Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>
                  {format(new Date(order.created_at!), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
              {order.guest_phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{order.guest_phone}</span>
                </div>
              )}
              {order.table_number && (
                <div className="flex items-center gap-2 text-gray-600">
                  <UtensilsCrossed className="h-4 w-4" />
                  <span>Table {order.table_number}</span>
                </div>
              )}
              {order.room_number && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>Room {order.room_number}</span>
                </div>
              )}
              {order.payment_method && (
                <div className="flex items-center gap-2 text-gray-600">
                  <CreditCard className="h-4 w-4" />
                  <span className="capitalize">{order.payment_method}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Order Items */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Items ({order.order_items.length})
              </h3>
              <div className="space-y-3">
                {order.order_items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-start p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.item_name}</span>
                        <Badge variant="outline" className="text-xs">
                          ×{item.quantity}
                        </Badge>
                      </div>
                      {item.order_item_addons.length > 0 && (
                        <div className="mt-1 text-sm text-gray-500">
                          {item.order_item_addons.map((addon) => (
                            <span key={addon.id} className="mr-2">
                              + {addon.addon_name}
                              {addon.additional_price > 0 && (
                                <span className="text-gray-400">
                                  {' '}
                                  ({formatCurrency(addon.additional_price)})
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.special_instructions && (
                        <p className="mt-1 text-sm text-amber-600 italic">
                          Note: {item.special_instructions}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(item.total_price)}</p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(item.unit_price)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Order Totals */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span>{formatCurrency(order.tax_amount)}</span>
                </div>
              )}
              {order.service_charge && order.service_charge > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Charge</span>
                  <span>{formatCurrency(order.service_charge)}</span>
                </div>
              )}
              {order.discount_amount && order.discount_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discount_amount)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>{formatCurrency(order.total_amount)}</span>
              </div>
            </div>

            {order.special_instructions && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Special Instructions</h3>
                  <p className="text-sm text-gray-600 p-3 bg-amber-50 rounded-lg border border-amber-100">
                    {order.special_instructions}
                  </p>
                </div>
              </>
            )}

            {/* Timeline */}
            {order.order_events.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Order Timeline
                  </h3>
                  <div className="space-y-3">
                    {order.order_events
                      .sort(
                        (a, b) =>
                          new Date(a.created_at!).getTime() -
                          new Date(b.created_at!).getTime()
                      )
                      .map((event, index) => (
                        <div key={event.id} className="flex items-start gap-3">
                          <div className="relative">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                            {index < order.order_events.length - 1 && (
                              <div className="absolute top-4 left-0.5 w-0.5 h-full bg-gray-200" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <p className="font-medium text-sm">
                              {formatEventType(event.event_type)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {format(
                                new Date(event.created_at!),
                                'MMM d, yyyy h:mm:ss a'
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
