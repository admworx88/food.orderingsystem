'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Plus, Minus, Trash2, ShoppingBag, ChevronRight } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { formatCurrency } from '@/lib/utils/currency';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export default function CartPage() {
  const router = useRouter();
  const {
    items,
    specialInstructions,
    setSpecialInstructions,
    updateQuantity,
    updateSpecialInstructions,
    removeItem,
    getSubtotal,
    getItemCount,
  } = useCartStore();

  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  if (items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[var(--kiosk-bg)] px-6">
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
    );
  }

  return (
    <div className="h-full flex bg-[var(--kiosk-bg)]">
      {/* Left side - Cart items */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-5 bg-white border-b border-stone-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/menu"
                className="w-11 h-11 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center active:scale-95 transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-stone-600" strokeWidth={2} />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-stone-800">Review Your Order</h1>
                <p className="text-sm text-stone-500 mt-0.5">
                  {getItemCount()} {getItemCount() === 1 ? 'item' : 'items'} in cart
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Cart items - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex gap-4">
                  {/* Item image placeholder */}
                  <div className="w-24 h-24 flex-shrink-0 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                    <span className="text-3xl">🍽️</span>
                  </div>

                  {/* Item details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-stone-800 mb-1 truncate">
                          {item.name}
                        </h3>
                        <p className="text-sm text-stone-500">
                          {formatCurrency(item.basePrice)} each
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-stone-800">
                          {formatCurrency(item.totalPrice)}
                        </p>
                      </div>
                    </div>

                    {/* Addons */}
                    {item.addons.length > 0 && (
                      <div className="mb-3 pl-3 border-l-2 border-amber-200">
                        {item.addons.map((addon, addonIndex) => (
                          <p key={addonIndex} className="text-sm text-stone-600">
                            + {addon.name} ({formatCurrency(addon.price)})
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Quantity controls & actions */}
                    <div className="flex items-center justify-between">
                      {/* Quantity */}
                      <div className="flex items-center gap-2 bg-stone-100 rounded-lg p-1">
                        <button
                          onClick={() => updateQuantity(index, item.quantity - 1)}
                          className="w-10 h-10 rounded-lg bg-white hover:bg-stone-50 flex items-center justify-center active:scale-95 transition-all"
                        >
                          <Minus className="w-4 h-4 text-stone-600" strokeWidth={2.5} />
                        </button>
                        <span className="w-10 text-center font-semibold text-stone-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                          className="w-10 h-10 rounded-lg bg-white hover:bg-stone-50 flex items-center justify-center active:scale-95 transition-all"
                        >
                          <Plus className="w-4 h-4 text-stone-600" strokeWidth={2.5} />
                        </button>
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={() => removeItem(index)}
                        className="flex items-center gap-2 px-4 h-10 text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm active:scale-95 transition-all"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={2} />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>

                {/* Special instructions */}
                {expandedItem === index && (
                  <div className="mt-4 pt-4 border-t border-stone-100 animate-fade-in">
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      Special instructions for this item
                    </label>
                    <Textarea
                      value={item.specialInstructions || ''}
                      onChange={(e) => updateSpecialInstructions(index, e.target.value)}
                      placeholder="e.g., No onions, extra sauce..."
                      className="min-h-[80px] resize-none"
                    />
                  </div>
                )}

                <button
                  onClick={() => setExpandedItem(expandedItem === index ? null : index)}
                  className="mt-3 text-sm text-amber-600 hover:text-amber-700 font-medium"
                >
                  {expandedItem === index ? 'Hide' : 'Add'} special instructions
                </button>
              </div>
            </div>
          ))}

          {/* General order instructions */}
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
            <label className="block text-sm font-semibold text-stone-800 mb-3">
              General order notes (optional)
            </label>
            <Textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Any special requests for your entire order?"
              className="min-h-[100px] resize-none bg-white"
            />
          </div>
        </div>
      </div>

      {/* Right side - Summary & Checkout */}
      <div className="w-96 flex-shrink-0 bg-white border-l border-stone-200 flex flex-col">
        <div className="p-6 border-b border-stone-200">
          <h2 className="text-lg font-bold text-stone-800">Order Summary</h2>
        </div>

        <div className="flex-1 p-6 space-y-4">
          {/* Price breakdown */}
          <div className="space-y-3">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal</span>
              <span className="font-semibold">{formatCurrency(getSubtotal())}</span>
            </div>
            <div className="text-sm text-stone-500 pl-4">
              Tax and service charges will be calculated at checkout
            </div>
          </div>

          {/* Promo code teaser */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
            <p className="text-sm font-semibold text-amber-900 mb-1">
              🎉 Have a promo code?
            </p>
            <p className="text-xs text-amber-700">
              Apply it at checkout for instant savings
            </p>
          </div>
        </div>

        {/* Checkout button */}
        <div className="p-6 border-t border-stone-200">
          <Button
            onClick={() => router.push('/checkout')}
            className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-lg font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all group"
          >
            <span>Proceed to Checkout</span>
            <ChevronRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
          </Button>
          <Link
            href="/menu"
            className="block text-center mt-4 text-sm text-stone-500 hover:text-stone-700 font-medium"
          >
            ← Add more items
          </Link>
        </div>
      </div>
    </div>
  );
}
