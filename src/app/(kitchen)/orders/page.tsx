'use client';

import dynamic from 'next/dynamic';

const OrderQueue = dynamic(
  () => import('@/components/kitchen/order-queue').then((mod) => ({ default: mod.OrderQueue })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 animate-spin border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Loading Kitchen Display...</p>
        </div>
      </div>
    ),
  }
);

export default function KitchenOrdersPage() {
  return <OrderQueue />;
}
