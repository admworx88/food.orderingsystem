'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/currency';
import type { BIRReceiptData } from '@/types/payment';

interface ReceiptPreviewProps {
  receipt: BIRReceiptData;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  gcash: 'GCash',
  card: 'Card',
};

function formatKioskLocation(location: string | null): string | null {
  if (!location) return null;
  return location
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ReceiptPreview({ receipt }: ReceiptPreviewProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    window.print();
  }

  const dateTime = new Date(receipt.dateTime);
  const formattedDate = dateTime.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  });
  const formattedTime = dateTime.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const locationLabel = formatKioskLocation(receipt.kioskLocation);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Print button */}
      <div className="w-full max-w-xs print:hidden">
        <Button onClick={handlePrint} className="w-full gap-2" size="lg">
          <Printer className="h-4 w-4" />
          Print Receipt
        </Button>
      </div>

      {/* Receipt paper */}
      <div
        ref={receiptRef}
        className="w-full max-w-xs bg-white font-mono text-[11px] leading-relaxed text-neutral-800 shadow-[0_2px_16px_rgba(0,0,0,0.10)] print:shadow-none print:max-w-none"
        style={{ fontFamily: "'Courier New', Courier, monospace" }}
      >
        {/* Top tear edge */}
        <div
          className="h-3 w-full print:hidden"
          style={{
            background:
              'radial-gradient(circle at 6px -2px, transparent 6px, #fff 6px) repeat-x',
            backgroundSize: '12px 12px',
            backgroundColor: '#f3f4f6',
          }}
        />

        <div className="px-5 py-4">
          {/* Logo */}
          <div className="mb-3 flex justify-center">
            <Image
              src="/arenalogo.png"
              alt="Arena Blanca Resort"
              width={72}
              height={72}
              className="object-contain"
              priority
            />
          </div>

          {/* Business Header */}
          <div className="mb-4 text-center">
            <div className="text-[15px] font-bold tracking-wide uppercase text-neutral-900">
              {receipt.businessName}
            </div>
            <div className="text-[10px] font-medium tracking-wide text-neutral-500 uppercase mt-0.5">
              Restaurant &amp; Dining
            </div>
            {locationLabel && (
              <div className="text-[10px] font-medium tracking-wide text-neutral-500 uppercase mt-0.5">
                {locationLabel}
              </div>
            )}
            <div className="mt-2 text-[10px] text-neutral-500 leading-snug">
              Britania, San Agustin, Surigao Del Sur, Philippines 8000
            </div>
          </div>

          {/* Receipt number band — number only, no labels */}
          <div className="bg-neutral-900 text-white text-center py-2 -mx-5 mb-4">
            <div className="text-[14px] font-bold tracking-widest">
              {receipt.receiptNumber}
            </div>
          </div>

          {/* Order meta */}
          <div className="mb-3 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Order</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">#{receipt.orderNumber}</span>
                <span className="bg-neutral-100 px-1.5 py-0.5 text-[9px] font-bold tracking-wide rounded-sm">
                  {receipt.orderType.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
            {receipt.tableNumber && (
              <div className="flex justify-between">
                <span className="text-neutral-500">Table</span>
                <span className="font-semibold">{receipt.tableNumber}</span>
              </div>
            )}
            {receipt.roomNumber && (
              <div className="flex justify-between">
                <span className="text-neutral-500">Room</span>
                <span className="font-semibold">{receipt.roomNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-neutral-500">Date</span>
              <span>{formattedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Time</span>
              <span>{formattedTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Cashier</span>
              <span>{receipt.cashierName}</span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-neutral-300 my-3" />

          {/* Items header */}
          <div className="flex justify-between text-[9px] uppercase tracking-widest text-neutral-400 mb-1.5">
            <span>Item</span>
            <span>Amount</span>
          </div>

          {/* Items */}
          <div className="space-y-2 mb-3">
            {receipt.items.map((item, i) => (
              <div key={i}>
                <div className="flex justify-between">
                  <span>
                    <span className="text-neutral-400">{item.quantity}×</span>{' '}
                    <span className="font-medium">{item.name}</span>
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(item.totalPrice)}
                  </span>
                </div>
                {item.unitPrice !== item.totalPrice / item.quantity && (
                  <div className="ml-4 text-[9px] text-neutral-400">
                    @ {formatCurrency(item.unitPrice)} each
                  </div>
                )}
                {item.addons.map((addon, j) => (
                  <div key={j} className="ml-4 flex justify-between text-[10px] text-neutral-500">
                    <span>↳ {addon.name}</span>
                    {addon.price > 0 && (
                      <span className="tabular-nums">+{formatCurrency(addon.price)}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-neutral-300 my-3" />

          {/* Totals */}
          <div className="space-y-1 mb-3">
            <div className="flex justify-between text-neutral-500">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCurrency(receipt.subtotal)}</span>
            </div>
            {receipt.discountAmount > 0 && (
              <div className="flex justify-between text-neutral-500">
                <span>{receipt.discountLabel || 'Discount'}</span>
                <span className="tabular-nums text-emerald-600">
                  −{formatCurrency(receipt.discountAmount)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-neutral-500">
              <span>VATable Sales</span>
              <span className="tabular-nums">{formatCurrency(receipt.taxableAmount)}</span>
            </div>
            <div className="flex justify-between text-neutral-500">
              <span>VAT (12%)</span>
              <span className="tabular-nums">{formatCurrency(receipt.vatAmount)}</span>
            </div>
            <div className="flex justify-between text-neutral-500">
              <span>Service Charge (10%)</span>
              <span className="tabular-nums">{formatCurrency(receipt.serviceCharge)}</span>
            </div>
          </div>

          {/* Total band */}
          <div className="border-t-2 border-neutral-800 pt-2 mb-3">
            <div className="flex justify-between items-baseline">
              <span className="text-[13px] font-bold tracking-wide uppercase">Total</span>
              <span className="text-[15px] font-bold tabular-nums">
                {formatCurrency(receipt.totalAmount)}
              </span>
            </div>
          </div>

          {/* Payment */}
          <div className="space-y-1 mb-3">
            <div className="flex justify-between">
              <span className="text-neutral-500">Payment</span>
              <span className="font-semibold">
                {PAYMENT_METHOD_LABELS[receipt.paymentMethod] || receipt.paymentMethod}
              </span>
            </div>
            {receipt.amountTendered !== null && (
              <div className="flex justify-between text-neutral-500">
                <span>Tendered</span>
                <span className="tabular-nums">{formatCurrency(receipt.amountTendered)}</span>
              </div>
            )}
            {receipt.changeGiven !== null && receipt.changeGiven > 0 && (
              <div className="flex justify-between text-neutral-500">
                <span>Change</span>
                <span className="tabular-nums">{formatCurrency(receipt.changeGiven)}</span>
              </div>
            )}
            {receipt.providerReference && (
              <div className="flex justify-between text-neutral-500">
                <span>Ref #</span>
                <span className="max-w-[120px] truncate tabular-nums">
                  {receipt.providerReference}
                </span>
              </div>
            )}
          </div>

          {receipt.promoCode && (
            <>
              <div className="border-t border-dashed border-neutral-300 my-3" />
              <div className="text-center text-[10px] text-neutral-500">
                Promo Applied:{' '}
                <span className="font-semibold text-neutral-700">{receipt.promoCode}</span>
              </div>
            </>
          )}

          {/* Divider */}
          <div className="border-t border-dashed border-neutral-300 my-3" />

          {/* Footer */}
          <div className="text-center text-[9px] leading-relaxed text-neutral-400">
            <div>This receipt is valid for five (5) years</div>
            <div>from the date of the permit to use.</div>
            {receipt.guestPhone && (
              <div className="mt-1">Guest: {receipt.guestPhone}</div>
            )}
            <div className="mt-3 text-[11px] font-bold tracking-widest text-neutral-700 uppercase">
              Thank You
            </div>
            <div className="mt-0.5">We hope to see you again!</div>
          </div>
        </div>

        {/* Bottom tear edge */}
        <div
          className="h-3 w-full print:hidden"
          style={{
            background:
              'radial-gradient(circle at 6px 14px, transparent 6px, #fff 6px) repeat-x',
            backgroundSize: '12px 12px',
            backgroundColor: '#f3f4f6',
          }}
        />
      </div>
    </div>
  );
}
