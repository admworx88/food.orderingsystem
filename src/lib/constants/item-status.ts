/**
 * Item-level status constants for waiter/kitchen modules
 */

import type { Database } from '@/lib/supabase/types';

export type OrderItemStatus = Database['public']['Enums']['order_item_status'];

export const ITEM_STATUS_LABELS: Record<OrderItemStatus, string> = {
  pending: 'Pending',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
};

export const ITEM_STATUS_COLORS: Record<OrderItemStatus, { bg: string; text: string; border: string }> = {
  pending: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    border: 'border-gray-200',
  },
  preparing: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  ready: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
  },
  served: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
  },
};

export const ITEM_STATUS_BADGE_COLORS: Record<OrderItemStatus, string> = {
  pending: 'bg-gray-100 text-gray-600',
  preparing: 'bg-amber-100 text-amber-700',
  ready: 'bg-emerald-100 text-emerald-700 animate-pulse',
  served: 'bg-blue-100 text-blue-600',
};
