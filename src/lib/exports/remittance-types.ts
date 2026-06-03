export interface Shift {
  id: string;
  cashier_id: string;
  started_at: string; // ISO timestamp UTC
  ended_at: string | null;
  submitted_at: string | null;
  status: 'open' | 'closed';
  notes: string | null;
}

export interface ShiftDeduction {
  id: string;
  shift_id: string;
  amount: number;
  description: string;
  created_at: string;
  created_by: string | null;
}

export interface ShiftPaymentRow {
  id: string;
  order_id: string;
  method: string; // 'cash' | 'gcash' | 'card' | 'ewallet' | 'bill_later'
  amount: number;
  status: string; // 'completed' | 'refunded' | 'failed' | 'pending'
  completed_at: string;
  order_number: string;
}

export interface ShiftTotals {
  grossTotal: number;
  byMethod: {
    cash: { count: number; total: number };
    gcash: { count: number; total: number };
    ewallet: { count: number; total: number };
    card: { count: number; total: number };
    bill_later: { count: number; total: number };
  };
  refundsTotal: number;
  deductionsTotal: number;
  netCash: number; // Cash total - refunds (cash only) - deductions
  totalOrders: number;
}

export interface RemittanceData {
  shift: Shift;
  cashierName: string;
  payments: ShiftPaymentRow[];
  deductions: ShiftDeduction[];
  totals: ShiftTotals;
}
