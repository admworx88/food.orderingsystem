'use client';

import { useState, useCallback } from 'react';
import { Delete, Check, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { CASH_QUICK_AMOUNTS } from '@/lib/constants/payment-methods';
import { cn } from '@/lib/utils';

interface CashCalculatorProps {
  totalAmount: number;
  onConfirm: (amountTendered: number) => void;
  isProcessing: boolean;
}

/**
 * Cash payment calculator - Terminal Command Center theme
 * Large tactile numpad with satisfying interactions
 */
export function CashCalculator({ totalAmount, onConfirm, isProcessing }: CashCalculatorProps) {
  const [inputValue, setInputValue] = useState('');

  const amountTendered = parseFloat(inputValue) || 0;
  const changeAmount = amountTendered - totalAmount;
  const isValid = amountTendered >= totalAmount;

  const appendDigit = useCallback((digit: string) => {
    setInputValue((prev) => {
      if (digit === '.' && prev.includes('.')) return prev;
      if (prev.includes('.') && prev.split('.')[1].length >= 2) return prev;
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
    <div>
      {/* Amount Due display */}
      <div className="pos-amount-display">
        <div className="pos-amount-label">Amount Due</div>
        <div className="pos-amount-value">{formatCurrency(totalAmount)}</div>
      </div>

      {/* Cash tendered input */}
      <div className={cn(
        'pos-cash-display',
        inputValue && 'pos-cash-display-active'
      )}>
        <div className="pos-amount-label">Cash Tendered</div>
        <div className="pos-cash-input">
          {inputValue ? formatCurrency(amountTendered) : '₱0.00'}
        </div>
      </div>

      {/* Change display */}
      <div className={cn(
        'pos-change-display',
        isValid && 'pos-change-display-valid'
      )}>
        <div className="pos-amount-label">Change</div>
        <div className={cn(
          'pos-change-value',
          isValid && 'pos-change-value-valid'
        )}>
          {isValid ? formatCurrency(changeAmount) : '—'}
        </div>
      </div>

      {/* Quick amounts */}
      <div className="pos-quick-amounts">
        {CASH_QUICK_AMOUNTS.map((amount) => (
          <button
            key={amount}
            className="pos-quick-btn"
            onClick={() => selectQuickAmount(amount)}
          >
            {formatCurrency(amount)}
          </button>
        ))}
      </div>

      {/* Exact amount button */}
      <button
        className="pos-exact-btn"
        onClick={() => selectQuickAmount(Math.ceil(totalAmount))}
      >
        Exact Amount ({formatCurrency(totalAmount)})
      </button>

      {/* Numpad */}
      <div className="pos-numpad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map((key) => (
          <button
            key={key}
            className="pos-numpad-key"
            onClick={() => appendDigit(key)}
          >
            {key}
          </button>
        ))}
        <button
          className="pos-numpad-key pos-numpad-key-action"
          onClick={backspace}
        >
          <Delete className="w-5 h-5 mx-auto" />
        </button>
      </div>

      {/* Action buttons */}
      <div className="pos-action-row">
        <button className="pos-btn-clear" onClick={clear}>
          Clear
        </button>
        <button
          className="pos-btn-confirm"
          onClick={handleConfirm}
          disabled={!isValid || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
              Processing...
            </>
          ) : (
            <>
              <Check className="w-5 h-5 inline mr-2" />
              Confirm Payment
            </>
          )}
        </button>
      </div>
    </div>
  );
}
