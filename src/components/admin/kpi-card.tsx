import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiTrend {
  value: number;
  direction: 'up' | 'down' | 'neutral';
  label: string;
}

interface KpiCardProps {
  label: string;
  value: string;
  trend?: KpiTrend;
  icon: LucideIcon;
  accentColor?: 'amber' | 'blue' | 'green' | 'violet';
  live?: boolean;
  className?: string;
}

const accentMap = {
  amber: {
    leftBorder: 'border-l-amber-500',
    iconBg: 'bg-amber-50',
    iconText: 'text-amber-600',
  },
  blue: {
    leftBorder: 'border-l-blue-500',
    iconBg: 'bg-blue-50',
    iconText: 'text-blue-600',
  },
  green: {
    leftBorder: 'border-l-emerald-500',
    iconBg: 'bg-emerald-50',
    iconText: 'text-emerald-600',
  },
  violet: {
    leftBorder: 'border-l-violet-500',
    iconBg: 'bg-violet-50',
    iconText: 'text-violet-600',
  },
};

export function KpiCard({
  label,
  value,
  trend,
  icon: Icon,
  accentColor = 'amber',
  live = false,
  className,
}: KpiCardProps) {
  const accent = accentMap[accentColor];

  const TrendIcon =
    trend?.direction === 'up'
      ? TrendingUp
      : trend?.direction === 'down'
      ? TrendingDown
      : Minus;

  const trendColor =
    trend?.direction === 'up'
      ? 'text-emerald-600'
      : trend?.direction === 'down'
      ? 'text-red-500'
      : 'text-slate-400';

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-100 border-l-4 shadow-sm hover:shadow-md transition-shadow duration-200',
        accent.leftBorder,
        className
      )}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {label}
              </p>
              {live && (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-slate-900 tabular-nums truncate">{value}</p>
          </div>
          <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center shrink-0', accent.iconBg)}>
            <Icon className={cn('h-5 w-5', accent.iconText)} />
          </div>
        </div>

        {trend && (
          <div className={cn('flex items-center gap-1 mt-3 text-xs font-medium', trendColor)}>
            <TrendIcon className="h-3.5 w-3.5 shrink-0" />
            <span>
              {Math.abs(trend.value)}% {trend.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
