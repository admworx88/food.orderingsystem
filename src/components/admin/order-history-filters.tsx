'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRangePicker } from '@/components/shared/date-range-picker';
import { Search, X, Loader2 } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { ReportExport } from './report-export';
import type { OrderFilters } from '@/services/order-service';

const ORDER_STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending_payment', label: 'Pending Payment' },
  { value: 'paid', label: 'Paid' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'served', label: 'Served' },
  { value: 'cancelled', label: 'Cancelled' },
];

const ORDER_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'dine_in', label: 'Dine In' },
  { value: 'room_service', label: 'Room Service' },
  { value: 'takeout', label: 'Takeout' },
  { value: 'ocean_view', label: 'Ocean View' },
];

const PAYMENT_STATUSES = [
  { value: 'all', label: 'All Payment' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'processing', label: 'Processing' },
  { value: 'paid', label: 'Paid' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'expired', label: 'Expired' },
];

export function OrderHistoryFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [orderType, setOrderType] = useState(searchParams.get('orderType') || 'all');
  const [paymentStatus, setPaymentStatus] = useState(
    searchParams.get('paymentStatus') || 'all'
  );
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const from = searchParams.get('dateFrom');
    const to = searchParams.get('dateTo');
    if (from) {
      return {
        from: new Date(from),
        to: to ? new Date(to) : undefined,
      };
    }
    return undefined;
  });

  const updateURL = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    // Reset to page 1 when filters change
    params.delete('page');

    startTransition(() => {
      router.push(`/admin/order-history?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateURL({ search: search || undefined });
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatus('all');
    setOrderType('all');
    setPaymentStatus('all');
    setDateRange(undefined);
    startTransition(() => {
      router.push('/admin/order-history');
    });
  };

  const hasActiveFilters =
    search ||
    status !== 'all' ||
    orderType !== 'all' ||
    paymentStatus !== 'all' ||
    dateRange;

  // Get current URL params for updates (excludes page/pageSize which are numbers)
  const currentUrlFilters = {
    search: search || undefined,
    status: status !== 'all' ? status : undefined,
    orderType: orderType !== 'all' ? orderType : undefined,
    paymentStatus: paymentStatus !== 'all' ? paymentStatus : undefined,
    dateFrom: dateRange?.from?.toISOString().split('T')[0],
    dateTo: dateRange?.to?.toISOString().split('T')[0],
  };

  // Get current filters for export
  const currentFilters: OrderFilters = {
    ...currentUrlFilters,
    dateFrom: dateRange?.from?.toISOString(),
    dateTo: dateRange?.to?.toISOString(),
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by order # or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </Button>
      </form>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            updateURL({ ...currentUrlFilters, status: value });
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={orderType}
          onValueChange={(value) => {
            setOrderType(value);
            updateURL({ ...currentUrlFilters, orderType: value });
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Order Type" />
          </SelectTrigger>
          <SelectContent>
            {ORDER_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={paymentStatus}
          onValueChange={(value) => {
            setPaymentStatus(value);
            updateURL({ ...currentUrlFilters, paymentStatus: value });
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_STATUSES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DateRangePicker
          value={dateRange}
          onChange={(range) => {
            setDateRange(range);
            updateURL({
              ...currentUrlFilters,
              dateFrom: range?.from?.toISOString().split('T')[0],
              dateTo: range?.to?.toISOString().split('T')[0],
            });
          }}
          placeholder="Select date range"
        />

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}

        <div className="ml-auto">
          <ReportExport filters={currentFilters} />
        </div>
      </div>
    </div>
  );
}
