# Agent: Kitchen Display System (KDS)
# Scope: /(kitchen) route group — Kitchen staff order management

---

## Mission

You own the Kitchen Display System. Your goal is to deliver a real-time,
glanceable order queue that kitchen staff can operate with minimal interaction
— even with wet or gloved hands. Every second counts in a kitchen.

---

## Owned Files

```
src/app/(kitchen)/
├── layout.tsx              # Dark theme, fullscreen, top status bar
├── orders/page.tsx         # Main KDS view — real-time order queue
└── settings/page.tsx       # KDS config: sounds, auto-hide, display prefs

src/components/kitchen/
├── order-card.tsx          # Single order card with all items + customizations
├── order-queue.tsx         # Grid/column layout of order cards
├── status-controls.tsx     # Large "bump" buttons to advance order status
├── order-timer.tsx         # Elapsed time since order placed (color-coded)
├── filter-bar.tsx          # Filter: All | Dine-in | Room Service | Takeout
├── audio-alert.tsx         # Plays sound on new order arrival
└── recall-drawer.tsx       # View/recall recently served orders

src/hooks/use-realtime-orders.ts  # Supabase realtime subscription
src/hooks/use-sound.ts            # Audio notification hook
src/stores/kitchen-ui-store.ts    # KDS display preferences
```

---

## UI/UX Requirements

### Display Optimized for Kitchen Environment
- **Dark theme ONLY** — reduces glare, easier on eyes in bright kitchens
- **High contrast** — white/yellow text on dark backgrounds
- **Large text** — item names 20px+, order numbers 32px+
- **No scroll within cards** — all items visible without scrolling
- **Touch targets 64px+** — large buttons for gloved/wet hands

### Order Card Layout
```
┌─────────────────────────────────────┐
│  #A023  │  DINE-IN  │  Table 5     │  ← Header: number, type, location
│─────────────────────────────────────│
│  2× Chicken Adobo                  │  ← Items with quantity
│     + Extra Rice                   │     Addons indented
│     + No Onions                    │     Special notes in yellow
│  1× Sinigang na Baboy             │
│     + Large                        │
│  1× Halo-Halo                      │
│─────────────────────────────────────│
│  ⏱ 3:24  │  [🔥 PREPARING]        │  ← Timer + status button
└─────────────────────────────────────┘
```

### Color Coding (Time-Based Urgency)
| Age | Color | Meaning |
|-----|-------|---------|
| < 5 min | Green (#22C55E) | On time |
| 5-10 min | Yellow (#EAB308) | Getting late |
| 10-15 min | Orange (#F97316) | Urgent |
| > 15 min | Red (#EF4444) | Critical — flashing |

### Status Workflow
```
NEW (blue) → PREPARING (orange) → READY (green) → SERVED (gray, auto-hide)
```
- Single tap advances to next status
- Long press opens status selector for skipping/reverting
- "READY" status triggers notification to cashier/kiosk
- "SERVED" auto-hides after 30 seconds (configurable)

### Audio Alerts
- New order arrival: distinct chime/bell sound
- Order past 10 minutes: subtle warning beep every 60 seconds
- Volume configurable in settings
- Visual flash accompanies all audio alerts

### Layout Options (User Preference)
1. **Column view** (default): 3-4 columns, cards fill left-to-right
2. **Timeline view**: Single scrolling column, newest at bottom
3. Auto-adjusts column count based on screen width

---

## Real-Time Data Architecture

### Primary Subscription
```typescript
// Subscribe to all active orders (paid, preparing, ready)
const channel = supabase
  .channel('kitchen-orders')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'orders',
    filter: 'status=in.(paid,preparing,ready)'
  }, (payload) => {
    switch (payload.eventType) {
      case 'INSERT':
        addOrderToQueue(payload.new);
        playNewOrderSound();
        break;
      case 'UPDATE':
        updateOrderInQueue(payload.new);
        break;
      case 'DELETE':
        removeOrderFromQueue(payload.old.id);
        break;
    }
  })
  .subscribe();
```

### Order Items (Joined Query)
```typescript
// Fetch full order details including items and addons
const { data: orders } = await supabase
  .from('orders')
  .select(`
    *,
    order_items(
      *,
      order_item_addons(*)
    )
  `)
  .in('status', ['paid', 'preparing', 'ready'])
  .order('created_at', { ascending: true });
```

### Status Update (Optimistic)
```typescript
async function advanceOrderStatus(orderId: string, currentStatus: string) {
  const nextStatus = getNextStatus(currentStatus);
  
  // Optimistic: update UI immediately
  updateOrderInQueue({ id: orderId, status: nextStatus });
  
  // Server: update database
  const { error } = await supabase
    .from('orders')
    .update({
      status: nextStatus,
      ...(nextStatus === 'ready' ? { ready_at: new Date().toISOString() } : {}),
      ...(nextStatus === 'served' ? { served_at: new Date().toISOString() } : {})
    })
    .eq('id', orderId);
  
  if (error) {
    // Revert optimistic update
    updateOrderInQueue({ id: orderId, status: currentStatus });
    showToast('Failed to update order status');
  }
}
```

---

## KDS Settings (Persisted Locally)

```typescript
interface KitchenSettings {
  soundEnabled: boolean;
  soundVolume: number;          // 0-100
  autoHideServed: boolean;
  autoHideDelay: number;        // seconds (default 30)
  layoutMode: 'columns' | 'timeline';
  showOrderAge: boolean;
  flashCriticalOrders: boolean;
  criticalThresholdMinutes: number;  // default 15
  filterOrderType: 'all' | 'dine_in' | 'room_service' | 'takeout';
}
```

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
   by menu category. This is a future enhancement but design the
   data model to support it.

---

## Dependencies

- `@supabase/realtime-js` — Real-time subscriptions
- `zustand` + `persist` — KDS settings stored in localStorage
- `use-sound` or Web Audio API — New order alerts
- shadcn/ui: Card, Button, Badge, Toggle, Slider
