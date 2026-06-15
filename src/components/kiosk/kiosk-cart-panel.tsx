'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Minus, Plus, Trash2, Tag, X, Check,
  ChevronDown, ChevronUp, ShoppingBag, Loader2,
} from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { useKioskLocation } from '@/hooks/use-kiosk-location';
import { validatePromoCode, addItemsToOrder } from '@/services/order-service';
import { formatCurrency } from '@/lib/utils/currency';
import { normalizeImageUrl } from '@/lib/utils/image';
import { ORDER_TYPE_CONFIG } from '@/lib/constants/order-types';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface AddItemsContext {
  orderId: string;
  orderNumber: string;
  tableNumber: string | null;
  currentItemsCount: number;
  currentTotal: number;
}

export function KioskCartPanel({ addItemsContext }: { addItemsContext?: AddItemsContext }) {
  const router = useRouter();
  const { location } = useKioskLocation();
  const isOceanView = location === 'ocean_view';

  const {
    items,
    orderType,
    tableNumber,
    roomNumber,
    guestName,
    promoCode,
    promoCodeId,
    discountAmount,
    updateQuantity,
    removeItem,
    applyPromoCode,
    removePromoCode,
    clearCart,
    getSubtotal,
    getTaxAmount,
    getServiceCharge,
    getTotal,
    getItemCount,
    taxRate,
    serviceChargeRate,
  } = useCartStore();

  const [hydrated, setHydrated] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setHydrated(true); }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [showPromo, setShowPromo] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  const subtotal = hydrated ? getSubtotal() : 0;
  const tax = hydrated ? getTaxAmount() : 0;
  const serviceCharge = hydrated ? getServiceCharge() : 0;
  const total = hydrated ? getTotal() : 0;
  const itemCount = hydrated ? getItemCount() : 0;

  const orderTypeConfig = orderType ? ORDER_TYPE_CONFIG[orderType] : null;

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setIsValidatingPromo(true);
    setPromoError('');
    const result = await validatePromoCode(promoInput.trim(), subtotal);
    if (result.success) {
      applyPromoCode(result.data.code, result.data.discountAmount, result.data.promoId);
      setPromoInput('');
      setShowPromo(false);
    } else {
      setPromoError(result.error);
    }
    setIsValidatingPromo(false);
  };

  const handleCheckout = () => {
    setOrderError('');
    if (!orderType && !isOceanView) {
      setOrderError('Please select an order type first');
      return;
    }
    if (items.length === 0) return;
    if (orderType === 'dine_in' && !tableNumber) {
      setOrderError('Table number required. Tap "Change" to re-select your order type.');
      return;
    }
    if (orderType === 'room_service' && !roomNumber) {
      setOrderError('Room number required. Tap "Change" to re-select your order type.');
      return;
    }
    router.push('/cart');
  };

  const handleAddToOrder = async () => {
    if (items.length === 0 || !addItemsContext) return;
    setIsSubmitting(true);
    setOrderError('');
    const result = await addItemsToOrder(
      addItemsContext.orderId,
      items.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        basePrice: item.basePrice,
        quantity: item.quantity,
        addons: item.addons,
        specialInstructions: item.specialInstructions,
      }))
    );
    if (result.success) {
      clearCart();
      router.push(`/confirmation?orderNumber=${result.data.orderNumber}&total=0&paymentMethod=bill_later&addedItems=${result.data.newItemCount}`);
    } else {
      setOrderError(result.error);
      setIsSubmitting(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="w-80 xl:w-96 flex-shrink-0 bg-white border-l border-stone-200 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-80 xl:w-96 flex-shrink-0 bg-white border-l border-stone-200 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-stone-100 flex items-center justify-between">
        <h2 className="text-base font-bold text-stone-800">Your Order</h2>
        {itemCount > 0 && (
          <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        )}
      </div>

      {/* Order context — add items mode */}
      {addItemsContext ? (
        <div className="flex-shrink-0 px-4 py-2.5 border-b border-amber-200 flex items-center justify-between bg-amber-50">
          <div>
            <p className="text-xs font-bold text-amber-900">Adding to #{addItemsContext.orderNumber}</p>
            <p className="text-[10px] text-amber-700">
              {addItemsContext.tableNumber ? `Table ${addItemsContext.tableNumber} · ` : ''}
              {addItemsContext.currentItemsCount} existing item{addItemsContext.currentItemsCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-amber-700">Current total</p>
            <p className="text-xs font-bold text-amber-900">{formatCurrency(addItemsContext.currentTotal)}</p>
          </div>
        </div>
      ) : orderTypeConfig ? (
        <div className="flex-shrink-0 px-4 py-2.5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <span className="text-sm">{orderTypeConfig.icon}</span>
            <span className="text-xs font-semibold text-stone-700">{orderTypeConfig.label}</span>
            {tableNumber && (
              <span className="text-xs text-stone-400">· Table {tableNumber}</span>
            )}
            {roomNumber && (
              <span className="text-xs text-stone-400">· Room {roomNumber}</span>
            )}
            {guestName && (
              <span className="text-xs text-stone-400">· {guestName}</span>
            )}
          </div>
          {!isOceanView && (
            <Link
              href="/order-type"
              className="text-xs text-amber-600 hover:text-amber-700 font-semibold transition-colors"
            >
              Change
            </Link>
          )}
        </div>
      ) : !isOceanView ? (
        <div className="flex-shrink-0 px-4 py-2.5 border-b border-stone-100 bg-amber-50">
          <Link
            href="/order-type"
            className="text-xs text-amber-700 font-semibold flex items-center gap-1.5"
          >
            <span>Select order type to continue</span>
            <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
          </Link>
        </div>
      ) : null}

      {/* Items list — scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-10 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mb-3">
              <ShoppingBag className="w-7 h-7 text-stone-300" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-semibold text-stone-400">Your cart is empty</p>
            <p className="text-xs text-stone-300 mt-1">Tap any item to add it</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex gap-2.5 p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                {item.imageUrl ? (
                  <div className="relative w-11 h-11 flex-shrink-0 rounded-lg overflow-hidden bg-stone-200">
                    <Image
                      src={normalizeImageUrl(item.imageUrl) || ''}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="44px"
                    />
                  </div>
                ) : (
                  <div className="w-11 h-11 flex-shrink-0 rounded-lg bg-amber-100 flex items-center justify-center text-base">
                    🍽️
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-stone-800 leading-tight line-clamp-2">{item.name}</p>
                  {item.addons.length > 0 && (
                    <p className="text-[10px] text-stone-400 mt-0.5 truncate">
                      + {item.addons.map(a => a.name).join(', ')}
                    </p>
                  )}
                  <p className="text-xs font-bold text-amber-700 mt-0.5">{formatCurrency(item.totalPrice)}</p>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="flex items-center gap-0.5 bg-white rounded-lg border border-stone-200 p-0.5">
                    <button
                      onClick={() => updateQuantity(index, item.quantity - 1)}
                      className="w-6 h-6 rounded flex items-center justify-center hover:bg-stone-100 active:scale-95 transition-all"
                    >
                      <Minus className="w-2.5 h-2.5 text-stone-600" strokeWidth={3} />
                    </button>
                    <span className="w-5 text-center text-xs font-bold text-stone-800">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(index, item.quantity + 1)}
                      className="w-6 h-6 rounded flex items-center justify-center hover:bg-stone-100 active:scale-95 transition-all"
                    >
                      <Plus className="w-2.5 h-2.5 text-stone-600" strokeWidth={3} />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(index)}
                    className="w-6 h-6 flex items-center justify-center text-stone-300 hover:text-red-500 transition-colors rounded"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom section */}
      {items.length > 0 && (
        <div className="flex-shrink-0 border-t border-stone-100">
          {/* Promo code */}
          <div className="px-4 py-2.5 border-b border-stone-100">
            {promoCode ? (
              <div className="flex items-center justify-between px-3 py-2 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-green-600" strokeWidth={2.5} />
                  <span className="text-xs font-bold text-green-800">{promoCode}</span>
                  <span className="text-xs text-green-600">-{formatCurrency(discountAmount)}</span>
                </div>
                <button onClick={removePromoCode} className="text-green-500 hover:text-green-700 transition-colors">
                  <X className="w-3 h-3" strokeWidth={2} />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowPromo(!showPromo)}
                  className="flex items-center gap-1.5 text-amber-600 hover:text-amber-700 text-xs font-semibold transition-colors"
                >
                  <Tag className="w-3 h-3" strokeWidth={2} />
                  <span>Promo code?</span>
                  {showPromo
                    ? <ChevronUp className="w-3 h-3" />
                    : <ChevronDown className="w-3 h-3" />}
                </button>
                {showPromo && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1.5">
                      <Input
                        type="text"
                        value={promoInput}
                        onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(''); }}
                        placeholder="Enter code"
                        className="flex-1 h-7 text-xs uppercase"
                      />
                      <button
                        onClick={handleApplyPromo}
                        disabled={!promoInput.trim() || isValidatingPromo}
                        className="h-7 px-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
                      >
                        {isValidatingPromo ? '...' : 'Apply'}
                      </button>
                    </div>
                    {promoError && <p className="text-[10px] text-red-500">{promoError}</p>}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Price breakdown */}
          <div className="px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-xs text-stone-500">
              <span>Subtotal</span>
              <span className="font-medium text-stone-700">{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs text-green-600">
                <span>Discount</span>
                <span className="font-semibold">-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            {serviceCharge > 0 && (
              <div className="flex justify-between text-xs text-stone-500">
                <span>Service ({Math.round(serviceChargeRate * 100)}%)</span>
                <span className="font-medium text-stone-700">{formatCurrency(serviceCharge)}</span>
              </div>
            )}
            {tax > 0 && (
              <div className="flex justify-between text-xs text-stone-500">
                <span>VAT ({Math.round(taxRate * 100)}%)</span>
                <span className="font-medium text-stone-700">{formatCurrency(tax)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-stone-200 mt-2">
              <span className="text-sm font-bold text-stone-800">Total</span>
              <span className="text-lg font-bold text-stone-900 tabular-nums">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Error */}
          {orderError && (
            <div className="mx-4 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-xs text-red-700 font-medium">{orderError}</p>
            </div>
          )}

          {/* Place Order / Add to Order */}
          <div className="px-4 pb-4">
            {addItemsContext ? (
              <button
                onClick={handleAddToOrder}
                disabled={items.length === 0 || isSubmitting}
                className={cn(
                  'w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2',
                  'bg-amber-500 bg-gradient-to-r from-amber-500 to-amber-600 text-white',
                  'shadow-lg shadow-amber-500/20',
                  'hover:from-amber-400 hover:to-amber-500 hover:shadow-amber-500/35',
                  'active:scale-[0.98]',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
                )}
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Adding Items...</>
                ) : (
                  <span>Add to Order · {formatCurrency(total)}</span>
                )}
              </button>
            ) : !orderType && !isOceanView ? (
              <Link
                href="/order-type"
                className={cn(
                  'w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center',
                  'bg-amber-500 bg-gradient-to-r from-amber-500 to-amber-600 text-white',
                  'shadow-lg shadow-amber-500/20',
                  'hover:from-amber-400 hover:to-amber-500 hover:shadow-amber-500/35',
                  'active:scale-[0.98]',
                )}
              >
                Select Order Type
              </Link>
            ) : (
              <button
                onClick={handleCheckout}
                disabled={items.length === 0}
                className={cn(
                  'w-full py-3.5 rounded-xl font-bold text-sm transition-all',
                  'bg-amber-500 bg-gradient-to-r from-amber-500 to-amber-600 text-white',
                  'shadow-lg shadow-amber-500/20',
                  'hover:from-amber-400 hover:to-amber-500 hover:shadow-amber-500/35',
                  'active:scale-[0.98]',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
                )}
              >
                <span>Review Order · {formatCurrency(total)}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
