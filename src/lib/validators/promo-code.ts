import { z } from 'zod';

export const promoCodeSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .max(50, 'Code must be 50 characters or less')
    .transform((val) => val.toUpperCase().trim()),
  discount_type: z.enum(['percentage', 'fixed_amount'], {
    message: 'Discount type must be percentage or fixed_amount',
  }),
  discount_value: z
    .number({ message: 'Discount value is required' })
    .positive('Discount value must be positive'),
  valid_from: z.string().min(1, 'Start date is required'),
  valid_until: z.string().min(1, 'End date is required'),
  max_usage_count: z
    .number()
    .int('Must be a whole number')
    .positive('Must be a positive number')
    .nullable()
    .optional(),
  min_order_amount: z
    .number()
    .min(0, 'Cannot be negative')
    .nullable()
    .optional(),
  description: z.string().max(500).nullable().optional(),
  is_active: z.boolean().default(true),
}).refine(
  (data) => {
    if (data.discount_type === 'percentage' && data.discount_value > 100) {
      return false;
    }
    return true;
  },
  {
    message: 'Percentage discount cannot exceed 100%',
    path: ['discount_value'],
  }
).refine(
  (data) => {
    if (data.valid_from && data.valid_until) {
      return new Date(data.valid_until) >= new Date(data.valid_from);
    }
    return true;
  },
  {
    message: 'End date must be on or after start date',
    path: ['valid_until'],
  }
);

export type PromoCodeInput = z.infer<typeof promoCodeSchema>;
