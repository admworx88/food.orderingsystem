'use client';

import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils/currency';
import type { ShiftSummary } from '@/types/payment';

interface ShiftSummaryViewProps {
  summary: ShiftSummary;
}

/**
 * F-C09: Shift summary / reconciliation display.
 * Shows total orders, revenue by payment method, refunds, cancellations.
 */
export function ShiftSummaryView({ summary }: ShiftSummaryViewProps) {
  return (
    <div className="space-y-6">
      {/* Header info */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Date</div>
            <div className="text-lg font-semibold">{summary.date}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Cashier</div>
            <div className="text-lg font-semibold">{summary.cashierName}</div>
          </div>
        </div>
      </Card>

      {/* Revenue summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Orders</div>
          <div className="text-3xl font-bold">{summary.totalOrders}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Revenue</div>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(summary.totalRevenue)}
          </div>
        </Card>
      </div>

      {/* Payment method breakdown */}
      <Card className="p-4">
        <h3 className="mb-3 text-lg font-semibold">Payment Breakdown</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Cash</div>
              <div className="text-sm text-muted-foreground">
                {summary.cashPayments.count} transaction{summary.cashPayments.count !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="text-lg font-semibold">
              {formatCurrency(summary.cashPayments.total)}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">GCash</div>
              <div className="text-sm text-muted-foreground">
                {summary.gcashPayments.count} transaction{summary.gcashPayments.count !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="text-lg font-semibold">
              {formatCurrency(summary.gcashPayments.total)}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Card</div>
              <div className="text-sm text-muted-foreground">
                {summary.cardPayments.count} transaction{summary.cardPayments.count !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="text-lg font-semibold">
              {formatCurrency(summary.cardPayments.total)}
            </div>
          </div>
        </div>
      </Card>

      {/* Refunds & Cancellations */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Refunds</div>
          <div className="text-xl font-bold text-red-600">
            {summary.refunds.count > 0
              ? `-${formatCurrency(summary.refunds.total)}`
              : formatCurrency(0)}
          </div>
          <div className="text-xs text-muted-foreground">
            {summary.refunds.count} refund{summary.refunds.count !== 1 ? 's' : ''}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Cancelled</div>
          <div className="text-xl font-bold">{summary.cancelledOrders}</div>
          <div className="text-xs text-muted-foreground">orders</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Expired</div>
          <div className="text-xl font-bold">{summary.expiredOrders}</div>
          <div className="text-xs text-muted-foreground">orders</div>
        </Card>
      </div>
    </div>
  );
}
