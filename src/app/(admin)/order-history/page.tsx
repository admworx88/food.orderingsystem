import { Suspense } from 'react';
import { getOrders, type OrderFilters } from '@/services/order-service';
import { OrderHistoryTable } from '@/components/admin/order-history-table';
import { OrderHistoryFilters } from '@/components/admin/order-history-filters';
import { Pagination, PaginationInfo } from '@/components/shared/pagination';
import { AlertCircle, ClipboardList, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface OrderHistoryPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    orderType?: string;
    paymentStatus?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}

function OrderHistoryLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  );
}

async function OrderHistoryContent({
  filters,
}: {
  filters: OrderFilters;
}) {
  const result = await getOrders(filters);

  if (!result.success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Failed to load orders
        </h2>
        <p className="text-gray-500">{result.error}</p>
      </div>
    );
  }

  const { orders, total, page, pageSize, totalPages } = result.data;

  return (
    <div className="space-y-4">
      <OrderHistoryTable orders={orders} />

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4">
          <PaginationInfo
            currentPage={page}
            pageSize={pageSize}
            totalItems={total}
          />
          <PaginationWrapper
            currentPage={page}
            totalPages={totalPages}
            filters={filters}
          />
        </div>
      )}

      {total === 0 && !filters.search && !filters.status && !filters.orderType && (
        <div className="text-center py-8">
          <p className="text-gray-500">
            No orders in the system yet. Orders will appear here once customers
            start placing orders.
          </p>
        </div>
      )}
    </div>
  );
}

function PaginationWrapper({
  currentPage,
  totalPages,
  filters,
}: {
  currentPage: number;
  totalPages: number;
  filters: OrderFilters;
}) {
  const buildPageUrl = (page: number) => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    if (filters.orderType) params.set('orderType', filters.orderType);
    if (filters.paymentStatus) params.set('paymentStatus', filters.paymentStatus);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    params.set('page', page.toString());
    return `/order-history?${params.toString()}`;
  };

  return (
    <nav className="flex items-center gap-1">
      {currentPage > 1 && (
        <Link
          href={buildPageUrl(currentPage - 1)}
          className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50"
        >
          Previous
        </Link>
      )}
      <span className="px-3 py-2 text-sm text-gray-600">
        Page {currentPage} of {totalPages}
      </span>
      {currentPage < totalPages && (
        <Link
          href={buildPageUrl(currentPage + 1)}
          className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50"
        >
          Next
        </Link>
      )}
    </nav>
  );
}

export default async function OrderHistoryPage({
  searchParams,
}: OrderHistoryPageProps) {
  const params = await searchParams;

  const filters: OrderFilters = {
    search: params.search,
    status: params.status,
    orderType: params.orderType,
    paymentStatus: params.paymentStatus,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    page: params.page ? parseInt(params.page, 10) : 1,
    pageSize: 20,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Order History
        </h1>
        <p className="text-gray-600 mt-1">
          Search and view past orders, export reports
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <Suspense fallback={<OrderHistoryLoading />}>
          <OrderHistoryFilters />
        </Suspense>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border">
        <Suspense fallback={<OrderHistoryLoading />}>
          <OrderHistoryContent filters={filters} />
        </Suspense>
      </div>
    </div>
  );
}
