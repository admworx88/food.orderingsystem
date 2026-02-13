import type { Database } from '@/lib/supabase/types';

type OrderType = Database['public']['Enums']['order_type'];
type PaymentMethod = Database['public']['Enums']['payment_method'];

export interface OrderTypeConfig {
  value: OrderType;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
  requiresTable: boolean;
  requiresRoom: boolean;
  allowedPaymentMethods: PaymentMethod[];
}

export const ORDER_TYPE_CONFIG: Record<OrderType, OrderTypeConfig> = {
  dine_in: {
    value: 'dine_in',
    label: 'Dine In',
    shortLabel: 'Dine-in',
    icon: '🍽',
    description: 'Enjoy your meal at the restaurant',
    requiresTable: true,
    requiresRoom: false,
    allowedPaymentMethods: ['cash', 'bill_later'],
  },
  room_service: {
    value: 'room_service',
    label: 'Room Service',
    shortLabel: 'Room Svc',
    icon: '🛎',
    description: 'Deliver to your room',
    requiresTable: false,
    requiresRoom: true,
    allowedPaymentMethods: ['card', 'gcash'],
  },
  takeout: {
    value: 'takeout',
    label: 'Take Out',
    shortLabel: 'Takeout',
    icon: '📦',
    description: 'Take it to go',
    requiresTable: false,
    requiresRoom: false,
    allowedPaymentMethods: ['card', 'gcash'],
  },
  ocean_view: {
    value: 'ocean_view',
    label: 'Ocean View',
    shortLabel: 'Ocean View',
    icon: '🌊',
    description: 'Dine at our floating restaurant over the sea',
    requiresTable: false,
    requiresRoom: false,
    allowedPaymentMethods: ['card', 'gcash'],
  },
};

/** Get allowed payment methods for a given order type */
export function getAllowedPaymentMethods(orderType: OrderType): PaymentMethod[] {
  return ORDER_TYPE_CONFIG[orderType]?.allowedPaymentMethods ?? [];
}

/** Check if a payment method is allowed for an order type */
export function isPaymentMethodAllowed(orderType: string, method: string): boolean {
  const config = ORDER_TYPE_CONFIG[orderType as OrderType];
  if (!config) return false;
  return config.allowedPaymentMethods.includes(method as PaymentMethod);
}

/** Format order type for display */
export function formatOrderType(type: string): string {
  return ORDER_TYPE_CONFIG[type as OrderType]?.label ?? type;
}

/** List of all order types for iteration */
export const ALL_ORDER_TYPES = Object.values(ORDER_TYPE_CONFIG);
