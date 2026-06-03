import { cn } from '@/lib/utils';

interface DataCardProps {
  title?: string;
  description?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  padding?: 'default' | 'compact' | 'none';
  className?: string;
}

const paddingMap = {
  default: 'p-6',
  compact: 'p-4',
  none: '',
};

export function DataCard({
  title,
  description,
  headerAction,
  children,
  padding = 'default',
  className,
}: DataCardProps) {
  const hasHeader = title || headerAction;

  return (
    <div className={cn('bg-white rounded-xl border border-slate-200 shadow-sm', className)}>
      {hasHeader && (
        <div className={cn(
          'flex items-center justify-between gap-4',
          padding !== 'none' ? 'px-6 pt-5 pb-4 border-b border-slate-100' : 'p-4 border-b border-slate-100'
        )}>
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            )}
            {description && (
              <p className="text-xs text-slate-400 mt-0.5">{description}</p>
            )}
          </div>
          {headerAction && (
            <div className="shrink-0">{headerAction}</div>
          )}
        </div>
      )}
      <div className={cn(hasHeader ? paddingMap[padding] : paddingMap[padding])}>
        {children}
      </div>
    </div>
  );
}
