'use client';

import { DollarSign, ShoppingCart, Receipt, Tag } from 'lucide-react';
import { KpiCard } from '@/components/admin/kpi-card';
import { formatCurrency } from '@/lib/utils/currency';
import type { SalesReportSummary } from '@/types/dashboard';

interface ReportSummaryCardsProps {
  summary: SalesReportSummary | null;
}

export function ReportSummaryCards({ summary }: ReportSummaryCardsProps) {
  if (!summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        label="Total Revenue"
        value={formatCurrency(summary.totalRevenue)}
        icon={DollarSign}
        accentColor="green"
      />
      <KpiCard
        label="Total Orders"
        value={summary.totalOrders.toLocaleString()}
        icon={ShoppingCart}
        accentColor="amber"
      />
      <KpiCard
        label="Avg Order Value"
        value={formatCurrency(summary.avgOrderValue)}
        icon={Receipt}
        accentColor="blue"
      />
      <KpiCard
        label="Top Category"
        value={summary.topCategory || 'N/A'}
        icon={Tag}
        accentColor="violet"
      />
    </div>
  );
}
