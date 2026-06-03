'use client';

import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import type { ShiftPaymentRow } from '@/types/payment';

interface CollectionsPaymentsListProps {
  payments: ShiftPaymentRow[];
}

function formatPHTime(isoString: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(isoString));
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    refunded: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    failed: 'bg-red-500/15 text-red-400 border border-red-500/30',
    pending: 'bg-slate-500/15 text-slate-400 border border-slate-500/30',
  };
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', styles[status] ?? styles.pending)}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function MethodLabel({ method }: { method: string }) {
  const labels: Record<string, string> = {
    cash: 'Cash', gcash: 'GCash', card: 'Card', ewallet: 'eWallet', bill_later: 'Bill Later',
  };
  return <span>{labels[method] ?? method.toUpperCase()}</span>;
}

export function CollectionsPaymentsList({ payments }: CollectionsPaymentsListProps) {
  if (payments.length === 0) {
    return (
      <div className="pos-report-card flex flex-col items-center gap-3 py-10 text-[var(--pos-text-muted)]">
        <p className="text-sm">No payments recorded in this shift yet.</p>
      </div>
    );
  }

  return (
    <div className="pos-report-card overflow-hidden">
      <h3 className="pos-report-section-title mb-3">Payment Transactions</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--pos-border)]">
              <th className="text-left py-2 px-3 text-[var(--pos-text-muted)] font-medium">Order</th>
              <th className="text-left py-2 px-3 text-[var(--pos-text-muted)] font-medium">Method</th>
              <th className="text-right py-2 px-3 text-[var(--pos-text-muted)] font-medium">Amount</th>
              <th className="text-center py-2 px-3 text-[var(--pos-text-muted)] font-medium">Status</th>
              <th className="text-right py-2 px-3 text-[var(--pos-text-muted)] font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p, i) => (
              <tr key={p.id} className={cn('border-b border-[var(--pos-border)]/40', i % 2 === 0 ? '' : 'bg-white/[0.02]')}>
                <td className="py-2 px-3 font-mono text-[var(--pos-text)]">{p.order_number}</td>
                <td className="py-2 px-3 text-[var(--pos-text-muted)]"><MethodLabel method={p.method} /></td>
                <td className="py-2 px-3 text-right font-medium text-[var(--pos-text)]">
                  {p.status === 'refunded' ? (
                    <span className="text-amber-400">-{formatCurrency(p.amount)}</span>
                  ) : formatCurrency(p.amount)}
                </td>
                <td className="py-2 px-3 text-center"><StatusBadge status={p.status} /></td>
                <td className="py-2 px-3 text-right text-[var(--pos-text-muted)] text-xs">{formatPHTime(p.completed_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
