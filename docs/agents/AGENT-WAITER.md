# AGENT-WAITER: Waiter Module Implementation Guide

> **Version**: 1.1 | **Last Updated**: February 10, 2026 | **Status**: Phase 2.5 Complete + Split Panel UI

---

## Overview

The Waiter module provides a dedicated interface for restaurant waitstaff to:
- Monitor orders with ready items
- Mark individual items as served
- Receive audio/visual alerts when items become ready
- Track service progress across all active orders

---

## Module Ownership

### Files You Own (Create/Modify)

```
src/app/(waiter)/
  ├── layout.tsx              # Auth guard wrapper (waiter + admin roles)
  ├── layout-client.tsx       # Client layout with header, clock, sound toggle
  └── service/page.tsx        # Main waiter service page (route: /service)

src/components/waiter/
  ├── waiter-order-queue.tsx  # Order grid with tabs and view management
  ├── waiter-order-card.tsx   # Full order card with item checkboxes (Ready/Preparing tabs)
  ├── waiter-compact-card.tsx # Compact card for Recent tab grid view
  ├── waiter-split-panel.tsx  # Container for grid ↔ split-panel transitions (Framer Motion)
  ├── waiter-list-card.tsx    # Condensed card for left sidebar list view
  ├── waiter-detail-panel.tsx # Right panel with full order details
  └── waiter-order-detail.tsx # Legacy detail component (deprecated)

src/hooks/
  └── use-realtime-waiter-orders.ts  # Realtime subscription for waiter

src/lib/constants/
  └── item-status.ts          # Item status labels/colors

src/lib/utils/
  └── item-status.ts          # Item status calculation utilities
```

### Shared Files (Modify Carefully)

```
src/services/order-service.ts
  - getWaiterOrders()
  - updateItemToServed()
  - updateItemToReady()
  - markAllItemsReady()
  - getOrderItemStatusCounts()

src/types/order.ts
  - OrderItemStatus type

src/types/auth.ts
  - UserRole includes 'waiter'
```

---

## Database Schema

### Item Status Enum

```sql
CREATE TYPE order_item_status AS ENUM ('pending', 'preparing', 'ready', 'served');
```

### Order Items Table (Extended)

| Column | Type | Description |
|--------|------|-------------|
| status | order_item_status | Item preparation status |
| ready_at | TIMESTAMPTZ | When item was marked ready |
| served_at | TIMESTAMPTZ | When item was served |
| served_by | UUID | Waiter who served the item |

### Status Flow

```
Item Status Lifecycle:
pending → preparing → ready → served

Order Auto-Calculation:
- All items 'ready' → order becomes 'ready'
- All items 'served' → order becomes 'served'
```

---

## UI Specifications

### Layout

- **Header**: "Service Station" branding, sound toggle, live clock, waiter name
- **Tabs**: Ready / Preparing / Recent (with count badges)
- **Grid View** (default): Responsive card grid
- **Split Panel View** (on card click): Left sidebar list + right detail panel

### Tab Behavior

| Tab | Shows | Card Type |
|-----|-------|-----------|
| Ready | Orders with `readyCount > 0` | Full order card with SERVE buttons |
| Preparing | Orders with items still preparing | Full order card with SERVE buttons |
| Recent | Served orders (current shift) | Compact card (summary only) |

### Grid View (Default)

```
┌─────────────────────────────────────────────────────────────┐
│ [Ready ●3] [Preparing] [Recent]          2 orders  [Refresh]│
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ #A0003      │ │ #A0002      │ │ #A0001      │            │
│ │ 2/4 Ready   │ │ 1/3 Ready   │ │ 3/3 Ready   │            │
│ │ 🍽 DINE-IN  │ │ 🛎 ROOM SVC │ │ 🍽 DINE-IN  │            │
│ │ [items...]  │ │ [items...]  │ │ [items...]  │            │
│ │ ₱866.20     │ │ ₱585.60     │ │ ₱622.20     │            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### Split Panel View (On Card Click)

```
┌─────────────────────────────────────────────────────────────┐
│ [Ready ●3] [Preparing] [Recent]          2 orders  [Refresh]│
├─────────────────────────────────────────────────────────────┤
│ ┌────────────────┐ │ ┌─────────────────────────────────────┐│
│ │▌#A0003  2/4    │ │ │ ← Back                              ││
│ │ DINE-IN  T.2   │ │ │                                     ││
│ │ 4 items ₱866   │ │ │ Order #A0003                        ││
│ ├────────────────┤ │ │ ─────────────────────────────────── ││
│ │ #A0002  1/3    │ │ │ 🍽 DINE-IN  ◎ Table 2              ││
│ │ ROOM SVC R.305 │ │ │                                     ││
│ │ 3 items ₱586   │ │ │ ✓ 1× Baked Scallops    [SERVE]     ││
│ ├────────────────┤ │ │ ○ 1× Pork Kare-Kare   (preparing)  ││
│ │ #A0001  3/3    │ │ │ ✓ 2× Plain Rice        [SERVE]     ││
│ │ DINE-IN  T.1   │ │ │ ─────────────────────────────────── ││
│ │ 3 items ₱622   │ │ │ Total               ₱866.20        ││
│ └────────────────┘ │ └─────────────────────────────────────┘│
│     38% width      │           60% width                    │
└─────────────────────────────────────────────────────────────┘
```

### Animation Specifications (Framer Motion)

| Animation | Duration | Easing | Behavior |
|-----------|----------|--------|----------|
| Grid → List collapse | 350ms | cubic-bezier(0.4, 0, 0.2, 1) | Left panel shrinks to 38% |
| Detail panel slide-in | 350ms | cubic-bezier(0.4, 0, 0.2, 1) | From right (x: 100% → 0) |
| Detail content crossfade | 200ms | ease-out | On card selection change |
| List → Grid expand | 350ms | cubic-bezier(0.4, 0, 0.2, 1) | On back/Escape |

### Keyboard Support

- **Escape**: Close detail panel and return to grid view

### Order Card (Ready/Preparing Tabs)

```
┌─────────────────────────────────────┐
│ #1234      ⏱ 5:23   [2/4 Ready]    │
├─────────────────────────────────────┤
│ 🍽 DINE-IN            📍 Table 5    │
├─────────────────────────────────────┤
│ [✓] 2x Pasta Carbonara    [SERVE]  │  ← SERVE button for ready items
│ [○] 1x Caesar Salad    (preparing) │  ← Status text for non-ready
│ [✓] 1x Garlic Bread      [SERVED]  │  ← SERVED badge for served
├─────────────────────────────────────┤
│ ₱1,250.00              📞 0917...  │
└─────────────────────────────────────┘
```

### Compact Card (Recent Tab)

```
┌─────────────────────────────────────┐
│ #A0001            ✓ SERVED         │
│ 🍽 DINE-IN                         │
│ 3 items · ₱622.20                  │
│ 📍 Table 1 · 10m ago               │
└─────────────────────────────────────┘
```

### Visual States

| Item Status | Background | Action | Badge |
|-------------|------------|--------|-------|
| pending | Default | Disabled | Gray clock |
| preparing | Default | Disabled | Amber "preparing" text |
| ready | Emerald-50 | SERVE button | Emerald, pulsing |
| served | Muted, strikethrough | Disabled | Indigo "SERVED" badge |

---

## Split Panel Component Architecture

### Component Hierarchy

```
WaiterOrderQueue (state management, tabs, filters)
└── WaiterSplitPanel (layout orchestration, Framer Motion)
    ├── [Left Panel]
    │   ├── Grid View (when no selection)
    │   │   ├── WaiterOrderCard (Ready/Preparing tabs)
    │   │   └── WaiterCompactCard (Recent tab)
    │   └── List View (when order selected)
    │       └── WaiterListCard (condensed sidebar items)
    └── [Right Panel]
        └── WaiterDetailPanel (full order details, SERVE buttons)
```

### State Flow

```typescript
// WaiterOrderQueue manages selection state
const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

// WaiterSplitPanel receives props
interface WaiterSplitPanelProps {
  orders: WaiterOrder[];
  selectedOrderId: string | null;
  onSelectOrder: (id: string | null) => void;
  viewFilter: 'ready' | 'preparing' | 'recent';
  onItemServed: (itemId: string, newStatus: OrderItemStatus) => void;
}
```

### CSS Variables (Waiter Theme)

```css
--waiter-bg: #faf9f7
--waiter-surface: #ffffff
--waiter-card: #ffffff
--waiter-border: #e8e4de
--waiter-border-strong: #d4cfc5
--waiter-text: #1f1d1a
--waiter-text-secondary: #5c574f
--waiter-text-muted: #9c958a
--waiter-ready: #059669 (emerald)
--waiter-preparing: #d97706 (amber)
--waiter-served: #4f46e5 (indigo - selection highlight)
--waiter-served-light: #e0e7ff
```

---

## Realtime Behavior

### Subscriptions

1. **orders table**: Track order status changes
2. **order_items table**: Track item status changes

### Audio Alerts

- Plays notification sound when `totalReadyItems` increases
- Sound can be toggled via header button
- Preference stored in localStorage

### Polling Fallback

- 10-second interval as backup if Realtime fails

---

## Server Actions

### getWaiterOrders()

```typescript
// Returns orders with item-level status counts
type WaiterOrder = Order & {
  order_items: OrderItemWithStatus[];
  readyCount: number;
  servedCount: number;
  totalCount: number;
};
```

### updateItemToServed(itemId)

```typescript
// Mark a single item as served
// Returns { status, orderCompleted }
// orderCompleted = true when all items are served
```

---

## Integration with Kitchen

### Kitchen → Waiter Flow

1. Kitchen marks order as "preparing" → items sync to "preparing"
2. Kitchen marks individual items as "ready"
3. When all items ready → order auto-transitions to "ready"
4. Waiter sees order in "Ready for Pickup" queue
5. Waiter marks items as "served"
6. When all items served → order auto-transitions to "served"

### Database Triggers

```sql
-- Kitchen bumps order → sync items
orders_sync_items_status

-- Item status changes → recalculate order
order_items_auto_update_order
```

---

## Bill Later Flow

### Kiosk Checkout

1. Guest selects "Dine In" order type
2. "Pay After Meal" option appears in payment methods
3. Guest selects "Pay After Meal"
4. Order goes directly to kitchen (status: 'paid', payment_status: 'unpaid')

### Waiter/Kitchen Processing

1. Kitchen prepares order normally
2. Waiter serves items normally
3. Order marked as 'served' with payment_status: 'unpaid'

### Cashier Settlement

1. Order appears in "Unpaid Bills" queue
2. Cashier processes payment when guest is ready
3. Updates payment_status to 'paid'

---

## Error Handling

### Item Status Transitions

| Error Code | Description |
|------------|-------------|
| E2001 | Order item not found |
| E2004 | Invalid status transition |

### Optimistic Updates

- UI updates immediately on checkbox click
- Background refetch for consistency
- Toast notification on failure

---

## Accessibility

### Touch Targets

- Checkboxes: Minimum 28x28px (7x7 rem units)
- Cards: Full width on mobile

### Visual Indicators

- Ring highlight on actionable items
- Pulsing badge for ready items
- Status colors with text labels (not color-only)

---

## Testing Checklist

### Manual Tests — Grid View

- [x] Tab switching works (Ready, Preparing, Recent)
- [x] Ready tab shows orders with ready items
- [x] Preparing tab shows orders being prepared
- [x] Recent tab shows served orders with compact cards
- [x] Tab counts update correctly
- [x] Empty states display for each tab

### Manual Tests — Split Panel

- [x] Clicking card opens split panel
- [x] Grid animates to left sidebar list (38% width)
- [x] Detail panel slides in from right (60% width)
- [x] Selected card highlighted with indigo border
- [x] Clicking different card switches detail content with crossfade
- [x] Back button closes panel and returns to grid
- [x] Escape key closes panel and returns to grid

### Manual Tests — Detail Panel

- [x] Order number and type badge display correctly
- [x] Location (table/room) displays correctly
- [x] Items list shows all order items
- [x] SERVE buttons work for ready items (Ready/Preparing tabs)
- [x] SERVED badges show for served items
- [x] Status text shows for preparing items
- [x] Totals section displays (Subtotal, VAT, Service Charge, Total)
- [x] Discount row only shows when discount > 0

### Manual Tests — Realtime & Audio

- [ ] Sound plays on new ready items
- [ ] Sound toggle persists across refresh
- [ ] Realtime updates reflect immediately
- [ ] Selection maintained during realtime updates

### Edge Cases

- [ ] No ready items shows empty state
- [ ] Concurrent updates don't cause conflicts
- [ ] Network disconnect shows error state
- [ ] Multiple waiters can serve same order
- [ ] Order removed from list when all items served (auto-clears selection)
