'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { OrderTypeData } from '@/types/dashboard';

interface OrderTypeBreakdownProps {
  data: OrderTypeData[];
}

export function OrderTypeBreakdown({ data }: OrderTypeBreakdownProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Order Types</CardTitle>
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
        <CardTitle className="text-xl font-semibold text-slate-900">Order Types</CardTitle>
        <p className="text-sm text-slate-600">Distribution by type today</p>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="count"
                nameKey="label"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [
                  `${Number(value) || 0} orders (${data.find((d) => d.label === String(name))?.percentage || 0}%)`,
                  String(name),
                ]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Stats below chart */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          {data.map((item) => (
            <div key={item.type} className="text-center">
              <div
                className="w-3 h-3 rounded-full mx-auto mb-1"
                style={{ backgroundColor: item.color }}
              />
              <p className="text-2xl font-bold admin-data text-slate-900">{item.count}</p>
              <p className="text-xs text-slate-600 font-medium">{item.label}</p>
              <p className="text-xs font-medium text-slate-500">{item.percentage}%</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
