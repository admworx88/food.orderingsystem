'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { processRefund } from '@/services/payment-service';
import { REFUND_REASONS } from '@/lib/constants/payment-methods';
import { formatCurrency } from '@/lib/utils/currency';
import { toast } from 'sonner';
import type { RefundReason, CashierOrderItem } from '@/types/payment';

interface RefundDialogProps {
  paymentId: string;
  paymentAmount: number;
  orderItems: CashierOrderItem[];
  onRefundComplete: () => void;
}

/**
 * Refund dialog: reason dropdown, optional reason text,
 * manager PIN (4 digits, masked), partial/full toggle,
 * item selector for partial refund (US-C03).
 */
export function RefundDialog({
  paymentId,
  paymentAmount,
  orderItems,
  onRefundComplete,
}: RefundDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<RefundReason | ''>('');
  const [reasonText, setReasonText] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [isPartial, setIsPartial] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const partialAmount = isPartial
    ? orderItems
        .filter((item) => selectedItemIds.includes(item.id))
        .reduce((sum, item) => sum + item.total_price, 0)
    : paymentAmount;

  function toggleItem(itemId: string) {
    setSelectedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  }

  async function handleRefund() {
    if (!reason) {
      toast.error('Please select a refund reason');
      return;
    }

    setIsProcessing(true);
    const result = await processRefund({
      paymentId,
      reason,
      reasonText: reason === 'other' ? reasonText : undefined,
      managerPin,
      isPartial,
      itemIds: isPartial ? selectedItemIds : undefined,
    });
    setIsProcessing(false);

    if (result.success) {
      toast.success('Refund processed successfully');
      setOpen(false);
      onRefundComplete();
    } else {
      toast.error(result.error);
    }
  }

  function resetForm() {
    setReason('');
    setReasonText('');
    setManagerPin('');
    setIsPartial(false);
    setSelectedItemIds([]);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Refund
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Process Refund</DialogTitle>
          <DialogDescription>
            Refund amount: {formatCurrency(isPartial ? partialAmount : paymentAmount)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Reason */}
          <div>
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as RefundReason)}>
              <SelectTrigger>
                <SelectValue placeholder="Select refund reason" />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(REFUND_REASONS) as [RefundReason, string][]).map(
                  ([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Other reason text */}
          {reason === 'other' && (
            <div>
              <Label>Reason Details (min 10 characters)</Label>
              <Textarea
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="Describe the refund reason..."
                rows={2}
              />
            </div>
          )}

          {/* Partial/Full toggle */}
          <div className="flex items-center gap-3">
            <Switch
              checked={isPartial}
              onCheckedChange={setIsPartial}
              id="partial-refund"
            />
            <Label htmlFor="partial-refund">Partial Refund</Label>
          </div>

          {/* Item selector for partial */}
          {isPartial && (
            <div className="space-y-2 rounded-lg border p-3">
              <div className="text-sm font-medium">Select items to refund:</div>
              {orderItems.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-center gap-2 rounded p-1.5 hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={selectedItemIds.includes(item.id)}
                    onChange={() => toggleItem(item.id)}
                    className="h-4 w-4"
                  />
                  <span className="flex-1 text-sm">
                    {item.quantity}x {item.item_name}
                  </span>
                  <span className="text-sm font-medium">
                    {formatCurrency(item.total_price)}
                  </span>
                </label>
              ))}
              {selectedItemIds.length > 0 && (
                <div className="border-t pt-2 text-sm font-semibold">
                  Refund Total: {formatCurrency(partialAmount)}
                </div>
              )}
            </div>
          )}

          {/* Manager PIN */}
          <div>
            <Label>Manager PIN (4 digits)</Label>
            <Input
              type="password"
              maxLength={4}
              value={managerPin}
              onChange={(e) => setManagerPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Enter manager PIN"
              className="font-mono tracking-widest"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRefund}
            disabled={
              isProcessing ||
              !reason ||
              managerPin.length !== 4 ||
              (reason === 'other' && reasonText.trim().length < 10) ||
              (isPartial && selectedItemIds.length === 0)
            }
          >
            {isProcessing ? 'Processing...' : 'Confirm Refund'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
