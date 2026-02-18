'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, Minus, Plus, ShoppingBag, Trash2, Tag, ChevronRight, Sparkles } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { formatCurrency } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';

// Cart item type - matches the Zustand store interface from AGENT-KIOSK.md
interface CartItem {
  menuItemId: string;
  name: string;
  basePrice: number;
  quantity: number;
  addons: { id: string; name: string; price: number }[];
  specialInstructions?: string;
  allergens?: string[];
  imageUrl?: string;
  totalPrice: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  promoCode?: string | null;
  discountAmount?: number;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemoveItem: (index: number) => void;
  onCheckout: () => void;
}

// Tax rates per PRD
const TAX_RATE = 0.12; // 12% VAT
const SERVICE_CHARGE_RATE = 0.10; // 10% service charge

export function CartDrawer({
  isOpen,
  onClose,
  items,
  promoCode,
  discountAmount = 0,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}: CartDrawerProps) {
  const [removingIndex, setRemovingIndex] = useState<number | null>(null);
  const existingOrderItems = useCartStore((state) => state.existingOrderItems);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountedSubtotal = subtotal - discountAmount;
  const taxAmount = discountedSubtotal * TAX_RATE;
  const serviceCharge = discountedSubtotal * SERVICE_CHARGE_RATE;
  const grandTotal = discountedSubtotal + taxAmount + serviceCharge;
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleRemove = (index: number) => {
    setRemovingIndex(index);
    setTimeout(() => {
      onRemoveItem(index);
      setRemovingIndex(null);
    }, 200);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col bg-gradient-to-b from-stone-50 to-white border-l-0 shadow-2xl"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 bg-white border-b border-stone-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <ShoppingBag className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-6 h-6 bg-stone-900 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md">
                    {totalItems}
                  </span>
                )}
              </div>
              <div>
                <SheetTitle className="text-xl font-bold text-stone-900">
                  Your Order
                </SheetTitle>
                <p className="text-sm text-stone-500">
                  {totalItems === 0
                    ? 'Cart is empty'
                    : `${totalItems} item${totalItems > 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-12 h-12 rounded-2xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors active:scale-95"
              aria-label="Close cart"
            >
              <X className="w-5 h-5 text-stone-600" />
            </button>
          </div>
        </SheetHeader>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Already Ordered section — shown when adding to existing order */}
          {existingOrderItems.length > 0 && (
            <div className="mb-4 rounded-2xl border border-stone-200 bg-stone-50 overflow-hidden">
              <div className="px-4 py-2.5 bg-stone-100 border-b border-stone-200">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Already Ordered</p>
              </div>
              <div className="divide-y divide-stone-100">
                {existingOrderItems.map((item) => {
                  const isServed = item.status === 'served';
                  return (
                    <div
                      key={item.id}
                      className={cn('flex items-center justify-between px-4 py-2.5', isServed ? 'opacity-40' : '')}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-stone-700">{item.quantity}× {item.item_name}</span>
                        {isServed && (
                          <span className="text-[10px] font-bold text-stone-500 bg-stone-200 px-1.5 py-0.5 rounded uppercase tracking-wide">
                            SERVED
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-stone-500">{formatCurrency(item.total_price)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {items.length === 0 && existingOrderItems.length === 0 ? (
            <EmptyCartState />
          ) : items.length === 0 ? null : (
            <div className="space-y-3">
              {existingOrderItems.length > 0 && (
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">New Items</p>
              )}
              {items.map((item, index) => (
                <CartItemCard
                  key={`${item.menuItemId}-${index}`}
                  item={item}
                  index={index}
                  isRemoving={removingIndex === index}
                  onUpdateQuantity={onUpdateQuantity}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer with totals and checkout */}
        {items.length > 0 && (
          <SheetFooter className="flex-shrink-0 p-0 border-t-0">
            <div className="w-full">
              {/* Promo code banner */}
              {promoCode && discountAmount > 0 && (
                <div className="mx-4 mb-3 flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl px-4 py-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    <Tag className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-emerald-800">
                      Promo Applied: {promoCode}
                    </p>
                    <p className="text-xs text-emerald-600">
                      You save {formatCurrency(discountAmount)}!
                    </p>
                  </div>
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                </div>
              )}

              {/* Order summary */}
              <div className="bg-white mx-4 rounded-3xl border border-stone-200 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
                <div className="px-5 py-4 space-y-3">
                  <SummaryRow label="Subtotal" value={subtotal} />
                  {discountAmount > 0 && (
                    <SummaryRow
                      label="Discount"
                      value={-discountAmount}
                      isDiscount
                    />
                  )}
                  <SummaryRow label="VAT (12%)" value={taxAmount} subtle />
                  <SummaryRow
                    label="Service Charge (10%)"
                    value={serviceCharge}
                    subtle
                  />
                  <div className="h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent" />
                  <div className="flex items-center justify-between py-1">
                    <span className="text-lg font-bold text-stone-900">
                      Total
                    </span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                      {formatCurrency(grandTotal)}
                    </span>
                  </div>
                </div>

                {/* Checkout button */}
                <button
                  onClick={onCheckout}
                  className={cn(
                    'w-full flex items-center justify-center gap-3 py-5 font-bold text-lg text-white',
                    'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 bg-[length:200%_100%]',
                    'hover:bg-[position:100%_0] transition-all duration-500',
                    'active:scale-[0.99] min-h-[64px]'
                  )}
                >
                  <span>Proceed to Checkout</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Safe area spacer for mobile */}
              <div className="h-4" />
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

// Cart Item Card Component
interface CartItemCardProps {
  item: CartItem;
  index: number;
  isRemoving: boolean;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemove: (index: number) => void;
}

function CartItemCard({
  item,
  index,
  isRemoving,
  onUpdateQuantity,
  onRemove,
}: CartItemCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-stone-100 p-4 shadow-sm transition-all duration-200',
        'hover:shadow-md hover:border-stone-200',
        isRemoving && 'opacity-0 scale-95 -translate-x-4'
      )}
    >
      <div className="flex gap-4">
        {/* Item image */}
        <div className="relative w-20 h-20 rounded-xl bg-gradient-to-br from-stone-100 to-stone-50 overflow-hidden flex-shrink-0">
          {item.imageUrl && !imageError ? (
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              className="object-cover"
              sizes="80px"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl opacity-60">🍽️</span>
            </div>
          )}
        </div>

        {/* Item details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-stone-900 line-clamp-1">
              {item.name}
            </h3>
            <button
              onClick={() => onRemove(index)}
              className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors flex-shrink-0 active:scale-95"
              aria-label={`Remove ${item.name} from cart`}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>

          {/* Addons */}
          {item.addons.length > 0 && (
            <p className="text-sm text-stone-500 mt-1 line-clamp-1">
              + {item.addons.map((a) => a.name).join(', ')}
            </p>
          )}

          {/* Special instructions */}
          {item.specialInstructions && (
            <p className="text-xs text-amber-600 mt-1 italic line-clamp-1">
              &quot;{item.specialInstructions}&quot;
            </p>
          )}

          {/* Price and quantity controls */}
          <div className="flex items-center justify-between mt-3">
            <span className="font-bold text-amber-600">
              {formatCurrency(item.totalPrice)}
            </span>

            {/* Quantity controls */}
            <div className="flex items-center bg-stone-100 rounded-xl">
              <button
                onClick={() =>
                  item.quantity > 1 && onUpdateQuantity(index, item.quantity - 1)
                }
                disabled={item.quantity <= 1}
                className="w-10 h-10 flex items-center justify-center rounded-l-xl hover:bg-stone-200 active:scale-95 transition-all disabled:opacity-40"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4 text-stone-600" />
              </button>
              <span className="w-8 text-center font-bold text-stone-900">
                {item.quantity}
              </span>
              <button
                onClick={() =>
                  item.quantity < 10 && onUpdateQuantity(index, item.quantity + 1)
                }
                disabled={item.quantity >= 10}
                className="w-10 h-10 flex items-center justify-center rounded-r-xl hover:bg-stone-200 active:scale-95 transition-all disabled:opacity-40"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4 text-stone-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Empty Cart State
function EmptyCartState() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 px-6">
      {/* Illustrated empty bag */}
      <div className="relative mb-8">
        <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-stone-100 to-stone-50 flex items-center justify-center">
          <ShoppingBag className="w-16 h-16 text-stone-300" strokeWidth={1.5} />
        </div>
        {/* Decorative dots */}
        <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-amber-200" />
        <div className="absolute -bottom-1 -left-3 w-6 h-6 rounded-full bg-orange-100" />
        <div className="absolute top-1/2 -right-4 w-3 h-3 rounded-full bg-amber-300" />
      </div>

      <h3 className="text-xl font-bold text-stone-900 mb-2">
        Your cart is empty
      </h3>
      <p className="text-stone-500 text-center max-w-[240px] leading-relaxed">
        Looks like you haven&apos;t added any delicious items yet. Start browsing our menu!
      </p>

      {/* Subtle pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>
    </div>
  );
}

// Summary Row Component
interface SummaryRowProps {
  label: string;
  value: number;
  isDiscount?: boolean;
  subtle?: boolean;
}

function SummaryRow({ label, value, isDiscount, subtle }: SummaryRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={cn(
          'text-sm',
          subtle ? 'text-stone-400' : 'text-stone-600'
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'text-sm font-medium',
          isDiscount && 'text-emerald-600',
          subtle && 'text-stone-400',
          !isDiscount && !subtle && 'text-stone-900'
        )}
      >
        {isDiscount && '-'}
        {formatCurrency(Math.abs(value))}
      </span>
    </div>
  );
}