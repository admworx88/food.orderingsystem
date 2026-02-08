'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { applySeniorPwdDiscount } from '@/services/payment-service';
import { formatCurrency } from '@/lib/utils/currency';
import { SENIOR_PWD_DISCOUNT_RATE } from '@/lib/constants/payment-methods';
import { toast } from 'sonner';

interface DiscountSelectorProps {
  orderId: string;
  subtotal: number;
  currentDiscount: number;
  onDiscountApplied: () => void;
}

/**
 * Senior/PWD discount selector (20% pre-tax per RA 9994/10754).
 * Only one discount type per order. Requires ID number input.
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
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Discount Applied</span>
          <Badge variant="outline" className="bg-green-50 text-green-700">
            -{formatCurrency(currentDiscount)}
          </Badge>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="text-sm font-medium">Apply Discount</div>

      <div className="flex gap-2">
        <Button
          variant={discountType === 'senior' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDiscountType('senior')}
        >
          Senior (20%)
        </Button>
        <Button
          variant={discountType === 'pwd' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDiscountType('pwd')}
        >
          PWD (20%)
        </Button>
      </div>

      {discountType && (
        <>
          <div>
            <Label htmlFor="id-number" className="text-xs">
              {discountType === 'senior' ? 'Senior Citizen' : 'PWD'} ID Number
            </Label>
            <Input
              id="id-number"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder="Enter ID number"
              className="mt-1"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            Preview: -{formatCurrency(previewDiscount)} off subtotal
          </div>
          <Button
            size="sm"
            className="w-full"
            disabled={!idNumber.trim() || isApplying}
            onClick={handleApply}
          >
            {isApplying ? 'Applying...' : 'Apply Discount'}
          </Button>
        </>
      )}
    </Card>
  );
}
