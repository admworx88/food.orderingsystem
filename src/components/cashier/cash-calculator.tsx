'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/currency';
import { CASH_QUICK_AMOUNTS } from '@/lib/constants/payment-methods';
import { cn } from '@/lib/utils';

interface CashCalculatorProps {
  totalAmount: number;
  onConfirm: (amountTendered: number) => void;
  isProcessing: boolean;
}

/**
 * Cash payment numpad with quick-select denomination buttons.
 * Shows real-time change calculation.
 * Confirm button enabled only when amount >= total.
 */
export function CashCalculator({ totalAmount, onConfirm, isProcessing }: CashCalculatorProps) {
  const [inputValue, setInputValue] = useState('');

  const amountTendered = parseFloat(inputValue) || 0;
  const changeAmount = amountTendered - totalAmount;
  const isValid = amountTendered >= totalAmount;

  const appendDigit = useCallback((digit: string) => {
    setInputValue((prev) => {
      // Prevent multiple decimal points
      if (digit === '.' && prev.includes('.')) return prev;
      // Limit decimal places to 2
      if (prev.includes('.') && prev.split('.')[1].length >= 2) return prev;
      // Limit total length
      if (prev.length >= 10) return prev;
      return prev + digit;
    });
  }, []);

  const backspace = useCallback(() => {
    setInputValue((prev) => prev.slice(0, -1));
  }, []);

  const clear = useCallback(() => {
    setInputValue('');
  }, []);

  const selectQuickAmount = useCallback((amount: number) => {
    setInputValue(amount.toString());
  }, []);

  const handleConfirm = useCallback(() => {
    if (isValid && !isProcessing) {
      onConfirm(amountTendered);
    }
  }, [isValid, isProcessing, amountTendered, onConfirm]);

  return (
    <div className="space-y-4">
      {/* Total due */}
      <div className="text-center">
        <div className="text-sm text-muted-foreground">Amount Due</div>
        <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
      </div>

      {/* Amount entered display */}
      <div className="rounded-lg border bg-muted/30 p-3 text-center">
        <div className="text-sm text-muted-foreground">Cash Tendered</div>
        <div className="text-3xl font-bold font-mono">
          {inputValue ? formatCurrency(amountTendered) : '₱0.00'}
        </div>
      </div>

      {/* Change display */}
      <div className={cn(
        'rounded-lg border p-3 text-center',
        isValid ? 'bg-green-50 border-green-200' : 'bg-muted/20'
      )}>
        <div className="text-sm text-muted-foreground">Change</div>
        <div className={cn(
          'text-xl font-bold',
          isValid ? 'text-green-700' : 'text-muted-foreground'
        )}>
          {isValid ? formatCurrency(changeAmount) : '—'}
        </div>
      </div>

      {/* Quick amounts */}
      <div className="grid grid-cols-5 gap-2">
        {CASH_QUICK_AMOUNTS.map((amount) => (
          <Button
            key={amount}
            variant="outline"
            size="sm"
            className="font-mono"
            onClick={() => selectQuickAmount(amount)}
          >
            {formatCurrency(amount)}
          </Button>
        ))}
      </div>

      {/* Exact amount button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => selectQuickAmount(Math.ceil(totalAmount))}
      >
        Exact Amount ({formatCurrency(totalAmount)})
      </Button>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '←'].map((key) => (
          <Button
            key={key}
            variant="outline"
            className="h-12 text-lg font-mono"
            onClick={() => {
              if (key === '←') backspace();
              else appendDigit(key);
            }}
          >
            {key}
          </Button>
        ))}
      </div>

      {/* Clear & Confirm */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={clear}>
          Clear
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!isValid || isProcessing}
          className="font-semibold"
        >
          {isProcessing ? 'Processing...' : 'Confirm Payment'}
        </Button>
      </div>
    </div>
  );
}
