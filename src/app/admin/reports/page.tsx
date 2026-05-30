import { Suspense } from 'react';
import { SalesReportClient } from '@/components/admin/sales-report-client';
import { PageHeader } from '@/components/admin/page-header';
import { subDays, format } from 'date-fns';
import {
  getSalesReport,
  getSalesByCategory,
  getSalesByItem,
  getSalesByPaymentMethod,
} from '@/services/analytics-service';

export const dynamic = 'force-dynamic';

interface ReportsPageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;
  const today = new Date();
  const defaultFrom = format(subDays(today, 30), 'yyyy-MM-dd');
  const defaultTo = format(today, 'yyyy-MM-dd');

  const dateFrom = params.from || defaultFrom;
  const dateTo = params.to || defaultTo;

  const [summaryResult, categoryResult, itemResult, paymentResult] = await Promise.all([
    getSalesReport(dateFrom, dateTo),
    getSalesByCategory(dateFrom, dateTo),
    getSalesByItem(dateFrom, dateTo),
    getSalesByPaymentMethod(dateFrom, dateTo),
  ]);

  return (
    <div>
      <PageHeader
        title="Sales Reports"
        description="Analyze revenue, categories, items, and payment methods."
      />
      <Suspense fallback={<div className="text-slate-500 py-8 text-sm">Loading reports…</div>}>
        <SalesReportClient
          dateFrom={dateFrom}
          dateTo={dateTo}
          summary={summaryResult.success ? summaryResult.data : null}
          byCategory={categoryResult.success ? categoryResult.data : []}
          byItem={itemResult.success ? itemResult.data : []}
          byPaymentMethod={paymentResult.success ? paymentResult.data : []}
        />
      </Suspense>
    </div>
  );
}
