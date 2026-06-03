import { Suspense } from 'react';
import { getDashboardData } from '@/services/analytics-service';
import { DashboardClient } from '@/components/admin/dashboard-client';
import { DashboardSkeleton } from '@/components/admin/dashboard-skeleton';
import { PageHeader } from '@/components/admin/page-header';
import { AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function DashboardContent() {
  const result = await getDashboardData();

  if (!result.success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Failed to load dashboard
        </h2>
        <p className="text-gray-500">{result.error}</p>
      </div>
    );
  }

  return <DashboardClient initialData={result.data} />;
}

export default function AdminDashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Real-time overview of today's restaurant operations."
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
