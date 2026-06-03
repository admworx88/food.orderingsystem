'use client';

import { Loader2, FileDown, Table2, Banknote, Smartphone, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/currency';
import type { ShiftCollectionRecord } from '@/types/payment';
import { downloadBlob } from '@/lib/exports/download';

interface CollectionDetailDialogProps {
  record: ShiftCollectionRecord | null;
  open: boolean;
  onClose: () => void;
}

function formatPH(isoString: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(isoString));
}

const METHOD_ROWS = [
  { key: 'cash_total',    icon: Banknote,    label: 'Cash' },
  { key: 'gcash_total',   icon: Smartphone,  label: 'GCash' },
  { key: 'ewallet_total', icon: Smartphone,  label: 'eWallet' },
  { key: 'card_total',    icon: CreditCard,  label: 'Card' },
] as const;

export function CollectionDetailDialog({ record, open, onClose }: CollectionDetailDialogProps) {
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);

  if (!record) return null;

  const grossTotal = record.total_revenue;

  const handleExportPDF = async () => {
    setExportingPdf(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const m = 14;
      let y = 20;

      const fmt = (n: number) => {
        const num = new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
        return `PHP ${num}`;
      };

      doc.setFontSize(18); doc.setFont('helvetica', 'bold');
      doc.text('Arena Blanca Resort', m, y); y += 7;
      doc.setFontSize(11); doc.setFont('helvetica', 'normal');
      doc.text('End-of-Shift Remittance Report', m, y); y += 5;
      doc.setDrawColor(200, 200, 200); doc.line(m, y, 210 - m, y); y += 6;

      doc.setFontSize(10);
      doc.text(`Remittance No: ${record.remittance_number}`, m, y);
      doc.text(`Submitted: ${formatPH(record.submitted_at)}`, 110, y); y += 5;
      doc.text(`Cashier: ${record.cashier_name}`, m, y);
      if (record.shift_started_at) doc.text(`Shift Start: ${formatPH(record.shift_started_at)}`, 110, y);
      y += 8;

      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('Payment Breakdown', m, y); y += 4;

      autoTable(doc, {
        startY: y,
        head: [['Method', 'Total']],
        body: METHOD_ROWS
          .filter(r => record[r.key] > 0)
          .map(r => [r.label, fmt(record[r.key])]),
        foot: [
          ['Total Collections', fmt(grossTotal)],
          ['Total Cash Collections', fmt(record.cash_total)],
          ...(record.deductions_total > 0 ? [['Deductions', `-${fmt(record.deductions_total)}`]] : []),
        ],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [30, 41, 59] },
        footStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: m, right: m },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable.finalY + 8;
      doc.setDrawColor(200, 200, 200); doc.line(m, y, 210 - m, y); y += 7;
      doc.setFontSize(13); doc.setFont('helvetica', 'bold');
      doc.text('Net Cash to Remit:', m, y);
      const nfmt = new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(record.net_cash);
      doc.text(`PHP ${nfmt}`, 210 - m, y, { align: 'right' });

      downloadBlob(doc.output('blob'), `remittance-${record.remittance_number}.pdf`);
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportXLSX = async () => {
    setExportingXlsx(true);
    try {
      const XLSX = await import('xlsx');
      const rows = [
        ['Arena Blanca Resort — End-of-Shift Remittance'],
        [],
        ['Remittance No', record.remittance_number],
        ['Cashier', record.cashier_name],
        ['Shift Start', record.shift_started_at ? formatPH(record.shift_started_at) : '—'],
        ['Shift End', record.shift_ended_at ? formatPH(record.shift_ended_at) : '—'],
        ['Submitted', formatPH(record.submitted_at)],
        [],
        ['Payment Method', 'Total'],
        ['Cash', record.cash_total],
        ['GCash', record.gcash_total],
        ['eWallet', record.ewallet_total],
        ['Card', record.card_total],
        [],
        ['Total Collections (Gross)', record.total_revenue],
        ['Total Cash Collections', record.cash_total],
        ['Deductions', -record.deductions_total],
        ['NET CASH TO REMIT', record.net_cash],
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 28 }, { wch: 18 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Summary');
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
      downloadBlob(
        new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `remittance-${record.remittance_number}.xlsx`,
      );
    } catch {
      toast.error('Failed to generate Excel');
    } finally {
      setExportingXlsx(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Remittance {record.remittance_number}</DialogTitle>
          <p className="text-sm text-muted-foreground">Arena Blanca Resort</p>
        </DialogHeader>

        {/* Submitted banner */}
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700">
          <span className="font-semibold">Submitted</span>
          <span className="text-emerald-500">·</span>
          <span>{formatPH(record.submitted_at)}</span>
        </div>

        {/* Shift info */}
        <div className="grid grid-cols-2 gap-3 py-2 border-b border-border text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Cashier</p>
            <p className="font-medium">{record.cashier_name}</p>
          </div>
          {record.shift_started_at && (
            <div>
              <p className="text-xs text-muted-foreground">Shift Start</p>
              <p>{formatPH(record.shift_started_at)}</p>
            </div>
          )}
          {record.shift_ended_at && (
            <div>
              <p className="text-xs text-muted-foreground">Shift End</p>
              <p>{formatPH(record.shift_ended_at)}</p>
            </div>
          )}
        </div>

        {/* Payment breakdown */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Payment Breakdown</h4>
          <div className="flex flex-col gap-1.5">
            {METHOD_ROWS.map(({ key, icon: Icon, label }) => (
              record[key] > 0 ? (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </span>
                  <span className="font-medium">{formatCurrency(record[key])}</span>
                </div>
              ) : null
            ))}
          </div>
        </div>

        {/* Summary totals */}
        <div className="border-t border-border pt-3 flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Collections (Gross)</span>
            <span className="font-medium">{formatCurrency(grossTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Cash Collections</span>
            <span className="font-medium">{formatCurrency(record.cash_total)}</span>
          </div>
          {record.deductions_total > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Deductions</span>
              <span className="text-amber-500">-{formatCurrency(record.deductions_total)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2 mt-1">
            <span className="font-semibold">Net Cash to Remit</span>
            <span className="font-bold text-lg text-emerald-500">{formatCurrency(record.net_cash)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exportingPdf}>
            {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileDown className="w-4 h-4 mr-2" />}
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportXLSX} disabled={exportingXlsx}>
            {exportingXlsx ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Table2 className="w-4 h-4 mr-2" />}
            Export Excel
          </Button>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
