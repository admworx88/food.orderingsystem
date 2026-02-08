'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/currency';
import type { BIRReceiptData } from '@/types/payment';

interface ReceiptPreviewProps {
  receipt: BIRReceiptData;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'CASH',
  gcash: 'GCASH',
  card: 'CARD',
};

/**
 * BIR-compliant receipt layout with print support.
 * Uses @media print CSS for 58mm/80mm thermal printers.
 */
export function ReceiptPreview({ receipt }: ReceiptPreviewProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    window.print();
  }

  const dateTime = new Date(receipt.dateTime);
  const formattedDate = dateTime.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
  const formattedTime = dateTime.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return (
    <div>
      {/* Print button (hidden in print) */}
      <div className="mb-4 flex gap-2 print:hidden">
        <Button onClick={handlePrint} className="flex-1">
          Print Receipt
        </Button>
      </div>

      {/* Receipt content */}
      <Card className="mx-auto max-w-sm p-6 font-mono text-xs print:border-0 print:shadow-none print:max-w-none print:p-0" ref={receiptRef}>
        {/* Header */}
        <div className="text-center">
          <div className="text-sm font-bold">{receipt.businessName}</div>
          <div>{receipt.businessAddress}</div>
          <div>TIN: {receipt.tin}</div>
          {receipt.accreditationNumber && (
            <div>Accreditation: {receipt.accreditationNumber}</div>
          )}
          {receipt.permitNumber && (
            <div>Permit: {receipt.permitNumber}</div>
          )}
          {receipt.posMachineId && (
            <div>POS: {receipt.posMachineId}</div>
          )}
          {receipt.terminalId && (
            <div>Terminal: {receipt.terminalId}</div>
          )}
        </div>

        <div className="my-2 border-t border-dashed" />

        {/* Receipt number and order info */}
        <div className="text-center">
          <div className="font-bold">OFFICIAL RECEIPT</div>
          <div>No. {receipt.receiptNumber}</div>
        </div>

        <div className="my-2 border-t border-dashed" />

        <div className="flex justify-between">
          <span>Order: #{receipt.orderNumber}</span>
          <span>{receipt.orderType.replace('_', ' ').toUpperCase()}</span>
        </div>
        {receipt.tableNumber && (
          <div>Table: {receipt.tableNumber}</div>
        )}
        {receipt.roomNumber && (
          <div>Room: {receipt.roomNumber}</div>
        )}
        <div>Date: {formattedDate} {formattedTime}</div>
        <div>Cashier: {receipt.cashierName}</div>

        <div className="my-2 border-t border-dashed" />

        {/* Items */}
        <div className="space-y-1">
          {receipt.items.map((item, i) => (
            <div key={i}>
              <div className="flex justify-between">
                <span>{item.quantity}x {item.name}</span>
                <span>{formatCurrency(item.totalPrice)}</span>
              </div>
              {item.unitPrice !== item.totalPrice / item.quantity && (
                <div className="ml-4 text-[10px] text-muted-foreground">
                  @ {formatCurrency(item.unitPrice)} each
                </div>
              )}
              {item.addons.map((addon, j) => (
                <div key={j} className="ml-4 flex justify-between text-[10px]">
                  <span>+ {addon.name}</span>
                  {addon.price > 0 && <span>{formatCurrency(addon.price)}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="my-2 border-t border-dashed" />

        {/* Totals */}
        <div className="space-y-0.5">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(receipt.subtotal)}</span>
          </div>
          {receipt.discountAmount > 0 && (
            <div className="flex justify-between">
              <span>{receipt.discountLabel || 'Discount'}</span>
              <span>-{formatCurrency(receipt.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>VATable Sales</span>
            <span>{formatCurrency(receipt.taxableAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>VAT (12%)</span>
            <span>{formatCurrency(receipt.vatAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Service Charge (10%)</span>
            <span>{formatCurrency(receipt.serviceCharge)}</span>
          </div>
          <div className="my-1 border-t" />
          <div className="flex justify-between font-bold text-sm">
            <span>TOTAL</span>
            <span>{formatCurrency(receipt.totalAmount)}</span>
          </div>
        </div>

        <div className="my-2 border-t border-dashed" />

        {/* Payment info */}
        <div className="space-y-0.5">
          <div className="flex justify-between">
            <span>Payment</span>
            <span>{PAYMENT_METHOD_LABELS[receipt.paymentMethod] || receipt.paymentMethod}</span>
          </div>
          {receipt.amountTendered !== null && (
            <div className="flex justify-between">
              <span>Cash Tendered</span>
              <span>{formatCurrency(receipt.amountTendered)}</span>
            </div>
          )}
          {receipt.changeGiven !== null && receipt.changeGiven > 0 && (
            <div className="flex justify-between">
              <span>Change</span>
              <span>{formatCurrency(receipt.changeGiven)}</span>
            </div>
          )}
          {receipt.providerReference && (
            <div className="flex justify-between">
              <span>Ref</span>
              <span className="max-w-[120px] truncate">{receipt.providerReference}</span>
            </div>
          )}
        </div>

        {receipt.promoCode && (
          <>
            <div className="my-2 border-t border-dashed" />
            <div className="text-center">
              Promo Code: {receipt.promoCode}
            </div>
          </>
        )}

        <div className="my-2 border-t border-dashed" />

        {/* Footer */}
        <div className="text-center text-[10px] leading-relaxed">
          <div>This receipt is valid for five (5) years</div>
          <div>from the date of the permit to use.</div>
          {receipt.guestPhone && (
            <div className="mt-1">Guest: {receipt.guestPhone}</div>
          )}
          <div className="mt-2 font-bold">Thank you!</div>
        </div>
      </Card>
    </div>
  );
}
