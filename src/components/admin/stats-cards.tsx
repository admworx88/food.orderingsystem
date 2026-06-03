'use client';

import { ShoppingCart, DollarSign, Receipt, Clock } from 'lucide-react';
import { KpiCard } from '@/components/admin/kpi-card';
import type { DashboardStats } from '@/types/dashboard';

interface StatsCardsProps {
  stats: DashboardStats;
  isLive?: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function toTrend(value: number | null | undefined): { value: number; direction: 'up' | 'down' | 'neutral'; label: string } | undefined {
  if (value == null) return undefined;
  return {
    value: Math.abs(value),
    direction: value > 0 ? 'up' : value < 0 ? 'down' : 'neutral',
    label: 'vs yesterday',
  };
}

export function StatsCards({ stats, isLive }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        label="Orders Today"
        value={stats.ordersToday.toString()}
        trend={toTrend(stats.ordersChange)}
        icon={ShoppingCart}
        accentColor="amber"
      />
      <KpiCard
        label="Revenue Today"
        value={formatCurrency(stats.revenueToday)}
        trend={toTrend(stats.revenueChange)}
        icon={DollarSign}
        accentColor="green"
      />
      <KpiCard
        label="Avg Order Value"
        value={formatCurrency(stats.avgOrderValue)}
        trend={toTrend(stats.avgOrderChange)}
        icon={Receipt}
        accentColor="blue"
      />
      <KpiCard
        label="Active Orders"
        value={stats.activeOrders.toString()}
        icon={Clock}
        accentColor="violet"
        live={isLive}
      />
    </div>
  );
}
