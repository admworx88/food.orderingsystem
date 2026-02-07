import { z } from 'zod';

export const cartAddonSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  price: z.number().min(0),
});

export const cartItemSchema = z.object({
  menuItemId: z.string().uuid(),
  name: z.string().min(1),
  basePrice: z.number().min(0),
  quantity: z.number().int().min(1).max(99),
  addons: z.array(cartAddonSchema),
  specialInstructions: z.string().max(200).optional(),
});

export const orderInputSchema = z.object({
  items: z.array(cartItemSchema).min(1, 'Cart cannot be empty'),
  orderType: z.enum(['dine_in', 'room_service', 'takeout']),
  tableNumber: z.string().optional().nullable(),
  roomNumber: z.string().optional().nullable(),
  paymentMethod: z.enum(['cash', 'gcash', 'card']),
  promoCode: z.string().optional().nullable(),
  promoCodeId: z.string().uuid().optional().nullable(),
  guestPhone: z.string().max(20).optional().nullable(),
  specialInstructions: z.string().max(500).optional().nullable(),
}).refine(
  (data) => {
    if (data.orderType === 'dine_in') {
      return data.tableNumber && data.tableNumber.trim().length > 0;
    }
    return true;
  },
  { message: 'Table number is required for dine-in orders', path: ['tableNumber'] }
).refine(
  (data) => {
    if (data.orderType === 'room_service') {
      return data.roomNumber && data.roomNumber.trim().length > 0;
    }
    return true;
  },
  { message: 'Room number is required for room service orders', path: ['roomNumber'] }
);

export const promoCodeInputSchema = z.object({
  code: z.string().min(1, 'Promo code is required').max(50).transform((v) => v.toUpperCase().trim()),
  subtotal: z.number().min(0),
});

export type CartAddonInput = z.infer<typeof cartAddonSchema>;
export type CartItemInput = z.infer<typeof cartItemSchema>;
export type OrderInput = z.infer<typeof orderInputSchema>;
export type PromoCodeInput = z.infer<typeof promoCodeInputSchema>;
