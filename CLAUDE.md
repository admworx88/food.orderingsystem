# CLAUDE.md

> **Version**: 4.0 | **Last Updated**: Jun 16, 2026 | **Status**: Phases 1–4 + Collections/Shifts Complete

This file provides guidance to Claude Code when working with this repository.

---

# Compact mode
When using compact, focus on test output and code changes.

## Commands

```bash
npm run dev              # Start dev server (port 3000)
npm run build            # Production build + type check
npm run lint             # ESLint
npm run type-check       # TypeScript only (tsc --noEmit)
npm run supabase:push    # Apply migrations (use this, NOT reset)
npm run supabase:types   # Regenerate DB types — requires local Supabase running (see note)
npm run supabase:reset   # ⚠️ WIPES ALL DATA — dev only
```

**Use `npm`** (not pnpm/yarn) — project uses `package-lock.json`.

> **`supabase:types` note**: The script uses `--local`, so it requires a running local Supabase instance. For this remote-first project (`https://ucoipcmzmdazqxvceyux.supabase.co`), you may need to run `npx supabase gen types typescript --project-ref ucoipcmzmdazqxvceyux > src/lib/supabase/types.ts` instead if the local stack is not running.

---

## Project Overview

Arena Blanca Resort — hotel restaurant ordering system with 5 isolated interfaces in a single Next.js 16 (App Router) app. Backend: Supabase (Postgres + Auth + Realtime).

| Module | Route | Auth | Purpose |
|--------|-------|------|---------|
| Kiosk | `/(kiosk)` | Public | Ordering UI shared by guests, cashiers, and waiters |
| Kitchen | `/(kitchen)` | Staff (kitchen) | Real-time Kitchen Display System |
| Waiter | `/(waiter)` | Staff (waiter) | Item-level service tracking |
| Cashier | `/(cashier)` | Staff (cashier) | Payment processing, POS, shift collections |
| Admin | `/admin` | Admin only | Menu, analytics, settings |

**Kiosk is the shared ordering UI.** Guests order anonymously. Cashiers and waiters sign in via staff PIN (top-right "Staff Sign-in" button on welcome screen) to take walk-in orders on behalf of guests. Kitchen staff who sign in are auto-redirected to `/orders`.

**What's implemented (Phases 1–4 + Collections):** Full kiosk ordering (restaurant + ocean view), KDS with availability toggling, waiter item tracking, cashier POS with cash/GCash/card payments, BIR receipts, refunds, shift lifecycle with remittance export, admin dashboard, promo codes, audit log, sales reports, allergen/nutrition display, multi-language (EN/TL), realtime dashboard, network offline detection.

**Sub-projects at repo root (separate codebases):**
- `desktop/` — Electron 36 desktop app (Windows/Mac wrapper)
- `mobile/` — Capacitor 7 Android app

**Phase 5 (pending):** Playwright E2E tests, load testing, security audit.

Before working on a module, read the agent doc first:

| Module | Agent doc |
|--------|-----------|
| Kiosk | `docs/agents/AGENT-KIOSK.md` |
| Kitchen | `docs/agents/AGENT-KITCHEN.md` |
| Waiter | `docs/agents/AGENT-WAITER.md` |
| Cashier | `docs/agents/AGENT-CASHIER.md` |
| Admin | `docs/agents/AGENT-ADMIN.md` |
| Database / RLS / migrations | `docs/agents/AGENT-DATABASE.md` |
| PayMongo / webhooks / refunds | `docs/agents/AGENT-PAYMENTS.md` |

---

## Critical Rules

### 1. Preserve Existing Functionality
Never break working features. Before modifying any file, understand what depends on it. Flag ripple effects — don't silently modify.

### 2. No Surprise Dependencies
Do NOT install new packages unless nothing in the existing stack handles it. Check shadcn/ui, Supabase built-ins, and `src/lib/utils/` first. If you need a new package, state why before installing.

### 3. Think Like a System Designer
Every feature must account for:
- **Logging**: `console.error` for failures, structured logs for payment flows
- **Security**: Validate inputs, check auth/roles, re-fetch prices server-side
- **Error handling**: try/catch DB ops, return meaningful errors, show toasts — never fail silently
- **Edge cases**: Empty cart, duplicate payments, stale prices, network drops, concurrent orders
- **Performance**: Avoid N+1 queries — use Supabase `.select()` joins, not multiple round-trips

### 4. Database — CRITICAL
**NEVER run `supabase db reset` or `npm run supabase:reset` unless explicitly asked.** These WIPE ALL DATA.
- ✅ Apply migrations: `npm run supabase:push`
- ✅ Schema changes: create a new migration file
- ❌ Never drop tables or truncate without explicit approval

After any schema change: `npm run supabase:types`.

### 5. UI/UX — Match the Exact Pattern
Match the EXACT interaction pattern the user describes. These are NOT interchangeable:
- **Expandable card**: expands in-place
- **Split-panel/Master-detail**: grid collapses to sidebar, detail slides in
- **Bottom sheet**: modal slides up from bottom

If ANY ambiguity, describe the interaction back in one sentence before writing code.

### 6. Module Boundaries

| Module | Shows | Actions | Never |
|--------|-------|---------|-------|
| Kitchen (KDS) | `preparing`, `ready` | Mark Ready, toggle item availability | Handle `served` |
| Waiter | `ready`, `preparing`, `served` | Mark Served | Handle preparation |
| Cashier | `pending_payment`, `unpaid` | Process payment, shift collections | Handle service status |

---

## Architecture

### File Organization

```
src/app/
  (kiosk)/            → Guest ordering (public, route group)
    page.tsx           → Welcome screen
    order-type/        → Dine-in / Takeaway / Bill Later selection
    ocean-view/        → Ocean View order type entry (identifier dialog)
    menu/              → Category grid + item list
    cart/              → Cart review
    checkout/          → Multi-step checkout (single page, UI states)
    confirmation/      → Order number + Add More Items
    add-items/         → Add items to existing dine-in order
      [orderId]/       → Menu browser for a specific order
  (kitchen)/          → KDS (staff, route group)
    orders/            → Real-time order queue
  (waiter)/           → Waiter service (staff, route group)
    service/           → Split-panel order queue with item tracking
  (cashier)/          → POS (staff, route group)
    payments/          → Main POS (pending queue + payment)
    recent/            → Recent Orders (split-panel, receipt access)
    collections/       → Shift lifecycle: start → payments → deductions → submit
  admin/              → Admin (regular folder — needs /admin URL prefix)
    page.tsx           → Dashboard (realtime stats, charts)
    menu-management/
    users/
    order-history/
    promo-codes/
    reports/
    audit-log/
    settings/          → Tax rates, service charge, BIR config, kiosk PIN
  login/
  signup/
  forgot-password/     → Password recovery request
  reset-password/      → Password reset (token from email)
  unauthorized/

src/components/
  ui/          → shadcn/ui primitives — do NOT edit directly
  kiosk/       → Kiosk-specific
  kitchen/     → KDS-specific
  waiter/      → Waiter-specific
  cashier/     → Cashier-specific
  admin/       → Admin-specific
  auth/        → login-form, signup-form, forgot-password-form, reset-password-form
  shared/      → Cross-module shared components (burger-loader, network-offline-dialog, fullscreen-toggle)

src/services/        → Server Actions (ALL DB mutations go here)
  order-service.ts   → Order CRUD
  payment-service.ts → Cash, digital, refund, shift lifecycle, deductions
  bir-service.ts     → BIR receipt generation
  menu-service.ts    → Menu CRUD
  analytics-service.ts → Reporting queries
  auth-service.ts    → Authentication
  user-service.ts    → User management, staff PIN resolution, kiosk sessions
  promo-service.ts   → Promo code validation + CRUD
  settings-service.ts → Tax/service charge rates, BIR config, kiosk PIN management

src/stores/
  cart-store.ts           → Cart state + localStorage persistence (Zustand)
  staff-session-store.ts  → Active staff session on kiosk (name, role, id → takenBy on orders)

src/hooks/
  use-realtime-orders.ts          → Kitchen realtime subscription
  use-realtime-waiter-orders.ts   → Waiter realtime (with item status)
  use-realtime-pending-orders.ts  → Cashier pending orders
  use-realtime-unpaid-bills.ts    → Cashier bill_later orders
  use-realtime-dashboard.ts       → Admin realtime dashboard
  use-realtime-reconnection.ts    → Shared exponential-backoff reconnection utility
  use-elapsed-timer.ts            → KDS elapsed time tracker per order
  use-kiosk-location.ts           → localStorage kiosk location ('restaurant' | 'ocean_view')
  use-network-status.ts           → Real connectivity check via HEAD ping to /arenalogo.png

src/lib/
  supabase/
    client.ts   → createBrowserClient() — client components ONLY
    server.ts   → createServerClient() — Server Components + Server Actions
    admin.ts    → createAdminClient() — service role; used for webhooks, admin scripts,
                  AND shift/deduction operations called from kiosk (no Supabase auth session)
    types.ts    → Auto-generated DB types
  validators/   → Zod schemas (auth, category, menu-item, order, payment, promo-code, user)
  utils/
    cn.ts             → className merger (import from '@/lib/utils' barrel — most code uses this)
    currency.ts       → formatCurrency() — Philippine Peso
    image.ts          → normalizeImageUrl(), getOptimizedImageUrl()
    item-status.ts    → Item status helpers
    rate-limiter.ts   → Rate limiting
  constants/
    order-status.ts   → Order status enums and maps
    order-types.ts    → Order type configs, getAllowedPaymentMethods(), formatOrderType()
    item-status.ts    → Item status enum, labels, colors
    payment-methods.ts → Payment configs and quick amounts
    allergens.ts      → Allergen constants
    locales.ts        → i18n locale constants
  exports/            → Client-side remittance export utilities (lazy-imported)
    remittance-types.ts → RemittanceData interface
    remittance-pdf.ts   → generateRemittancePDF() via jsPDF + jspdf-autotable
    remittance-xlsx.ts  → generateRemittanceXLSX() via xlsx (3-sheet workbook)
    download.ts         → downloadBlob() helper
  i18n/         → LocaleProvider + useLocale() hook, EN/TL dictionaries (kiosk-only)

src/types/      → TypeScript types (auth, dashboard, order, payment)
  payment.ts    → Shift, ShiftDeduction, ShiftPaymentRow, ShiftTotals, ShiftDetails,
                  CashierOrder, RecentOrder, BIRReceiptData, ShiftSummary

supabase/migrations/ → Timestamped SQL files (63 migrations as of Jun 2026)
```

**Admin uses a regular folder** (not a route group) — needs the `/admin` URL prefix.

### Golden Rules

1. **Server Actions for all mutations.** Never call `.insert()`, `.update()`, `.delete()` from client components.
2. **Server Components by default.** Add `'use client'` only at the leaf level.
3. **Supabase client discipline:**
   - `createBrowserClient()` → browser/client components
   - `createServerClient()` → Server Components + Server Actions
   - `createAdminClient()` → service role; required for: webhooks, admin scripts, and **kiosk-originated shift/deduction operations** where no Supabase auth session exists
4. **Validate on both sides.** Zod schemas used on client for UX AND re-validated in Server Actions. Never trust client-submitted prices — re-fetch from DB.
5. **Route groups are boundaries.** `src/components/kiosk/` must NOT import from `src/components/admin/`. Shared code goes in `src/components/shared/`.
6. **Realtime on `orders` and `order_items` only.** Don't add realtime to other tables without discussing performance implications.

### Component Design
- Single responsibility — if >150 lines, split it
- Extract reusable logic into `src/hooks/`, reusable UI into `src/components/shared/`
- Components render; services mutate — never mix DB writes into components
- Image uploads: Supabase Storage via Server Actions — never base64 in DB

---

## Code Style

### TypeScript
- Strict mode ON. No `any`, no `@ts-ignore`.
- `interface` for object shapes, `type` for unions/intersections.
- Always type function params and return values.

### React / Next.js 16
- Named exports for components (`export function MenuGrid()`), except `page.tsx`/`layout.tsx` (Next.js requires default).
- Props interfaces named `{ComponentName}Props`, defined above the component.
- Use `cn()` from `@/lib/utils` (barrel) for conditional classes. Import path is `@/lib/utils`, not `@/lib/utils/cn`.
- **`params` and `searchParams` are async** — always `await` them:
  ```typescript
  export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
  }
  ```
- Next.js 16 caching is **opt-in** — fetches are dynamic by default. Use `use cache` where needed.

### Naming
- Files: `kebab-case.tsx` (components), `kebab-case.ts` (utilities)
- Components: `PascalCase`
- Hooks: `use-kebab-case.ts` → `useKebabCase()`
- Stores: `kebab-case-store.ts` → `useKebabCaseStore()`
- DB migrations: `YYYYMMDDHHMMSS_description.sql` — never rename existing ones

### Tailwind CSS (v4 — CSS-first)
- **No `tailwind.config.js`** — all config in `src/app/globals.css` via `@theme {}`
- Use `@import "tailwindcss"` (not the old `@tailwind` directives)
- PostCSS plugin: `@tailwindcss/postcss` (not `tailwindcss`)
- **Do NOT indent CSS rules in `globals.css`** — Tailwind v4 breaks silently on indentation

**Kiosk:** 48px min touch targets (`min-h-12`), body text ≥ 18px, headings ≥ 24px.
**Kitchen:** Dark theme only, details ≥ 20px, order numbers ≥ 28px.

### Currency
- Format: `₱1,234.56` via `formatCurrency()` from `src/lib/utils/currency.ts`
- Store as `DECIMAL(10,2)` — never floats
- PayMongo: centavos (`Math.round(total * 100)`)

---

## Supabase Patterns

### Querying (Server Components)
```typescript
import { createServerClient } from '@/lib/supabase/server';

export default async function MenuPage() {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('menu_items')
    .select('*, category:categories(*), addon_groups(*, addon_options(*))')
    .eq('is_available', true)
    .order('display_order');
}
```

### Mutations (Server Actions)
```typescript
'use server'
import { createServerClient } from '@/lib/supabase/server';

export async function createMenuItem(input: MenuItemInput) {
  const supabase = await createServerClient();
  const { data, error } = await supabase.from('menu_items').insert(input).select().single();
  if (error) throw error;
  revalidatePath('/admin/menu-management');
  return data;
}
```

### Realtime (Client Components)
```typescript
'use client'
import { createBrowserClient } from '@/lib/supabase/client';

function useRealtimeOrders() {
  const supabase = createBrowserClient();
  useEffect(() => {
    const channel = supabase
      .channel('kitchen-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, handleChange)
      .subscribe();
    return () => { supabase.removeChannel(channel); }; // Always clean up
  }, []);
}
```

---

## Database Migration Rules

1. **Never edit existing migration files.** Create a new one.
2. **Naming**: `YYYYMMDDHHMMSS_description.sql`
3. **Include rollback SQL** in comments at the bottom.
4. **After schema changes**: `npm run supabase:types`
5. **RLS on every table**: Public data (menu items) → anon SELECT. Staff data → auth + role. Admin data → admin role only.

---

## Error Handling

### Server Actions — structured result pattern
```typescript
export async function createOrder(input: OrderInput) {
  try {
    const validated = orderSchema.parse(input);
    // ... do work
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: { code: 'E2001', message: 'Validation failed', details: error.flatten() } };
    }
    console.error('createOrder failed:', error);
    return { success: false, error: { code: 'E9001', message: 'Failed to create order' } };
  }
}
```

### Error Code System
| Range | Category |
|-------|----------|
| E1xxx | Authentication |
| E2xxx | Orders |
| E3xxx | Payments / Shifts (E3101 open shift exists, E3102 shift closed, E3110 no open shift) |
| E4xxx | Menu |
| E5xxx | Promo Codes |
| E9xxx | System |

### Client — toast feedback
```typescript
const result = await createOrder(cartData);
if (result.success) {
  toast.success('Order placed!');
  router.push(`/confirmation?order=${result.data.id}`);
} else {
  toast.error(result.error.message);
}
```

---

## Security Checklist

- [ ] No Supabase service-role key in client code
- [ ] Server Actions validate input with Zod before any DB operation
- [ ] Prices re-calculated server-side — never trust client totals
- [ ] PayMongo webhook signatures verified with HMAC
- [ ] RLS policies on every table
- [ ] Admin routes protected by middleware role check
- [ ] File uploads through Supabase Storage with size/type validation
- [ ] No raw SQL — use Supabase query builder or typed RPCs

---

## Staff Session (Kiosk)

The kiosk welcome screen has a **Staff Sign-in** button (top-right). Staff enter a 4–6 digit PIN resolved via `resolveStaffPin()` in `user-service.ts`. On success, their session is stored in `staffSessionStore` and their name shows as a chip. The session ID is passed as `takenBy` when `createOrder()` is called — this tracks which cashier or waiter placed the order.

Staff sessions are also persisted server-side in the `kiosk_active_sessions` DB table (migration `20260530000000`). `clearKioskSession()` in `user-service.ts` clears the DB record on sign-out, triggered by `StaffSignOutDialog`.

- **Cashier / Waiter**: session set → proceed through kiosk flow normally
- **Kitchen**: session set → auto-redirected to `/orders`
- **Guest** (no sign-in): `takenBy` is `null`

Components: `EmployeePinDialog` (sign-in), `StaffSignOutDialog` (PIN-verified sign-out), `KioskAdminOverlay` (5-tap logo → admin location change).

### Dual Identity — Important
Kiosk staff sessions use `profiles.id` (PIN-resolved UUID). Cashier interface uses `supabase.auth.getUser().id` (auth UUID). These may differ for accounts created before Auth was linked. All shift and deduction service functions accept an optional `overrideCashierId?: string` — when provided (kiosk context), they use `createAdminClient()` and bypass auth UID resolution.

---

## Order Lifecycle

```
Guest/Staff (kiosk) → "Pay at Counter" → pending_payment (15 min timeout) → Cashier pays → paid → Kitchen
Guest/Staff (kiosk) → eWallet/Card     → reference number entered → paid → Kitchen
Guest/Staff (kiosk) → "Bill Later"     → paid (bill_later) → Kitchen → Cashier settles later
Ocean View guests   → ocean_view order type → identifier (table # or name) → same flow above

paid → preparing (kitchen) → ready (kitchen done) → served (waiter)
```

**Valid transitions**: `pending_payment` → `paid` | `cancelled` · `paid` → `preparing` · `preparing` → `ready` · `ready` → `served`

**Order types**: `dine_in`, `takeaway`, `bill_later`, `ocean_view`

---

## Shift / Collections Lifecycle (Cashier)

The cashier's Collections tab (`/collections`) manages the end-of-shift remittance flow:

```
Start Shift  →  Process payments (Payments tab unlocked)
             →  Add/edit/delete deductions (petty cash, supplies)
             →  View Draft remittance → Export PDF / Export XLSX
             →  Submit Collections (one-shot — shift closes, read-only after)
             →  Sign-out blocked until shift submitted
```

**Key rules:**
- One open shift per cashier enforced by a partial unique index on `shifts(cashier_id) WHERE status='open'`
- Submit calls `submit_shift` RPC atomically (INSERT into `shift_collections` + UPDATE `shifts`)
- Closed shifts are read-only — deductions frozen, submit button disabled
- Net Cash to Remit = Cash − Refunds − Deductions (digital totals shown separately)
- Sign-out gate blocks if `hasOpenShift()` is true — redirects to `/collections`

**New tables**: `shifts`, `shift_deductions` (with `shift_id` FK); `shift_collections` augmented with `shift_id`, `deductions_total`, `net_cash`, `shift_started_at`, `shift_ended_at`.

**Export dependencies** (lazy-imported): `jspdf`, `jspdf-autotable`, `xlsx`

---

## Tax & Service Charge

```typescript
const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
const discountAmount = applyPromoDiscount(subtotal, promoCode); // BEFORE tax
const taxableAmount = subtotal - discountAmount;
const taxAmount = taxableAmount * settings.tax_rate;          // 12% VAT
const serviceCharge = taxableAmount * settings.service_charge; // 10%
const totalAmount = taxableAmount + taxAmount + serviceCharge;
```

All calculations server-side. Never trust client totals.

---

## Promo Code Validation

Enforce ALL of these in the Server Action:
1. Code exists and `is_active = true`
2. Current date between `valid_from` and `valid_until`
3. `current_usage_count < max_usage_count` (if limit set)
4. Subtotal ≥ `min_order_amount` (if set)
5. Compare codes case-insensitively (`.toUpperCase()`)
6. Discount capped at subtotal

Error codes: `E5001` invalid · `E5002` expired · `E5003` not yet active · `E5004` usage limit · `E5005` min order not met

---

## Module Ownership

Module-specific code NEVER imports from another module's directory.

| Directory | Cross-module import OK? |
|-----------|------------------------|
| `src/app/(kiosk|kitchen|waiter|cashier)/` | No |
| `src/app/admin/` | No |
| `src/components/{kiosk,kitchen,waiter,cashier,admin}/` | No |
| `src/components/shared/`, `src/components/ui/` | Yes |
| `src/services/`, `src/lib/`, `src/types/` | Yes |
| `src/stores/` | By feature scope |

---

## What NOT To Do

- **Don't create `tailwind.config.js`** — Tailwind v4 uses CSS-first config
- **Don't use `@tailwind` directives** — use `@import "tailwindcss"`
- **Don't use `tailwindcss` as PostCSS plugin** — use `@tailwindcss/postcss`
- **Don't create API routes for CRUD** — use Server Actions. API routes only for webhooks/external integrations
- **Don't use `useEffect` for data fetching** — fetch in Server Components or Server Actions
- **Don't put business logic in components** — services mutate, components render
- **Don't bypass TypeScript** — if the type system fights you, it's catching a real bug
- **Don't store sensitive data in localStorage** — cart (Zustand persist) is fine; auth/payment data never
- **Don't modify `src/components/ui/`** — wrap shadcn/ui components in module-specific ones
- **Don't `await` params synchronously** — Next.js 16: `const { id } = await params`
- **Don't run `supabase db reset`** in normal development — use `supabase:push`
- **Don't import `cn` from `@/lib/utils/cn`** — use `@/lib/utils` (the barrel export)
- **Don't touch `desktop/` or `mobile/`** unless explicitly working on those sub-projects — they are separate codebases with their own `package.json`

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `params is not a Promise` | Next.js 16 async params | `await params` |
| `Module not found: @/lib/...` | Path alias | Check `tsconfig.json`, ensure file exists |
| `relation "table" does not exist` | Missing migration | `npm run supabase:push` |
| `permission denied for table` | RLS blocking | Check `AGENT-DATABASE.md` for policies |
| `new row violates row-level security` | RLS rejection | Verify user role has required permissions |
| `Hydration mismatch` | Server/client HTML differs | Check for browser-only APIs |
| `ReferenceError: document is not defined` | Server component using client API | Add `'use client'` |
| Realtime `CHANNEL_ERROR: undefined` | HTTP 431 header too large | Set `max_header_length = 8192` in `supabase/config.toml` `[realtime]` |
| `supabase:types` produces wrong/empty types | Script uses `--local` but local stack not running | Run `npx supabase gen types typescript --project-ref ucoipcmzmdazqxvceyux > src/lib/supabase/types.ts` |
| `E3101` — open shift already exists | Cashier clicked Start Shift twice | DB partial-unique index prevents double-open; surface toast |
| `E3110` — no open shift | Payment attempted without starting shift | Redirect cashier to `/collections` → Start Shift |
| Collections shows empty payments | UUID mismatch (auth UID ≠ profiles.id) | Pass `overrideCashierId` (PIN UUID) from kiosk session; service uses `createAdminClient()` |

**Supabase is REMOTE** for this project: `https://ucoipcmzmdazqxvceyux.supabase.co`. Not local.

**Browser client key**: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (not `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

**Vercel env var**: Must be `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` — not `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (missing `_DEFAULT` causes 500 on production).

---

## Manual Testing Checklist

Before marking a feature complete:

- [ ] Happy path works end-to-end
- [ ] Error states display correctly (toast messages, inline errors)
- [ ] Loading states are visible
- [ ] Empty states handled
- [ ] Form validation works
- [ ] Mobile/touch responsiveness (especially kiosk — 48px min targets)
- [ ] Browser refresh doesn't break state
