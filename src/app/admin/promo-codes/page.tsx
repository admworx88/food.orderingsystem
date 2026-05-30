import { getPromoCodes } from '@/services/promo-service';
import { PromoCodeTable } from '@/components/admin/promo-code-table';
import { PageHeader } from '@/components/admin/page-header';
import { AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PromoCodesPage() {
  const result = await getPromoCodes();

  if (!result.success) {
    return (
      <div>
        <PageHeader title="Promo Codes" description="Manage discount codes and promotions." />
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load promo codes</h2>
          <p className="text-gray-500">{result.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Promo Codes" description="Manage discount codes and promotions." />
      <PromoCodeTable promoCodes={result.data} />
    </div>
  );
}
