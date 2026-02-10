'use client';

import { useState } from 'react';
import { UserCheck, Loader2 } from 'lucide-react';
import { applySeniorPwdDiscount } from '@/services/payment-service';
import { formatCurrency } from '@/lib/utils/currency';
import { SENIOR_PWD_DISCOUNT_RATE } from '@/lib/constants/payment-methods';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DiscountSelectorProps {
  orderId: string;
  subtotal: number;
  currentDiscount: number;
  onDiscountApplied: () => void;
}

/**
 * Senior/PWD discount selector - Terminal Command Center theme
 * 20% pre-tax per RA 9994/10754
 */
export function DiscountSelector({
  orderId,
  subtotal,
  currentDiscount,
  onDiscountApplied,
}: DiscountSelectorProps) {
  const [discountType, setDiscountType] = useState<'senior' | 'pwd' | null>(null);
  const [idNumber, setIdNumber] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const hasExistingDiscount = currentDiscount > 0;
  const previewDiscount = Math.round(subtotal * SENIOR_PWD_DISCOUNT_RATE * 100) / 100;

  async function handleApply() {
    if (!discountType || !idNumber.trim()) return;

    setIsApplying(true);
    const result = await applySeniorPwdDiscount({
      orderId,
      discountType,
      idNumber: idNumber.trim(),
    });
    setIsApplying(false);

    if (result.success) {
      toast.success(
        `${discountType === 'senior' ? 'Senior' : 'PWD'} discount applied: ${formatCurrency(result.data.discountAmount)}`
      );
      onDiscountApplied();
    } else {
      toast.error(result.error);
    }
  }

  if (hasExistingDiscount) {
    return (
      <div className="pos-discount-applied">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[var(--pos-mint)]" />
          <span className="text-sm text-[var(--pos-text-muted)]">Discount Applied</span>
        </div>
        <span className="pos-discount-badge">
          -{formatCurrency(currentDiscount)}
        </span>
      </div>
    );
  }

  return (
    <div className="pos-discount-card">
      <div className="pos-discount-header">
        <UserCheck className="w-4 h-4" />
        Apply Discount
      </div>

      <div className="pos-discount-types">
        <button
          className={cn(
            'pos-discount-type-btn',
            discountType === 'senior' && 'pos-discount-type-btn-active'
          )}
          onClick={() => setDiscountType('senior')}
        >
          Senior (20%)
        </button>
        <button
          className={cn(
            'pos-discount-type-btn',
            discountType === 'pwd' && 'pos-discount-type-btn-active'
          )}
          onClick={() => setDiscountType('pwd')}
        >
          PWD (20%)
        </button>
      </div>

      {discountType && (
        <div className="pos-discount-form">
          <label htmlFor="id-number" className="pos-discount-label">
            {discountType === 'senior' ? 'Senior Citizen' : 'PWD'} ID Number
          </label>
          <input
            id="id-number"
            type="text"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            placeholder="Enter ID number"
            className="pos-discount-input"
          />
          <div className="pos-discount-preview">
            Preview: <span className="text-[var(--pos-mint)]">-{formatCurrency(previewDiscount)}</span> off subtotal
          </div>
          <button
            className="pos-discount-apply-btn"
            disabled={!idNumber.trim() || isApplying}
            onClick={handleApply}
          >
            {isApplying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Applying...
              </>
            ) : (
              'Apply Discount'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
