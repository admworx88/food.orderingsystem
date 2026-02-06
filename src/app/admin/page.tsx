import { Suspense } from 'react';
import { getDashboardData } from '@/services/analytics-service';
import { StatsCards } from '@/components/admin/stats-cards';
import { SalesChart } from '@/components/admin/sales-chart';
import { TopItemsChart } from '@/components/admin/top-items-chart';
import { OrderTypeBreakdown } from '@/components/admin/order-type-breakdown';
import { DashboardSkeleton } from '@/components/admin/dashboard-skeleton';
import { AlertCircle } from 'lucide-react';

async function DashboardContent() {
  const result = await getDashboardData();

  if (!result.success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Failed to load dashboard
        </h2>
        <p className="text-gray-500">{result.error}</p>
      </div>
    );
  }

  const { stats, revenueChart, topItems, orderTypeBreakdown } = result.data;

  return (
    <div className="space-y-8">
      {/* KPI Stats Cards */}
      <StatsCards stats={stats} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SalesChart data={revenueChart} />
        <OrderTypeBreakdown data={orderTypeBreakdown} />
      </div>

      {/* Top Items */}
      <TopItemsChart data={topItems} />
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Dashboard
        </h1>
        <p className="text-slate-600 mt-1">
          Welcome back! Here&apos;s what&apos;s happening today.
        </p>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
