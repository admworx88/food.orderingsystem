'use client';

import { useState } from 'react';
import { Trash2, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils/currency';
import { deleteDeduction } from '@/services/payment-service';
import type { ShiftDeduction } from '@/types/payment';

interface DeductionsListProps {
  deductions: ShiftDeduction[];
  shiftClosed: boolean;
  onEdit: (deduction: ShiftDeduction) => void;
  onDeleted: (id: string) => void;
  overrideCashierId?: string;
}

export function DeductionsList({ deductions, shiftClosed, onEdit, onDeleted, overrideCashierId }: DeductionsListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const result = await deleteDeduction(id, overrideCashierId);
    setDeletingId(null);
    if (result.success) {
      toast.success('Deduction removed');
      onDeleted(id);
    } else {
      toast.error(result.error);
    }
  };

  const total = deductions.reduce((s, d) => s + Number(d.amount), 0);

  if (deductions.length === 0) {
    return (
      <div className="text-sm text-[var(--pos-text-muted)] italic py-2 px-1">
        No deductions added.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {deductions.map((d) => (
        <div
          key={d.id}
          className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-white/[0.03] border border-[var(--pos-border)]/50"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--pos-text)] truncate">{d.description}</p>
          </div>
          <span className="text-sm font-medium text-amber-400 shrink-0">
            -{formatCurrency(Number(d.amount))}
          </span>
          {!shiftClosed && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onEdit(d)}
                className="p-1.5 rounded hover:bg-white/10 text-[var(--pos-text-muted)] hover:text-[var(--pos-text)] transition-colors"
                aria-label="Edit deduction"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(d.id)}
                disabled={deletingId === d.id}
                className="p-1.5 rounded hover:bg-red-500/10 text-[var(--pos-text-muted)] hover:text-red-400 transition-colors disabled:opacity-50"
                aria-label="Delete deduction"
              >
                {deletingId === d.id
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      ))}
      <div className="flex justify-between items-center pt-1 border-t border-[var(--pos-border)]/50 mt-1">
        <span className="text-xs text-[var(--pos-text-muted)]">Total Deductions</span>
        <span className="text-sm font-semibold text-amber-400">-{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
