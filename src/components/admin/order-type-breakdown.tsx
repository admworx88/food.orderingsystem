'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { DataCard } from '@/components/admin/data-card';
import { EmptyState } from '@/components/admin/empty-state';
import { PieChart as PieIcon } from 'lucide-react';
import type { OrderTypeData } from '@/types/dashboard';

interface OrderTypeBreakdownProps {
  data: OrderTypeData[];
}

export function OrderTypeBreakdown({ data }: OrderTypeBreakdownProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <DataCard title="Order Types" description="Distribution by type today">
        <EmptyState
          icon={PieIcon}
          title="No orders yet"
          description="Order type data will appear here once orders come in today."
          className="py-10"
        />
      </DataCard>
    );
  }

  return (
    <DataCard title="Order Types" description={`${total} orders today`}>
      <div className="flex items-center gap-4">
        {/* Donut */}
        <div className="h-44 w-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={44}
                outerRadius={68}
                paddingAngle={2}
                dataKey="count"
                nameKey="label"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [
                  `${Number(value) || 0} orders`,
                  String(name),
                ]}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend list */}
        <div className="flex-1 space-y-3 min-w-0">
          {data.map((item) => (
            <div key={item.type} className="flex items-center gap-2.5">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-700 truncate">{item.label}</span>
                  <span className="text-xs font-bold text-slate-900 tabular-nums shrink-0">
                    {item.count}
                  </span>
                </div>
                <div className="mt-1 h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                      opacity: 0.7,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DataCard>
  );
}
