'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Wallet,
  Tag,
  Phone,
  Check,
  ChevronRight,
  X,
  Loader2,
  Pencil,
} from 'lucide-react';
import { PageSubHeader } from '@/components/kiosk/page-sub-header';
import { KioskNavSidebar } from '@/components/kiosk/kiosk-nav-sidebar';
import { useCartStore, type PaymentMethod } from '@/stores/cart-store';
import { useStaffSessionStore } from '@/stores/staff-session-store';
import { useKioskLocation } from '@/hooks/use-kiosk-location';
import { validatePromoCode, createOrder } from '@/services/order-service';
import { formatCurrency } from '@/lib/utils/currency';
import { ORDER_TYPE_CONFIG, getAllowedPaymentMethods } from '@/lib/constants/order-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { BurgerLoader } from '@/components/shared/burger-loader';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string; description: string; disabled?: boolean }[] = [
  { value: 'cash', label: 'Cash', icon: '💵', description: 'Pay at counter/room' },
  { value: 'ewallet', label: 'eWallets / Banks', icon: '📱', description: 'GCash, Maya, GoTyme, and more' },
  { value: 'card', label: 'Credit/Debit Card', icon: '💳', description: 'Visa, Mastercard, etc.', disabled: true },
  { value: 'bill_later', label: 'Pay After Meal', icon: '🍽️', description: 'Settle bill when ready to leave' },
];


export default function CheckoutPage() {
  const router = useRouter();
  const {
    items,
    orderType,
    tableNumber,
    roomNumber,
    guestName,
    promoCode,
    promoCodeId,
    discountAmount,
    taxRate,
    serviceChargeRate,
    applyPromoCode,
    removePromoCode,
    guestPhone,
    setGuestPhone,
    paymentMethod,
    setPaymentMethod,
    specialInstructions,
    getSubtotal,
    getTaxAmount,
    getServiceCharge,
    getTotal,
    clearCart,
  } = useCartStore();

  const staffSession = useStaffSessionStore((s) => s.session);
  const staffSessionId = staffSession?.id ?? null;
  const staffRole = staffSession?.role ?? null;
  const { location } = useKioskLocation();
  const isOceanView = location === 'ocean_view';

  const orderPlacedRef = useRef(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [showPromo, setShowPromo] = useState(false);
  const [showPhone, setShowPhone] = useState(false);


  const subtotal = getSubtotal();
  const tax = getTaxAmount();
  const serviceCharge = getServiceCharge();
  const total = getTotal();

  // Wait for Zustand store hydration before redirecting
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Required for Zustand hydration sync
    setHydrated(true);
  }, []);

  // Redirect if no order type selected or cart is empty (only after hydration)
  // orderPlacedRef prevents spurious redirect when clearCart() is called after successful order
  useEffect(() => {
    if (!hydrated) return;
    if (orderPlacedRef.current) return;
    if (!orderType) {
      router.push('/order-type');
    } else if (items.length === 0) {
      router.push('/menu');
    }
  }, [hydrated, orderType, items.length, router]);

  if (!hydrated || !orderType || items.length === 0) {
    return null;
  }

  const orderTypeConfig = ORDER_TYPE_CONFIG[orderType];
  const allowedMethods = getAllowedPaymentMethods(orderType);
  const filteredPaymentMethods = PAYMENT_METHODS.filter(
    (m) => allowedMethods.includes(m.value) && !(isOceanView && m.value === 'bill_later')
  );

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;

    setIsValidatingPromo(true);
    setPromoError('');

    const result = await validatePromoCode(promoInput.trim(), subtotal);

    if (result.success) {
      applyPromoCode(result.data.code, result.data.discountAmount, result.data.promoId);
      setPromoInput('');
    } else {
      setPromoError(result.error);
    }

    setIsValidatingPromo(false);
  };

  const handlePlaceOrder = async () => {
    setOrderError('');

    if (!paymentMethod) {
      setOrderError('Please select a payment method');
      return;
    }

    setIsPlacingOrder(true);

    const result = await createOrder({
      items: items.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        basePrice: item.basePrice,
        quantity: item.quantity,
        addons: item.addons,
        specialInstructions: item.specialInstructions,
      })),
      orderType,
      tableNumber: tableNumber || guestName || null,
      roomNumber: roomNumber || null,
      paymentMethod,
      promoCode: promoCode || null,
      promoCodeId: promoCodeId || null,
      guestPhone: guestPhone || null,
      specialInstructions: specialInstructions || null,
      takenBy: staffSessionId,
      kioskLocation: location || null,
    });

    if (result.success) {
      navigateToConfirmation(result.data, paymentMethod);
    } else {
      setOrderError(result.error);
      setIsPlacingOrder(false);
    }
  };

  const navigateToConfirmation = (
    data: { orderId: string; orderNumber: string; totalAmount: number; expiresAt: string | null },
    method: string
  ) => {
    orderPlacedRef.current = true;
    if (staffRole === 'cashier') {
      clearCart();
      router.push(`/menu?view=payments&selectOrder=${data.orderId}`);
      return;
    }
    const params = new URLSearchParams({
      orderNumber: data.orderNumber,
      total: data.totalAmount.toString(),
      orderId: data.orderId,
      paymentMethod: method,
    });
    if (data.expiresAt) params.set('expiresAt', data.expiresAt);
    if (tableNumber) params.set('tableNumber', tableNumber);
    if (location) params.set('kioskLocation', location);
    router.push(`/confirmation?${params.toString()}`);
  };


  return (
    <>
    <BurgerLoader isLoading={isPlacingOrder} message="Placing your order…" />
    <div className="h-full flex flex-row bg-[var(--kiosk-bg)]">
      {/* Left icon nav */}
      <KioskNavSidebar />

      {/* Checkout form */}
      <div className="flex-1 flex flex-col lg:flex-row min-w-0 min-h-0 overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <PageSubHeader
          title="Checkout"
          subtitle="Complete your order details"
          backHref="/cart"
        />

        {/* Scrollable form sections */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-5 lg:space-y-6">
          {/* Order Type Badge */}
          <div className="flex items-center justify-between bg-white rounded-xl sm:rounded-2xl border border-stone-200 px-4 sm:px-5 py-3 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-lg sm:text-xl">{orderTypeConfig.icon}</span>
              <div>
                <p className="text-xs sm:text-sm text-stone-500">Order Type</p>
                <p className="text-sm sm:text-base font-semibold text-stone-800">{orderTypeConfig.label}</p>
              </div>
            </div>
            {!isOceanView && (
              <Link
                href="/order-type"
                className="flex items-center gap-1 text-xs sm:text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
                <span>Change</span>
              </Link>
            )}
          </div>

          {/* Payment Method */}
          <section className="bg-white rounded-xl sm:rounded-2xl border border-stone-200 p-4 sm:p-5 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-100 flex items-center justify-center">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" strokeWidth={2} />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-stone-800">Payment Method</h2>
            </div>

            <div className="space-y-2 sm:space-y-3">
              {filteredPaymentMethods.map((method) => {
                const isSelected = paymentMethod === method.value;
                const isDisabled = method.disabled === true;
                return (
                  <button
                    key={method.value}
                    onClick={() => !isDisabled && setPaymentMethod(method.value)}
                    disabled={isDisabled}
                    className={cn(
                      'w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all text-left',
                      isDisabled
                        ? 'border-stone-200 bg-stone-50 opacity-60 cursor-not-allowed'
                        : isSelected
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                    )}
                  >
                    <div className={cn(
                      'w-10 h-10 sm:w-12 sm:h-12 rounded-md sm:rounded-lg border flex items-center justify-center text-xl sm:text-2xl flex-shrink-0',
                      isDisabled ? 'bg-stone-100 border-stone-200' : 'bg-white border-stone-200'
                    )}>
                      {method.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3
                          className={cn(
                            'text-sm sm:text-base font-semibold truncate',
                            isDisabled ? 'text-stone-400' : isSelected ? 'text-amber-900' : 'text-stone-700'
                          )}
                        >
                          {method.label}
                        </h3>
                        {isDisabled && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-stone-200 text-stone-500 leading-none shrink-0">
                            Not Yet Available
                          </span>
                        )}
                      </div>
                      <p
                        className={cn(
                          'text-xs sm:text-sm truncate',
                          isDisabled ? 'text-stone-400' : isSelected ? 'text-amber-700' : 'text-stone-500'
                        )}
                      >
                        {method.description}
                      </p>
                    </div>
                    {isSelected && !isDisabled && (
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Optional buttons: Promo Code & Phone Number */}
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={() => setShowPromo(!showPromo)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all text-sm sm:text-base font-semibold',
                showPromo || promoCode
                  ? 'border-amber-500 bg-amber-50 text-amber-900'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50'
              )}
            >
              <Tag className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
              <span>{promoCode ? promoCode : 'Promo Code'}</span>
            </button>
            <button
              onClick={() => setShowPhone(!showPhone)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all text-sm sm:text-base font-semibold',
                showPhone || guestPhone
                  ? 'border-amber-500 bg-amber-50 text-amber-900'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50'
              )}
            >
              <Phone className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
              <span>Phone</span>
            </button>
          </div>

          {/* Expandable: Promo Code */}
          {showPromo && (
            <section className="bg-white rounded-xl sm:rounded-2xl border border-stone-200 p-4 sm:p-5 lg:p-6">
              {promoCode ? (
                <div className="flex items-center justify-between p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg sm:rounded-xl">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-md sm:rounded-lg bg-green-100 flex items-center justify-center">
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="font-semibold text-green-900 text-sm sm:text-base">{promoCode}</p>
                      <p className="text-xs sm:text-sm text-green-700">
                        Discount: {formatCurrency(discountAmount)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={removePromoCode}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg hover:bg-green-100 flex items-center justify-center active:scale-95 transition-all"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" strokeWidth={2} />
                  </button>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex gap-2 sm:gap-3">
                    <Input
                      type="text"
                      value={promoInput}
                      onChange={(e) => {
                        setPromoInput(e.target.value.toUpperCase());
                        setPromoError('');
                      }}
                      placeholder="Enter promo code"
                      className="flex-1 h-11 sm:h-12 text-sm sm:text-base uppercase"
                      autoFocus
                    />
                    <Button
                      onClick={handleApplyPromo}
                      disabled={!promoInput.trim() || isValidatingPromo}
                      className="h-11 sm:h-12 px-4 sm:px-6 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm sm:text-base"
                    >
                      {isValidatingPromo ? 'Checking...' : 'Apply'}
                    </Button>
                  </div>
                  {promoError && (
                    <p className="text-xs sm:text-sm text-red-600 flex items-center gap-2">
                      <X className="w-4 h-4" />
                      {promoError}
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Expandable: Phone Number */}
          {showPhone && (
            <section className="bg-white rounded-xl sm:rounded-2xl border border-stone-200 p-4 sm:p-5 lg:p-6">
              <Input
                type="tel"
                value={guestPhone || ''}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="+63 XXX XXX XXXX"
                className="h-11 sm:h-12 text-sm sm:text-base"
                autoFocus
              />
            </section>
          )}

          {/* Mobile spacing */}
          <div className="h-4 lg:h-0" />
        </div>
      </div>

      {/* Right side - Order summary (responsive) */}
      <div className="w-full lg:w-96 flex-shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-stone-200 flex flex-col">
        <div className="hidden lg:block p-6 border-b border-stone-200">
          <h2 className="text-lg font-bold text-stone-800">Order Summary</h2>
        </div>

        <div className="flex-1 p-3 sm:p-4 lg:p-6 space-y-3 lg:space-y-4 overflow-y-auto">
          {/* Items list - collapsible on mobile */}
          <div className="space-y-2 lg:space-y-3">
            {items.slice(0, 3).map((item, index) => (
              <div key={index} className="flex justify-between text-xs sm:text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-700 truncate">
                    {item.quantity}x {item.name}
                  </p>
                  {item.addons.length > 0 && (
                    <p className="text-[10px] sm:text-xs text-stone-500 mt-0.5 truncate">
                      + {item.addons.map((a) => a.name).join(', ')}
                    </p>
                  )}
                </div>
                <p className="font-semibold text-stone-700 ml-2">{formatCurrency(item.totalPrice)}</p>
              </div>
            ))}
            {items.length > 3 && (
              <p className="text-xs text-stone-500">+{items.length - 3} more items</p>
            )}
          </div>

          <div className="border-t border-stone-200 pt-3 lg:pt-4 space-y-2 lg:space-y-3">
            <div className="flex justify-between text-xs sm:text-sm text-stone-600">
              <span>Subtotal</span>
              <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-xs sm:text-sm text-green-600">
                <span>Discount ({promoCode})</span>
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

          <div className="border-t-2 border-stone-300 pt-3 lg:pt-4">
            <div className="flex justify-between items-baseline">
              <span className="text-sm sm:text-base font-semibold text-stone-800">Total</span>
              <span className="text-xl sm:text-2xl font-bold text-stone-900">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Place order button + error */}
        <div className="p-3 sm:p-4 lg:p-6 border-t border-stone-200 space-y-2 sm:space-y-3 safe-area-inset-bottom">
          {orderError && (
            <div className="p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg sm:rounded-xl">
              <p className="text-xs sm:text-sm text-red-700 font-medium">{orderError}</p>
            </div>
          )}
          <Button
            onClick={handlePlaceOrder}
            disabled={!paymentMethod || isPlacingOrder}
            className="w-full h-12 sm:h-14 bg-amber-500 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-base sm:text-lg font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all group"
          >
            {isPlacingOrder ? (
              <>
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                <span>Placing Order...</span>
              </>
            ) : (
              <>
                <span>Place Order</span>
                <ChevronRight
                  className="w-5 h-5 sm:w-6 sm:h-6 ml-2 group-hover:translate-x-1 transition-transform"
                  strokeWidth={2.5}
                />
              </>
            )}
          </Button>
        </div>
      </div>
      </div>
    </div>

</>
  );
}
