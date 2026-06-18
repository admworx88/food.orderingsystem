'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { addDeduction, updateDeduction } from '@/services/payment-service';
import type { ShiftDeduction } from '@/types/payment';

interface AddDeductionDialogProps {
  shiftId: string;
  open: boolean;
  editingDeduction?: ShiftDeduction | null;
  onClose: () => void;
  onSaved: (deduction: ShiftDeduction) => void;
  overrideCashierId?: string;
}

export function AddDeductionDialog({
  shiftId,
  open,
  editingDeduction,
  onClose,
  onSaved,
  overrideCashierId,
}: AddDeductionDialogProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; description?: string }>({});

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (editingDeduction) {
      setAmount(String(editingDeduction.amount));
      setDescription(editingDeduction.description);
    } else {
      setAmount('');
      setDescription('');
    }
    setErrors({});
  }, [editingDeduction, open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const validate = () => {
    const newErrors: typeof errors = {};
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) newErrors.amount = 'Enter a valid amount greater than 0';
    if (!description.trim() || description.trim().length < 3) newErrors.description = 'Description must be at least 3 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    const num = parseFloat(amount);
    let result;
    if (editingDeduction) {
      result = await updateDeduction(editingDeduction.id, num, description.trim(), overrideCashierId);
    } else {
      result = await addDeduction(shiftId, num, description.trim(), overrideCashierId);
    }

    setSaving(false);
    if (result.success) {
      toast.success(editingDeduction ? 'Deduction updated' : 'Deduction added');
      onSaved(result.data);
      onClose();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editingDeduction ? 'Edit Deduction' : 'Add Deduction'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deduction-amount">Amount (₱)</Label>
            <Input
              id="deduction-amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {errors.amount && <p className="text-xs text-red-400">{errors.amount}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deduction-description">Description</Label>
            <Textarea
              id="deduction-description"
              placeholder="e.g. Petty cash, office supplies…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            {errors.description && <p className="text-xs text-red-400">{errors.description}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {editingDeduction ? 'Save Changes' : 'Add Deduction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
