'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { createPromoCode, updatePromoCode } from '@/services/promo-service';
import type { Database } from '@/lib/supabase/types';

type PromoCode = Database['public']['Tables']['promo_codes']['Row'];

interface PromoCodeFormDialogProps {
  promoCode?: PromoCode;
  trigger: React.ReactNode;
}

function formatDateForInput(dateStr: string): string {
  return dateStr.split('T')[0] || dateStr;
}

export function PromoCodeFormDialog({ promoCode, trigger }: PromoCodeFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = !!promoCode;

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed_amount'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [maxUsageCount, setMaxUsageCount] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (open && promoCode) {
      setCode(promoCode.code);
      setDiscountType(promoCode.discount_type);
      setDiscountValue(String(promoCode.discount_value));
      setValidFrom(formatDateForInput(promoCode.valid_from));
      setValidUntil(formatDateForInput(promoCode.valid_until));
      setMaxUsageCount(promoCode.max_usage_count !== null ? String(promoCode.max_usage_count) : '');
      setMinOrderAmount(promoCode.min_order_amount !== null ? String(promoCode.min_order_amount) : '');
      setDescription(promoCode.description ?? '');
      setIsActive(promoCode.is_active ?? true);
    } else if (open && !promoCode) {
      setCode('');
      setDiscountType('percentage');
      setDiscountValue('');
      setValidFrom('');
      setValidUntil('');
      setMaxUsageCount('');
      setMinOrderAmount('');
      setDescription('');
      setIsActive(true);
    }
  }, [open, promoCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const input = {
        code,
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        valid_from: validFrom,
        valid_until: validUntil,
        max_usage_count: maxUsageCount ? parseInt(maxUsageCount, 10) : null,
        min_order_amount: minOrderAmount ? parseFloat(minOrderAmount) : null,
        description: description || null,
        is_active: isActive,
      };

      const result = isEdit
        ? await updatePromoCode(promoCode.id, input)
        : await createPromoCode(input);

      if (result.success) {
        toast.success(isEdit ? 'Promo code updated' : 'Promo code created');
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Promo Code' : 'Create Promo Code'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              placeholder="e.g. SUMMER20"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount_type">Discount Type</Label>
              <Select value={discountType} onValueChange={(v) => setDiscountType(v as 'percentage' | 'fixed_amount')}>
                <SelectTrigger id="discount_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed_amount">Fixed Amount (PHP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount_value">
                {discountType === 'percentage' ? 'Discount (%)' : 'Discount (PHP)'}
              </Label>
              <Input
                id="discount_value"
                type="number"
                step={discountType === 'percentage' ? '1' : '0.01'}
                min="0"
                max={discountType === 'percentage' ? '100' : undefined}
                placeholder={discountType === 'percentage' ? '20' : '100.00'}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valid_from">Valid From</Label>
              <Input
                id="valid_from"
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valid_until">Valid Until</Label>
              <Input
                id="valid_until"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                min={validFrom || undefined}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_usage_count">Max Uses (optional)</Label>
              <Input
                id="max_usage_count"
                type="number"
                min="1"
                step="1"
                placeholder="Unlimited"
                value={maxUsageCount}
                onChange={(e) => setMaxUsageCount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_order_amount">Min Order (optional)</Label>
              <Input
                id="min_order_amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="No minimum"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Internal note about this promo code..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
