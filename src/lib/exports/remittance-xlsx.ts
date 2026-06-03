import type { RemittanceData } from './remittance-types';

function formatPeso(amount: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

function formatPHTime(isoString: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(isoString));
}

export async function generateRemittanceXLSX(data: RemittanceData): Promise<Blob> {
  const XLSX = await import('xlsx');

  const wb = XLSX.utils.book_new();

  // --- Sheet 1: Summary ---
  const { byMethod, refundsTotal, deductionsTotal, grossTotal, netCash } = data.totals;
  const summaryRows = [
    ['Arena Blanca Resort — End-of-Shift Remittance'],
    [],
    ['Cashier', data.cashierName],
    ['Shift Start', formatPHTime(data.shift.started_at)],
    ['Shift End', data.shift.ended_at ? formatPHTime(data.shift.ended_at) : 'In progress'],
    ['Submitted', data.shift.submitted_at ? formatPHTime(data.shift.submitted_at) : '—'],
    [],
    ['Payment Method', 'Transactions', 'Total'],
    ['Cash', byMethod.cash.count, byMethod.cash.total],
    ['GCash', byMethod.gcash.count, byMethod.gcash.total],
    ['eWallet', byMethod.ewallet.count, byMethod.ewallet.total],
    ['Card', byMethod.card.count, byMethod.card.total],
    ['Bill Later', byMethod.bill_later.count, byMethod.bill_later.total],
    [],
    ['Total Collections (Gross)', '', grossTotal],
    ['Total Cash Collections', '', byMethod.cash.total],
    ['Refunds', '', -refundsTotal],
    ['Deductions', '', -deductionsTotal],
    ['NET CASH TO REMIT', '', netCash],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // --- Sheet 2: Payments ---
  const paymentRows: (string | number)[][] = [
    ['Order #', 'Method', 'Amount', 'Status', 'Time'],
    ...data.payments.map((p) => [
      p.order_number,
      p.method.toUpperCase(),
      p.amount,
      p.status,
      formatPHTime(p.completed_at),
    ]),
  ];
  const wsPayments = XLSX.utils.aoa_to_sheet(paymentRows);
  wsPayments['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsPayments, 'Payments');

  // --- Sheet 3: Deductions ---
  const deductionRows: (string | number)[][] = [
    ['Description', 'Amount'],
    ...data.deductions.map((d) => [d.description, d.amount]),
    [],
    ['Total Deductions', deductionsTotal],
  ];
  const wsDeductions = XLSX.utils.aoa_to_sheet(deductionRows);
  wsDeductions['!cols'] = [{ wch: 32 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsDeductions, 'Deductions');

  // Write to ArrayBuffer and return as Blob
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
