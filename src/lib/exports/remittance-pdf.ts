import type { RemittanceData } from './remittance-types';

// jsPDF's built-in Helvetica font lacks the ₱ glyph — use "PHP" prefix instead
function formatPeso(amount: number): string {
  const n = new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  return `PHP ${n}`;
}

// Formats a UTC ISO timestamp for display in Asia/Manila timezone
function formatPHTime(isoString: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(isoString));
}

export async function generateRemittancePDF(data: RemittanceData): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 14;
  let y = 20;

  // --- Header ---
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Arena Blanca Resort', margin, y);
  y += 7;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('End-of-Shift Remittance Report', margin, y);
  y += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, 210 - margin, y);
  y += 6;

  // --- Shift info ---
  doc.setFontSize(10);
  doc.text(`Cashier: ${data.cashierName}`, margin, y);
  doc.text(`Shift Start: ${formatPHTime(data.shift.started_at)}`, 110, y);
  y += 5;
  if (data.shift.ended_at) {
    doc.text(`Shift End: ${formatPHTime(data.shift.ended_at)}`, 110, y);
  }
  if (data.shift.submitted_at) {
    doc.text(`Submitted: ${formatPHTime(data.shift.submitted_at)}`, margin, y);
  }
  y += 8;

  // --- Payments table ---
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Transactions', margin, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Order #', 'Method', 'Amount', 'Status', 'Time']],
    body: data.payments.map((p) => [
      p.order_number,
      p.method.toUpperCase(),
      formatPeso(p.amount),
      p.status.charAt(0).toUpperCase() + p.status.slice(1),
      new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        hour: 'numeric', minute: '2-digit', hour12: true,
      }).format(new Date(p.completed_at)),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 41, 59] },
    columnStyles: { 2: { halign: 'right' } },
    margin: { left: margin, right: margin },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  // --- Totals summary ---
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Totals by Payment Method', margin, y);
  y += 4;

  const { byMethod, refundsTotal, deductionsTotal, grossTotal, netCash } = data.totals;
  const methodRows = [
    ['Cash', byMethod.cash.count.toString(), formatPeso(byMethod.cash.total)],
    ['GCash', byMethod.gcash.count.toString(), formatPeso(byMethod.gcash.total)],
    ['eWallet', byMethod.ewallet.count.toString(), formatPeso(byMethod.ewallet.total)],
    ['Card', byMethod.card.count.toString(), formatPeso(byMethod.card.total)],
    ['Bill Later', byMethod.bill_later.count.toString(), formatPeso(byMethod.bill_later.total)],
  ].filter(([, , amt]) => amt !== formatPeso(0));

  autoTable(doc, {
    startY: y,
    head: [['Method', 'Transactions', 'Total']],
    body: methodRows,
    foot: [
      ['Total Collections', data.totals.totalOrders.toString(), formatPeso(grossTotal)],
      ['Total Cash Collections', byMethod.cash.count.toString(), formatPeso(byMethod.cash.total)],
      ...(refundsTotal > 0 ? [['Refunds', '', `-${formatPeso(refundsTotal)}`]] : []),
      ...(deductionsTotal > 0 ? [['Deductions', '', `-${formatPeso(deductionsTotal)}`]] : []),
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 41, 59] },
    footStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 2: { halign: 'right' } },
    margin: { left: margin, right: margin },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  // --- Deductions table (if any) ---
  if (data.deductions.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Deductions', margin, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [['Description', 'Amount']],
      body: data.deductions.map((d) => [d.description, formatPeso(d.amount)]),
      foot: [['Total Deductions', formatPeso(deductionsTotal)]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 41, 59] },
      footStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: margin, right: margin },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // --- Net Cash to Remit ---
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, 210 - margin, y);
  y += 7;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Net Cash to Remit:', margin, y);
  doc.text(formatPeso(netCash), 210 - margin, y, { align: 'right' });
  y += 12;

  // Signature line
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Cashier Signature: _______________________', margin, y);
  doc.text('Received by: _______________________', 120, y);

  return doc.output('blob');
}
