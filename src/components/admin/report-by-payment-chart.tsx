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
import { CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import type { SalesByPaymentMethodItem } from '@/types/dashboard';

interface ReportByPaymentChartProps {
  data: SalesByPaymentMethodItem[];
}

export function ReportByPaymentChart({ data }: ReportByPaymentChartProps) {
  if (data.length === 0) {
    return (
      <DataCard title="Payment Methods">
        <EmptyState
          icon={CreditCard}
          title="No data for selected period"
          description="Try selecting a different date range."
          className="py-12"
        />
      </DataCard>
    );
  }

  const chartData = data.map((d) => ({
    name: d.label,
    revenue: d.revenue,
    count: d.count,
    color: d.color,
  }));

  const total = data.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <DataCard title="Payment Methods" description={`${formatCurrency(total)} total revenue`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Horizontal bar chart */}
        <div className="h-52">
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
                tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={68}
              />
              <Tooltip
                formatter={(value, name) => [formatCurrency(Number(value) || 0), String(name)]}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="revenue" radius={[0, 4, 4, 0]} maxBarSize={28}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary list */}
        <div className="space-y-3">
          {data.map((method) => (
            <div key={method.method} className="flex items-center gap-3">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: method.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-slate-700 truncate">{method.label}</span>
                  <span className="text-sm font-bold text-slate-900 tabular-nums shrink-0">
                    {formatCurrency(method.revenue)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 tabular-nums">{method.count} orders</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DataCard>
  );
}
