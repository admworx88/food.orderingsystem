/**
 * Item status calculation utilities
 */

import type { OrderItemStatus } from '@/lib/constants/item-status';

export interface ItemStatusCounts {
  pending: number;
  preparing: number;
  ready: number;
  served: number;
  total: number;
}

/**
 * Calculate item status counts from an array of items
 */
export function calculateItemStatusCounts(
  items: Array<{ status: OrderItemStatus }>
): ItemStatusCounts {
  const counts: ItemStatusCounts = {
    pending: 0,
    preparing: 0,
    ready: 0,
    served: 0,
    total: items.length,
  };

  for (const item of items) {
    if (item.status in counts) {
      counts[item.status]++;
    }
  }

  return counts;
}

/**
 * Get a human-readable progress string
 * e.g., "2/4 Ready", "All Served"
 */
export function getProgressLabel(counts: ItemStatusCounts): string {
  if (counts.served === counts.total) {
    return 'All Served';
  }
  if (counts.ready + counts.served === counts.total) {
    return counts.ready === counts.total ? 'All Ready' : `${counts.ready} Ready`;
  }
  if (counts.ready > 0) {
    return `${counts.ready}/${counts.total} Ready`;
  }
  if (counts.preparing > 0) {
    return `${counts.preparing}/${counts.total} Preparing`;
  }
  return 'Pending';
}

/**
 * Check if an order has any items ready to serve
 */
export function hasReadyItems(counts: ItemStatusCounts): boolean {
  return counts.ready > 0;
}

/**
 * Check if all items have been served
 */
export function isFullyServed(counts: ItemStatusCounts): boolean {
  return counts.served === counts.total && counts.total > 0;
}
