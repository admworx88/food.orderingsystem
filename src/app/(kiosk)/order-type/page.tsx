'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Coffee, Home, ShoppingBag, Check } from 'lucide-react';
import { useCartStore, type OrderType } from '@/stores/cart-store';
import { ORDER_TYPE_CONFIG } from '@/lib/constants/order-types';
import { OceanViewIcon } from '@/components/kiosk/ocean-view-icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const ORDER_TYPE_ICONS: Record<OrderType, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  dine_in: Coffee,
  room_service: Home,
  takeout: ShoppingBag,
  ocean_view: OceanViewIcon,
};

export default function OrderTypePage() {
  const router = useRouter();
  const {
    orderType,
    setOrderType,
    tableNumber,
    setTableNumber,
    roomNumber,
    setRoomNumber,
  } = useCartStore();

  const selectedConfig = orderType ? ORDER_TYPE_CONFIG[orderType] : null;
  const canContinue = orderType && (
    (orderType === 'dine_in' ? tableNumber && tableNumber.trim().length > 0 : true) &&
    (orderType === 'room_service' ? roomNumber && roomNumber.trim().length > 0 : true)
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-amber-50 via-white to-stone-50 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 sm:top-20 left-5 sm:left-10 w-40 sm:w-64 h-40 sm:h-64 bg-amber-200/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 sm:bottom-20 right-5 sm:right-10 w-56 sm:w-96 h-56 sm:h-96 bg-amber-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-700 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={2} />
          <span className="text-sm font-medium">Back</span>
        </Link>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pb-6">
        <div className="max-w-2xl w-full">
          {/* Title */}
          <div className="text-center mb-8 sm:mb-10 animate-scale-in">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-stone-800 mb-2 sm:mb-3 tracking-tight font-display">
              How would you like to order?
            </h1>
            <p className="text-sm sm:text-base text-stone-500 font-medium">
              Choose your dining experience
            </p>
          </div>

          {/* Order type grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8 animate-fade-in-up animation-delay-200">
            {Object.values(ORDER_TYPE_CONFIG).map((config, index) => {
              const Icon = ORDER_TYPE_ICONS[config.value];
              const isSelected = orderType === config.value;
              return (
                <button
                  key={config.value}
                  onClick={() => setOrderType(config.value)}
                  className={cn(
                    'relative flex flex-col items-center justify-center p-5 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl border-2 transition-all min-h-[140px] sm:min-h-[160px] lg:min-h-[180px]',
                    isSelected
                      ? 'border-amber-500 bg-amber-50 shadow-lg shadow-amber-500/10'
                      : 'border-stone-200 bg-white/80 backdrop-blur-sm hover:border-stone-300 hover:bg-white hover:shadow-md',
                    'active:scale-[0.97] transition-all'
                  )}
                  style={{ animationDelay: `${(index + 1) * 100}ms` }}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-500 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" strokeWidth={3} />
                    </div>
                  )}
                  <Icon
                    className={cn(
                      'w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 mb-3 sm:mb-4',
                      isSelected ? 'text-amber-600' : 'text-stone-400'
                    )}
                    strokeWidth={2}
                  />
                  <h3
                    className={cn(
                      'text-sm sm:text-base lg:text-lg font-bold mb-1',
                      isSelected ? 'text-amber-900' : 'text-stone-700'
                    )}
                  >
                    {config.label}
                  </h3>
                  <p
                    className={cn(
                      'text-[10px] sm:text-xs lg:text-sm text-center leading-tight',
                      isSelected ? 'text-amber-700' : 'text-stone-500'
                    )}
                  >
                    {config.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Conditional inputs */}
          {orderType === 'dine_in' && (
            <div className="mb-6 sm:mb-8 animate-fade-in">
              <div className="bg-white rounded-xl sm:rounded-2xl border border-stone-200 p-4 sm:p-5">
                <label className="block text-xs sm:text-sm font-semibold text-stone-700 mb-2">
                  Table Number
                </label>
                <Input
                  type="text"
                  value={tableNumber || ''}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="Enter your table number"
                  className="h-11 sm:h-12 text-sm sm:text-base"
                  autoFocus
                />
              </div>
            </div>
          )}

          {orderType === 'room_service' && (
            <div className="mb-6 sm:mb-8 animate-fade-in">
              <div className="bg-white rounded-xl sm:rounded-2xl border border-stone-200 p-4 sm:p-5">
                <label className="block text-xs sm:text-sm font-semibold text-stone-700 mb-2">
                  Room Number
                </label>
                <Input
                  type="text"
                  value={roomNumber || ''}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="Enter your room number"
                  className="h-11 sm:h-12 text-sm sm:text-base"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* CTA Button */}
          <div className="text-center animate-fade-in-up animation-delay-400">
            <Button
              onClick={() => router.push('/menu')}
              disabled={!canContinue}
              className="inline-flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-8 sm:px-10 md:px-12 py-4 sm:py-5 md:py-6 rounded-xl sm:rounded-2xl text-base sm:text-lg font-bold shadow-2xl shadow-amber-500/30 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100 group h-auto"
            >
              <span>Continue to Menu</span>
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
