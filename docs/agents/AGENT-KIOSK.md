# Agent: Kiosk Module
# Scope: /(kiosk) route group — Guest-facing ordering interface

> **Version:** 2.3 | **Last Updated:** February 10, 2026 | **Status:** ✅ Frontend Complete + Bill Later Support, Aligned with PRD v1.4

---

## ✅ Implementation Status

**Completed Components** (February 2026):
- ✅ Welcome/splash page with animated gradient hero
- ✅ Menu display with responsive grid/list view
- ✅ Category sidebar with **flat borders** and 60px touch targets
- ✅ Menu item cards with generous spacing (20px padding)
- ✅ Cart review page with quantity controls and special instructions
- ✅ Checkout page with 4-step flow (order type, promo, phone, payment)
- ✅ Confirmation page with 144px order number display
- ✅ Zustand cart store with localStorage persistence
- ✅ Idle timer with 2-minute auto-reset
- ✅ Fully responsive design (mobile-first, works on all screen sizes)
- ✅ Premium UI: Flat borders, 48px+ touch targets, bold typography

**Next Steps** (Backend Integration):
- ⏳ Server Action for order submission (`createOrder()`)
- ⏳ Server Action for promo code validation (`validatePromoCode()`)
- ⏳ Item detail sheet with addon selection
- ⏳ PayMongo payment integration
- ⏳ Real-time order status updates

**Documentation**:
- `KIOSK-UI-IMPLEMENTATION.md` — Complete frontend implementation details
- `KIOSK-VISUAL-GUIDE.md` — Design system reference (colors, typography, spacing)
- `MENU-UI-IMPROVEMENTS.md` — Latest UI enhancements (flat borders, responsive design)

---

## Quick Reference

### User Flow
```
Welcome → Menu Browse → Item Detail → Add to Cart → Cart Review → Checkout → Confirmation
   │                        │              │            │            │
   │                        ▼              ▼            ▼            ▼
   │                   Addon Select   Qty Adjust    Order Type   Payment
   │                   Allergen View  Remove Item   Promo Code   Phone Input
   └─────────── Idle Timer (2min) → Auto Reset ←─────────────────────┘
```

### Key Components
| Component | Purpose | Touch Target |
|-----------|---------|--------------|
| `menu-item-card.tsx` | Display menu item | 48px+ |
| `item-detail-sheet.tsx` | Customization | Full screen |
| `cart-drawer.tsx` | Cart summary | Side panel |
| `order-type-selector.tsx` | Dine-in/Room/Takeout | Large cards |
| `promo-code-input.tsx` | Discount codes | Input + button |
| `idle-timer.tsx` | Auto-reset | Hidden |

### State Management
| Store | Purpose |
|-------|---------|
| `cart-store.ts` | Cart items, totals, promo code |
| `kiosk-ui-store.ts` | Current screen, selected category |

---

## Mission

You are responsible for the guest-facing kiosk experience. Your goal is to create
a touch-optimized, visually appealing ordering interface that guides hotel guests
from browsing the menu to placing an order in under 3 minutes, with support for
promo codes, allergen warnings, and guest phone collection.

---

## Owned Files

```
src/app/(kiosk)/
├── layout.tsx              # Fullscreen layout, idle timer, no navigation
├── page.tsx                # Welcome / splash screen with "Start Order" CTA
├── menu/page.tsx           # Category grid → item list → item detail
├── cart/page.tsx           # Cart review, order type selector, special instructions
├── checkout/page.tsx       # Payment method selection + promo code + phone + digital payment flow
└── confirmation/page.tsx   # Order number display + estimated wait time

src/components/kiosk/
├── menu-grid.tsx           # Category cards in responsive grid
├── menu-item-card.tsx      # Item card: image, name, price, allergen icons, "Add" button
├── item-detail-sheet.tsx   # Bottom sheet: full description, addon groups, quantity, allergens, nutrition
├── addon-selector.tsx      # Checkbox/radio group for addons
├── allergen-badge.tsx      # NEW: Icon badge for allergen warnings
├── nutrition-info.tsx      # NEW: Optional nutrition facts display
├── language-toggle.tsx     # NEW: Switch between English/Tagalog
├── cart-drawer.tsx         # Slide-out cart panel
├── cart-item.tsx           # Cart line: name, qty controls, addons, price
├── promo-code-input.tsx    # NEW: Promo code entry + validation
├── phone-input.tsx         # NEW: Optional guest phone number collection
├── order-type-selector.tsx # Dine-in / Room Service / Takeout cards
├── payment-method-selector.tsx  # Cash / GCash / Card / Pay After Meal option cards
├── order-number-display.tsx     # Large animated order number
├── order-expiration-timer.tsx   # NEW: 15-minute countdown for unpaid orders
├── idle-timer.tsx          # Resets to welcome after 2min inactivity
└── numpad.tsx              # On-screen numpad for table/room number

src/stores/cart-store.ts    # Zustand cart state (ENHANCED)
src/stores/kiosk-ui-store.ts
src/hooks/use-idle-timer.ts
src/hooks/use-order-events.ts  # NEW: Track analytics events
```

---

## UI/UX Requirements

### Touch Optimization
- All interactive elements minimum 48px × 48px (✅ **implemented: 48-60px**)
- Category buttons: **60px height** with flat borders (✅ **implemented**)
- Menu card buttons: **48px** with shadow effects (✅ **implemented**)
- Use bottom sheets instead of modals (easier thumb reach)
- Large, clear typography: category names 16px bold, item names 16px bold, prices 20px (✅ **implemented**)
- Generous spacing between tap targets (16-24px gaps) (✅ **implemented**)
- No hover states (touch only) — use active/pressed states (✅ **implemented**)
- **Flat rectangular borders** on category buttons for modern, clean look (✅ **implemented**)

### Screen Flow (ENHANCED)
```
Welcome → Menu → Item Detail → Cart → Order Type → Promo Code → Phone → Checkout → Confirmation
  ↑                   ↓                                                              │
  └──────────────────────────────────────────────────────────────────────────────────┘
                          (auto-reset after timeout or completion)
```

### Visual Design
- Light theme with high contrast for readability in bright hotel lobbies (✅ **implemented**)
- Food photography as hero elements (large item images) (✅ **implemented with placeholders**)
- Prominent floating cart button with item count badge (✅ **implemented**)
- Animated transitions between pages (staggered entrance animations) (✅ **implemented**)
- Philippine Peso (₱) formatting throughout (✅ **implemented**)
- Allergen icons (dairy, nuts, gluten, shellfish, eggs, soy, etc.) (✅ **implemented**)
- Multi-language support toggle (EN/TL) (✅ **implemented in layout**)
- **Responsive design**: Mobile-first, 1→2→3→4→5 column grid (✅ **implemented**)
- **Flat borders**: Category buttons use `rounded-none` for modern aesthetic (✅ **implemented**)
- **Generous spacing**: 20px card padding, 24px grid gaps (✅ **implemented**)
- **Bold typography**: font-bold throughout for better readability (✅ **implemented**)

### Idle Timer Behavior
1. After 60s of no interaction → show "Are you still there?" overlay
2. After additional 30s → reset to welcome screen
3. Clear cart, order type, promo code, phone, and all selections on reset
4. Any touch resets the idle timer

---

## Data Fetching Strategy

### Menu Data (ENHANCED)
```typescript
// Server Component: fetch categories + items on page load
// This runs on the server, close to the database
async function MenuPage() {
  const supabase = createServerClient();
  const { data: categories } = await supabase
    .from('categories')
    .select(`
      *,
      menu_items(
        *,
        addon_groups(*, addon_options(*)),
        menu_item_stations(kitchen_stations(*))
      )
    `)
    .eq('is_active', true)
    .eq('menu_items.is_available', true)
    .is('menu_items.deleted_at', null)  // NEW: Filter soft-deleted items
    .order('display_order');

  return <MenuGrid categories={categories} />;
}
```

### Cart State (Zustand - ENHANCED)
```typescript
interface CartItem {
  menuItemId: string;
  name: string;
  basePrice: number;
  quantity: number;
  addons: { id: string; name: string; price: number }[];
  specialInstructions?: string;
  allergens?: string[];      // NEW: Allergen warnings
  totalPrice: number;        // (basePrice + sum(addon prices)) * quantity
}

interface CartStore {
  items: CartItem[];
  orderType: 'dine_in' | 'room_service' | 'takeout' | null;
  tableNumber: string | null;
  roomNumber: string | null;
  specialInstructions: string;

  // NEW in PRD v1.1:
  promoCode: string | null;
  promoCodeId: string | null;
  discountAmount: number;
  guestPhone: string | null;    // Optional for order history
  expiresAt: Date | null;       // 15-minute timeout for unpaid orders

  // Actions
  addItem: (item: CartItem) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, qty: number) => void;
  setOrderType: (type: OrderType) => void;
  applyPromoCode: (code: string, discount: number, promoId: string) => void;
  removePromoCode: () => void;
  setGuestPhone: (phone: string) => void;
  clearCart: () => void;

  // Computed
  subtotal: number;
  taxAmount: number;
  serviceCharge: number;
  total: number;
}
```

### Promo Code Validation (NEW)
```typescript
'use server'
async function validatePromoCode(code: string, subtotal: number) {
  const supabase = await createServerClient();

  const { data: promo } = await supabase
    .from('promo_codes')
    .select('*')
    .ilike('code', code)
    .eq('is_active', true)
    .single();

  if (!promo) throw new Error('Invalid promo code');

  // Validation checks
  const now = new Date();
  if (now < new Date(promo.valid_from) || now > new Date(promo.valid_until)) {
    throw new Error('Promo code expired or not yet valid');
  }

  if (promo.max_usage_count && promo.current_usage_count >= promo.max_usage_count) {
    throw new Error('Promo code usage limit reached');
  }

  if (promo.min_order_amount && subtotal < promo.min_order_amount) {
    throw new Error(`Minimum order amount is ₱${promo.min_order_amount.toFixed(2)}`);
  }

  // Calculate discount
  const discountAmount = promo.discount_type === 'percentage'
    ? (subtotal * promo.discount_value / 100)
    : promo.discount_value;

  return { promo, discountAmount };
}
```

### Order Submission (Server Action - ENHANCED)
```typescript
'use server'
async function createOrder(cart: CartStore): Promise<OrderConfirmation> {
  // 1. Validate with Zod
  const validated = orderSchema.parse(cart);

  // 2. Re-verify prices server-side (prevent tampering)
  const menuItems = await supabase
    .from('menu_items')
    .select('id, base_price, addon_groups(addon_options(id, additional_price))')
    .in('id', cart.items.map(item => item.menuItemId));

  // Recalculate total server-side
  const calculatedSubtotal = cart.items.reduce((sum, cartItem) => {
    const menuItem = menuItems.find(m => m.id === cartItem.menuItemId);
    const itemTotal = menuItem.base_price * cartItem.quantity;
    const addonsTotal = cartItem.addons.reduce((addonSum, addon) => {
      const addonPrice = menuItem.addon_groups
        .flatMap(g => g.addon_options)
        .find(opt => opt.id === addon.id)?.additional_price || 0;
      return addonSum + addonPrice;
    }, 0);
    return sum + itemTotal + addonsTotal;
  }, 0);

  // 3. Re-validate promo code server-side
  let discountAmount = 0;
  let promoCodeId = null;
  if (cart.promoCode) {
    const { promo, discountAmount: discount } = await validatePromoCode(
      cart.promoCode,
      calculatedSubtotal
    );
    discountAmount = discount;
    promoCodeId = promo.id;
  }

  // 4. Calculate final amounts
  const discountedSubtotal = calculatedSubtotal - discountAmount;
  const taxAmount = discountedSubtotal * 0.12;  // 12% VAT on discounted amount
  const serviceCharge = discountedSubtotal * 0.10; // 10% service charge
  const totalAmount = discountedSubtotal + taxAmount + serviceCharge;

  // 5. Generate order number (via DB sequence)
  // 6. Set expires_at (15 minutes from now if payment_method is cash)
  // Bill Later orders don't expire — guests pay after eating
  const expiresAt = cart.paymentMethod === 'cash'
    ? new Date(Date.now() + 15 * 60 * 1000)
    : null; // null for gcash, card, and bill_later

  // 7. Insert order + items + addons in a transaction
  const { data: order } = await supabase
    .from('orders')
    .insert({
      order_type: cart.orderType,
      table_number: cart.tableNumber,
      room_number: cart.roomNumber,
      subtotal: calculatedSubtotal,
      promo_code_id: promoCodeId,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      service_charge: serviceCharge,
      total_amount: totalAmount,
      special_instructions: cart.specialInstructions,
      guest_phone: cart.guestPhone,
      expires_at: expiresAt,
      payment_method: cart.paymentMethod,
      payment_status: cart.paymentMethod === 'bill_later' ? 'unpaid'
        : cart.paymentMethod === 'cash' ? 'unpaid' : 'processing',
      status: cart.paymentMethod === 'bill_later' ? 'paid'  // Goes to kitchen immediately
        : cart.paymentMethod === 'cash' ? 'pending_payment' : 'paid',
    })
    .select()
    .single();

  // 8. Track analytics event
  await supabase.from('order_events').insert({
    order_id: order.id,
    event_type: 'order_submitted',
    metadata: {
      order_type: cart.orderType,
      item_count: cart.items.length,
      used_promo: !!cart.promoCode,
    }
  });

  // 9. If digital payment → create PayMongo session
  let paymentUrl = null;
  if (cart.paymentMethod !== 'cash') {
    paymentUrl = await createPayMongoPayment(order.id, totalAmount, cart.paymentMethod);
  }

  return {
    orderNumber: order.order_number,
    estimatedWait: 15, // minutes
    expiresAt: expiresAt,
    paymentUrl,
  };
}
```

---

## Allergen Warnings (NEW)

### Display Allergen Icons
```typescript
const ALLERGEN_ICONS = {
  dairy: '🥛',
  nuts: '🥜',
  gluten: '🌾',
  shellfish: '🦐',
  eggs: '🥚',
  soy: '🫘',
  fish: '🐟',
  sesame: '🫙',
};

// In menu item card
<div className="flex gap-1 mt-2">
  {item.allergens?.map(allergen => (
    <AllergenBadge key={allergen} type={allergen} />
  ))}
</div>
```

### Item Detail Allergen Section
```typescript
// In item detail sheet
{item.allergens && item.allergens.length > 0 && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
    <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Allergen Warning</h3>
    <p className="text-sm text-yellow-800">
      Contains: {item.allergens.join(', ')}
    </p>
  </div>
)}
```

---

## Nutritional Information (NEW)

### Optional Nutrition Display
```typescript
// In item detail sheet (expandable section)
{item.nutritional_info && (
  <details className="mt-4">
    <summary className="cursor-pointer font-medium">Nutrition Facts</summary>
    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
      {item.nutritional_info.calories && (
        <div>Calories: {item.nutritional_info.calories}</div>
      )}
      {item.nutritional_info.protein && (
        <div>Protein: {item.nutritional_info.protein}g</div>
      )}
      {item.nutritional_info.carbs && (
        <div>Carbs: {item.nutritional_info.carbs}g</div>
      )}
      {item.nutritional_info.fat && (
        <div>Fat: {item.nutritional_info.fat}g</div>
      )}
    </div>
  </details>
)}
```

---

## Multi-Language Support (NEW)

### Language Toggle
```typescript
const [language, setLanguage] = useState<'en' | 'tl'>('en');

// In menu item display
const displayName = language === 'tl' && item.translations?.tl?.name
  ? item.translations.tl.name
  : item.name;

const displayDescription = language === 'tl' && item.translations?.tl?.description
  ? item.translations.tl.description
  : item.description;
```

---

## Order Expiration Handling (NEW)

### Expiration Timer Component
```typescript
'use client'
function OrderExpirationTimer({ expiresAt }: { expiresAt: Date }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      setTimeLeft(remaining);

      if (remaining === 0) {
        // Order expired
        alert('Order expired. Please place a new order.');
        clearCart();
        router.push('/');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <p className="text-red-800 font-medium">
        ⏱ Please pay within: {minutes}:{seconds.toString().padStart(2, '0')}
      </p>
    </div>
  );
}
```

---

## Analytics Event Tracking (NEW)

### Track Order Events
```typescript
async function trackOrderEvent(eventType: string, metadata?: any) {
  await supabase.from('order_events').insert({
    order_id: currentOrderId,
    event_type: eventType,
    metadata: metadata || {},
  });
}

// Usage throughout the flow:
trackOrderEvent('cart_started');
trackOrderEvent('item_added', { menu_item_id: itemId, quantity: qty });
trackOrderEvent('checkout_initiated', { order_type: type });
trackOrderEvent('payment_started', { method: paymentMethod });
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

7. **Promo Code UX**:
   - Apply promo code before showing final total
   - Show discount amount clearly (₱XX off)
   - Allow removal of promo code
   - Real-time validation with error messages

8. **Phone Number Collection**:
   - Optional field (for order history)
   - Format: Philippine mobile format (+63 XXX XXX XXXX)
   - Store without country code prefix

9. **Order Expiration**:
   - Display countdown timer for unpaid orders
   - Show warning at 5 minutes remaining
   - Auto-redirect to home on expiration
   - Server-side cron job cancels expired orders

---

## Dependencies

- `zustand` — Cart and UI state
- `zustand/middleware` — Persist middleware
- `framer-motion` or CSS transitions — Page animations
- `@supabase/ssr` — Server-side Supabase client
- `zod` — Cart and promo code validation
- `libphonenumber-js` — Phone number formatting (NEW)
- shadcn/ui: Sheet, Button, Card, Badge, Dialog, Toast, Input, Textarea

---

## Troubleshooting

### Common Kiosk Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Cart lost on refresh | Zustand persist not working | Check localStorage, verify persist middleware |
| Menu items not loading | RLS blocking anonymous | Ensure `is_available = true` policy exists |
| Images not displaying | Wrong Supabase Storage URL | Verify bucket is public, URL is correct |
| Touch targets too small | CSS sizing issues | Ensure `min-h-12 min-w-12` on buttons |
| Idle timer not resetting | Event listeners missing | Check touch/mouse event handlers |
| Promo code not applying | Validation failing | Check promo code expiry and usage limits |

### Testing Checklist

- [ ] Menu categories display correctly
- [ ] Menu items show images, prices, allergen icons
- [ ] Add to cart works (single and with addons)
- [ ] Cart quantity +/- works
- [ ] Remove from cart works
- [ ] Cart total calculates correctly (with tax, service charge)
- [ ] Promo code applies and shows discount
- [ ] Order type selection works
- [ ] Payment method selection works
- [ ] Order submission succeeds
- [ ] Order number displays prominently
- [ ] Idle timer resets cart after 2 minutes
- [ ] Mobile/tablet touch interactions work

---

## Version History

### Version 2.3 (February 10, 2026)
**Changes**:
- Added "Pay After Meal" (bill_later) as payment option for dine-in orders
- Updated payment-method-selector.tsx description to include bill_later
- Updated order creation code example to handle bill_later flow
- Updated version references to PRD v1.4 and Architecture v2.5

### Version 2.2 (February 7, 2026)
**Changes**:
- Updated all version references to PRD v1.3 and Architecture v2.3

### Version 2.1 (February 2026)
**Changes**:
- Added Quick Reference section with user flow diagram
- Added Troubleshooting section with testing checklist
- Updated version references to PRD v1.2

### Version 2.0 (February 5, 2026)
**Status**: Updated for PRD v1.1 and Architecture v2.0 alignment

**Major Updates**:
- Added promo code entry and validation flow
- Added order expiration (15-minute timeout) handling
- Added allergen warnings display
- Added nutritional info display
- Added multi-language support (EN/TL)
- Added guest phone number collection
- Added order events tracking for analytics
- Updated cart store with new fields
- Added soft delete filtering in menu queries
- Added libphonenumber-js dependency

### Version 1.0 (February 2, 2026)
- Initial kiosk module specification

---

## Related Documents

- **[PRD.md](../prd/PRD.md)** — Product Requirements Document v1.4
- **[ARCHITECTURE.md](../architecture/ARCHITECTURE.md)** — System Architecture v2.5
- **[AGENT-DATABASE.md](./AGENT-DATABASE.md)** — Database schema v2.4
