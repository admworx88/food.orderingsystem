'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, BarChart3, List, CreditCard } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { ReportSummaryCards } from './report-summary-cards';
import { ReportByCategoryChart } from './report-by-category-chart';
import { ReportByItemTable } from './report-by-item-table';
import { ReportByPaymentChart } from './report-by-payment-chart';
import type {
  SalesReportSummary,
  SalesByCategoryItem,
  SalesByMenuItem,
  SalesByPaymentMethodItem,
} from '@/types/dashboard';

interface SalesReportClientProps {
  dateFrom: string;
  dateTo: string;
  summary: SalesReportSummary | null;
  byCategory: SalesByCategoryItem[];
  byItem: SalesByMenuItem[];
  byPaymentMethod: SalesByPaymentMethodItem[];
}

export function SalesReportClient({
  dateFrom,
  dateTo,
  summary,
  byCategory,
  byItem,
  byPaymentMethod,
}: SalesReportClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fromDate, setFromDate] = useState<Date>(parseISO(dateFrom));
  const [toDate, setToDate] = useState<Date>(parseISO(dateTo));

  const applyDateRange = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('from', format(fromDate, 'yyyy-MM-dd'));
    params.set('to', format(toDate, 'yyyy-MM-dd'));
    router.push(`/admin/reports?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Date range filter bar */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-3 flex-wrap shadow-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1">Period</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn('h-9 justify-start text-left font-normal text-sm', !fromDate && 'text-muted-foreground')}
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5 text-slate-400" />
              {format(fromDate, 'MMM d, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={fromDate} onSelect={(d) => d && setFromDate(d)} initialFocus />
          </PopoverContent>
        </Popover>

        <span className="text-slate-400 text-sm">→</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn('h-9 justify-start text-left font-normal text-sm', !toDate && 'text-muted-foreground')}
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5 text-slate-400" />
              {format(toDate, 'MMM d, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={toDate} onSelect={(d) => d && setToDate(d)} initialFocus />
          </PopoverContent>
        </Popover>

        <Button
          size="sm"
          onClick={applyDateRange}
          className="h-9 bg-amber-500 hover:bg-amber-600 text-white ml-1"
        >
          Apply
        </Button>
      </div>

      {/* Summary KPI cards */}
      <ReportSummaryCards summary={summary} />

      {/* Tabbed charts */}
      <Tabs defaultValue="category" className="space-y-4">
        <TabsList className="bg-slate-100 rounded-xl p-1 h-auto">
          <TabsTrigger
            value="category"
            className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-500 transition-all gap-2"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            By Category
          </TabsTrigger>
          <TabsTrigger
            value="item"
            className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-500 transition-all gap-2"
          >
            <List className="h-3.5 w-3.5" />
            By Item
          </TabsTrigger>
          <TabsTrigger
            value="payment"
            className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-500 transition-all gap-2"
          >
            <CreditCard className="h-3.5 w-3.5" />
            By Payment
          </TabsTrigger>
        </TabsList>

        <TabsContent value="category">
          <ReportByCategoryChart data={byCategory} />
        </TabsContent>
        <TabsContent value="item">
          <ReportByItemTable data={byItem} />
        </TabsContent>
        <TabsContent value="payment">
          <ReportByPaymentChart data={byPaymentMethod} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
