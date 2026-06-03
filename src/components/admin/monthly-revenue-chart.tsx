'use client';

import { useState, useEffect } from 'react';
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
import { getMonthlyRevenueData } from '@/services/analytics-service';
import type { RevenueDataPoint } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface MonthlyRevenueChartProps {
  initialData: RevenueDataPoint[];
  initialYear: number;
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

export function MonthlyRevenueChart({ initialData, initialYear }: MonthlyRevenueChartProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const years = [currentYear - 2, currentYear - 1, currentYear];

  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedYear === initialYear) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    getMonthlyRevenueData(selectedYear).then((result) => {
      if (result.success) setData(result.data);
      setIsLoading(false);
    });
  }, [selectedYear, initialYear]);

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = data.reduce((sum, d) => sum + d.orders, 0);

  const yearFilter = (
    <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden shrink-0">
      {years.map((year, i) => (
        <button
          key={year}
          onClick={() => setSelectedYear(year)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
            i > 0 && 'border-l border-slate-200',
            selectedYear === year
              ? 'bg-amber-500 text-white'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
          )}
          aria-pressed={selectedYear === year}
        >
          {year}
        </button>
      ))}
    </div>
  );

  return (
    <DataCard
      title="Monthly Revenue"
      description={`${formatCurrencyFull(totalRevenue)} · ${totalOrders} orders in ${selectedYear}`}
      headerAction={yearFilter}
    >
      <div
        className={cn(
          'h-64 transition-opacity duration-200',
          isLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'
        )}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
              formatter={(value, name) => {
                if (name === 'revenue') return [formatCurrencyFull(Number(value) || 0), 'Revenue'];
                return [Number(value), String(name)];
              }}
              labelFormatter={(label) => `${label} ${selectedYear}`}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                fontSize: '13px',
              }}
              cursor={{ fill: '#F8FAFC' }}
            />
            <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={44}>
              {data.map((entry, index) => {
                const isFuture = selectedYear === currentYear && index > currentMonth;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={isFuture ? '#E2E8F0' : entry.revenue > 0 ? '#F59E0B' : '#FDE68A'}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </DataCard>
  );
}
