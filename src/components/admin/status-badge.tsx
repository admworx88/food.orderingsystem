import { cn } from '@/lib/utils';

type OrderStatus = 'pending_payment' | 'paid' | 'preparing' | 'ready' | 'served' | 'cancelled';
type GenericStatus = 'active' | 'inactive' | 'expired' | 'upcoming';
type UserRole = 'admin' | 'cashier' | 'kitchen' | 'waiter';
type PaymentMethod = 'cash' | 'gcash' | 'card' | 'bill_later' | 'ewallet';
type PromoStatus = 'active' | 'inactive' | 'expired' | 'upcoming';

export type StatusVariant =
  | OrderStatus
  | GenericStatus
  | UserRole
  | PaymentMethod;

interface StatusConfig {
  label: string;
  className: string;
}

const statusMap: Record<string, StatusConfig> = {
  // Order statuses
  pending_payment: { label: 'Pending Payment', className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  paid: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  preparing: { label: 'Preparing', className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  ready: { label: 'Ready', className: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200' },
  served: { label: 'Served', className: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' },
  cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-600 ring-1 ring-red-200' },

  // Generic statuses
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  inactive: { label: 'Inactive', className: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200' },
  expired: { label: 'Expired', className: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200' },
  upcoming: { label: 'Upcoming', className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },

  // User roles
  admin: { label: 'Admin', className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  cashier: { label: 'Cashier', className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  kitchen: { label: 'Kitchen', className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  waiter: { label: 'Waiter', className: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200' },

  // Payment methods
  cash: { label: 'Cash', className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  gcash: { label: 'GCash', className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  card: { label: 'Card', className: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200' },
  bill_later: { label: 'Bill Later', className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  ewallet: { label: 'E-Wallet', className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
};

interface StatusBadgeProps {
  status: StatusVariant | string;
  className?: string;
  dot?: boolean;
}

export function StatusBadge({ status, className, dot = false }: StatusBadgeProps) {
  const config = statusMap[status] ?? {
    label: status,
    className: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold',
        config.className,
        className
      )}
    >
      {dot && (
        <span className={cn(
          'h-1.5 w-1.5 rounded-full shrink-0',
          status === 'active' || status === 'paid' || status === 'served' || status === 'cash'
            ? 'bg-emerald-500'
            : status === 'cancelled' || status === 'expired' || status === 'inactive'
            ? 'bg-slate-400'
            : 'bg-current opacity-70'
        )} />
      )}
      {config.label}
    </span>
  );
}
