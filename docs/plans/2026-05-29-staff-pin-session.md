# Staff PIN Session & Role-Gated Kiosk Navigation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Staff enter a PIN on the kiosk welcome screen to identify themselves; their role gates the left-nav items in the menu, and every order they place is tagged with their profile ID for performance reporting.

**Architecture:** A new `staff-session-store.ts` (Zustand + localStorage) holds `{ id, full_name, role }` for the active employee and persists until "Change Employee" is clicked. The welcome screen's right-arrow area becomes a PIN trigger / employee chip. `kiosk-pos-layout.tsx` reads the store and renders only the nav items allowed for that role. A new `taken_by` column on `orders` is populated at order creation time.

**Tech Stack:** Next.js 15 App Router, Zustand (persist), Supabase (Server Actions), Tailwind CSS v4, TypeScript strict mode.

---

## Key File Reference

| File | Purpose |
|------|---------|
| `src/stores/cart-store.ts` | Pattern to copy for new Zustand store |
| `src/components/kiosk/kiosk-welcome-client.tsx` | Welcome screen — add PIN trigger & employee chip |
| `src/components/kiosk/kiosk-pos-layout.tsx:82-87` | `NAV_ITEMS` constant — replace with dynamic nav |
| `src/components/kiosk/kiosk-pin-dialog.tsx` | Existing PIN dialog — reference for styling |
| `src/services/user-service.ts` | Add `resolveStaffPin()` here |
| `src/services/order-service.ts:689-713` | `createOrder` insert block — add `taken_by` |
| `src/lib/validators/order.ts:19-53` | `orderInputSchema` — add `takenBy` field |
| `src/app/(kiosk)/checkout/page.tsx` | Passes `OrderInput` to `createOrder` — add `takenBy` |
| `supabase/migrations/` | New migration file goes here |

---

## Task 1: DB Migration — Add `taken_by` to `orders`

**Files:**
- Create: `supabase/migrations/20260529200000_orders_taken_by.sql`

**Step 1: Create the migration file**

```sql
-- Add taken_by column to orders — tracks which staff member placed the order
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS taken_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Index for reporting queries (filter orders by staff member)
CREATE INDEX IF NOT EXISTS orders_taken_by_idx ON orders(taken_by);

-- Rollback:
-- DROP INDEX IF EXISTS orders_taken_by_idx;
-- ALTER TABLE orders DROP COLUMN IF EXISTS taken_by;
```

**Step 2: Apply the migration**

```bash
npm run supabase:push
```

Expected: `Applying migration 20260529200000_orders_taken_by.sql... done`

**Step 3: Regenerate types**

```bash
npm run supabase:types
```

Expected: `src/lib/supabase/types.ts` updated — `orders` Row/Insert/Update now includes `taken_by: string | null`.

**Step 4: Verify the column exists**

Open `src/lib/supabase/types.ts`, search for `taken_by` — should appear under the `orders` table Row, Insert, and Update types.

**Step 5: Commit**

```bash
git add supabase/migrations/20260529200000_orders_taken_by.sql src/lib/supabase/types.ts
git commit -m "feat(db): add taken_by column to orders for staff performance tracking"
```

---

## Task 2: Staff Session Store

**Files:**
- Create: `src/stores/staff-session-store.ts`

**Step 1: Create the store**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type StaffRole = 'admin' | 'cashier' | 'kitchen' | 'waiter' | 'kiosk';

export interface StaffSession {
  id: string;
  full_name: string;
  role: StaffRole;
}

interface StaffSessionStore {
  session: StaffSession | null;
  setSession: (session: StaffSession) => void;
  clearSession: () => void;
}

export const useStaffSessionStore = create<StaffSessionStore>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),
    }),
    { name: 'staff-session' }
  )
);
```

**Step 2: Verify type check passes**

```bash
npm run type-check 2>&1 | grep staff-session
```

Expected: no output (no errors).

**Step 3: Commit**

```bash
git add src/stores/staff-session-store.ts
git commit -m "feat(store): add staff session store for PIN-based role tracking"
```

---

## Task 3: `resolveStaffPin` Server Action

**Files:**
- Modify: `src/services/user-service.ts`

**Step 1: Add the function at the end of `user-service.ts`**

After the `deleteUser` function, add:

```typescript
/**
 * Resolve a staff member by their PIN.
 * Returns their id, full_name, and role if the PIN matches an active profile.
 */
export async function resolveStaffPin(
  pin: string
): Promise<ServiceResult<{ id: string; full_name: string; role: string }>> {
  try {
    if (!pin || !/^\d{4,6}$/.test(pin)) {
      return { success: false, error: 'Invalid PIN format' };
    }

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('pin_hash', pin)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return { success: false, error: 'Incorrect PIN. Please try again.' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('resolveStaffPin failed:', error);
    return { success: false, error: 'Failed to verify PIN' };
  }
}
```

**Step 2: Verify type check**

```bash
npm run type-check 2>&1 | grep user-service
```

Expected: no output.

**Step 3: Commit**

```bash
git add src/services/user-service.ts
git commit -m "feat(service): add resolveStaffPin server action"
```

---

## Task 4: Employee PIN Dialog Component

**Files:**
- Create: `src/components/kiosk/employee-pin-dialog.tsx`

This is a kiosk-optimised PIN entry dialog. Styling reference: `src/components/kiosk/kiosk-pin-dialog.tsx`.

**Step 1: Create the component**

```typescript
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { resolveStaffPin } from '@/services/user-service';
import { useStaffSessionStore, type StaffRole } from '@/stores/staff-session-store';
import { cn } from '@/lib/utils';

const MAX_ATTEMPTS = 3;

interface EmployeePinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeePinDialog({ open, onOpenChange }: EmployeePinDialogProps) {
  const router = useRouter();
  const setSession = useStaffSessionStore((s) => s.setSession);

  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  const handleClose = useCallback(() => {
    setPin('');
    setError('');
    setAttempts(0);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSubmit = useCallback(async () => {
    if (pin.length < 4 || loading) return;
    setLoading(true);
    setError('');

    const result = await resolveStaffPin(pin);

    if (result.success) {
      setSession({
        id: result.data.id,
        full_name: result.data.full_name,
        role: result.data.role as StaffRole,
      });
      handleClose();
      // Kitchen role has no kiosk access — redirect immediately
      if (result.data.role === 'kitchen') {
        router.push('/kitchen/orders');
      }
    } else {
      const next = attempts + 1;
      setAttempts(next);
      setPin('');
      if (next >= MAX_ATTEMPTS) {
        handleClose();
      } else {
        setError(`${result.error} (${MAX_ATTEMPTS - next} attempt${MAX_ATTEMPTS - next !== 1 ? 's' : ''} left)`);
      }
    }

    setLoading(false);
  }, [pin, loading, attempts, setSession, handleClose, router]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm rounded-3xl border-orange-100/60 bg-[#FEF7EE] p-8">
        <DialogHeader className="items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center mb-2">
            <User className="w-7 h-7 text-orange-500" strokeWidth={1.75} />
          </div>
          <DialogTitle className="text-xl font-bold text-stone-800">
            Employee Sign-In
          </DialogTitle>
          <DialogDescription className="text-sm text-stone-500">
            Enter your 4–6 digit PIN
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <input
            type="password"
            inputMode="numeric"
            pattern="\d*"
            maxLength={6}
            value={pin}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="• • • •"
            autoFocus
            className={cn(
              'w-full h-24 text-6xl font-bold text-center tracking-[0.5em] rounded-2xl border bg-white',
              'placeholder:text-stone-200 placeholder:tracking-widest placeholder:text-4xl',
              'focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400',
              error ? 'border-rose-300' : 'border-stone-200'
            )}
          />
          {error && (
            <p className="text-xs text-rose-500 text-center mt-2">{error}</p>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={pin.length < 4 || loading}
          className={cn(
            'mt-4 w-full h-14 rounded-2xl font-bold text-base transition-all',
            'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none'
          )}
        >
          {loading ? 'Verifying…' : 'Sign In'}
        </button>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Type check**

```bash
npm run type-check 2>&1 | grep employee-pin
```

Expected: no output.

**Step 3: Commit**

```bash
git add src/components/kiosk/employee-pin-dialog.tsx
git commit -m "feat(kiosk): add EmployeePinDialog for staff PIN entry"
```

---

## Task 5: Welcome Screen — PIN Trigger & Employee Chip

**Files:**
- Modify: `src/components/kiosk/kiosk-welcome-client.tsx`

The right-arrow circle of "Start Your Order" becomes the PIN trigger. When a session is active, it shows the employee's name and a "Change" button instead.

**Step 1: Add imports at the top of `kiosk-welcome-client.tsx`**

Add to the existing imports:
```typescript
import { UserCircle2, RefreshCw } from 'lucide-react';
import { EmployeePinDialog } from '@/components/kiosk/employee-pin-dialog';
import { useStaffSessionStore } from '@/stores/staff-session-store';
```

**Step 2: Add state inside `KioskWelcomeClient`**

Add after the existing `useState` calls:
```typescript
const [pinDialogOpen, setPinDialogOpen] = useState(false);
const { session, clearSession } = useStaffSessionStore();
```

**Step 3: Replace the CTA button**

Find the existing CTA `<motion.button>` block (the orange "Start Your Order" button, roughly lines 211–228). Replace the right-side arrow circle with a role-aware section:

```tsx
{/* CTA */}
<motion.button
  onClick={handleStartOrder}
  className="w-full flex items-center bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white pl-1.5 pr-1.5 py-1.5 rounded-full shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all duration-200"
  variants={fadeUp}
  initial="hidden"
  animate={mounted ? 'show' : 'hidden'}
  custom={0.75}
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.97 }}
>
  <div className="w-12 h-12 flex-shrink-0 rounded-full bg-white/20 flex items-center justify-center">
    <UtensilsCrossed className="w-5 h-5 text-white" strokeWidth={2} />
  </div>
  <span className="flex-1 text-center text-[17px] font-bold tracking-wide pr-2">Start Your Order</span>

  {/* Right side: employee chip or PIN trigger */}
  {session ? (
    <div
      className="flex items-center gap-1.5 bg-white/20 rounded-full pl-2 pr-1 py-1 max-w-[140px]"
      onClick={(e) => { e.stopPropagation(); clearSession(); }}
      title="Click to change employee"
    >
      <UserCircle2 className="w-4 h-4 text-white flex-shrink-0" strokeWidth={1.75} />
      <span className="text-xs font-semibold text-white truncate">{session.full_name}</span>
      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
        <RefreshCw className="w-3 h-3 text-white" strokeWidth={2} />
      </div>
    </div>
  ) : (
    <div
      className="w-12 h-12 flex-shrink-0 rounded-full bg-white/25 flex items-center justify-center"
      onClick={(e) => { e.stopPropagation(); setPinDialogOpen(true); }}
      title="Employee sign-in"
    >
      <ArrowRight className="w-5 h-5 text-white" strokeWidth={2.5} />
    </div>
  )}
</motion.button>
```

**Step 4: Add the dialog below `<KioskAdminOverlay />`**

```tsx
<EmployeePinDialog open={pinDialogOpen} onOpenChange={setPinDialogOpen} />
```

**Step 5: Type check**

```bash
npm run type-check 2>&1 | grep kiosk-welcome
```

Expected: no output.

**Step 6: Commit**

```bash
git add src/components/kiosk/kiosk-welcome-client.tsx
git commit -m "feat(kiosk): employee PIN trigger and session chip on welcome screen"
```

---

## Task 6: Role-Gated Navigation in `kiosk-pos-layout.tsx`

**Files:**
- Modify: `src/components/kiosk/kiosk-pos-layout.tsx`

**Step 1: Add imports**

Add to existing imports:
```typescript
import { useRouter } from 'next/navigation';
import { CreditCard } from 'lucide-react';
import { useStaffSessionStore } from '@/stores/staff-session-store';
```

**Step 2: Replace the hardcoded `NAV_ITEMS` constant**

Remove lines 82–87:
```typescript
const NAV_ITEMS = [
  { icon: UtensilsCrossed, label: 'Menu',   active: true  },
  { icon: ClipboardList,   label: 'Orders',  active: false },
  { icon: LayoutGrid,      label: 'Tables',  active: false },
  { icon: MoreHorizontal,  label: 'More',    active: false },
] as const;
```

Replace with:
```typescript
type NavItem = {
  icon: LucideIcon;
  label: string;
  href?: string;
};

const ALL_NAV_ITEMS: NavItem[] = [
  { icon: UtensilsCrossed, label: 'Menu' },
  { icon: ClipboardList,   label: 'Orders',   href: '/waiter/service' },
  { icon: LayoutGrid,      label: 'Tables',   href: '/waiter/service' },
  { icon: CreditCard,      label: 'Payments', href: '/cashier/payments' },
];

function getNavItems(role: string | undefined): NavItem[] {
  if (!role) return [ALL_NAV_ITEMS[0]]; // guest — Menu only
  if (role === 'waiter') return ALL_NAV_ITEMS.slice(0, 3); // Menu + Orders + Tables
  if (role === 'cashier' || role === 'admin') return ALL_NAV_ITEMS; // all 4
  return [ALL_NAV_ITEMS[0]]; // kiosk/other — Menu only
}
```

**Step 3: Use the dynamic nav inside `KioskPosLayout`**

Add inside the component body, after existing `useState` calls:
```typescript
const router = useRouter();
const staffRole = useStaffSessionStore((s) => s.session?.role);
const navItems = getNavItems(staffRole);
```

**Step 4: Replace the nav render in the left icon nav**

Find the `{NAV_ITEMS.map(...)}` block (around line 152) and replace with:
```tsx
{navItems.map(({ icon: Icon, label, href }) => {
  const isActive = label === 'Menu';
  return (
    <button
      key={label}
      onClick={() => href && router.push(href)}
      className={cn(
        'flex flex-col items-center justify-center gap-1.5 w-full py-3 rounded-xl transition-all duration-200 cursor-pointer',
        isActive
          ? 'bg-amber-500/20'
          : 'hover:bg-white/[0.06] active:bg-white/10'
      )}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200',
        isActive ? 'bg-amber-500/25' : 'bg-transparent'
      )}>
        <Icon
          className={cn('w-[18px] h-[18px] transition-colors duration-200', isActive ? 'text-amber-400' : 'text-stone-500')}
          strokeWidth={isActive ? 2 : 1.75}
        />
      </div>
      <span className={cn(
        'text-[9px] font-semibold leading-none tracking-wide transition-colors duration-200',
        isActive ? 'text-amber-400' : 'text-stone-500'
      )}>
        {label}
      </span>
    </button>
  );
})}
```

**Step 5: Type check**

```bash
npm run type-check 2>&1 | grep kiosk-pos-layout
```

Expected: no output.

**Step 6: Commit**

```bash
git add src/components/kiosk/kiosk-pos-layout.tsx
git commit -m "feat(kiosk): role-gated nav items based on staff session"
```

---

## Task 7: Attach `takenBy` to Order Input

**Files:**
- Modify: `src/lib/validators/order.ts`
- Modify: `src/services/order-service.ts`

**Step 1: Add `takenBy` to `orderInputSchema` in `order.ts`**

In `orderInputSchema`, add after `ewalletReference`:
```typescript
takenBy: z.string().uuid().optional().nullable(),
```

**Step 2: Pass `taken_by` in the `orders` insert in `order-service.ts`**

In the `.insert({...})` block (around line 691), add after `ewallet_reference`:
```typescript
taken_by: validated.takenBy ?? null,
```

**Step 3: Type check**

```bash
npm run type-check 2>&1 | grep -E "order-service|order\.ts"
```

Expected: no output.

**Step 4: Commit**

```bash
git add src/lib/validators/order.ts src/services/order-service.ts
git commit -m "feat(orders): add takenBy field — tag orders with staff member who placed them"
```

---

## Task 8: Checkout Passes `takenBy`

**Files:**
- Modify: `src/app/(kiosk)/checkout/page.tsx`

The checkout page calls `createOrder(orderInput)`. We need to read the staff session store and include `takenBy` in the payload.

**Step 1: Find where `createOrder` is called in `checkout/page.tsx`**

Search for `createOrder(` in that file. It will be inside a submit handler.

**Step 2: Add the store import at the top**

```typescript
import { useStaffSessionStore } from '@/stores/staff-session-store';
```

**Step 3: Read the session inside the component**

```typescript
const staffSessionId = useStaffSessionStore((s) => s.session?.id ?? null);
```

**Step 4: Add `takenBy` to the `createOrder` call**

In the object passed to `createOrder`, add:
```typescript
takenBy: staffSessionId,
```

**Step 5: Type check**

```bash
npm run type-check 2>&1 | grep checkout
```

Expected: no output.

**Step 6: Commit**

```bash
git add src/app/(kiosk)/checkout/page.tsx
git commit -m "feat(checkout): attach staff session ID to orders as taken_by"
```

---

## Task 9: Kitchen Role Redirect Guard

**Files:**
- Modify: `src/components/kiosk/kiosk-pos-layout.tsx`

Kitchen staff should never land on the kiosk menu — if they somehow reach `/menu`, redirect them.

**Step 1: Add a `useEffect` guard inside `KioskPosLayout`**

Add after the `staffRole` line:
```typescript
useEffect(() => {
  if (staffRole === 'kitchen') {
    router.replace('/kitchen/orders');
  }
}, [staffRole, router]);
```

**Step 2: Add `useEffect` to imports if not already present**

`kiosk-pos-layout.tsx` already has `useState`, `useRef`, `useCallback` — add `useEffect` to that import.

**Step 3: Type check**

```bash
npm run type-check 2>&1 | grep kiosk-pos-layout
```

Expected: no output.

**Step 4: Commit**

```bash
git add src/components/kiosk/kiosk-pos-layout.tsx
git commit -m "feat(kiosk): redirect kitchen role away from kiosk menu"
```

---

## Manual Testing Checklist

After all tasks are complete:

- [ ] Guest (no PIN): welcome screen shows arrow → clicking it opens PIN dialog → entering wrong PIN shows attempt counter → 3 fails closes dialog
- [ ] Waiter PIN: welcome screen shows employee chip with name → Start Your Order → menu shows Menu + Orders + Tables nav items → clicking Orders navigates to `/waiter/service`
- [ ] Cashier PIN: menu shows Menu + Orders + Tables + Payments → clicking Payments navigates to `/cashier/payments`
- [ ] Admin PIN: same nav as cashier
- [ ] Kitchen PIN: after PIN entry, immediately redirected to `/kitchen/orders`
- [ ] "Change Employee" (clicking the chip): clears session → arrow returns
- [ ] Place an order as a waiter → check Supabase `orders` table — `taken_by` column populated with waiter's profile UUID
- [ ] Place an order as guest → `taken_by` is `null`
- [ ] Refresh the page — staff session persists (localStorage)
