'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { TopSellingItem } from '@/types/dashboard';

interface TopItemsChartProps {
  data: TopSellingItem[];
}

const COLORS = ['#f59e0b', '#1e293b', '#334155', '#10b981', '#475569'];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function TopItemsChart({ data }: TopItemsChartProps) {
  // Truncate item names for display
  const chartData = data.map((item) => ({
    ...item,
    displayName: item.name.length > 15 ? `${item.name.slice(0, 15)}...` : item.name,
  }));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Top Selling Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-slate-500">
            No orders yet today
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-slate-900">Top Selling Items</CardTitle>
        <p className="text-sm text-slate-600">Today&apos;s best performers</p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
              <XAxis
                type="number"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="displayName"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip
                formatter={(value, name) => {
                  const numValue = Number(value) || 0;
                  if (name === 'orderCount') {
                    return [numValue, 'Orders'];
                  }
                  return [numValue, String(name)];
                }}
                labelFormatter={(label) => {
                  const item = chartData.find((d) => d.displayName === label);
                  return item?.name || String(label);
                }}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Bar dataKey="orderCount" radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* List view below chart */}
        <div className="mt-4 space-y-2">
          {data.map((item, index) => (
            <div key={item.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="font-medium text-sm text-slate-900">{item.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500 admin-data">{item.orderCount} orders</span>
                <span className="text-sm font-semibold text-slate-900 admin-data">{formatCurrency(item.revenue)}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
