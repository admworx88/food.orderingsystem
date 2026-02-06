'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, ShoppingCart, DollarSign, Receipt, Clock } from 'lucide-react';
import type { DashboardStats } from '@/types/dashboard';

interface StatsCardsProps {
  stats: DashboardStats;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function ChangeIndicator({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="flex items-center text-sm text-slate-500">
        <Minus className="h-4 w-4 mr-1" />
        No change
      </span>
    );
  }

  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <span
      className={cn(
        'flex items-center text-sm font-medium',
        isPositive ? 'text-emerald-600' : 'text-rose-600'
      )}
    >
      <Icon className="h-4 w-4 mr-1" />
      {isPositive ? '+' : ''}
      {value.toFixed(1)}% vs yesterday
    </span>
  );
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Orders Today',
      value: stats.ordersToday.toString(),
      change: stats.ordersChange,
      icon: ShoppingCart,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
    {
      title: 'Revenue Today',
      value: formatCurrency(stats.revenueToday),
      change: stats.revenueChange,
      icon: DollarSign,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'Avg Order Value',
      value: formatCurrency(stats.avgOrderValue),
      change: stats.avgOrderChange,
      icon: Receipt,
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
    },
    {
      title: 'Active Orders',
      value: stats.activeOrders.toString(),
      change: null,
      icon: Clock,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="hover:shadow-lg hover:border-slate-200 transition-all group">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{card.title}</p>
                  <p className="text-3xl font-bold mt-3 admin-data text-slate-900">{card.value}</p>
                  {card.change !== null && (
                    <div className="mt-3">
                      <ChangeIndicator value={card.change} />
                    </div>
                  )}
                  {card.change === null && (
                    <p className="text-sm text-slate-500 mt-3">Currently processing</p>
                  )}
                </div>
                <div className={cn('p-3 rounded-xl transition-transform group-hover:scale-110', card.iconBg)}>
                  <Icon className={cn('h-6 w-6', card.iconColor)} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
