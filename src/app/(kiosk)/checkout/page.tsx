'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Coffee,
  Home,
  ShoppingBag,
  Wallet,
  Tag,
  Phone,
  Check,
  ChevronRight,
  X,
} from 'lucide-react';
import { useCartStore, type OrderType, type PaymentMethod } from '@/stores/cart-store';
import { formatCurrency } from '@/lib/utils/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const ORDER_TYPES: { value: OrderType; label: string; icon: typeof Coffee; description: string }[] = [
  { value: 'dine_in', label: 'Dine In', icon: Coffee, description: 'Enjoy your meal here' },
  { value: 'room_service', label: 'Room Service', icon: Home, description: 'Deliver to your room' },
  { value: 'takeout', label: 'Takeout', icon: ShoppingBag, description: 'Take it to go' },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string; description: string }[] = [
  { value: 'cash', label: 'Cash', icon: '💵', description: 'Pay at counter/room' },
  { value: 'gcash', label: 'GCash', icon: '📱', description: 'Digital wallet payment' },
  { value: 'card', label: 'Credit/Debit Card', icon: '💳', description: 'Visa, Mastercard, etc.' },
];

export default function CheckoutPage() {
  const router = useRouter();
  const {
    items,
    orderType,
    setOrderType,
    tableNumber,
    setTableNumber,
    roomNumber,
    setRoomNumber,
    promoCode,
    discountAmount,
    applyPromoCode,
    removePromoCode,
    guestPhone,
    setGuestPhone,
    paymentMethod,
    setPaymentMethod,
    getSubtotal,
    getTaxAmount,
    getServiceCharge,
    getTotal,
  } = useCartStore();

  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  const subtotal = getSubtotal();
  const discountedSubtotal = subtotal - discountAmount;
  const tax = getTaxAmount();
  const serviceCharge = getServiceCharge();
  const total = getTotal();

  if (items.length === 0) {
    router.push('/menu');
    return null;
  }

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;

    setIsValidatingPromo(true);
    setPromoError('');

    // TODO: Replace with actual server action call
    // Simulating validation for now
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Mock validation (replace with real server action)
    if (promoInput.toUpperCase() === 'WELCOME10') {
      applyPromoCode('WELCOME10', subtotal * 0.1, 'demo-promo-id');
      setPromoInput('');
    } else {
      setPromoError('Invalid promo code');
    }

    setIsValidatingPromo(false);
  };

  const handlePlaceOrder = () => {
    // Validation
    if (!orderType) {
      alert('Please select an order type');
      return;
    }
    if (orderType === 'dine_in' && !tableNumber) {
      alert('Please enter your table number');
      return;
    }
    if (orderType === 'room_service' && !roomNumber) {
      alert('Please enter your room number');
      return;
    }
    if (!paymentMethod) {
      alert('Please select a payment method');
      return;
    }

    // TODO: Call server action to create order
    // For now, navigate to confirmation
    router.push('/confirmation?orderNumber=1234');
  };

  return (
    <div className="h-full flex bg-[var(--kiosk-bg)]">
      {/* Left side - Checkout form */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-5 bg-white border-b border-stone-200">
          <div className="flex items-center gap-4">
            <Link
              href="/cart"
              className="w-11 h-11 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center active:scale-95 transition-all"
            >
              <ChevronLeft className="w-5 h-5 text-stone-600" strokeWidth={2} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-stone-800">Checkout</h1>
              <p className="text-sm text-stone-500 mt-0.5">Complete your order details</p>
            </div>
          </div>
        </div>

        {/* Scrollable form sections */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1: Order Type */}
          <section className="bg-white rounded-2xl border border-stone-200 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <span className="text-lg font-bold text-amber-600">1</span>
              </div>
              <h2 className="text-lg font-bold text-stone-800">Select Order Type</h2>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {ORDER_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = orderType === type.value;
                return (
                  <button
                    key={type.value}
                    onClick={() => setOrderType(type.value)}
                    className={cn(
                      'relative p-5 rounded-xl border-2 transition-all text-left min-h-[120px] flex flex-col',
                      isSelected
                        ? 'border-amber-500 bg-amber-50 shadow-md'
                        : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                      </div>
                    )}
                    <Icon
                      className={cn(
                        'w-8 h-8 mb-3',
                        isSelected ? 'text-amber-600' : 'text-stone-400'
                      )}
                      strokeWidth={2}
                    />
                    <h3
                      className={cn(
                        'text-base font-semibold mb-1',
                        isSelected ? 'text-amber-900' : 'text-stone-700'
                      )}
                    >
                      {type.label}
                    </h3>
                    <p className={cn('text-xs', isSelected ? 'text-amber-700' : 'text-stone-500')}>
                      {type.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Conditional inputs */}
            {orderType === 'dine_in' && (
              <div className="mt-5 animate-fade-in">
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Table Number
                </label>
                <Input
                  type="text"
                  value={tableNumber || ''}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="Enter your table number"
                  className="h-12 text-base"
                />
              </div>
            )}

            {orderType === 'room_service' && (
              <div className="mt-5 animate-fade-in">
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Room Number
                </label>
                <Input
                  type="text"
                  value={roomNumber || ''}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="Enter your room number"
                  className="h-12 text-base"
                />
              </div>
            )}
          </section>

          {/* Step 2: Promo Code */}
          <section className="bg-white rounded-2xl border border-stone-200 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Tag className="w-5 h-5 text-amber-600" strokeWidth={2} />
              </div>
              <h2 className="text-lg font-bold text-stone-800">Promo Code (Optional)</h2>
            </div>

            {promoCode ? (
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-600" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="font-semibold text-green-900">{promoCode}</p>
                    <p className="text-sm text-green-700">
                      Discount: {formatCurrency(discountAmount)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={removePromoCode}
                  className="w-9 h-9 rounded-lg hover:bg-green-100 flex items-center justify-center active:scale-95 transition-all"
                >
                  <X className="w-5 h-5 text-green-700" strokeWidth={2} />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Input
                    type="text"
                    value={promoInput}
                    onChange={(e) => {
                      setPromoInput(e.target.value.toUpperCase());
                      setPromoError('');
                    }}
                    placeholder="Enter promo code"
                    className="flex-1 h-12 text-base uppercase"
                  />
                  <Button
                    onClick={handleApplyPromo}
                    disabled={!promoInput.trim() || isValidatingPromo}
                    className="h-12 px-6 bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                  >
                    {isValidatingPromo ? 'Checking...' : 'Apply'}
                  </Button>
                </div>
                {promoError && (
                  <p className="text-sm text-red-600 flex items-center gap-2">
                    <X className="w-4 h-4" />
                    {promoError}
                  </p>
                )}
                <p className="text-xs text-stone-500">
                  💡 Try: <strong>WELCOME10</strong> for 10% off
                </p>
              </div>
            )}
          </section>

          {/* Step 3: Guest Phone (Optional) */}
          <section className="bg-white rounded-2xl border border-stone-200 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Phone className="w-5 h-5 text-amber-600" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-stone-800">Phone Number (Optional)</h2>
                <p className="text-xs text-stone-500 mt-0.5">For order updates and history</p>
              </div>
            </div>

            <Input
              type="tel"
              value={guestPhone || ''}
              onChange={(e) => setGuestPhone(e.target.value)}
              placeholder="+63 XXX XXX XXXX"
              className="h-12 text-base"
            />
          </section>

          {/* Step 4: Payment Method */}
          <section className="bg-white rounded-2xl border border-stone-200 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-amber-600" strokeWidth={2} />
              </div>
              <h2 className="text-lg font-bold text-stone-800">Payment Method</h2>
            </div>

            <div className="space-y-3">
              {PAYMENT_METHODS.map((method) => {
                const isSelected = paymentMethod === method.value;
                return (
                  <button
                    key={method.value}
                    onClick={() => setPaymentMethod(method.value)}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                      isSelected
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                    )}
                  >
                    <div className="w-12 h-12 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-2xl">
                      {method.icon}
                    </div>
                    <div className="flex-1">
                      <h3
                        className={cn(
                          'text-base font-semibold',
                          isSelected ? 'text-amber-900' : 'text-stone-700'
                        )}
                      >
                        {method.label}
                      </h3>
                      <p
                        className={cn(
                          'text-sm',
                          isSelected ? 'text-amber-700' : 'text-stone-500'
                        )}
                      >
                        {method.description}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* Right side - Order summary */}
      <div className="w-96 flex-shrink-0 bg-white border-l border-stone-200 flex flex-col">
        <div className="p-6 border-b border-stone-200">
          <h2 className="text-lg font-bold text-stone-800">Order Summary</h2>
        </div>

        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          {/* Items list */}
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <div className="flex-1">
                  <p className="font-medium text-stone-700">
                    {item.quantity}x {item.name}
                  </p>
                  {item.addons.length > 0 && (
                    <p className="text-xs text-stone-500 mt-0.5">
                      + {item.addons.map((a) => a.name).join(', ')}
                    </p>
                  )}
                </div>
                <p className="font-semibold text-stone-700">{formatCurrency(item.totalPrice)}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-stone-200 pt-4 space-y-3">
            <div className="flex justify-between text-sm text-stone-600">
              <span>Subtotal</span>
              <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount ({promoCode})</span>
                <span className="font-semibold">-{formatCurrency(discountAmount)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm text-stone-600">
              <span>Tax (12%)</span>
              <span className="font-semibold">{formatCurrency(tax)}</span>
            </div>

            <div className="flex justify-between text-sm text-stone-600">
              <span>Service Charge (10%)</span>
              <span className="font-semibold">{formatCurrency(serviceCharge)}</span>
            </div>
          </div>

          <div className="border-t-2 border-stone-300 pt-4">
            <div className="flex justify-between items-baseline">
              <span className="text-base font-semibold text-stone-800">Total</span>
              <span className="text-2xl font-bold text-stone-900">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Place order button */}
        <div className="p-6 border-t border-stone-200">
          <Button
            onClick={handlePlaceOrder}
            disabled={!orderType || !paymentMethod}
            className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-lg font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all group"
          >
            <span>Place Order</span>
            <ChevronRight
              className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform"
              strokeWidth={2.5}
            />
          </Button>
        </div>
      </div>
    </div>
  );
}
