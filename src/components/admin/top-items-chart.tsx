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
import { UtensilsCrossed } from 'lucide-react';
import type { TopSellingItem } from '@/types/dashboard';

interface TopItemsChartProps {
  data: TopSellingItem[];
}

const BAR_COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444', '#06B6D4', '#F97316', '#84CC16'];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function TopItemsChart({ data }: TopItemsChartProps) {
  const chartData = data.slice(0, 8).map((item) => ({
    ...item,
    displayName: item.name.length > 22 ? `${item.name.slice(0, 22)}…` : item.name,
  }));

  if (data.length === 0) {
    return (
      <DataCard title="Top Selling Items" description="Today's best performers">
        <EmptyState
          icon={UtensilsCrossed}
          title="No sales data yet"
          description="Top items will appear here once orders are placed today."
          className="py-10"
        />
      </DataCard>
    );
  }

  return (
    <DataCard title="Top Selling Items" description="Today's best performers by order count">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Horizontal bar chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} vertical={true} />
              <XAxis
                type="number"
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="displayName"
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={110}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'orderCount') return [Number(value), 'Orders'];
                  return [Number(value), String(name)];
                }}
                labelFormatter={(label) => {
                  const item = chartData.find((d) => d.displayName === label);
                  return item?.name || String(label);
                }}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="orderCount" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Ranked list */}
        <div className="space-y-1">
          {data.slice(0, 8).map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0"
            >
              <span
                className="text-xs font-bold w-5 text-right shrink-0"
                style={{ color: BAR_COLORS[index % BAR_COLORS.length] }}
              >
                #{index + 1}
              </span>
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: BAR_COLORS[index % BAR_COLORS.length] }}
              />
              <span className="text-sm text-slate-700 flex-1 truncate">{item.name}</span>
              <span className="text-xs text-slate-400 tabular-nums shrink-0">{item.orderCount}×</span>
              <span className="text-sm font-semibold text-slate-800 tabular-nums shrink-0 w-20 text-right">
                {formatCurrency(item.revenue)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </DataCard>
  );
}
