# CLAUDE.md — AI Agent Operating Manual
# OrderFlow: Hotel Restaurant Web Ordering System

This file tells AI assistants (Claude Code, Cursor, Copilot, etc.) how to work
in this codebase. Read this FIRST before touching any code.

---

## Project Overview

OrderFlow is a hotel restaurant ordering system with 4 isolated interfaces in
a single Next.js 16 (App Router) app. The backend is Supabase (Postgres + Auth + Realtime).

| Module | Route Group | Auth | Purpose |
|--------|-------------|------|---------|
| Kiosk | `/(kiosk)` | Public | Guest self-service ordering (touch screens) |
| Kitchen | `/(kitchen)` | Staff (kitchen role) | Real-time Kitchen Display System |
| Cashier | `/(cashier)` | Staff (cashier role) | Payment processing & POS |
| Admin | `/(admin)` | Admin only | Menu management, analytics, settings |

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

### 4. Never Reset the Database in Production
`pnpm supabase db reset` **WIPES ALL DATA**. Use it only in local development
when testing migrations from scratch. For applying new migrations, always use
`pnpm supabase db push`. Regenerate types with `pnpm supabase gen types`
after any schema change.

---

## Version Pinning (Latest Stable as of Feb 2026)

| Package | Version | Notes |
|---------|---------|-------|
| `next` | `16.1.x` | Latest stable. Turbopack is default bundler. |
| `react` / `react-dom` | `19.2.x` | Ships with Next.js 16. Includes View Transitions, `useEffectEvent`. |
| `tailwindcss` | `4.1.x` | CSS-first config. No `tailwind.config.js` needed. |
| `@tailwindcss/postcss` | `4.1.x` | Required PostCSS plugin for Next.js integration. |
| `typescript` | `5.7.x` | Strict mode enabled. |
| `@supabase/supabase-js` | `2.x` | With `@supabase/ssr` for server/client helpers. |
| `zustand` | `5.x` | Client state management. |
| `zod` | `3.x` | Schema validation. |
| Node.js | `20.9+` | Minimum required by Next.js 16. |

**Always install exact versions**: `pnpm add next@16.1 react@19.2 react-dom@19.2`

---

## Essential Commands

```bash
pnpm dev                    # Start dev server (port 3000, Turbopack by default)
pnpm build                  # Production build — run this to check for errors
pnpm lint                   # ESLint check (run manually, Next.js 16 no longer auto-lints on build)
pnpm type-check             # TypeScript strict check (tsc --noEmit)
pnpm supabase db push       # Push migrations to Supabase
pnpm supabase gen types typescript --linked > src/lib/supabase/types.ts  # Regen DB types
```

**Always run `pnpm type-check` after making changes.** TypeScript is strict.

> **Next.js 16 note:** `next build` no longer runs the linter automatically.
> Add `"lint": "next lint"` to your package.json scripts and run it separately.

---

## Architecture Rules

### File Organization — Where Things Go

```
src/app/(module)/           → Pages and layouts ONLY. No business logic here.
src/components/(module)/    → UI components scoped to one module.
src/components/shared/      → Components used across 2+ modules.
src/components/ui/          → shadcn/ui primitives. Do NOT edit these directly.
src/services/               → Server Actions (all DB mutations live here).
src/hooks/                  → Custom React hooks (client-side).
src/stores/                 → Zustand stores (client state only).
src/lib/supabase/           → Supabase client factories. Do NOT duplicate these.
src/lib/validators/         → Zod schemas for all data shapes.
src/lib/utils/              → Pure utility functions (no React, no Supabase).
src/lib/constants/          → Enums, status maps, config values.
src/types/                  → TypeScript types and interfaces.
supabase/migrations/        → Numbered SQL migration files.
```

### The Golden Rules

1. **Server Actions for all mutations.** Use `'use server'` functions in
   `src/services/`. Never call Supabase `.insert()`, `.update()`, `.delete()`
   from client components directly.

2. **Server Components by default.** Every page and layout is a Server Component
   unless it needs interactivity. Add `'use client'` only at the leaf level.

3. **Supabase client discipline:**
   - `src/lib/supabase/client.ts` → Browser (client components)
   - `src/lib/supabase/server.ts` → Server Components and Server Actions
   - `src/lib/supabase/admin.ts` → Webhooks and admin scripts ONLY (service role)
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
- DB migrations: `NNN_description.sql` — sequential, never rename existing ones.

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
- For kitchen: dark theme only, high contrast, text-lg minimum.
- **Do NOT create a `tailwind.config.js` or `tailwind.config.ts` file.**
  If you see one, delete it — v4 doesn't use it.

### Currency
- Always format as Philippine Peso: `₱1,234.56`
- Use the `formatCurrency()` util from `src/lib/utils/currency.ts`.
- Store prices as `DECIMAL(10,2)` in the database, never as floats.
- PayMongo uses centavos (multiply by 100 before sending).

---

## Supabase Patterns

### Querying (Server Components)
```typescript
// CORRECT — Server Component
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
// CORRECT — Server Action in src/services/
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
// CORRECT — Client Component with realtime
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

1. **Never edit existing migration files.** Create a new numbered file instead.
2. **Naming**: `NNN_short_description.sql` (e.g., `014_add_promo_codes.sql`).
3. **Always include rollback comments** at the bottom of migration files.
4. **After adding/changing tables**: regenerate types with `pnpm supabase gen types`.
5. **RLS policies**: Every new table MUST have RLS enabled and at least one policy.
   Public-facing data (menu items) → allow anonymous SELECT.
   Staff data (orders) → require auth + role check.
   Admin data (settings, users) → admin role only.
6. **Test locally first**: Use `pnpm supabase db reset` ONLY in local dev to test
   migrations from scratch. **NEVER run db:reset against production** — it wipes all data.
   Use `pnpm supabase db push` to apply new migrations safely.

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