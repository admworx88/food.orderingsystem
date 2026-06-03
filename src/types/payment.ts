import type { Database } from '@/lib/supabase/types';

// Database row types
export type Payment = Database['public']['Tables']['payments']['Row'];
export type BIRReceiptConfig = Database['public']['Tables']['bir_receipt_config']['Row'];
export type AuditLog = Database['public']['Tables']['audit_log']['Row'];

// Re-export enums for convenience
export type PaymentMethod = Database['public']['Enums']['payment_method'];
export type PaymentStatus = Database['public']['Enums']['payment_status'];

// Order with full payment context (for cashier pending queue)
type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type OrderItemAddon = Database['public']['Tables']['order_item_addons']['Row'];
type PromoCode = Database['public']['Tables']['promo_codes']['Row'];

export type CashierOrderItem = OrderItem & {
  order_item_addons: OrderItemAddon[];
};

export type CashierOrder = Order & {
  order_items: CashierOrderItem[];
  promo_codes: Pick<PromoCode, 'code' | 'discount_value' | 'discount_type'> | null;
  kiosk_location: string | null;
};

// Recent completed order (with payment data for receipt viewing)
export type RecentOrder = Order & {
  order_items: CashierOrderItem[];
  promo_codes: Pick<PromoCode, 'code' | 'discount_value' | 'discount_type'> | null;
  payments: Payment[];
};

// Payment processing inputs
export interface CashPaymentInput {
  orderId: string;
  amountTendered: number;
  cashierId: string;
}

export interface DigitalPaymentInput {
  orderId: string;
  method: 'gcash' | 'card';
}

export interface RefundInput {
  paymentId: string;
  reason: RefundReason;
  reasonText?: string;
  managerPin: string;
  isPartial: boolean;
  itemIds?: string[];
}

export type RefundReason = 'guest_request' | 'wrong_order' | 'quality_issue' | 'other';

// Senior/PWD discount
export interface DiscountInput {
  orderId: string;
  discountType: 'senior' | 'pwd';
  idNumber: string;
}

// BIR receipt data (assembled from multiple DB tables)
export interface BIRReceiptData {
  receiptNumber: string;
  businessName: string;
  businessAddress: string;
  tin: string;
  accreditationNumber: string | null;
  accreditationDate: string | null;
  permitNumber: string | null;
  permitDateIssued: string | null;
  posMachineId: string | null;
  terminalId: string | null;

  orderNumber: string;
  orderType: string;
  tableNumber: string | null;
  roomNumber: string | null;
  dateTime: string;
  cashierName: string;

  items: BIRReceiptItem[];

  subtotal: number;
  discountAmount: number;
  discountLabel: string | null;
  taxableAmount: number;
  vatAmount: number;
  serviceCharge: number;
  totalAmount: number;

  paymentMethod: PaymentMethod;
  amountTendered: number | null;
  changeGiven: number | null;
  providerReference: string | null;

  guestPhone: string | null;
  promoCode: string | null;
  kioskLocation: string | null;
}

export interface BIRReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  addons: { name: string; price: number }[];
}

// Shift/reconciliation summary
export interface ShiftSummary {
  date: string;
  cashierName: string;
  totalOrders: number;
  totalRevenue: number;
  cashPayments: { count: number; total: number };
  gcashPayments: { count: number; total: number };
  ewalletPayments: { count: number; total: number };
  cardPayments: { count: number; total: number };
  refunds: { count: number; total: number };
  cancelledOrders: number;
  expiredOrders: number;
}

// Shift lifecycle types (Collections tab)
export interface Shift {
  id: string;
  cashier_id: string;
  started_at: string;
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
  method: string;
  amount: number;
  status: string;
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
  netCash: number;
  totalOrders: number;
}

export interface ShiftDetails {
  shift: Shift;
  cashierName: string;
  payments: ShiftPaymentRow[];
  deductions: ShiftDeduction[];
  totals: ShiftTotals;
}

export interface ShiftCollectionRecord {
  id: string;
  remittance_number: string;
  cashier_id: string;
  cashier_name: string;
  date: string;
  submitted_at: string;
  shift_started_at: string | null;
  shift_ended_at: string | null;
  total_orders: number;
  total_revenue: number;
  cash_total: number;
  gcash_total: number;
  ewallet_total: number;
  card_total: number;
  refunds_total: number;
  deductions_total: number;
  net_cash: number;
  shift_id: string | null;
}
