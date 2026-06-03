'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { DataCard } from '@/components/admin/data-card';
import type { RevenueDataPoint } from '@/types/dashboard';

interface SalesChartProps {
  data: RevenueDataPoint[];
}

function formatCurrencyShort(amount: number): string {
  if (amount >= 1000) return `₱${(amount / 1000).toFixed(1)}k`;
  return `₱${amount.toFixed(0)}`;
}

function formatCurrencyFull(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function SalesChart({ data }: SalesChartProps) {
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = data.reduce((sum, d) => sum + d.orders, 0);

  return (
    <DataCard
      title="Revenue — Last 7 Days"
      description={`${formatCurrencyFull(totalRevenue)} from ${totalOrders} orders`}
      className="lg:col-span-2"
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="label"
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
              tickFormatter={formatCurrencyShort}
              width={52}
            />
            <Tooltip
              formatter={(value) => [formatCurrencyFull(Number(value) || 0), 'Revenue']}
              labelFormatter={(label) => `${label}`}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                fontSize: '13px',
              }}
              cursor={{ stroke: '#F59E0B', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#F59E0B"
              strokeWidth={2.5}
              fill="url(#revenueGrad)"
              dot={false}
              activeDot={{ r: 5, fill: '#F59E0B', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </DataCard>
  );
}
