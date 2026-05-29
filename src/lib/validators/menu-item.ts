import { z } from 'zod';

export const nutritionalInfoSchema = z.object({
  calories: z.number().min(0).optional(),
  protein: z.number().min(0).optional(),
  carbs: z.number().min(0).optional(),
  fat: z.number().min(0).optional(),
  fiber: z.number().min(0).optional(),
  sodium: z.number().min(0).optional(),
}).optional().nullable();

export const menuItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string().min(1, 'Slug is required').max(100),
  description: z.string().max(500).optional().nullable(),
  category_id: z.string().uuid('Invalid category'),
  base_price: z.number().min(0).max(999999.99),
  image_url: z.string().url().optional().nullable(),
  is_available: z.boolean().default(true),
  display_order: z.number().int().min(0).default(0),
  allergens: z.array(z.string()).optional().nullable(),
  nutritional_info: nutritionalInfoSchema,
  translations: z.object({
    tl: z.object({
      name: z.string().max(100).optional(),
      description: z.string().max(500).optional(),
    }).optional(),
  }).optional().nullable(),
});

export type MenuItemInput = z.infer<typeof menuItemSchema>;
