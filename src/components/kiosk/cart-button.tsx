'use client';

import { ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';

interface CartButtonProps {
  itemCount: number;
  total: number;
  onClick: () => void;
  className?: string;
}

export function CartButton({ itemCount, total, onClick, className }: CartButtonProps) {
  const hasItems = itemCount > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-6 right-6 z-40 flex items-center gap-3 min-h-[64px] rounded-2xl transition-all duration-300',
        'shadow-2xl shadow-amber-500/30 active:scale-95',
        hasItems
          ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 bg-[length:200%_100%] hover:bg-[position:100%_0] text-white pl-5 pr-6'
          : 'bg-white text-stone-600 border border-stone-200 px-5 hover:shadow-lg',
        className
      )}
      aria-label={hasItems ? `View cart with ${itemCount} items` : 'View empty cart'}
    >
      <div className="relative">
        <ShoppingBag className={cn('w-6 h-6', hasItems ? 'text-white' : 'text-stone-500')} />
        {hasItems && (
          <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-amber-600 text-xs font-bold rounded-full flex items-center justify-center shadow-md">
            {itemCount > 9 ? '9+' : itemCount}
          </span>
        )}
      </div>

      {hasItems && (
        <>
          <div className="h-8 w-px bg-white/30" />
          <div className="flex flex-col items-start">
            <span className="text-xs text-white/80 font-medium">Your Order</span>
            <span className="text-lg font-bold leading-tight">{formatCurrency(total)}</span>
          </div>
        </>
      )}
    </button>
  );
}