# Agent: Kitchen Display System (KDS)
# Scope: /(kitchen) route group — Kitchen staff order management

> **Version:** 2.3 | **Last Updated:** February 10, 2026 | **Status:** Phase 2 + Waiter Integration Complete

---

## Quick Reference

### Order Status Flow
```
PAID → PREPARING → READY → SERVED
 │         │          │        │
 ▼         ▼          ▼        ▼
New order  Kitchen   Ready for   Delivered
received   working   pickup      to guest
```

### Key Components
| Component | Purpose |
|-----------|---------|
| `order-queue.tsx` | Main display grid |
| `order-card.tsx` | Individual order (with per-item status) |
| `order-timer.tsx` | Time since paid (color-coded) |
| `status-controls.tsx` | Bump buttons |
| `station-filter.tsx` | Filter by station |

### Item-Level Status (Phase 2.5)
| Item Status | Meaning | Who Changes |
|-------------|---------|-------------|
| `pending` | Waiting to start | Auto (on order creation) |
| `preparing` | Being cooked | Auto (when order bumped to preparing) |
| `ready` | Done, waiting for service | Kitchen (per-item DONE button) |
| `served` | Delivered to guest | Waiter (SERVE button) |

### Timer Color Coding (PRD Section 5: F-KD04)
| Age (from paid_at) | Color | Status |
|-----|-------|--------|
| 0-5 min | Green (#22C55E) | On track |
| 5-10 min | Yellow (#EAB308) | Needs attention |
| > 10 min | Red (#EF4444) | Overdue |

### Realtime Subscription
```typescript
// Filter for active orders only
.on('postgres_changes', {
  event: '*', table: 'orders',
  filter: 'status=in.(paid,preparing,ready)'
})
```

---

## Mission

You own the Kitchen Display System. Your goal is to deliver a real-time,
glanceable order queue that kitchen staff can operate with minimal interaction
— even with wet or gloved hands. Every second counts in a kitchen. Support for
multi-station routing and order expiration handling is critical.

---

## Owned Files

```
src/app/(kitchen)/
├── layout.tsx              # Dark theme, fullscreen, top status bar
├── orders/page.tsx         # Main KDS view — real-time order queue
└── settings/page.tsx       # KDS config: sounds, auto-hide, display prefs, station filter

src/components/kitchen/
├── order-card.tsx          # Single order card with per-item status + DONE buttons (ENHANCED)
├── order-queue.tsx         # Grid/column layout of order cards (per-item updates)
├── status-controls.tsx     # Large "bump" buttons to advance order status
├── order-timer.tsx         # Elapsed time since order PAID (color-coded) — FIXED
├── expired-orders-list.tsx # NEW: Display cancelled/expired orders
├── station-filter.tsx      # NEW: Filter by kitchen station
├── filter-bar.tsx          # Filter: All | Dine-in | Room Service | Takeout
├── audio-alert.tsx         # Plays sound on new order arrival
└── recall-drawer.tsx       # View/recall recently served orders

src/hooks/use-realtime-orders.ts  # Supabase realtime subscription (ENHANCED)
src/hooks/use-sound.ts            # Audio notification hook
src/stores/kitchen-ui-store.ts    # KDS display preferences (ENHANCED)
```

---

## UI/UX Requirements

### Display Optimized for Kitchen Environment
- **Dark theme ONLY** — reduces glare, easier on eyes in bright kitchens
- **High contrast** — white/yellow text on dark backgrounds
- **Large text** — item names 20px+, order numbers 28px+ (WCAG/PRD minimum)
- **No scroll within cards** — all items visible without scrolling
- **Touch targets 64px+** — large buttons for gloved/wet hands

### Order Card Layout (ENHANCED)
```
┌─────────────────────────────────────┐
│  #A023  │  DINE-IN  │  Table 5     │  ← Header: number, type, location
│─────────────────────────────────────│
│  🍗 Grill Station                   │  ← NEW: Kitchen station badge
│─────────────────────────────────────│
│  2× Chicken Adobo                  │  ← Items with quantity
│     + Extra Rice                   │     Addons indented
│     + No Onions                    │     Special notes in yellow
│     ⚠️ Allergens: gluten, soy     │  ← NEW: Allergen warnings
│  1× Sinigang na Baboy             │
│     + Large                        │
│  1× Halo-Halo                      │
│─────────────────────────────────────│
│  💰 ₱939.51 (Promo: -₱50)         │  ← NEW: Total + discount
│  📱 +63 917 XXX XXXX              │  ← NEW: Guest phone (if provided)
│─────────────────────────────────────│
│  ⏱ 3:24  │  [🔥 PREPARING]        │  ← Timer (from paid_at) + status button
└─────────────────────────────────────┘
```

### Color Coding (Time-Based Urgency — PRD Section 5: F-KD04)
| Age (from paid_at) | Color | Meaning |
|-----|-------|---------|
| < 5 min | Green (#22C55E) | On time |
| 5-10 min | Yellow (#EAB308) | Getting late |
| > 10 min | Red (#EF4444) | Overdue — flashing |

**CRITICAL**: Timer reference changed from `created_at` to `paid_at` to accurately track kitchen processing time.

### Status Workflow
```
NEW (blue) → PREPARING (orange) → READY (green) → SERVED (gray, auto-hide)
                                                          ↓
                                                   Auto-cancel after 15min unpaid
```
- Single tap advances to next status
- Long press opens status selector for skipping/reverting
- "READY" status triggers notification to cashier/kiosk
- "SERVED" auto-hides after 5 minutes (configurable via settings)
- **NEW**: Expired orders show with "EXPIRED" badge, auto-hide after 5min

### Audio Alerts
- New order arrival: distinct chime/bell sound
- Order past 10 minutes: subtle warning beep every 60 seconds
- Volume configurable in settings
- Visual flash accompanies all audio alerts

### Layout Options (User Preference)
1. **Column view** (default): 3-4 columns, cards fill left-to-right
2. **Timeline view**: Single scrolling column, newest at bottom
3. **Station view** (NEW): Grouped by kitchen station
4. Auto-adjusts column count based on screen width

---

## Real-Time Data Architecture (ENHANCED)

### Primary Subscription
```typescript
// Subscribe to all active orders (paid, preparing, ready)
// ENHANCED: Include soft-deleted check and version field
const channel = supabase
  .channel('kitchen-orders')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'orders',
    filter: 'status=in.(paid,preparing,ready).and(deleted_at=is.null)'
  }, (payload) => {
    switch (payload.eventType) {
      case 'INSERT':
        addOrderToQueue(payload.new);
        playNewOrderSound();
        break;
      case 'UPDATE':
        // Check version field for optimistic locking
        updateOrderInQueue(payload.new);
        break;
      case 'DELETE':
        removeOrderFromQueue(payload.old.id);
        break;
    }
  })
  .subscribe();
```

### Order Items (Joined Query - ENHANCED)
```typescript
// Fetch full order details including items, addons, stations, promo
const { data: orders } = await supabase
  .from('orders')
  .select(`
    *,
    promo_codes(code, discount_value, discount_type),
    order_items(
      *,
      order_item_addons(*),
      menu_items(
        allergens,
        menu_item_stations(
          kitchen_stations(name)
        )
      )
    )
  `)
  .in('status', ['paid', 'preparing', 'ready'])
  .is('deleted_at', null)  // NEW: Filter soft-deleted orders
  .order('paid_at', { ascending: true });  // FIXED: Order by paid_at, not created_at

return orders;
```

### Status Update (Optimistic - ENHANCED)
```typescript
async function advanceOrderStatus(orderId: string, currentStatus: string, currentVersion: number) {
  const nextStatus = getNextStatus(currentStatus);

  // Optimistic: update UI immediately
  updateOrderInQueue({ id: orderId, status: nextStatus });

  // Server: update database with optimistic locking
  const { error } = await supabase
    .from('orders')
    .update({
      status: nextStatus,
      version: currentVersion + 1,  // NEW: Optimistic locking
      ...(nextStatus === 'ready' ? { ready_at: new Date().toISOString() } : {}),
      ...(nextStatus === 'served' ? { served_at: new Date().toISOString() } : {})
    })
    .eq('id', orderId)
    .eq('version', currentVersion);  // NEW: Only update if version matches

  if (error) {
    // Revert optimistic update (version conflict or other error)
    updateOrderInQueue({ id: orderId, status: currentStatus });
    showToast('Failed to update order status. Please refresh.');
  }
}
```

---

## Kitchen Station Filtering (NEW)

### Station Filter Component
```typescript
interface KitchenStationFilter {
  stationId: string | 'all';
  stationName: string;
}

function StationFilter() {
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [stations, setStations] = useState<KitchenStation[]>([]);

  useEffect(() => {
    async function fetchStations() {
      const { data } = await supabase
        .from('kitchen_stations')
        .select('*')
        .eq('is_active', true);
      setStations(data || []);
    }
    fetchStations();
  }, []);

  return (
    <div className="flex gap-2">
      <Button
        variant={selectedStation === 'all' ? 'default' : 'outline'}
        onClick={() => setSelectedStation('all')}
      >
        All Stations
      </Button>
      {stations.map(station => (
        <Button
          key={station.id}
          variant={selectedStation === station.id ? 'default' : 'outline'}
          onClick={() => setSelectedStation(station.id)}
        >
          {station.name}
        </Button>
      ))}
    </div>
  );
}
```

### Filter Orders by Station
```typescript
const filteredOrders = selectedStation === 'all'
  ? orders
  : orders.filter(order =>
      order.order_items.some(item =>
        item.menu_items?.menu_item_stations?.some(
          station => station.kitchen_stations.id === selectedStation
        )
      )
    );
```

---

## Order Expiration Handling (NEW)

### Display Expired Orders
```typescript
// Fetch expired orders (separate query)
const { data: expiredOrders } = await supabase
  .from('orders')
  .select('*')
  .eq('status', 'cancelled')
  .eq('payment_status', 'expired')
  .is('deleted_at', null)
  .gte('cancelled_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())  // Last 5 min
  .order('cancelled_at', { ascending: false });

// Display in separate section with "EXPIRED" badge
<div className="opacity-50">
  <h3>Expired Orders (Auto-removed in 5 min)</h3>
  {expiredOrders.map(order => (
    <div key={order.id} className="border-red-500">
      <span className="bg-red-600 text-white px-2 py-1 rounded">EXPIRED</span>
      Order #{order.order_number} - {formatCurrency(order.total_amount)}
    </div>
  ))}
</div>
```

---

## Order Timer Calculation (FIXED)

### Timer Hook
```typescript
function useOrderAge(paidAt: string | null) {
  const [age, setAge] = useState(0);

  useEffect(() => {
    if (!paidAt) return;

    const interval = setInterval(() => {
      // FIXED: Calculate from paid_at, not created_at
      const ageInMinutes = Math.floor(
        (Date.now() - new Date(paidAt).getTime()) / 60000
      );
      setAge(ageInMinutes);
    }, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, [paidAt]);

  return age;
}

// Color coding based on age (3 levels per PRD Section 5: F-KD04)
function getOrderColorClass(age: number) {
  if (age < 5) return 'text-green-500';
  if (age < 10) return 'text-yellow-500';
  return 'text-red-500 animate-pulse';  // >10 min = overdue
}
```

---

## KDS Settings (Persisted Locally - ENHANCED)

```typescript
interface KitchenSettings {
  soundEnabled: boolean;
  soundVolume: number;          // 0-100
  autoHideServed: boolean;
  autoHideDelay: number;        // seconds (default 300 = 5 min, per CLAUDE.md)
  layoutMode: 'columns' | 'timeline' | 'station';
  showOrderAge: boolean;
  flashCriticalOrders: boolean;
  criticalThresholdMinutes: number;  // default 15
  filterOrderType: 'all' | 'dine_in' | 'room_service' | 'takeout';
  selectedStation: string | 'all';    // NEW: Station filter
  showExpiredOrders: boolean;         // NEW: Show/hide expired orders
}
```

---

## Item-Level Status Tracking (Phase 2.5)

### Per-Item Ready Buttons

Kitchen staff can now mark individual items as ready instead of bumping the entire order:

```
┌─────────────────────────────────────┐
│  #A023  │  DINE-IN  │  Table 5     │
│─────────────────────────────────────│
│  2× Chicken Adobo      [✓ DONE]    │  ← Mark this item ready
│  1× Sinigang            [✓ DONE]    │  ← Mark this item ready
│  1× Halo-Halo           preparing   │  ← Not yet done
│─────────────────────────────────────│
│  ⏱ 4 min  │  2/3 Ready            │  ← Partial ready badge
│  [MARK ALL READY]                   │  ← Bulk action still available
└─────────────────────────────────────┘
```

**Server Actions used**:
- `updateItemToReady(itemId)` — Marks a single item as ready (validates pending/preparing → ready)
- `markAllItemsReady(orderId)` — Bulk marks all items ready (existing bump behavior)

**Auto-transitions via DB triggers**:
- When order bumped to `preparing` → all pending items auto-sync to `preparing` (`sync_order_items_on_order_status` trigger)
- When all items marked `ready` → order auto-transitions to `ready` (`auto_update_order_status_from_items` trigger)
- When all items marked `served` (by waiter) → order auto-transitions to `served`

### Waiter Integration

Kitchen and waiter modules work together for item-level service:

```
Kitchen                           Waiter
────────                          ──────
1. Order arrives (status: paid)
2. Bump to "Preparing"
   → All items sync to preparing
3. Mark item ready (per item)     → Ready items appear in waiter "Ready" tab
   → Shows "2/4 Ready" badge      → Waiter gets audio alert
                                  4. Waiter marks item served
                                     → served_by + served_at recorded
                                  5. When all items served
                                     → Order auto-transitions to "served"
```

### Realtime for order_items

In addition to subscribing to the `orders` table, the kitchen hook (`use-realtime-orders.ts`) now also subscribes to the `order_items` table for item-level status changes. This enables:
- Seeing when waiter marks items as served (partial progress updates)
- Optimistic updates when kitchen marks items ready

---

## Key Implementation Notes

1. **Never lose an order**: If realtime disconnects, show a prominent
   "DISCONNECTED" banner and auto-reconnect. On reconnect, re-fetch
   all active orders to ensure nothing was missed.

2. **Performance**: Kitchen display runs ALL DAY. Watch for memory leaks
   in subscriptions. Clean up served orders from state. Use `requestAnimationFrame`
   for timer updates, not `setInterval`.

3. **Fullscreen mode**: Use the Fullscreen API to go truly fullscreen
   on the kitchen monitor. Hide browser chrome completely.

4. **Screen burn-in prevention**: For monitors running 12+ hours, subtly
   shift the UI by 1-2px every 30 minutes.

5. **Offline resilience**: If the network drops, keep showing current orders.
   Queue any status changes locally and sync when reconnected.

6. **Multiple KDS support**: If the hotel has multiple kitchen stations
   (hot kitchen, cold kitchen, bar), each KDS should be able to filter
   by station using the `kitchen_stations` table.

7. **Order age calculation**: ALWAYS use `paid_at` timestamp, not `created_at`.
   Unpaid orders should not appear on KDS.

8. **Optimistic locking**: Use the `version` field to prevent concurrent
   status updates from overwriting each other.

9. **Soft delete awareness**: Filter out soft-deleted orders (deleted_at IS NULL)
   in all queries and realtime subscriptions.

10. **Expired order handling**: Auto-remove expired orders from the queue.
    Optionally display them in a separate section for awareness.

---

## Dependencies

- `@supabase/realtime-js` — Real-time subscriptions
- `zustand` + `persist` — KDS settings stored in localStorage
- `use-sound` or Web Audio API — New order alerts
- shadcn/ui: Card, Button, Badge, Toggle, Slider

---

## Troubleshooting

### Common KDS Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Orders not appearing | Realtime disconnected | Check connection banner, verify subscription |
| Timer showing wrong time | Using created_at | Ensure timer uses `paid_at` timestamp |
| Sound not playing | Autoplay blocked | User must interact with page first |
| Memory leak over time | Served orders not cleaned | Remove served orders from state |
| Status update fails | Optimistic locking conflict | Retry with refreshed version field |

### Realtime Debugging

```typescript
// Check subscription status
const channel = supabase.channel('kitchen-orders');
console.log('Channel state:', channel.state); // Should be 'joined'

// Manual reconnect
if (channel.state !== 'joined') {
  channel.unsubscribe();
  channel.subscribe();
}
```

### Testing Checklist

- [ ] Realtime subscription connects
- [ ] New orders appear automatically
- [ ] Timer shows correct elapsed time (from paid_at)
- [ ] Status buttons advance order
- [ ] Sound plays on new order
- [ ] Station filter works
- [ ] Served orders auto-hide
- [ ] Recall drawer shows recent orders

---

## Version History

### Version 2.3 (February 10, 2026)
**Changes**:
- Added Item-Level Status Tracking section (Phase 2.5 integration)
- Added per-item ready buttons documentation with wireframe
- Added Waiter Integration section with kitchen↔waiter flow diagram
- Added Realtime for order_items section (dual table subscription)
- Updated order-card.tsx and order-queue.tsx descriptions for per-item support
- Added Item-Level Status table to Quick Reference
- Updated version references to PRD v1.4 and Architecture v2.5

### Version 2.2 (February 7, 2026)
**Changes**:
- Fixed color coding: 3 levels (green/yellow/red) aligned with PRD Section 5 (F-KD04) — removed orange 10-15min tier
- Fixed auto-hide served delay: 300s (5 min) aligned with CLAUDE.md — was 30s
- Fixed order number minimum font size: 28px+ aligned with PRD accessibility — was 32px+
- Updated all version references to PRD v1.3 and Architecture v2.3

### Version 2.1 (February 2026)
**Changes**:
- Added Quick Reference with status flow and timer colors
- Added Troubleshooting section
- Updated version references to PRD v1.2

### Version 2.0 (February 5, 2026)
**Status**: Updated for PRD v1.1 and Architecture v2.0 alignment

**Major Updates**:
- Added kitchen_stations multi-station routing support
- Added order expiration handling
- FIXED: Timer calculation now uses paid_at field
- Added version field for optimistic locking
- Added soft delete filtering in queries
- Added station-based filtering

### Version 1.0 (February 2, 2026)
- Initial kitchen display specification

---

## Related Documents

- **[PRD.md](../prd/PRD.md)** — Product Requirements Document v1.4
- **[ARCHITECTURE.md](../architecture/ARCHITECTURE.md)** — System Architecture v2.5
- **[AGENT-DATABASE.md](./AGENT-DATABASE.md)** — Database schema v2.4
- **[AGENT-WAITER.md](./AGENT-WAITER.md)** — Waiter module spec v1.1 (kitchen↔waiter integration)
