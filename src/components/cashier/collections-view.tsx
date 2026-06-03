'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Banknote, Smartphone, CreditCard, Plus, FileText,
  CheckCircle2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import type { Shift, ShiftDeduction, ShiftPaymentRow, ShiftTotals, ShiftCollectionRecord } from '@/types/payment';
import { getOpenShift } from '@/services/payment-service';
import { CollectionHistoryTable } from './collection-history-table';
import { CollectionsPaymentsList } from './collections-payments-list';
import { DeductionsList } from './deductions-list';
import { AddDeductionDialog } from './add-deduction-dialog';
import { DraftRemittanceDialog } from './draft-remittance-dialog';
import { StartShiftButton } from './start-shift-button';

interface CollectionsViewProps {
  shift: Shift | null;
  cashierName: string;
  payments: ShiftPaymentRow[];
  initialDeductions: ShiftDeduction[];
  totals: ShiftTotals;
  lastClosedShift: Shift | null;
  collectionHistory?: ShiftCollectionRecord[];
  showStartShiftButton?: boolean;
  overrideCashierId?: string;
  onShiftSubmitted?: () => void;
}

function formatPHDateTime(isoString: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(isoString));
}

export function CollectionsView({
  shift,
  cashierName,
  payments,
  initialDeductions,
  totals,
  lastClosedShift,
  collectionHistory = [],
  showStartShiftButton = true,
  overrideCashierId,
  onShiftSubmitted,
}: CollectionsViewProps) {
  const router = useRouter();
  const [deductions, setDeductions] = useState<ShiftDeduction[]>(initialDeductions);
  const [addDeductionOpen, setAddDeductionOpen] = useState(false);

  useEffect(() => {
    setDeductions(initialDeductions);
  }, [initialDeductions]);
  const [editingDeduction, setEditingDeduction] = useState<ShiftDeduction | null>(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(shift?.submitted_at ?? null);

  const shiftClosed = shift?.status === 'closed' || !!submittedAt;

  const handleDeductionSaved = (saved: ShiftDeduction) => {
    setDeductions((prev) => {
      const idx = prev.findIndex((d) => d.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
  };

  const handleDeductionDeleted = (id: string) => {
    setDeductions((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSubmitSuccess = (at: string) => {
    setSubmittedAt(at);
    if (onShiftSubmitted) {
      onShiftSubmitted();
    } else {
      router.refresh();
    }
  };

  // --- No shift state ---
  if (!shift) {
    return (
      <div className="pos-reports-container">
        <div className="flex items-center justify-between mb-6">
          <h2 className="pos-reports-title">Collections</h2>
        </div>

        {lastClosedShift ? (
          <div className="pos-report-card mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="pos-report-label">Last Submitted Shift</p>
              <p className="pos-report-value">
                {formatPHDateTime(lastClosedShift.started_at)}
                {lastClosedShift.submitted_at && (
                  <> — submitted {formatPHDateTime(lastClosedShift.submitted_at)}</>
                )}
              </p>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          </div>
        ) : null}

        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-[var(--pos-text-muted)] text-sm text-center max-w-xs">
            No open shift. Start a shift from the Payments tab to begin collecting.
          </p>
          {showStartShiftButton && <StartShiftButton />}
        </div>
      </div>
    );
  }

  // --- Active or closed shift ---
  const currentTotals = { ...totals };
  const currentDeductions = deductions;
  const deductionsTotal = currentDeductions.reduce((s, d) => s + Number(d.amount), 0);
  const recomputedNetCash = currentTotals.byMethod.cash.total - currentTotals.refundsTotal - deductionsTotal;
  const displayTotals: ShiftTotals = { ...currentTotals, deductionsTotal, netCash: recomputedNetCash };

  return (
    <div className="pos-reports-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="pos-reports-title">Collections</h2>
          <p className="text-sm text-[var(--pos-text-muted)]">
            Shift started {formatPHDateTime(shift.started_at)}
          </p>
        </div>

        {shiftClosed ? (
          <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Submitted {submittedAt ? formatPHDateTime(submittedAt) : ''}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {!shiftClosed && (
              <button
                onClick={() => { setEditingDeduction(null); setAddDeductionOpen(true); }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--pos-border)] text-[var(--pos-text-muted)] hover:text-[var(--pos-text)] hover:bg-white/5 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Deduction
              </button>
            )}
            <button
              onClick={async () => {
                // Re-check DB before opening — shift may have been submitted in another session
                if (shift) {
                  const fresh = await getOpenShift(overrideCashierId);
                  if (!fresh.success || !fresh.data || fresh.data.id !== shift.id) {
                    // Shift is no longer open — mark submitted so the dialog shows correctly
                    setSubmittedAt(new Date().toISOString());
                  }
                }
                setDraftOpen(true);
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--pos-border)] text-[var(--pos-text-muted)] hover:text-[var(--pos-text)] hover:bg-white/5 transition-colors text-sm"
            >
              <FileText className="w-4 h-4" />
              Draft
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* Left: payments + deductions */}
        <div className="flex flex-col gap-4">
          <CollectionsPaymentsList payments={payments} />

          {/* Deductions section */}
          <div className="pos-report-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="pos-report-section-title">Deductions</h3>
              {!shiftClosed && (
                <button
                  onClick={() => { setEditingDeduction(null); setAddDeductionOpen(true); }}
                  className="flex items-center gap-1.5 text-xs text-[var(--pos-text-muted)] hover:text-[var(--pos-text)] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              )}
            </div>
            <DeductionsList
              deductions={currentDeductions}
              shiftClosed={shiftClosed}
              onEdit={(d) => { setEditingDeduction(d); setAddDeductionOpen(true); }}
              onDeleted={handleDeductionDeleted}
              overrideCashierId={overrideCashierId}
            />
          </div>
        </div>

        {/* Right: totals card */}
        <div className="flex flex-col gap-4">
          <div className="pos-report-card">
            <h3 className="pos-report-section-title mb-4">Shift Totals</h3>

            {/* Method breakdown */}
            <div className="flex flex-col gap-2 mb-4">
              {[
                { key: 'cash', icon: Banknote, label: 'Cash' },
                { key: 'gcash', icon: Smartphone, label: 'GCash' },
                { key: 'ewallet', icon: Smartphone, label: 'eWallet' },
                { key: 'card', icon: CreditCard, label: 'Card' },
              ].map(({ key, icon: Icon, label }) => {
                const val = displayTotals.byMethod[key as keyof typeof displayTotals.byMethod];
                return (
                  <div key={key} className="pos-report-breakdown-row">
                    <div className="pos-report-breakdown-info">
                      <div className="pos-report-breakdown-icon">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="pos-report-breakdown-name">{label}</div>
                        <div className="pos-report-breakdown-count">{val.count} txn{val.count !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    <div className="pos-report-breakdown-amount">{formatCurrency(val.total)}</div>
                  </div>
                );
              })}
            </div>

            <div className="pos-report-divider mb-3" />

            {/* Summary lines */}
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="pos-report-label">Total Collections</span>
                <span className="font-medium text-[var(--pos-text)]">{formatCurrency(displayTotals.grossTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="pos-report-label">Total Cash Collections</span>
                <span className="font-medium text-[var(--pos-text)]">{formatCurrency(displayTotals.byMethod.cash.total)}</span>
              </div>
              {displayTotals.refundsTotal > 0 && (
                <div className="flex justify-between">
                  <span className="pos-report-label">Refunds</span>
                  <span className="text-amber-400">-{formatCurrency(displayTotals.refundsTotal)}</span>
                </div>
              )}
              {deductionsTotal > 0 && (
                <div className="flex justify-between">
                  <span className="pos-report-label">Deductions</span>
                  <span className="text-amber-400">-{formatCurrency(deductionsTotal)}</span>
                </div>
              )}
              <div className="pos-report-divider my-1" />
              <div className="flex justify-between items-baseline">
                <span className="font-semibold text-[var(--pos-text)]">Net Cash to Remit</span>
                <span className="text-xl font-bold text-emerald-400">{formatCurrency(displayTotals.netCash)}</span>
              </div>
            </div>
          </div>

          {/* CTA buttons */}
          {!shiftClosed ? (
            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  if (shift) {
                    const fresh = await getOpenShift(overrideCashierId);
                    if (!fresh.success || !fresh.data || fresh.data.id !== shift.id) {
                      setSubmittedAt(new Date().toISOString());
                    }
                  }
                  setDraftOpen(true);
                }}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg border border-[var(--pos-border)] text-[var(--pos-text-muted)] hover:text-[var(--pos-text)] hover:bg-white/5 transition-colors text-sm"
              >
                <FileText className="w-4 h-4" />
                View Draft Report
              </button>
            </div>
          ) : (
            <div className="pos-collection-submit-area">
              <div className="pos-collection-submitted">
                <CheckCircle2 className="w-5 h-5 text-[var(--pos-mint)]" />
                <div>
                  <p className="pos-collection-submitted-label">Collection Submitted</p>
                  {submittedAt && (
                    <p className="pos-collection-submitted-time">{formatPHDateTime(submittedAt)}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Collection history */}
      <div className="mt-6">
        <CollectionHistoryTable records={collectionHistory} />
      </div>

      {/* Dialogs */}
      {shift && !shiftClosed && (
        <AddDeductionDialog
          shiftId={shift.id}
          open={addDeductionOpen}
          editingDeduction={editingDeduction}
          onClose={() => { setAddDeductionOpen(false); setEditingDeduction(null); }}
          onSaved={handleDeductionSaved}
          overrideCashierId={overrideCashierId}
        />
      )}

      {shift && (
        <DraftRemittanceDialog
          shift={{ ...shift, submitted_at: submittedAt ?? shift.submitted_at }}
          cashierName={cashierName}
          payments={payments}
          deductions={currentDeductions}
          totals={displayTotals}
          open={draftOpen}
          shiftClosed={shiftClosed}
          onClose={() => setDraftOpen(false)}
          onSubmitSuccess={handleSubmitSuccess}
          overrideCashierId={overrideCashierId}
        />
      )}
    </div>
  );
}
