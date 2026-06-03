'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import type { ShiftCollectionRecord } from '@/types/payment';
import { CollectionDetailDialog } from './collection-detail-dialog';

interface CollectionHistoryTableProps {
  records: ShiftCollectionRecord[];
}

function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(isoString));
}

export function CollectionHistoryTable({ records }: CollectionHistoryTableProps) {
  const [selected, setSelected] = useState<ShiftCollectionRecord | null>(null);

  return (
    <>
      <div className="pos-report-card">
        <h3 className="pos-report-section-title mb-4">Collection History</h3>

        {records.length === 0 ? (
          <p className="text-sm text-[var(--pos-text-muted)] text-center py-6">
            No submitted collections yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--pos-border)]">
                  <th className="text-left py-2 pr-4 font-semibold text-[var(--pos-text)] whitespace-nowrap">Remittance #</th>
                  <th className="text-left py-2 pr-4 font-semibold text-[var(--pos-text-muted)] whitespace-nowrap">Submitted</th>
                  <th className="text-left py-2 pr-4 font-semibold text-[var(--pos-text-muted)] whitespace-nowrap">Cashier</th>
                  <th className="text-right py-2 pr-4 font-semibold text-[var(--pos-text-muted)] whitespace-nowrap">Total Collections</th>
                  <th className="text-right py-2 pr-4 font-semibold text-[var(--pos-text-muted)] whitespace-nowrap">Net Cash</th>
                  <th className="py-2 w-6" />
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr
                    key={rec.id}
                    onClick={() => setSelected(rec)}
                    className="border-b border-[var(--pos-border)] hover:bg-stone-50 cursor-pointer transition-colors group"
                  >
                    <td className="py-2.5 pr-4 whitespace-nowrap">
                      <span className="font-bold text-[var(--pos-accent)]">{rec.remittance_number}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-[var(--pos-text-muted)] whitespace-nowrap">
                      {formatDate(rec.submitted_at)}
                    </td>
                    <td className="py-2.5 pr-4 text-[var(--pos-text-muted)]">
                      {rec.cashier_name}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-medium text-[var(--pos-text)] whitespace-nowrap">
                      {formatCurrency(rec.total_revenue)}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-semibold text-emerald-600 whitespace-nowrap">
                      {formatCurrency(rec.net_cash)}
                    </td>
                    <td className="py-2.5 text-[var(--pos-text-muted)] group-hover:text-[var(--pos-accent)]">
                      <ChevronRight className="w-4 h-4" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CollectionDetailDialog
        record={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
