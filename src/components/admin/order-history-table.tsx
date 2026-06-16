'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { OrderDetailDialog } from './order-detail-dialog';
import { StatusBadge } from '@/components/admin/status-badge';
import { DataCard } from '@/components/admin/data-card';
import { EmptyState } from '@/components/admin/empty-state';
import { formatCurrency } from '@/lib/utils/currency';
import { format } from 'date-fns';
import { ClipboardList, Phone, MapPin, UtensilsCrossed, Waves } from 'lucide-react';
import type { Database } from '@/lib/supabase/types';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type OrderItemAddon = Database['public']['Tables']['order_item_addons']['Row'];

type OrderWithItems = Order & {
  order_items: (OrderItem & {
    order_item_addons: OrderItemAddon[];
  })[];
};

interface OrderHistoryTableProps {
  orders: OrderWithItems[];
}

function formatOrderType(type: string): string {
  switch (type) {
    case 'dine_in':
      return 'Dine In';
    case 'room_service':
      return 'Room Service';
    case 'takeout':
      return 'Takeout';
    case 'ocean_view':
      return 'Ocean View';
    default:
      return type;
  }
}

function getOrderTypeIcon(type: string) {
  switch (type) {
    case 'dine_in':
      return <UtensilsCrossed className="h-3.5 w-3.5" />;
    case 'room_service':
      return <MapPin className="h-3.5 w-3.5" />;
    case 'takeout':
      return <ClipboardList className="h-3.5 w-3.5" />;
    case 'ocean_view':
      return <Waves className="h-3.5 w-3.5" />;
    default:
      return null;
  }
}

export function OrderHistoryTable({ orders }: OrderHistoryTableProps) {
  if (orders.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No orders found"
        description="Try adjusting your search or filter criteria."
      />
    );
  }

  return (
    <DataCard padding="none">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 border-b border-slate-200">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400 py-3">Order #</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400 py-3">Type</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400 py-3">Items</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400 py-3">Contact</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400 py-3">Total</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400 py-3">Status</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400 py-3">Payment</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400 py-3">Date</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400 py-3 w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow
                key={order.id}
                className="hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100 last:border-0"
              >
                <TableCell>
                  <span className="font-mono font-semibold text-amber-600">
                    {order.order_number}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="gap-1 capitalize">
                    {getOrderTypeIcon(order.order_type)}
                    {formatOrderType(order.order_type)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {order.order_items.length} item
                    {order.order_items.length !== 1 ? 's' : ''}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="text-sm space-y-1">
                    {order.guest_phone && (
                      <div className="flex items-center gap-1 text-slate-600">
                        <Phone className="h-3 w-3" />
                        {order.guest_phone}
                      </div>
                    )}
                    {order.table_number && (
                      <div className="flex items-center gap-1 text-slate-500">
                        Table {order.table_number}
                      </div>
                    )}
                    {order.room_number && (
                      <div className="flex items-center gap-1 text-slate-500">
                        Room {order.room_number}
                      </div>
                    )}
                    {!order.guest_phone && !order.table_number && !order.room_number && (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-semibold">
                    {formatCurrency(order.total_amount)}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={order.status} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={order.payment_status} />
                </TableCell>
                <TableCell>
                  <div className="text-sm text-slate-500">
                    {format(new Date(order.created_at!), 'MMM d, yyyy')}
                    <br />
                    <span className="text-xs">
                      {format(new Date(order.created_at!), 'h:mm a')}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <OrderDetailDialog
                    orderId={order.id}
                    orderNumber={order.order_number}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DataCard>
  );
}
