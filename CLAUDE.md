# CLAUDE.md

> **Version**: 2.2 | **Last Updated**: February 7, 2026 | **Status**: Phase 1 + Kiosk UI Complete, Phase 2 In Progress

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Quick Reference

### Most-Used Commands
```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Production build with type checking
npm run lint         # Run ESLint
npm run type-check   # TypeScript validation only
npm run supabase:types  # Regenerate database types after schema changes
```

### Key File Locations
| Need to... | Go to... |
|------------|----------|
| Add a new page | `src/app/(module)/` |
| Create a component | `src/components/(module)/` |
| Add a Server Action | `src/services/` |
| Create a Zustand store | `src/stores/` |
| Add validation schema | `src/lib/validators/` |
| Add database migration | `supabase/migrations/` |
| Check implementation specs | `docs/agents/AGENT-*.md` |

### Emergency Contacts (Code Issues)
- **Build failing**: Check `npm run build` output, then `npm run type-check`
- **Database issues**: Check Supabase dashboard at http://localhost:54323
- **Auth not working**: Verify `.env.local` has correct Supabase keys

---

## Project Status: Phase 1 Complete + Kiosk UI Complete + Admin UI Refined ✅

**Phase 1 Foundation is COMPLETE.** The system now has:
- ✅ Full database schema with 22 migrations applied
- ✅ Authentication middleware with role-based routing
- ✅ All route group layouts (kiosk, kitchen, cashier, admin)
- ✅ Admin menu management with CRUD operations
- ✅ **Kiosk module fully functional** with cart, checkout, and confirmation
- ✅ **Premium UI with responsive design** (flat borders, generous spacing, 48px+ touch targets)
- ✅ **Admin UI refined with Executive Precision design** (slate + amber palette, professional polish)

### Before Working on New Features
1. **Read the specs first**: Check `docs/` directory for detailed requirements
   - `docs/prd/PRD.md` - Product requirements and features
   - `docs/architecture/ARCHITECTURE.md` - System architecture
   - `docs/agents/AGENT-*.md` - Module-specific implementation guides
2. **Check what exists**: Core foundation is built - refer to IMPLEMENTATION-NOTES.md
3. **Follow the implementation roadmap**: See "Current Setup Status" section below
4. **Preserve existing functionality**: Never break working features when adding new ones

---

## Project Overview

OrderFlow is a hotel restaurant ordering system with 4 isolated interfaces in
a single Next.js 16 (App Router) app. The backend will be Supabase (Postgres + Auth + Realtime).

| Module | Route | Auth | Purpose |
|--------|-------|------|---------|
| Kiosk | `/(kiosk)` (route group) | Public | Guest self-service ordering (touch screens) |
| Kitchen | `/(kitchen)` (route group) | Staff (kitchen role) | Real-time Kitchen Display System |
| Cashier | `/(cashier)` (route group) | Staff (cashier role) | Payment processing & POS |
| Admin | `/admin` (regular folder) | Admin only | Menu management, analytics, settings |

---

## Critical Rules — Read Before Every Task

These are non-negotiable. Violating any of these will break the project.

### 1. Preserve Existing Functionality
NEVER break working features when implementing changes. Before modifying any file:
- Understand what it currently does and what depends on it
- Test affected flows before AND after your changes
- If a change has ripple effects across modules, flag it — don't silently modify

### 2. No Surprise Dependencies
Do NOT install new packages unless the feature explicitly requires one that nothing
in the existing stack can handle. Before reaching for npm:
- Check if shadcn/ui already has the component
- Check if a Supabase built-in feature covers it
- Check `src/lib/utils/` for existing helpers
- If you genuinely need a new package, state WHY before installing

### 3. Think Like a System Designer, Not Just a Coder
Every feature you implement should account for ALL of these:
- **Logging**: Add `console.error` for failures, structured logs for audit trails
  (especially in payment flows and order mutations)
- **Security**: Validate inputs, check auth/roles, sanitize user content
- **Error handling**: Wrap DB operations in try/catch, return meaningful errors,
  show toast feedback to users — never let errors fail silently
- **Edge cases**: Empty cart submissions, duplicate payments, stale menu prices,
  network drops during payment, concurrent order number generation
- **Performance**: Avoid N+1 queries, use Supabase `.select()` joins over
  multiple round-trips, consider what happens with 200 concurrent kiosk sessions

### 4. Setup Dependencies Before Implementation
Before implementing features that require them:
- **Supabase**: Set up project, link locally, add environment variables
- **shadcn/ui**: Initialize with `npx shadcn@latest init` when UI components are needed
- **Zustand**: Add when client state management is needed
- **Zod**: Add when validation schemas are implemented

### 5. Never Reset the Database in Production
When Supabase is set up, `npm run supabase:reset` **WIPES ALL DATA**. Use it only
in local development when testing migrations from scratch. For applying new migrations,
always use `npm run supabase:push`. Regenerate types after any schema change.

---

## Version Pinning (Latest Stable as of Feb 2026)

| Package | Version | Status | Notes |
|---------|---------|--------|-------|
| `next` | `16.1.6` | ✅ Installed | Latest stable. Turbopack is default bundler. |
| `react` / `react-dom` | `19.2.3` | ✅ Installed | Ships with Next.js 16. |
| `tailwindcss` | `4.x` | ✅ Installed | CSS-first config. No `tailwind.config.js` needed. |
| `@tailwindcss/postcss` | `4.x` | ✅ Installed | Required PostCSS plugin for Next.js integration. |
| `typescript` | `5.x` | ✅ Installed | Strict mode enabled. |
| `@supabase/supabase-js` | `2.x` | ✅ Installed | With `@supabase/ssr` for server/client helpers. |
| `zustand` | `5.x` | ✅ Installed | Client state management. |
| `zod` | `3.x` | ✅ Installed | Schema validation. |
| Node.js | `20.9+` | ✅ Required | Minimum required by Next.js 16. |

**When installing new packages**: Use `npm install <package>` to maintain consistency with package-lock.json

---

## Essential Commands

```bash
npm run dev                 # Start dev server (port 3000, Turbopack by default)
npm run build               # Production build — run this to check for errors
npm run lint                # ESLint check
npm run type-check          # TypeScript check (tsc --noEmit)
npm run supabase:start      # Start local Supabase
npm run supabase:stop       # Stop local Supabase
npm run supabase:status     # Check local Supabase status
npm run supabase:push       # Push migrations to Supabase
npm run supabase:types      # Regenerate DB types after schema changes
npm run supabase:reset      # Reset local DB (dev only - WIPES DATA)
```

**Note**: The project uses `npm` (not `pnpm`) as shown in package-lock.json.

> **Next.js 16 note:** `next build` no longer runs the linter automatically.
> The lint script runs ESLint separately.

---

## Current Setup Status

### ✅ Phase 1 Complete
- Next.js 16.1.6 with App Router
- React 19.2.3
- TypeScript with strict mode (`tsconfig.json`)
- Tailwind CSS v4 with PostCSS plugin (`postcss.config.mjs`)
- ESLint with Next.js config
- shadcn/ui component library with 8 components
- Zod validation schemas
- Local Supabase running with all 22 migrations applied
- Environment variables configured in `.env.local`
- Route groups: `(kiosk)`, `(kitchen)`, `(cashier)`, `(admin)` with layouts
- Three Supabase client helpers (client, server, admin)
- Database migrations in `supabase/migrations/`
- Auth middleware with role-based routing
- Admin menu CRUD with image upload

### ✅ Kiosk Module Complete (Frontend)
- **Zustand cart store** with localStorage persistence (`src/stores/cart-store.ts`)
- **Welcome/splash page** with animated gradient hero (`/kiosk/`)
- **Menu display** with responsive grid/list view, category sidebar with flat borders
- **Cart review page** with quantity controls and special instructions (`/kiosk/cart`)
- **Checkout page** with 4-step flow: order type, promo code, phone, payment (`/kiosk/checkout`)
- **Confirmation page** with large order number and auto-redirect (`/kiosk/confirmation`)
- **Premium UI design**: Flat borders, 48px+ touch targets, generous spacing, bold typography
- **Fully responsive**: Mobile-first design, works on all screen sizes
- **Add to cart functionality**: MenuItemCard integrated with cart store
- **Idle timer**: 2-minute warning, auto-reset with cart clearing

### ⏳ Phase 2 — Backend Integration (In Progress)
- Server Action for order submission (connect checkout to database)
- Server Action for promo code validation
- Item detail sheet with addon selection
- Kitchen Display System (KDS) with Realtime
- Realtime order updates (kitchen ↔ kiosk)
- Order age color coding

### Phase 3 — Payments (Pending)
- PayMongo GCash integration
- PayMongo card payments (3DS)
- Webhook handler with idempotency (`/api/webhooks/paymongo`)
- Cashier POS interface (pending orders, payment processing)
- Cash payment + change calculation
- Unpaid order timeout (15 min auto-cancellation)
- BIR-compliant receipt generation

### Phase 4 — Admin & Polish (Pending)
- Real-time dashboard (revenue, orders, charts)
- Sales reports (date range, category, item)
- Promo code management UI
- Multi-language support (EN, TL)
- Allergen/nutrition info display
- Audit log viewer

### Phase 5 — Testing & Deploy (Pending)
- Playwright E2E tests (kiosk → kitchen flow)
- Load testing (200 concurrent users)
- Security audit (OWASP top 10)
- Vercel production deployment
- Monitoring + alerts setup

### Implementation Roadmap
~~1. **Phase 1 — Foundation**: Supabase, environment variables, database schema, auth middleware~~ ✅ **DONE**
~~2. **Phase 1 — Core utilities**: Supabase clients, utility functions, constants~~ ✅ **DONE**
~~3. **Phase 1 — Admin module**: Menu management with CRUD operations~~ ✅ **DONE**
~~4. **Phase 1.5 — Kiosk Frontend**: Complete customer-facing UI with cart, checkout, confirmation~~ ✅ **DONE**
5. **Phase 2 — Backend Integration**: Server Actions for order submission, promo codes, KDS realtime
6. **Phase 3 — Payments**: PayMongo integration, cashier POS, receipts
7. **Phase 4 — Admin & Polish**: Analytics, reports, promo codes, multi-language
8. **Phase 5 — Testing & Deploy**: E2E tests, load tests, security audit, production deployment

**Documentation**:
- `IMPLEMENTATION-NOTES.md` — Phase 1 foundation changes
- `KIOSK-UI-IMPLEMENTATION.md` — Complete kiosk UI breakdown
- `KIOSK-VISUAL-GUIDE.md` — Design system reference
- `MENU-UI-IMPROVEMENTS.md` — Recent menu enhancements (flat borders, spacing)
- `docs/prd/PRD.md` — Product requirements (all phases)

---

## Architecture Rules

### File Organization — Where Things Go

```
src/app/
  ├── layout.tsx              → Root layout (providers, fonts, metadata)
  ├── page.tsx                → Home page
  ├── globals.css             → Tailwind v4 CSS (design tokens in @theme)
  ├── (kiosk)/                → Guest ordering (route group, public)
  │   ├── layout.tsx          → Fullscreen, idle timer, no nav
  │   ├── page.tsx            → Welcome/splash screen
  │   ├── menu/page.tsx       → Category grid + item list
  │   ├── cart/page.tsx       → Cart review + special instructions
  │   ├── checkout/page.tsx   → 4-step checkout flow
  │   └── confirmation/page.tsx → Order number + auto-redirect
  ├── (kitchen)/              → Kitchen Display (route group, staff)
  │   ├── layout.tsx          → Dark theme, fullscreen
  │   └── orders/page.tsx     → Real-time order queue (KDS)
  ├── (cashier)/              → POS (route group, staff)
  │   └── layout.tsx          → POS layout (pages pending Phase 3)
  ├── admin/                  → Admin dashboard (regular folder, NOT route group)
  │   ├── layout.tsx          → Sidebar navigation
  │   ├── page.tsx            → Dashboard (stats, charts)
  │   ├── menu-management/page.tsx → Menu item CRUD
  │   ├── users/page.tsx      → Staff account management
  │   └── order-history/page.tsx → Order history + reports
  ├── login/page.tsx          → Staff login
  ├── signup/page.tsx         → Staff signup
  └── unauthorized/page.tsx   → 403 page

src/components/
  ├── ui/                     → shadcn/ui primitives (20 components). Do NOT edit directly.
  ├── kiosk/                  → Kiosk-specific (menu-grid, menu-item-card, cart-drawer, etc.)
  ├── kitchen/                → KDS-specific (order-card, order-queue)
  ├── admin/                  → Admin-specific (stats-cards, menu-item-form, sales-chart, etc.)
  ├── auth/                   → Auth components (login-form, signup-form)
  └── shared/                 → Cross-module (date-range-picker, pagination)

src/services/                 → Server Actions (all DB mutations)
  ├── order-service.ts        → Order CRUD
  ├── menu-service.ts         → Menu CRUD
  ├── analytics-service.ts    → Reporting queries
  ├── auth-service.ts         → Authentication operations
  └── user-service.ts         → User management

src/stores/                   → Zustand stores (client state only)
  └── cart-store.ts           → Cart state + localStorage persistence

src/hooks/                    → Custom React hooks (client-side)
  └── use-realtime-orders.ts  → Supabase realtime subscription

src/lib/
  ├── supabase/               → Supabase client factories. Do NOT duplicate these.
  │   ├── client.ts           → createBrowserClient() — browser/client components
  │   ├── server.ts           → createServerClient() — Server Components + Server Actions
  │   ├── admin.ts            → createAdminClient() — webhooks/admin scripts ONLY
  │   └── types.ts            → Auto-generated DB types
  ├── validators/             → Zod schemas (auth, category, menu-item, order, user)
  ├── utils/                  → Pure utility functions
  │   ├── cn.ts               → className merger (Tailwind)
  │   ├── currency.ts         → formatCurrency() — Philippine Peso formatting
  │   └── rate-limiter.ts     → Rate limiting utility
  └── constants/
      └── order-status.ts     → Order status enums and maps

src/types/                    → TypeScript types (auth, dashboard, order)
supabase/migrations/          → Timestamped SQL migration files (25 migrations applied)
```

**Important**: Admin uses a regular `admin/` folder (not a route group) because it needs
the `/admin` URL prefix. Kiosk, kitchen, and cashier use route groups `(...)` for layout
isolation without affecting URLs.

### The Golden Rules

1. **Server Actions for all mutations.** Use `'use server'` functions in
   `src/services/`. Never call Supabase `.insert()`, `.update()`, `.delete()`
   from client components directly.

2. **Server Components by default.** Every page and layout is a Server Component
   unless it needs interactivity. Add `'use client'` only at the leaf level.

3. **Supabase client discipline:**
   - `src/lib/supabase/client.ts` → `createBrowserClient()` — Browser/client components
   - `src/lib/supabase/server.ts` → `createServerClient()` — Server Components and Server Actions
   - `src/lib/supabase/admin.ts` → `createAdminClient()` — Webhooks and admin scripts ONLY (service role)
   - **NEVER import the admin/service-role client in a client component.**

4. **Validate on both sides.** Zod schemas in `src/lib/validators/` are used
   on the client for UX AND re-validated in Server Actions for security.
   Never trust client-submitted prices — re-fetch from DB.

5. **Route groups are boundaries.** Components in `src/components/kiosk/`
   must NOT import from `src/components/admin/` or vice versa. If something
   is shared, move it to `src/components/shared/`.

6. **Realtime only on `orders` table.** Supabase Realtime is enabled for the
   `orders` table only. The kitchen and cashier subscribe to it. Do not add
   realtime to other tables without discussing performance implications.

### Component Design Principles

- **Single Responsibility**: Each component does ONE thing. If a component
  exceeds ~150 lines, split it. Extract reusable logic into custom hooks
  in `src/hooks/`. Extract reusable UI into `src/components/shared/`.
- **DRY — but not at the cost of clarity**: Extract common patterns:
  - Reusable UI → `src/components/shared/` or `src/components/ui/`
  - Shared business logic → `src/services/` (server) or `src/hooks/` (client)
  - Common types → `src/types/`
  - Shared validators → `src/lib/validators/`
  - Utility functions → `src/lib/utils/`
- **Components render, services mutate**: Page components and UI components
  should ONLY handle rendering and user interaction. All database reads go
  in Server Components or hooks. All database writes go in Server Actions
  in `src/services/`. This separation is critical — do not mix them.
- **Image uploads**: Use Supabase Storage. Upload images in Server Actions
  via `supabase.storage.from('menu-images').upload()`. Store the public URL
  in the database. Never store base64 in the database.

---

## Code Style & Conventions

### TypeScript
- Strict mode is ON. No `any` types. No `@ts-ignore`.
- Use `interface` for object shapes, `type` for unions/intersections.
- Always type function parameters and return values explicitly.
- Prefer `unknown` over `any` when the type is genuinely unknown.

### React 19.2 / Next.js 16
- Use named exports for components: `export function MenuGrid()` not `export default`.
- Exception: `page.tsx` and `layout.tsx` use default exports (Next.js requirement).
- Props interfaces are named `{ComponentName}Props` and defined above the component.
- Use `cn()` from `src/lib/utils/cn.ts` for conditional class merging.
- No inline styles. Everything goes through Tailwind classes.
- **Next.js 16 caching is opt-in.** All dynamic code runs at request time by default.
  Use `use cache` directive or Cache Components to opt into caching where needed.
- **Turbopack is the default bundler.** No `--turbopack` flag needed on `next dev`.
- **`params` and `searchParams` are async** in pages/layouts — always `await` them:
  ```typescript
  // CORRECT — Next.js 16
  export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
  }
  ```
- **React Compiler is available** (stable in Next.js 16). Enable in `next.config.ts`
  with `reactCompiler: true` for automatic memoization. Not enabled by default.
- **Middleware is now `proxy.ts`** in Next.js 16 (renamed to clarify network boundary).
  However, `middleware.ts` still works for backward compatibility.

### Naming
- Files: `kebab-case.tsx` for components, `kebab-case.ts` for utilities.
- Components: `PascalCase` — matches the filename minus extension.
- Hooks: `use-kebab-case.ts` → `useKebabCase()`.
- Stores: `kebab-case-store.ts` → `useKebabCaseStore()`.
- Server Actions: `kebab-case-service.ts` → `camelCase()` function names.
- DB migrations: `YYYYMMDDHHMMSS_description.sql` — timestamp-based (Supabase default), never rename existing ones.

### Tailwind CSS (v4.1 — CSS-First Configuration)

Tailwind v4 is a **major paradigm shift** from v3. Know these differences:

- **No `tailwind.config.js` file.** Tailwind v4 uses CSS-first configuration.
  All customization happens in `src/app/globals.css` using `@theme` blocks.
- **No `content` array.** Tailwind v4 auto-detects your template files.
  Use `@source` directive in CSS only if you need to add non-standard paths.
- **PostCSS plugin changed.** Use `@tailwindcss/postcss` (not `tailwindcss`).
- **CSS import replaces directives.** Use `@import "tailwindcss"` instead of
  the old `@tailwind base; @tailwind components; @tailwind utilities;`.
- **CSS layers.** Tailwind v4 uses native `@layer` for theme, base, components, utilities.

```css
/* src/app/globals.css — Tailwind v4.1 setup */
@import "tailwindcss";

@theme {
  /* Custom design tokens — replaces tailwind.config.js theme.extend */
  --color-brand-500: #2563eb;
  --color-brand-600: #1d4ed8;
  --font-display: "Cabinet Grotesk", sans-serif;
  --font-body: "Satoshi", sans-serif;
}

/* Dark mode variant (class-based) */
@variant dark (&:where(.dark, .dark *));
```

```javascript
// postcss.config.mjs — Next.js 16 + Tailwind v4
export default {
  plugins: {
    "@tailwindcss/postcss": {},  // NOT "tailwindcss" — this is the v4 plugin
  },
};
```

- Design tokens live in `src/app/globals.css` inside `@theme {}` blocks.
- Use shadcn/ui components as the base. Customize via the `cn()` utility.
- For kiosk: minimum touch targets of 48px (use `min-h-12 min-w-12`).
- For kitchen: dark theme only, high contrast, `text-xl` minimum (20px) for details, `text-3xl` (28px+) for order numbers.
- **Do NOT create a `tailwind.config.js` or `tailwind.config.ts` file.**
  If you see one, delete it — v4 doesn't use it.

### Package Manager
- **Use `npm`** (NOT `pnpm` or `yarn`) - the project uses `package-lock.json`
- Install packages: `npm install <package>`
- Run scripts: `npm run <script>`

### Currency
- Always format as Philippine Peso: `₱1,234.56`
- Use the `formatCurrency()` util from `src/lib/utils/currency.ts`.
- Store prices as `DECIMAL(10,2)` in the database, never as floats.
- PayMongo uses centavos (multiply by 100 before sending).

---

## Supabase Patterns (Reference for Implementation)

**Note**: These patterns are for reference when implementing Supabase integration.
The helper functions and types referenced below don't exist yet and will need to be created.

### Querying (Server Components)
```typescript
// TARGET PATTERN — Server Component
import { createServerClient } from '@/lib/supabase/server';

export default async function MenuPage() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('menu_items')
    .select('*, category:categories(*), addon_groups(*, addon_options(*))')
    .eq('is_available', true)
    .order('display_order');
  // ...render with data
}
```

### Mutations (Server Actions)
```typescript
// TARGET PATTERN — Server Action in src/services/
'use server'
import { createServerClient } from '@/lib/supabase/server';
import { menuItemSchema } from '@/lib/validators/menu-item';

export async function createMenuItem(formData: FormData) {
  const input = menuItemSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerClient();
  const { data, error } = await supabase.from('menu_items').insert(input).select().single();
  if (error) throw error;
  revalidatePath('/menu-management');
  return data;
}
```

### Realtime (Client Components)
```typescript
// TARGET PATTERN — Client Component with realtime
'use client'
import { createBrowserClient } from '@/lib/supabase/client';

function useRealtimeOrders() {
  const supabase = createBrowserClient();
  useEffect(() => {
    const channel = supabase
      .channel('kitchen-orders')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: 'status=in.(paid,preparing,ready)'
      }, handleChange)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);
}
```

---

## Module-Specific Agent Guides

Before working on a specific module, READ the agent doc first:

| Working on... | Read this first |
|---|---|
| Kiosk UI, menu, cart | `docs/agents/AGENT-KIOSK.md` |
| Kitchen display, order queue | `docs/agents/AGENT-KITCHEN.md` |
| Cashier, payment processing | `docs/agents/AGENT-CASHIER.md` |
| Admin dashboard, menu CRUD | `docs/agents/AGENT-ADMIN.md` |
| Database schema, migrations, RLS | `docs/agents/AGENT-DATABASE.md` |
| PayMongo, webhooks, refunds | `docs/agents/AGENT-PAYMENTS.md` |

Each agent doc defines:
- Exact files you own (don't touch files outside your scope)
- UI specifications and wireframes
- Data queries and mutation patterns
- Edge cases and gotchas

---

## Database Migration Rules

1. **Never edit existing migration files.** Create a new migration file instead.
2. **Naming**: `YYYYMMDDHHMMSS_description.sql` (e.g., `20260207150000_add_promo_codes.sql`).
3. **Always include rollback comments** at the bottom of migration files.
4. **After adding/changing tables**: regenerate types with `npm run supabase:types`.
5. **RLS policies**: Every new table MUST have RLS enabled and at least one policy.
   Public-facing data (menu items) → allow anonymous SELECT.
   Staff data (orders) → require auth + role check.
   Admin data (settings, users) → admin role only.
6. **Test locally first**: Use `npm run supabase:reset` ONLY in local dev to test
   migrations from scratch. **NEVER run db:reset against production** — it wipes all data.
   Use `npm run supabase:push` to apply new migrations safely.

---

## Error Handling Patterns

### Server Actions
```typescript
// Return structured results, don't throw to the client
export async function createOrder(input: OrderInput) {
  try {
    const validated = orderSchema.parse(input);
    // ... do work
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', details: error.flatten() };
    }
    console.error('createOrder failed:', error);
    return { success: false, error: 'Failed to create order' };
  }
}
```

### Client Components
```typescript
// Use toast notifications for user feedback
const result = await createOrder(cartData);
if (result.success) {
  toast.success('Order placed!');
  router.push(`/confirmation?order=${result.data.id}`);
} else {
  toast.error(result.error);
}
```

---

## Security Checklist

When writing code, verify these:

- [ ] No Supabase service-role key exposed to the client
- [ ] Server Actions validate input with Zod before any DB operation
- [ ] Prices are re-calculated server-side, never trusted from the client
- [ ] PayMongo webhook signatures are verified with HMAC
- [ ] RLS policies exist for every table (check `AGENT-DATABASE.md`)
- [ ] Admin routes are protected by middleware role check
- [ ] File uploads go through Supabase Storage with size/type validation
- [ ] No raw SQL — use Supabase query builder or typed RPC calls

---

## Order Lifecycle & Status Flow

All modules must respect this order lifecycle. Invalid transitions should be rejected.

```
Guest at Kiosk                    Kitchen Display           Cashier
───────────────                   ───────────────           ───────
1. Browse Menu
2. Add Items to Cart
3. Customize (add-ons)
4. Review Order
5. Select Order Type
   (dine-in / room service / takeout)
6. Apply Promo Code (optional)
7. Choose Payment Method
   ├── "Pay at Counter" ─────────────────────────→ Pending Payment Queue
   │   status: pending_payment                      Process Cash Payment
   │   expires_at: now + 15 min                     Mark as Paid → Kitchen
   │
   ├── GCash/Card ──→ PayMongo ──→ Webhook ──→ Auto-confirmed
   │   status: paid                                 → Kitchen
   │
   └── [All paid orders] ────────────────────────→ NEW ORDER ALERT
                                                    status: paid
                                                    Timer starts (paid_at)
                                                    → Mark "Preparing"
                                                    → Mark "Ready" → Guest Notification
                                                    → Mark "Served" → Auto-hide 5 min
```

**Valid Status Transitions**:
- `pending_payment` → `paid` (payment confirmed) or `cancelled` (timeout/cancellation)
- `paid` → `preparing` (kitchen starts)
- `preparing` → `ready` (food done)
- `ready` → `served` (delivered to guest)

**Timeout Rule**: Unpaid orders auto-cancel after 15 minutes (`expires_at`).
Implemented via scheduled job that sets `status = 'cancelled'`, `payment_status = 'expired'`.

---

## Tax & Service Charge Calculation

All order totals MUST follow this formula. Tax rate and service charge are configurable
via the `settings` table but default to:

```typescript
const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
const discountAmount = applyPromoDiscount(subtotal, promoCode); // Applied BEFORE tax
const taxableAmount = subtotal - discountAmount;
const taxAmount = taxableAmount * settings.tax_rate;         // Default: 0.12 (12% VAT)
const serviceCharge = taxableAmount * settings.service_charge; // Default: 0.10 (10%)
const totalAmount = taxableAmount + taxAmount + serviceCharge;
```

**Key rules**:
- Discount is applied BEFORE tax calculation
- Service charge is calculated on subtotal (not on tax)
- Tax rate and service charge are stored in `settings` table, not hardcoded
- PayMongo amounts must be in centavos: `Math.round(totalAmount * 100)`
- All calculations MUST happen server-side — never trust client totals

---

## Promo Code Validation Rules

When implementing promo code validation (Server Action in `src/services/`), enforce ALL of these:

1. **Code exists** and `is_active = true`
2. **Date range**: Current date between `valid_from` and `valid_until`
3. **Usage limit**: `current_usage_count < max_usage_count` (if limit is set)
4. **Minimum order**: Order subtotal ≥ `min_order_amount` (if set)
5. **Case-insensitive**: Compare codes with `.toUpperCase()`

**Discount application**:
- `percentage` type: `discount_amount = subtotal * (discount_value / 100)`
- `fixed_amount` type: `discount_amount = discount_value`
- Discount cannot exceed subtotal (cap at subtotal)

**Error codes** (see PRD Section 17):
- `E5001`: Invalid promo code (doesn't exist)
- `E5002`: Promo code expired (past `valid_until`)
- `E5003`: Promo code not yet active (before `valid_from`)
- `E5004`: Usage limit reached (`max_usage_count` exceeded)
- `E5005`: Minimum order not met (subtotal < `min_order_amount`)

---

## Error Code System

All Server Actions should use standardized error codes from the PRD (Section 17).
Use specific codes so the client can display appropriate messages.

| Range | Category | Examples |
|-------|----------|----------|
| E1xxx | Authentication | E1001: Invalid credentials, E1002: Session expired |
| E2xxx | Orders | E2001: Order not found, E2003: Order expired, E2006: Cart empty |
| E3xxx | Payments | E3001: Payment declined, E3002: Gateway unavailable |
| E4xxx | Menu | E4001: Item not found, E4005: Image upload failed |
| E5xxx | Promo Codes | E5001: Invalid code, E5002: Expired, E5005: Min order not met |
| E9xxx | System | E9001: Internal error, E9002: DB connection failed, E9003: Rate limited |

**Error response format** (use consistently across all Server Actions):
```typescript
interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;       // E.g., "E2001"
    message: string;    // User-friendly message
    details?: unknown;  // Validation errors, additional context
  };
}
```

---

## What NOT To Do

- **Don't create a `tailwind.config.js` or `tailwind.config.ts`.** Tailwind v4 uses
  CSS-first configuration via `@theme {}` in `globals.css`. Config files are v3 legacy.
- **Don't use `@tailwind base/components/utilities` directives.** Use `@import "tailwindcss"`
  instead. The old directives are Tailwind v3 syntax and will not work.
- **Don't use `tailwindcss` as the PostCSS plugin.** Use `@tailwindcss/postcss` in
  `postcss.config.mjs`. The plugin name changed in v4.
- **Don't create API routes** for standard CRUD. Use Server Actions instead.
  API routes are ONLY for webhooks (`/api/webhooks/paymongo`) and external integrations.
- **Don't use `useEffect` for data fetching.** Fetch in Server Components or
  use Server Actions with `useTransition`.
- **Don't put business logic in components.** Components render UI.
  Business logic goes in `src/services/` (server) or `src/stores/` (client).
- **Don't install new dependencies** without checking if shadcn/ui or the
  existing stack already provides the functionality.
- **Don't bypass TypeScript.** If the type system is fighting you, it's
  probably catching a real bug. Fix the type, don't suppress it.
- **Don't use `localStorage` for anything sensitive.** Cart state in Zustand
  persist is fine. Auth tokens, payment data — never.
- **Don't modify `src/components/ui/`** directly. These are shadcn/ui generated
  files. Customize by wrapping them in your module-specific components.
- **Don't forget to `await params` and `searchParams`.** Next.js 16 made these
  async — accessing them synchronously will throw a runtime error.
- **Don't rely on implicit caching.** Next.js 16 caching is fully opt-in.
  Data fetches are dynamic by default. Use `use cache` where you want caching.

---

## Reference Docs

| Document | Path | Purpose |
|---|---|---|
| Product Requirements | `docs/prd/PRD.md` | Features, user stories, milestones |
| System Architecture | `docs/architecture/ARCHITECTURE.md` | Diagrams, data flow, full folder map |
| Kiosk Agent | `docs/agents/AGENT-KIOSK.md` | Guest ordering UI spec |
| Kitchen Agent | `docs/agents/AGENT-KITCHEN.md` | KDS real-time spec |
| Cashier Agent | `docs/agents/AGENT-CASHIER.md` | POS and payment UI spec |
| Admin Agent | `docs/agents/AGENT-ADMIN.md` | Dashboard and management spec |
| Database Agent | `docs/agents/AGENT-DATABASE.md` | Schema, RLS, migrations |
| Payments Agent | `docs/agents/AGENT-PAYMENTS.md` | PayMongo integration spec |

---

## Troubleshooting Guide

### Common Errors and Solutions

#### Build/Compilation Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `params is not a Promise` | Next.js 16 async params | Add `await` before accessing `params` or `searchParams` |
| `Module not found: @/lib/...` | Path alias issue | Check `tsconfig.json` paths, ensure file exists |
| `Type 'X' is not assignable to 'Y'` | Type mismatch | Check Zod schema matches DB types, regenerate types |
| `ReferenceError: document is not defined` | Server component using client API | Add `'use client'` directive to component |
| `Invalid hook call` | Hook outside component or conditional | Move hook to component body, remove conditionals |

#### Supabase Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `relation "table" does not exist` | Missing migration | Run `npm run supabase:push` |
| `permission denied for table` | RLS policy blocking | Check RLS policies in `AGENT-DATABASE.md` |
| `JWT expired` | Session timeout | Refresh session or re-authenticate |
| `duplicate key value violates unique` | Unique constraint | Check for existing records before insert |
| `new row violates row-level security` | RLS policy rejection | Verify user role has required permissions |

#### Runtime Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Hydration mismatch` | Server/client HTML differs | Check for browser-only APIs, use `useEffect` |
| `Maximum update depth exceeded` | Infinite re-render loop | Check `useEffect` dependencies, state updates |
| `Cannot read properties of undefined` | Missing null check | Add optional chaining (`?.`) or null checks |
| `Network request failed` | CORS or connectivity | Check Supabase URL, verify network settings |

### Debugging Tips

1. **Server Components**: Use `console.log()` - output appears in terminal, not browser
2. **Client Components**: Use browser DevTools console
3. **Server Actions**: Add try/catch, log errors with context: `console.error('createOrder:', error)`
4. **Supabase queries**: Log the query result: `console.log({ data, error })`
5. **Auth issues**: Check `supabase.auth.getUser()` response in Server Components

### Performance Debugging

```typescript
// Measure Server Component render time
const start = performance.now();
// ... your code
console.log(`Rendered in ${performance.now() - start}ms`);

// Check for N+1 queries - if you see multiple similar queries, use .select() joins
const { data } = await supabase
  .from('orders')
  .select('*, items:order_items(*, menu_item:menu_items(*))'); // Single query with joins
```

---

## Testing Guidelines

### Testing Philosophy

- **Test behavior, not implementation**: Focus on what the code does, not how
- **Test the happy path first**: Then add edge cases
- **Keep tests fast**: Mock external services (Supabase, PayMongo)
- **Testing pyramid**: 60% unit tests, 30% integration tests, 10% E2E tests

### Coverage Targets (Phase 5)

| Area | Target | Priority |
|------|--------|----------|
| Server Actions (`src/services/`) | ≥ 90% | Critical |
| Zod Validators (`src/lib/validators/`) | 100% | Critical |
| Utility Functions (`src/lib/utils/`) | ≥ 95% | High |
| React Hooks (`src/hooks/`) | ≥ 80% | High |
| UI Components (`src/components/`) | ≥ 70% | Medium |
| **Overall** | **≥ 80%** | — |

### What to Test by Module

| Module | Priority Tests |
|--------|----------------|
| **Kiosk** | Cart add/remove, price calculations, checkout flow |
| **Kitchen** | Order status transitions, timer calculations, bump functionality |
| **Cashier** | Payment processing, receipt generation, refund flows |
| **Admin** | CRUD operations, validation, image upload |

### Manual Testing Checklist

Before marking a feature complete, verify:

- [ ] Happy path works end-to-end
- [ ] Error states display correctly (toast messages, inline errors)
- [ ] Loading states are visible (spinners, skeleton loaders)
- [ ] Empty states are handled (no items, no orders)
- [ ] Form validation works (required fields, format validation)
- [ ] Mobile/touch responsiveness (especially kiosk)
- [ ] Browser refresh doesn't break state
- [ ] Multiple tabs don't cause conflicts

### Testing Server Actions

```typescript
// Example: Testing a Server Action locally
import { createMenuItem } from '@/services/menu-service';

// In a test file or temporary script:
const formData = new FormData();
formData.set('name', 'Test Item');
formData.set('price', '150.00');
formData.set('category_id', 'uuid-here');

const result = await createMenuItem(formData);
console.log(result); // { success: true, data: {...} } or { success: false, error: '...' }
```

---

## Environment Setup Checklist

### First-Time Setup

1. **Clone and install**:
   ```bash
   git clone <repo-url>
   cd food.orderingsystem
   npm install
   ```

2. **Environment variables**: Copy `.env.example` to `.env.local` (create if missing):
   ```bash
   # .env.local
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   ```

3. **Start Supabase locally**:
   ```bash
   npx supabase start
   ```

4. **Apply migrations**:
   ```bash
   npm run supabase:push
   npm run supabase:types
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

### Verification Steps

After setup, verify these work:
- [ ] `http://localhost:3000` loads the home page
- [ ] `http://localhost:54323` opens Supabase Studio
- [ ] No TypeScript errors: `npm run type-check`
- [ ] No lint errors: `npm run lint`

---

## Module Ownership Matrix

| File/Directory | Owner Module | Cross-Module Import OK? |
|----------------|--------------|-------------------------|
| `src/app/(kiosk)/` | Kiosk | No |
| `src/app/(kitchen)/` | Kitchen | No |
| `src/app/(cashier)/` | Cashier | No |
| `src/app/admin/` | Admin | No |
| `src/components/kiosk/` | Kiosk | No |
| `src/components/kitchen/` | Kitchen | No |
| `src/components/cashier/` | Cashier | No |
| `src/components/admin/` | Admin | No |
| `src/components/shared/` | Shared | Yes (by design) |
| `src/components/ui/` | Shared | Yes (shadcn/ui) |
| `src/services/` | Shared | Yes |
| `src/stores/` | By feature | Check store scope |
| `src/lib/` | Shared | Yes |
| `src/types/` | Shared | Yes |

**Rule**: Module-specific code NEVER imports from another module's directory.

---

## Decision Log

Track major architectural decisions here for context.

| Date | Decision | Rationale | Alternatives Considered |
|------|----------|-----------|------------------------|
| Feb 2026 | Use Next.js 16 App Router | Latest stable, built-in Turbopack | Pages Router (legacy) |
| Feb 2026 | Use Supabase over custom backend | Auth + DB + Realtime + Storage in one | Firebase, custom Node.js |
| Feb 2026 | Tailwind v4 CSS-first config | No config file, cleaner setup | Tailwind v3 (config-based) |
| Feb 2026 | shadcn/ui over other component libs | Composable, accessible, customizable | Radix, Chakra, MUI |
| Feb 2026 | Zustand over Redux/Context | Simpler API, better persistence | Redux Toolkit, React Context |
| Feb 2026 | PayMongo for payments | Philippine market, GCash support | Stripe (limited PH support) |
| Feb 2026 | Server Actions over API routes | Type-safe, simpler, less boilerplate | REST API routes |
| Feb 2026 | Zod for validation | TypeScript-first, works both sides | Yup, Joi |

---

## Performance Guidelines

### Database Query Optimization

```typescript
// BAD: N+1 queries
const orders = await supabase.from('orders').select('*');
for (const order of orders) {
  const items = await supabase.from('order_items').select('*').eq('order_id', order.id);
  // 1 + N queries!
}

// GOOD: Single query with joins
const { data: orders } = await supabase
  .from('orders')
  .select('*, order_items(*, menu_item:menu_items(name, price))');
// 1 query total
```

### Component Optimization

```typescript
// Use Server Components for static content (no 'use client')
export default async function MenuPage() {
  const data = await fetchMenuItems(); // Runs on server
  return <MenuGrid items={data} />;
}

// Use 'use client' only for interactivity
'use client'
export function AddToCartButton({ item }: { item: MenuItem }) {
  const addItem = useCartStore(state => state.addItem);
  return <Button onClick={() => addItem(item)}>Add</Button>;
}
```

### Image Optimization

- Use Supabase Storage for menu images
- Keep images under 500KB (compress before upload)
- Use Next.js `<Image>` component for automatic optimization
- Serve WebP format when supported

### Realtime Subscription Management

```typescript
// ALWAYS clean up subscriptions
useEffect(() => {
  const channel = supabase.channel('orders').subscribe();
  return () => {
    supabase.removeChannel(channel); // Prevents memory leaks
  };
}, []);
```

---

## Accessibility Requirements

### WCAG 2.1 Level AA Compliance

| Requirement | Implementation |
|-------------|----------------|
| **Color Contrast** | Minimum 4.5:1 for text, 3:1 for large text |
| **Focus Indicators** | Visible focus ring on all interactive elements |
| **Touch Targets** | Minimum 48x48px for kiosk interface |
| **Keyboard Navigation** | All features accessible via keyboard |
| **Screen Reader Support** | Semantic HTML, ARIA labels where needed |
| **Error Identification** | Clear error messages with suggestions |

### Module-Specific Requirements

| Module | Key Accessibility Features |
|--------|---------------------------|
| **Kiosk** | Touch targets ≥ 48px (56px for primary actions), body text ≥ 18px, headings ≥ 24px, high contrast, optional audio feedback |
| **Kitchen** | Dark theme only, order details ≥ 20px, order numbers ≥ 28px, color-blind friendly (icons + patterns supplement color coding), audio alerts configurable |
| **Cashier** | Standard accessibility, keyboard shortcuts for common actions |
| **Admin** | Standard WCAG compliance |

### Kitchen Display Specifics (KDS)

When implementing the Kitchen Display System, these rules apply:

- **Order age color coding**: Green (0-5 min), Yellow (5-10 min), Red (>10 min) — based on `paid_at` timestamp
- **Timer refresh**: Client-side `setInterval` every 30 seconds
- **Audio alert**: Play sound on new order (configurable volume/tone)
- **Auto-hide**: Served orders disappear after 5 minutes
- **Recall**: Served orders can be recalled within 30 minutes
- **Bump interaction**: Single tap advances status (paid → preparing → ready → served)
- **Filters**: Filter by order type (dine-in, room service, takeout) and status

### Cashier Module Specifics (POS)

When implementing the Cashier module (Phase 3):

- **Pending queue**: Orders with `payment_status = 'unpaid'`, sorted oldest first
- **Cash payment**: Numeric keypad + quick-select buttons (₱20, ₱50, ₱100, ₱500, ₱1000)
- **Change calculation**: Real-time as cashier enters amount tendered
- **Refunds**: Require manager PIN approval (4-digit code), log reason in audit trail
- **BIR receipts**: Must include TIN, business name, sequential receipt number, VAT breakdown
- **Order expiry**: Highlight orders within 2 min of 15-minute timeout in red

---

## Disaster Recovery & Rollback

For detailed procedures, see PRD Section 20. Key points:

- **Application rollback**: Use `vercel rollback <deployment-url>` or Vercel dashboard
- **Database rollback**: Each migration file should include rollback SQL comments at the bottom.
  Run rollback SQL manually if needed, then deploy previous app version.
- **PayMongo outage**: Disable GCash/Card in UI via `settings` table feature flag, fallback to cash
- **Supabase outage**: System enters read-only mode (cached menu data), display "temporarily unavailable" for new orders
- **Never run `supabase db reset` in production** — use Point-in-Time Recovery from Supabase dashboard

---

## Glossary

| Term | Definition |
|------|------------|
| **Route Group** | Next.js feature using `(folder)` syntax to group routes without affecting URL |
| **Server Action** | `'use server'` function that runs on server, callable from client |
| **Server Component** | React component that renders on server (default in App Router) |
| **Client Component** | React component with `'use client'` that hydrates in browser |
| **RLS** | Row Level Security - Supabase feature to restrict data access |
| **Realtime** | Supabase feature for live database change subscriptions |
| **KDS** | Kitchen Display System - real-time order display for kitchen staff |
| **POS** | Point of Sale - cashier interface for payment processing |
| **BIR** | Bureau of Internal Revenue - Philippine tax authority |
| **PayMongo** | Philippine payment gateway supporting GCash, cards, etc. |
| **shadcn/ui** | Component library with accessible, customizable primitives |
| **Zustand** | Lightweight state management library for React |
| **Zod** | TypeScript-first schema validation library |
| **Migration** | SQL file that modifies database schema |
| **Turbopack** | Fast bundler, default in Next.js 16 |
| **Centavos** | Philippine currency subunit (1 Peso = 100 centavos) |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.2 | Feb 7, 2026 | Aligned with PRD: fixed migration naming (timestamp-based), updated project structure to match actual code, fixed admin route (regular folder not route group), added order lifecycle/status flow, tax & service charge formula, promo code validation rules, error code system (PRD Section 17), kitchen/cashier specifics, enhanced accessibility with correct font sizes, added coverage targets, disaster recovery reference, fixed phase roadmap to match PRD phases |
| 2.0 | Feb 2026 | Added Quick Reference, Troubleshooting Guide, Testing Guidelines, Environment Setup Checklist, Module Ownership Matrix, Decision Log, Performance Guidelines, Accessibility Requirements, Glossary |
| 1.0 | Feb 2026 | Initial CLAUDE.md with project setup, critical rules, architecture patterns |