# Agent: Kiosk Module
# Scope: /(kiosk) route group — Guest-facing ordering interface

---

## Mission

You are responsible for the guest-facing kiosk experience. Your goal is to create
a touch-optimized, visually appealing ordering interface that guides hotel guests
from browsing the menu to placing an order in under 3 minutes.

---

## Owned Files

```
src/app/(kiosk)/
├── layout.tsx              # Fullscreen layout, idle timer, no navigation
├── page.tsx                # Welcome / splash screen with "Start Order" CTA
├── menu/page.tsx           # Category grid → item list → item detail
├── cart/page.tsx           # Cart review, order type selector, special instructions
├── checkout/page.tsx       # Payment method selection + digital payment flow
└── confirmation/page.tsx   # Order number display + estimated wait time

src/components/kiosk/
├── menu-grid.tsx           # Category cards in responsive grid
├── menu-item-card.tsx      # Item card: image, name, price, "Add" button
├── item-detail-sheet.tsx   # Bottom sheet: full description, addon groups, quantity
├── addon-selector.tsx      # Checkbox/radio group for addons
├── cart-drawer.tsx         # Slide-out cart panel
├── cart-item.tsx           # Cart line: name, qty controls, addons, price
├── order-type-selector.tsx # Dine-in / Room Service / Takeout cards
├── payment-method-selector.tsx  # Cash / GCash / Card option cards
├── order-number-display.tsx     # Large animated order number
├── idle-timer.tsx          # Resets to welcome after 2min inactivity
└── numpad.tsx              # On-screen numpad for table/room number

src/stores/cart-store.ts    # Zustand cart state
src/stores/kiosk-ui-store.ts
src/hooks/use-idle-timer.ts
```

---

## UI/UX Requirements

### Touch Optimization
- All interactive elements minimum 48px × 48px (ideally 56px+)
- Use bottom sheets instead of modals (easier thumb reach)
- Large, clear typography: category names 24px+, item names 18px+, prices bold
- Generous spacing between tap targets (min 8px gap)
- Swipe gestures for category navigation
- No hover states (touch only) — use active/pressed states

### Screen Flow
```
Welcome → Menu (categories → items) → Item Detail → Cart → Order Type → Checkout → Confirmation
  ↑                                      ↓                                           │
  └──────────────────────────────────────────────────────────────────────────────────┘
                                  (auto-reset after timeout)
```

### Visual Design
- Light theme with high contrast for readability in bright hotel lobbies
- Food photography as hero elements (large item images)
- Prominent floating cart button with item count badge
- Progress indicator showing current step (4 steps)
- Animated transitions between pages (slide left/right)
- Philippine Peso (₱) formatting throughout

### Idle Timer Behavior
1. After 60s of no interaction → show "Are you still there?" overlay
2. After additional 30s → reset to welcome screen
3. Clear cart, order type, and all selections on reset
4. Any touch resets the idle timer

---

## Data Fetching Strategy

### Menu Data
```typescript
// Server Component: fetch categories + items on page load
// This runs on the server, close to the database
async function MenuPage() {
  const supabase = createServerClient();
  const { data: categories } = await supabase
    .from('categories')
    .select(`*, menu_items(*, addon_groups(*, addon_options(*)))`)
    .eq('is_active', true)
    .eq('menu_items.is_available', true)
    .order('display_order');
  
  return <MenuGrid categories={categories} />;
}
```

### Cart State (Zustand)
```typescript
interface CartItem {
  menuItemId: string;
  name: string;
  basePrice: number;
  quantity: number;
  addons: { id: string; name: string; price: number }[];
  specialInstructions?: string;
  totalPrice: number; // (basePrice + sum(addon prices)) * quantity
}

interface CartStore {
  items: CartItem[];
  orderType: 'dine_in' | 'room_service' | 'takeout' | null;
  tableNumber: string | null;
  roomNumber: string | null;
  specialInstructions: string;
  
  // Actions
  addItem: (item: CartItem) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, qty: number) => void;
  setOrderType: (type: OrderType) => void;
  clearCart: () => void;
  
  // Computed
  subtotal: number;
  taxAmount: number;
  serviceCharge: number;
  total: number;
}
```

### Order Submission (Server Action)
```typescript
'use server'
async function createOrder(cart: CartStore): Promise<OrderConfirmation> {
  // 1. Validate with Zod
  // 2. Re-verify prices server-side (prevent tampering)
  // 3. Generate order number
  // 4. Insert order + items + addons in a transaction
  // 5. If digital payment → create PayMongo session
  // 6. Return { orderNumber, estimatedWait, paymentUrl? }
}
```

---

## Key Implementation Notes

1. **Price Verification**: NEVER trust client-side prices. Always re-fetch
   menu item prices on the server when creating orders.

2. **Cart Persistence**: Use Zustand persist middleware to survive
   accidental page refreshes, but clear on idle timeout.

3. **Image Optimization**: Use Next.js `<Image>` with blur placeholders
   for menu item photos. Serve from Supabase Storage.

4. **Accessibility**: Despite touch focus, maintain keyboard nav for
   accessibility compliance. Use `aria-label` on icon-only buttons.

5. **Order Number Display**: Make it HUGE (96px+, bold) on the
   confirmation page. Guests need to see this from across the restaurant.

6. **Error Handling**: If order submission fails, keep the cart intact
   and show a retry option. Never lose a guest's order.

---

## Dependencies

- `zustand` — Cart and UI state
- `framer-motion` or CSS transitions — Page animations
- `@supabase/ssr` — Server-side Supabase client
- `zod` — Cart validation
- shadcn/ui: Sheet, Button, Card, Badge, Dialog, Toast
