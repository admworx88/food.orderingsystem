'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Minus, Trash2, ShoppingBag, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useCartStore } from '@/stores/cart-store';
import { formatCurrency } from '@/lib/utils/currency';
import { normalizeImageUrl } from '@/lib/utils/image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PageSubHeader } from '@/components/kiosk/page-sub-header';
import { KioskNavSidebar } from '@/components/kiosk/kiosk-nav-sidebar';

export default function CartPage() {
  const router = useRouter();
  const {
    items,
    specialInstructions,
    promoCode,
    discountAmount,
    taxRate,
    serviceChargeRate,
    setSpecialInstructions,
    updateQuantity,
    updateSpecialInstructions,
    removeItem,
    getSubtotal,
    getTaxAmount,
    getServiceCharge,
    getTotal,
    getItemCount,
  } = useCartStore();

  const subtotal = getSubtotal();
  const tax = getTaxAmount();
  const serviceCharge = getServiceCharge();
  const total = getTotal();

  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  if (items.length === 0) {
    return (
      <div className="h-full flex overflow-hidden">
        <KioskNavSidebar activeLabel="Menu" />
        <div className="flex-1 flex flex-col items-center justify-center bg-[var(--kiosk-bg)] px-6">
          <div className="max-w-md w-full text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-stone-100 flex items-center justify-center">
              <ShoppingBag className="w-12 h-12 text-stone-300" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold text-stone-800 mb-3">Your cart is empty</h2>
            <p className="text-stone-500 mb-8">
              Start adding delicious items to your order
            </p>
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-8 py-4 rounded-xl font-semibold active:scale-[0.98] transition-all"
            >
              Browse Menu
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden">
      <KioskNavSidebar activeLabel="Menu" />
      <div className="flex-1 flex flex-col lg:flex-row bg-[var(--kiosk-bg)] min-w-0 overflow-hidden">
      {/* Left side - Cart items */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <PageSubHeader
          title="Review Your Order"
          subtitle={`${getItemCount()} ${getItemCount() === 1 ? 'item' : 'items'} in cart`}
          backHref="/menu"
        />

        {/* Cart items - Scrollable */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
          {items.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-xl sm:rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-3 sm:p-4 lg:p-5">
                <div className="flex gap-3 sm:gap-4">
                  {/* Item image */}
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 flex-shrink-0 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 overflow-hidden">
                    {item.imageUrl ? (
                      <Image
                        src={normalizeImageUrl(item.imageUrl) || ''}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl sm:text-2xl lg:text-3xl">🍽️</span>
                      </div>
                    )}
                  </div>

                  {/* Item details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 sm:gap-4 mb-2 sm:mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-stone-800 mb-0.5 sm:mb-1 truncate">
                          {item.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-stone-500">
                          {formatCurrency(item.basePrice)} each
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-base sm:text-lg lg:text-xl font-bold text-stone-800">
                          {formatCurrency(item.totalPrice)}
                        </p>
                      </div>
                    </div>

                    {/* Addons */}
                    {item.addons.length > 0 && (
                      <div className="mb-2 sm:mb-3 pl-2 sm:pl-3 border-l-2 border-amber-200">
                        {item.addons.map((addon, addonIndex) => (
                          <p key={addonIndex} className="text-xs sm:text-sm text-stone-600">
                            + {addon.name} ({formatCurrency(addon.price)})
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Quantity controls & actions - stack on mobile */}
                    <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-2 sm:gap-3">
                      {/* Quantity */}
                      <div className="flex items-center gap-1 sm:gap-2 bg-stone-100 rounded-lg p-1">
                        <button
                          onClick={() => updateQuantity(index, item.quantity - 1)}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-md sm:rounded-lg bg-white hover:bg-stone-50 flex items-center justify-center active:scale-95 transition-all"
                        >
                          <Minus className="w-4 h-4 text-stone-600" strokeWidth={2.5} />
                        </button>
                        <span className="w-8 sm:w-10 text-center font-semibold text-stone-800 text-sm sm:text-base">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-md sm:rounded-lg bg-white hover:bg-stone-50 flex items-center justify-center active:scale-95 transition-all"
                        >
                          <Plus className="w-4 h-4 text-stone-600" strokeWidth={2.5} />
                        </button>
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={() => removeItem(index)}
                        className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-9 sm:h-10 text-red-600 hover:bg-red-50 rounded-lg font-medium text-xs sm:text-sm active:scale-95 transition-all"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={2} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Special instructions */}
                {expandedItem === index && (
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-stone-100 animate-fade-in">
                    <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-2">
                      Special instructions for this item
                    </label>
                    <Textarea
                      value={item.specialInstructions || ''}
                      onChange={(e) => updateSpecialInstructions(index, e.target.value)}
                      placeholder="e.g., No onions, extra sauce..."
                      className="min-h-[70px] sm:min-h-[80px] resize-none text-sm"
                    />
                  </div>
                )}

                <button
                  onClick={() => setExpandedItem(expandedItem === index ? null : index)}
                  className="mt-2 sm:mt-3 text-xs sm:text-sm text-amber-600 hover:text-amber-700 font-medium"
                >
                  {expandedItem === index ? 'Hide' : 'Add'} special instructions
                </button>
              </div>
            </div>
          ))}

          {/* General order instructions */}
          <div className="bg-amber-50 rounded-xl sm:rounded-2xl border border-amber-200 p-3 sm:p-4 lg:p-5">
            <label className="block text-xs sm:text-sm font-semibold text-stone-800 mb-2 sm:mb-3">
              General order notes (optional)
            </label>
            <Textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Any special requests for your entire order?"
              className="min-h-[80px] sm:min-h-[100px] resize-none bg-white text-sm"
            />
          </div>

          {/* Mobile spacing for sticky footer */}
          <div className="h-4 lg:h-0" />
        </div>
      </div>

      {/* Right side - Summary & Checkout (sticky on mobile) */}
      <div className="w-full lg:w-96 flex-shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-stone-200 flex flex-col">
        {/* Summary header - hidden on mobile for space */}
        <div className="hidden lg:block p-6 border-b border-stone-200">
          <h2 className="text-lg font-bold text-stone-800">Order Summary</h2>
        </div>

        <div className="flex-1 p-4 lg:p-6 space-y-3 lg:space-y-4 overflow-y-auto">
          {/* Items list */}
          <div className="space-y-2">
            {items.slice(0, 3).map((item, index) => (
              <div key={index} className="flex justify-between text-xs sm:text-sm">
                <p className="font-medium text-stone-700 truncate flex-1 min-w-0">
                  {item.quantity}× {item.name}
                </p>
                <p className="font-semibold text-stone-700 ml-2 flex-shrink-0">{formatCurrency(item.totalPrice)}</p>
              </div>
            ))}
            {items.length > 3 && (
              <p className="text-xs text-stone-400">+{items.length - 3} more items</p>
            )}
          </div>

          {/* Price breakdown */}
          <div className="border-t border-stone-200 pt-3 space-y-2">
            <div className="flex justify-between text-xs sm:text-sm text-stone-600">
              <span>Subtotal</span>
              <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-xs sm:text-sm text-green-600">
                <span>Discount {promoCode && `(${promoCode})`}</span>
                <span className="font-semibold">-{formatCurrency(discountAmount)}</span>
              </div>
            )}

            {tax > 0 && (
              <div className="flex justify-between text-xs sm:text-sm text-stone-600">
                <span>Tax ({Math.round(taxRate * 100)}%)</span>
                <span className="font-semibold">{formatCurrency(tax)}</span>
              </div>
            )}

            {serviceCharge > 0 && (
              <div className="flex justify-between text-xs sm:text-sm text-stone-600">
                <span>Service Charge ({Math.round(serviceChargeRate * 100)}%)</span>
                <span className="font-semibold">{formatCurrency(serviceCharge)}</span>
              </div>
            )}
          </div>

          {/* Total */}
          <div className="border-t-2 border-stone-300 pt-3">
            <div className="flex justify-between items-baseline">
              <span className="text-sm sm:text-base font-semibold text-stone-800">Total</span>
              <span className="text-xl sm:text-2xl font-bold text-stone-900">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Checkout button */}
        <div className="p-3 sm:p-4 lg:p-6 border-t border-stone-200 safe-area-inset-bottom">
          <Button
            onClick={() => router.push('/checkout')}
            className="w-full h-12 sm:h-14 bg-amber-500 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-base sm:text-lg font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all group"
          >
            <span>Proceed to Checkout</span>
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 ml-2 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
          </Button>
          <Link
            href="/menu"
            className="block text-center mt-3 lg:mt-4 py-2 text-xs sm:text-sm text-stone-500 hover:text-stone-700 font-medium"
          >
            ← Add more items
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}
