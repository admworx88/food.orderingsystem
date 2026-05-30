import { Suspense } from 'react';
import {
  getAuditLogs,
  getAuditLogTableNames,
  type AuditLogFilters,
} from '@/services/analytics-service';
import { AuditLogTable } from '@/components/admin/audit-log-table';
import { AuditLogFilters as AuditLogFiltersComponent } from '@/components/admin/audit-log-filters';
import { PageHeader } from '@/components/admin/page-header';
import { DataCard } from '@/components/admin/data-card';
import { PaginationInfo } from '@/components/shared/pagination';
import { AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface AuditLogPageProps {
  searchParams: Promise<{
    action?: string;
    table?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}

function AuditLogLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  );
}

async function AuditLogContent({ filters }: { filters: AuditLogFilters }) {
  const result = await getAuditLogs(filters);

  if (!result.success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Failed to load audit logs</h2>
        <p className="text-slate-500">{result.error}</p>
      </div>
    );
  }

  const { logs, total, page, limit, totalPages } = result.data;

  return (
    <div>
      <AuditLogTable logs={logs} />
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 py-3 border-t border-slate-100">
          <PaginationInfo currentPage={page} pageSize={limit} totalItems={total} />
          <AuditLogPagination currentPage={page} totalPages={totalPages} filters={filters} />
        </div>
      )}
    </div>
  );
}

function AuditLogPagination({
  currentPage,
  totalPages,
  filters,
}: {
  currentPage: number;
  totalPages: number;
  filters: AuditLogFilters;
}) {
  const buildPageUrl = (page: number) => {
    const params = new URLSearchParams();
    if (filters.action && filters.action !== 'all') params.set('action', filters.action);
    if (filters.table_name && filters.table_name !== 'all') params.set('table', filters.table_name);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    params.set('page', page.toString());
    return `/admin/audit-log?${params.toString()}`;
  };

  return (
    <nav className="flex items-center gap-1">
      {currentPage > 1 && (
        <Link
          href={buildPageUrl(currentPage - 1)}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-medium transition-colors"
        >
          Previous
        </Link>
      )}
      <span className="px-3 py-1.5 text-sm text-slate-500">
        Page {currentPage} of {totalPages}
      </span>
      {currentPage < totalPages && (
        <Link
          href={buildPageUrl(currentPage + 1)}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-medium transition-colors"
        >
          Next
        </Link>
      )}
    </nav>
  );
}

export default async function AuditLogPage({ searchParams }: AuditLogPageProps) {
  const params = await searchParams;

  const filters: AuditLogFilters = {
    action: params.action,
    table_name: params.table,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    page: params.page ? parseInt(params.page, 10) : 1,
    limit: 20,
  };

  const tableNamesResult = await getAuditLogTableNames();
  const tableNames = tableNamesResult.success ? tableNamesResult.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Track all data changes across the system"
      />

      <DataCard>
        <Suspense fallback={<AuditLogLoading />}>
          <AuditLogFiltersComponent tableNames={tableNames} />
        </Suspense>
      </DataCard>

      <DataCard padding="none">
        <Suspense fallback={<AuditLogLoading />}>
          <AuditLogContent filters={filters} />
        </Suspense>
      </DataCard>
    </div>
  );
}
