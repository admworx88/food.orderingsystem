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
  cardPayments: { count: number; total: number };
  refunds: { count: number; total: number };
  cancelledOrders: number;
  expiredOrders: number;
}
