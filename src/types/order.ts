import type { Database } from '@/lib/supabase/types';

export type OrderType = Database['public']['Enums']['order_type'];
export type OrderStatus = Database['public']['Enums']['order_status'];
export type OrderItemStatus = Database['public']['Enums']['order_item_status'];
export type PaymentMethod = Database['public']['Enums']['payment_method'];
export type PaymentStatus = Database['public']['Enums']['payment_status'];
export type UserRole = Database['public']['Enums']['user_role'];

// Order item with status for waiter/kitchen modules
export type OrderItemRow = Database['public']['Tables']['order_items']['Row'];
export type OrderRow = Database['public']['Tables']['orders']['Row'];
export type OrderItemAddonRow = Database['public']['Tables']['order_item_addons']['Row'];

export type OrderItemWithAddons = OrderItemRow & {
  order_item_addons: OrderItemAddonRow[];
};

export type OrderWithItems = OrderRow & {
  order_items: OrderItemWithAddons[];
};
