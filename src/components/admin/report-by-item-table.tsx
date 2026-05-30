'use client';

import { useState, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowUpDown } from 'lucide-react';
import { UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import { DataCard } from '@/components/admin/data-card';
import { EmptyState } from '@/components/admin/empty-state';
import type { SalesByMenuItem } from '@/types/dashboard';

interface ReportByItemTableProps {
  data: SalesByMenuItem[];
}

type SortKey = 'name' | 'qtySold' | 'revenue' | 'avgPrice';
type SortDir = 'asc' | 'desc';

function SortButton({
  label,
  field,
  sortKey,
  onToggle,
}: {
  label: string;
  field: SortKey;
  sortKey: SortKey;
  onToggle: (key: SortKey) => void;
}) {
  return (
    <button
      onClick={() => onToggle(field)}
      className="flex items-center gap-1 hover:text-slate-900 transition-colors"
    >
      {label}
      <ArrowUpDown
        className={cn('h-3.5 w-3.5', sortKey === field ? 'text-amber-500' : 'text-slate-300')}
      />
    </button>
  );
}

export function ReportByItemTable({ data }: ReportByItemTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('desc');
      return key;
    });
  }, []);

  const sorted = [...data].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  if (data.length === 0) {
    return (
      <DataCard title="Sales by Item">
        <EmptyState
          icon={UtensilsCrossed}
          title="No data for selected period"
          description="Try selecting a different date range."
          className="py-12"
        />
      </DataCard>
    );
  }

  return (
    <DataCard title="Sales by Item" description={`${data.length} items sold`} padding="none">
      <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10">
            <TableRow className="border-b border-slate-200">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400 w-12 pl-6">#</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                <SortButton label="Item Name" field="name" sortKey={sortKey} onToggle={toggleSort} />
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-right">
                <SortButton label="Qty Sold" field="qtySold" sortKey={sortKey} onToggle={toggleSort} />
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-right">
                <SortButton label="Revenue" field="revenue" sortKey={sortKey} onToggle={toggleSort} />
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-right pr-6">
                <SortButton label="Avg Price" field="avgPrice" sortKey={sortKey} onToggle={toggleSort} />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((item, index) => (
              <TableRow
                key={item.menuItemId}
                className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
              >
                <TableCell className="pl-6">
                  <span
                    className={cn(
                      'text-xs font-bold tabular-nums',
                      index === 0 ? 'text-amber-500' : index === 1 ? 'text-slate-400' : index === 2 ? 'text-orange-400' : 'text-slate-300'
                    )}
                  >
                    #{index + 1}
                  </span>
                </TableCell>
                <TableCell className="font-medium text-sm text-slate-800">{item.name}</TableCell>
                <TableCell className="text-right text-sm tabular-nums text-slate-600">{item.qtySold}</TableCell>
                <TableCell className="text-right text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(item.revenue)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums text-slate-500 pr-6">{formatCurrency(item.avgPrice)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DataCard>
  );
}
