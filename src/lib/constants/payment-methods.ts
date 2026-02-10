import type { PaymentMethod, PaymentStatus, RefundReason } from '@/types/payment';

// Quick-select cash denominations (Philippine Peso)
export const CASH_QUICK_AMOUNTS = [20, 50, 100, 500, 1000] as const;

// Payment method display config
export const PAYMENT_METHOD_CONFIG: Record<PaymentMethod, {
  label: string;
  icon: string;
  description: string;
}> = {
  cash: { label: 'Cash', icon: 'Banknote', description: 'Pay at the counter' },
  gcash: { label: 'GCash', icon: 'Smartphone', description: 'Pay via GCash' },
  card: { label: 'Credit/Debit Card', icon: 'CreditCard', description: 'Pay with card' },
  bill_later: { label: 'Pay After Meal', icon: 'Utensils', description: 'Settle when ready to leave' },
};

// Payment status display config
export const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, {
  label: string;
  className: string;
}> = {
  unpaid: { label: 'Unpaid', className: 'bg-yellow-100 text-yellow-800' },
  processing: { label: 'Processing', className: 'bg-blue-100 text-blue-800' },
  paid: { label: 'Paid', className: 'bg-green-100 text-green-800' },
  refunded: { label: 'Refunded', className: 'bg-purple-100 text-purple-800' },
  expired: { label: 'Expired', className: 'bg-red-100 text-red-800' },
};

// Refund reasons
export const REFUND_REASONS: Record<RefundReason, string> = {
  guest_request: 'Guest Request',
  wrong_order: 'Wrong Order',
  quality_issue: 'Quality Issue',
  other: 'Other (specify)',
};

// Expiration countdown thresholds (minutes remaining)
export const EXPIRATION_THRESHOLDS = {
  safe: 5,    // > 5 min remaining = green
  warning: 2, // 2-5 min remaining = yellow
  critical: 0, // < 2 min remaining = red
} as const;

// Order expiration time in minutes (matches PRD: 15 min auto-cancel)
export const ORDER_EXPIRATION_MINUTES = 15;

// Expiry polling interval in ms (cashier polls every 60s)
export const EXPIRY_POLL_INTERVAL_MS = 60_000;

// Senior/PWD discount rate (Philippine law RA 9994/10754)
export const SENIOR_PWD_DISCOUNT_RATE = 0.20;

// PayMongo feature flag check
export function isPayMongoEnabled(): boolean {
  return !!process.env.PAYMONGO_SECRET_KEY;
}
