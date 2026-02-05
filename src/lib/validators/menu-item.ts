import { z } from 'zod';

export const menuItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string().min(1, 'Slug is required').max(100),
  description: z.string().max(500).optional().nullable(),
  category_id: z.string().uuid('Invalid category'),
  base_price: z.number().min(0).max(999999.99),
  image_url: z.string().url().optional().nullable(),
  is_available: z.boolean().default(true),
  display_order: z.number().int().min(0).default(0),
});

export type MenuItemInput = z.infer<typeof menuItemSchema>;
