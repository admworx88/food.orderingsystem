import { z } from 'zod';

export const cashPaymentSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  amountTendered: z.number().min(0, 'Amount must be positive'),
  cashierId: z.string().uuid('Invalid cashier ID'),
}).refine(
  (data) => data.amountTendered > 0,
  { message: 'Amount tendered must be greater than zero', path: ['amountTendered'] }
);

export const digitalPaymentSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  method: z.enum(['gcash', 'card'], { message: 'Payment method is required' }),
});

export const refundSchema = z.object({
  paymentId: z.string().uuid('Invalid payment ID'),
  reason: z.enum(['guest_request', 'wrong_order', 'quality_issue', 'other'], {
    message: 'Refund reason is required',
  }),
  reasonText: z.string().max(500).optional(),
  managerPin: z.string().length(4, 'Manager PIN must be 4 digits').regex(/^\d{4}$/, 'PIN must be numeric'),
  isPartial: z.boolean(),
  itemIds: z.array(z.string().uuid()).optional(),
}).refine(
  (data) => {
    if (data.reason === 'other') {
      return data.reasonText && data.reasonText.trim().length >= 10;
    }
    return true;
  },
  { message: 'Please provide a reason with at least 10 characters', path: ['reasonText'] }
).refine(
  (data) => {
    if (data.isPartial) {
      return data.itemIds && data.itemIds.length > 0;
    }
    return true;
  },
  { message: 'Select at least one item for partial refund', path: ['itemIds'] }
);

export const discountSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  discountType: z.enum(['senior', 'pwd'], { message: 'Discount type is required' }),
  idNumber: z.string().min(1, 'ID number is required').max(50),
});

// Inferred types for use in Server Actions
export type CashPaymentInput = z.infer<typeof cashPaymentSchema>;
export type DigitalPaymentInput = z.infer<typeof digitalPaymentSchema>;
export type RefundInput = z.infer<typeof refundSchema>;
export type DiscountInput = z.infer<typeof discountSchema>;
