'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { DataCard } from '@/components/admin/data-card';
import { EmptyState } from '@/components/admin/empty-state';
import { BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import type { SalesByCategoryItem } from '@/types/dashboard';

interface ReportByCategoryChartProps {
  data: SalesByCategoryItem[];
}

const CATEGORY_COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444', '#06B6D4'];

export function ReportByCategoryChart({ data }: ReportByCategoryChartProps) {
  if (data.length === 0) {
    return (
      <DataCard title="Revenue by Category">
        <EmptyState
          icon={BarChart3}
          title="No data for selected period"
          description="Try selecting a different date range."
          className="py-12"
        />
      </DataCard>
    );
  }

  const total = data.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <DataCard title="Revenue by Category" description={`${formatCurrency(total)} total`}>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="categoryName"
              stroke="#94A3B8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={4}
            />
            <YAxis
              stroke="#94A3B8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
              width={48}
            />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value) || 0), 'Revenue']}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                fontSize: '12px',
              }}
              cursor={{ fill: '#F8FAFC' }}
            />
            <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={56}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Ranked list below chart */}
      <div className="mt-4 space-y-1 border-t border-slate-100 pt-4">
        {data.map((item, index) => (
          <div key={item.categoryName} className="flex items-center gap-3 py-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
            />
            <span className="text-sm text-slate-700 flex-1">{item.categoryName}</span>
            <span className="text-xs text-slate-400 tabular-nums">{item.orderCount} orders</span>
            <span className="text-sm font-semibold text-slate-800 tabular-nums w-20 text-right">
              {formatCurrency(item.revenue)}
            </span>
          </div>
        ))}
      </div>
    </DataCard>
  );
}
