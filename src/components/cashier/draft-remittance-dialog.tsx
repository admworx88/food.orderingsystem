'use client';

import { useState } from 'react';
import { Loader2, FileDown, Table2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/currency';
import { submitShiftCollection } from '@/services/payment-service';
import type { Shift, ShiftPaymentRow, ShiftDeduction, ShiftTotals } from '@/types/payment';
import { downloadBlob } from '@/lib/exports/download';

interface DraftRemittanceDialogProps {
  shift: Shift;
  cashierName: string;
  payments: ShiftPaymentRow[];
  deductions: ShiftDeduction[];
  totals: ShiftTotals;
  open: boolean;
  shiftClosed?: boolean;
  onClose: () => void;
  onSubmitSuccess: (submittedAt: string) => void;
  overrideCashierId?: string;
}

function formatPHDateTime(isoString: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(isoString));
}

function MethodLabel({ method }: { method: string }) {
  const labels: Record<string, string> = {
    cash: 'Cash', gcash: 'GCash', card: 'Card', ewallet: 'eWallet', bill_later: 'Bill Later',
  };
  return <>{labels[method] ?? method.toUpperCase()}</>;
}

export function DraftRemittanceDialog({
  shift, cashierName, payments, deductions, totals, open, shiftClosed, onClose, onSubmitSuccess, overrideCashierId,
}: DraftRemittanceDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const isSubmitted = shiftClosed || shift.status === 'closed' || !!shift.submitted_at || localSubmitted;

  const remittanceData = { shift, cashierName, payments, deductions, totals };

  const handleExportPDF = async () => {
    setExportingPdf(true);
    try {
      const { generateRemittancePDF } = await import('@/lib/exports/remittance-pdf');
      const blob = await generateRemittancePDF(remittanceData);
      downloadBlob(blob, `remittance-${cashierName.replace(/\s+/g, '-').toLowerCase()}-${shift.id.slice(0, 8)}.pdf`);
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportXLSX = async () => {
    setExportingXlsx(true);
    try {
      const { generateRemittanceXLSX } = await import('@/lib/exports/remittance-xlsx');
      const blob = await generateRemittanceXLSX(remittanceData);
      downloadBlob(blob, `remittance-${cashierName.replace(/\s+/g, '-').toLowerCase()}-${shift.id.slice(0, 8)}.xlsx`);
    } catch {
      toast.error('Failed to generate Excel file');
    } finally {
      setExportingXlsx(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const result = await submitShiftCollection(shift.id, overrideCashierId);
    setSubmitting(false);
    if (result.success) {
      toast.success('Shift collection submitted successfully!');
      setLocalSubmitted(true);
      onSubmitSuccess(result.data.submittedAt);
    } else if (result.error === 'Shift is already closed') {
      toast.info('This shift has already been submitted.');
      setLocalSubmitted(true);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Remittance Report</DialogTitle>
          <p className="text-sm text-muted-foreground">Arena Blanca Resort</p>
        </DialogHeader>

        {isSubmitted && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-700">Shift Submitted</p>
              <p className="text-xs text-emerald-600">This shift collection has been recorded and closed.</p>
            </div>
          </div>
        )}

        {/* Shift info */}
        <div className="grid grid-cols-2 gap-3 py-3 border-b border-border">
          <div>
            <p className="text-xs text-muted-foreground">Cashier</p>
            <p className="text-sm font-medium">{cashierName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Shift Start</p>
            <p className="text-sm">{formatPHDateTime(shift.started_at)}</p>
          </div>
          {shift.ended_at && (
            <div>
              <p className="text-xs text-muted-foreground">Shift End</p>
              <p className="text-sm">{formatPHDateTime(shift.ended_at)}</p>
            </div>
          )}
          {shift.submitted_at && (
            <div>
              <p className="text-xs text-muted-foreground">Submitted</p>
              <p className="text-sm">{formatPHDateTime(shift.submitted_at)}</p>
            </div>
          )}
        </div>

        {/* Method breakdown */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Payment Breakdown</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1.5 text-muted-foreground font-medium">Method</th>
                <th className="text-center py-1.5 text-muted-foreground font-medium">Transactions</th>
                <th className="text-right py-1.5 text-muted-foreground font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {(Object.entries(totals.byMethod) as [string, { count: number; total: number }][]).map(([method, val]) => (
                val.count > 0 ? (
                  <tr key={method} className="border-b border-border/40">
                    <td className="py-1.5"><MethodLabel method={method} /></td>
                    <td className="py-1.5 text-center text-muted-foreground">{val.count}</td>
                    <td className="py-1.5 text-right font-medium">{formatCurrency(val.total)}</td>
                  </tr>
                ) : null
              ))}
            </tbody>
          </table>
        </div>

        {/* Deductions */}
        {deductions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Deductions</h4>
            <div className="flex flex-col gap-1">
              {deductions.map((d) => (
                <div key={d.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{d.description}</span>
                  <span className="text-amber-400">-{formatCurrency(Number(d.amount))}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary totals */}
        <div className="border-t border-border pt-3 flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Collections (Gross)</span>
            <span className="font-medium">{formatCurrency(totals.grossTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Cash Collections</span>
            <span className="font-medium">{formatCurrency(totals.byMethod.cash.total)}</span>
          </div>
          {totals.refundsTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Refunds</span>
              <span className="text-amber-400">-{formatCurrency(totals.refundsTotal)}</span>
            </div>
          )}
          {totals.deductionsTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Deductions</span>
              <span className="text-amber-400">-{formatCurrency(totals.deductionsTotal)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2 mt-1">
            <span className="font-semibold">Net Cash to Remit</span>
            <span className="font-bold text-lg text-emerald-400">{formatCurrency(totals.netCash)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exportingPdf}>
            {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileDown className="w-4 h-4 mr-2" />}
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportXLSX} disabled={exportingXlsx}>
            {exportingXlsx ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Table2 className="w-4 h-4 mr-2" />}
            Export Excel
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
            {!isSubmitted && (
              <Button onClick={handleSubmit} disabled={submitting} size="sm">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Submit Collections
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
