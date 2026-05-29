# CLAUDE.md

> **Version**: 3.0 | **Last Updated**: May 28, 2026 | **Status**: Phases 1–4 Complete

This file provides guidance to Claude Code when working with this repository.

---

# Compact mode
When using compact, focus on test output and code changes.

## Commands

```bash
npm run dev              # Start dev server (port 3000, Turbopack)
npm run build            # Production build + type check
npm run lint             # ESLint
npm run type-check       # TypeScript only (tsc --noEmit)
npm run supabase:push    # Apply migrations (use this, NOT reset)
npm run supabase:types   # Regenerate DB types after schema changes
npm run supabase:reset   # ⚠️ WIPES ALL DATA — dev only
```

**Use `npm`** (not pnpm/yarn) — project uses `package-lock.json`.

---

## Project Overview

Arena Blanca Resort — hotel restaurant ordering system with 5 isolated interfaces in a single Next.js 16 (App Router) app. Backend: Supabase (Postgres + Auth + Realtime).

| Module | Route | Auth | Purpose |
|--------|-------|------|---------|
| Kiosk | `/(kiosk)` | Public | Guest self-service ordering |
| Kitchen | `/(kitchen)` | Staff (kitchen) | Real-time Kitchen Display System |
| Waiter | `/(waiter)` | Staff (waiter) | Item-level service tracking |
| Cashier | `/(cashier)` | Staff (cashier) | Payment processing & POS |
| Admin | `/admin` | Admin only | Menu, analytics, settings |

**What's implemented (Phases 1–4):** Full kiosk ordering, KDS, waiter item tracking, cashier POS with cash/GCash/card payments, BIR receipts, refunds, admin dashboard, promo codes, audit log, sales reports, allergen/nutrition display, multi-language (EN/TL), realtime dashboard.

**Phase 5 (pending):** Playwright E2E tests, load testing, security audit, Vercel production deployment.

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
| Kitchen (KDS) | `preparing`, `ready` | Mark Ready | Handle `served` |
| Waiter | `ready`, `preparing`, `served` | Mark Served | Handle preparation |
| Cashier | `pending_payment`, `unpaid` | Process payment | Handle service status |

---

## Architecture

### File Organization

```
src/app/
  (kiosk)/            → Guest ordering (public, route group)
    page.tsx           → Welcome screen
    menu/              → Category grid + item list
    cart/              → Cart review
    checkout/          → 4-step checkout
    confirmation/      → Order number + Add More Items
    add-items/         → Add items to existing dine-in order
  (kitchen)/          → KDS (staff, route group)
    orders/            → Real-time order queue
  (waiter)/           → Waiter service (staff, route group)
    service/           → Split-panel order queue with item tracking
  (cashier)/          → POS (staff, route group)
    payments/          → Main POS (pending queue + payment)
    recent/            → Recent Orders (split-panel, receipt access)
    reports/           → Shift summary / reconciliation
  admin/              → Admin (regular folder — needs /admin URL prefix)
    page.tsx           → Dashboard (realtime stats, charts)
    menu-management/
    users/
    order-history/
    promo-codes/
    reports/
    audit-log/
  login/ signup/ unauthorized/

src/components/
  ui/          → shadcn/ui primitives — do NOT edit directly
  kiosk/       → Kiosk-specific
  kitchen/     → KDS-specific
  waiter/      → Waiter-specific
  cashier/     → Cashier-specific
  admin/       → Admin-specific
  auth/        → login-form, signup-form
  shared/      → Cross-module shared components

src/services/        → Server Actions (ALL DB mutations go here)
  order-service.ts   → Order CRUD
  payment-service.ts → Cash, digital, refund, shift summary
  bir-service.ts     → BIR receipt generation
  menu-service.ts    → Menu CRUD
  analytics-service.ts → Reporting queries
  auth-service.ts    → Authentication
  user-service.ts    → User management
  promo-service.ts   → Promo code validation + CRUD

src/stores/
  cart-store.ts      → Cart state + localStorage persistence (Zustand)

src/hooks/
  use-realtime-orders.ts          → Kitchen realtime subscription
  use-realtime-waiter-orders.ts   → Waiter realtime (with item status)
  use-realtime-pending-orders.ts  → Cashier pending orders
  use-realtime-unpaid-bills.ts    → Cashier bill_later orders
  use-realtime-dashboard.ts       → Admin realtime dashboard

src/lib/
  supabase/
    client.ts   → createBrowserClient() — client components ONLY
    server.ts   → createServerClient() — Server Components + Server Actions
    admin.ts    → createAdminClient() — webhooks/admin scripts ONLY (service role)
    types.ts    → Auto-generated DB types
  validators/   → Zod schemas (auth, category, menu-item, order, promo-code, user)
  utils/
    cn.ts             → className merger
    currency.ts       → formatCurrency() — Philippine Peso
    item-status.ts    → Item status helpers
    rate-limiter.ts   → Rate limiting
  constants/
    order-status.ts   → Order status enums and maps
    item-status.ts    → Item status enum, labels, colors
    payment-methods.ts → Payment configs and quick amounts
    allergens.ts      → Allergen constants
    locales.ts        → i18n locale constants
  i18n/         → LocaleProvider + useLocale() hook, EN/TL dictionaries (kiosk-only)

src/types/      → TypeScript types (auth, dashboard, order)
supabase/migrations/ → Timestamped SQL files (35 migrations applied)
```

**Admin uses a regular folder** (not a route group) — needs the `/admin` URL prefix.

### Golden Rules

1. **Server Actions for all mutations.** Never call `.insert()`, `.update()`, `.delete()` from client components.
2. **Server Components by default.** Add `'use client'` only at the leaf level.
3. **Supabase client discipline:**
   - `createBrowserClient()` → browser/client components
   - `createServerClient()` → Server Components + Server Actions
   - `createAdminClient()` → webhooks/admin scripts ONLY — **NEVER in a client component**
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
- Use `cn()` from `src/lib/utils/cn.ts` for conditional classes. No inline styles.
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
| E3xxx | Payments |
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

## Order Lifecycle

```
Kiosk → "Pay at Counter" → pending_payment (15 min timeout) → Cashier pays → paid → Kitchen
Kiosk → GCash/Card      → PayMongo webhook → paid → Kitchen
Kiosk → "Bill Later"    → paid (bill_later) → Kitchen → Cashier settles later

paid → preparing (kitchen) → ready (kitchen done) → served (waiter)
```

**Valid transitions**: `pending_payment` → `paid` | `cancelled` · `paid` → `preparing` · `preparing` → `ready` · `ready` → `served`

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

**Supabase is REMOTE** for this project: `https://ucoipcmzmdazqxvceyux.supabase.co`. Not local.

**Browser client key**: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (not `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

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
