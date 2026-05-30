'use client';

import { useRealtimeDashboard } from '@/hooks/use-realtime-dashboard';
import { StatsCards } from '@/components/admin/stats-cards';
import { SalesChart } from '@/components/admin/sales-chart';
import { TopItemsChart } from '@/components/admin/top-items-chart';
import { OrderTypeBreakdown } from '@/components/admin/order-type-breakdown';
import { MonthlyRevenueChart } from '@/components/admin/monthly-revenue-chart';
import type { DashboardData } from '@/types/dashboard';

interface DashboardClientProps {
  initialData: DashboardData;
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  const { data, isLive, lastUpdated } = useRealtimeDashboard(initialData);
  const dashboardData = data || initialData;

  return (
    <div className="space-y-6">
      {/* Last-updated caption */}
      {lastUpdated && (
        <p className="text-xs text-slate-400 -mt-4">
          Updated{' '}
          {lastUpdated.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })}
        </p>
      )}

      {/* KPI row */}
      <StatsCards stats={dashboardData.stats} isLive={isLive} />

      {/* Charts row: 2/3 revenue + 1/3 order types */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <SalesChart data={dashboardData.revenueChart} />
        <OrderTypeBreakdown data={dashboardData.orderTypeBreakdown} />
      </div>

      {/* Full-width monthly revenue with year filter */}
      <MonthlyRevenueChart
        initialData={dashboardData.monthlyRevenue}
        initialYear={new Date().getFullYear()}
      />

      {/* Full-width top items */}
      <TopItemsChart data={dashboardData.topItems} />
    </div>
  );
}
