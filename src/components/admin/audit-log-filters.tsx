'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRangePicker } from '@/components/shared/date-range-picker';
import { X, Loader2 } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

const ACTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'deleted', label: 'Deleted' },
];

interface AuditLogFiltersProps {
  tableNames: string[];
}

export function AuditLogFilters({ tableNames }: AuditLogFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [action, setAction] = useState(searchParams.get('action') || 'all');
  const [tableName, setTableName] = useState(searchParams.get('table') || 'all');
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
      router.push(`/admin/audit-log?${params.toString()}`);
    });
  };

  const currentUrlFilters = {
    action: action !== 'all' ? action : undefined,
    table: tableName !== 'all' ? tableName : undefined,
    dateFrom: dateRange?.from?.toISOString().split('T')[0],
    dateTo: dateRange?.to?.toISOString().split('T')[0],
  };

  const handleClearFilters = () => {
    setAction('all');
    setTableName('all');
    setDateRange(undefined);
    startTransition(() => {
      router.push('/admin/audit-log');
    });
  };

  const hasActiveFilters =
    action !== 'all' || tableName !== 'all' || dateRange;

  const tableNameOptions = [
    { value: 'all', label: 'All Tables' },
    ...tableNames.map((name) => ({ value: name, label: name })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={action}
        onValueChange={(value) => {
          setAction(value);
          updateURL({ ...currentUrlFilters, action: value });
        }}
      >
        <SelectTrigger className="h-9 text-sm w-[150px]">
          <SelectValue placeholder="Action" />
        </SelectTrigger>
        <SelectContent>
          {ACTIONS.map((a) => (
            <SelectItem key={a.value} value={a.value}>
              {a.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={tableName}
        onValueChange={(value) => {
          setTableName(value);
          updateURL({ ...currentUrlFilters, table: value });
        }}
      >
        <SelectTrigger className="h-9 text-sm w-[180px]">
          <SelectValue placeholder="Table" />
        </SelectTrigger>
        <SelectContent>
          {tableNameOptions.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
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
        <Button variant="ghost" size="sm" onClick={handleClearFilters} disabled={isPending} className="h-9 text-slate-500 hover:text-slate-700">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <X className="h-4 w-4 mr-1" />
          )}
          Clear
        </Button>
      )}
    </div>
  );
}
