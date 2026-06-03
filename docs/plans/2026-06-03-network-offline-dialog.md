# Network Offline Dialog Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show a dismissible network-offline dialog on all kiosk pages (restaurant + ocean-view) when internet connectivity is lost, with auto-reappear after 30s if still offline and a manual Retry button.

**Architecture:** A `useNetworkStatus` hook listens to browser `offline`/`online` events; on `online` it ping-verifies via a HEAD request to `/arenalogo.png` before clearing offline state. A `NetworkOfflineDialog` shared component is added once to `KioskLayoutInner` — this single placement covers every kiosk route including `/ocean-view` since it lives inside the `(kiosk)` route group.

**Tech Stack:** React hooks, browser `online`/`offline` events, fetch with AbortController timeout, Tailwind v4, Lucide icons, shadcn/ui Dialog primitive.

---

### Task 1: Create `useNetworkStatus` hook

**Files:**
- Create: `src/hooks/use-network-status.ts`

**Step 1: Create the hook**

```typescript
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const PING_URL = '/arenalogo.png';
const PING_TIMEOUT_MS = 5000;

async function checkConnectivity(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    const res = await fetch(`${PING_URL}?_=${Date.now()}`, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  // Avoid state updates after unmount
  const mountedRef = useRef(true);

  const verify = useCallback(async () => {
    if (!mountedRef.current) return;
    setIsChecking(true);
    const ok = await checkConnectivity();
    if (mountedRef.current) {
      setIsOnline(ok);
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const handleOffline = () => {
      if (mountedRef.current) setIsOnline(false);
    };
    const handleOnline = () => {
      // Don't trust the browser event alone — ping verify
      verify();
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // Check once on mount in case the page loaded offline
    if (!navigator.onLine) setIsOnline(false);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [verify]);

  return { isOnline, isChecking, retry: verify };
}
```

**Step 2: Type-check**

```bash
npm run type-check
```
Expected: no errors related to this file.

---

### Task 2: Create `NetworkOfflineDialog` component

**Files:**
- Create: `src/components/shared/network-offline-dialog.tsx`

**Step 1: Create the component**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const RESHOW_AFTER_MS = 30_000;

interface NetworkOfflineDialogProps {
  isOnline: boolean;
  isChecking: boolean;
  onRetry: () => void;
}

export function NetworkOfflineDialog({ isOnline, isChecking, onRetry }: NetworkOfflineDialogProps) {
  const [dismissed, setDismissed] = useState(false);
  const reshowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When online status restores, reset dismissed so it doesn't linger
  useEffect(() => {
    if (isOnline) {
      setDismissed(false);
      if (reshowTimerRef.current) clearTimeout(reshowTimerRef.current);
    }
  }, [isOnline]);

  // When dismissed while still offline, schedule re-show after 30s
  useEffect(() => {
    if (dismissed && !isOnline) {
      reshowTimerRef.current = setTimeout(() => setDismissed(false), RESHOW_AFTER_MS);
    }
    return () => {
      if (reshowTimerRef.current) clearTimeout(reshowTimerRef.current);
    };
  }, [dismissed, isOnline]);

  const visible = !isOnline && !dismissed;
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-red-50 flex items-center justify-center">
          <WifiOff className="w-8 h-8 text-red-500" strokeWidth={1.75} />
        </div>

        {/* Heading */}
        <h2 className="text-xl font-bold text-stone-800 mb-2">No Internet Connection</h2>
        <p className="text-stone-500 text-sm mb-7 leading-relaxed">
          Please check your network connection. Ordering, payments, and order status require an active connection.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onRetry}
            disabled={isChecking}
            className={cn(
              'w-full h-12 rounded-xl font-semibold text-sm transition-all',
              'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/25',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center justify-center gap-2'
            )}
          >
            <RefreshCw className={cn('w-4 h-4', isChecking && 'animate-spin')} strokeWidth={2} />
            {isChecking ? 'Checking…' : 'Retry Connection'}
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="w-full h-11 rounded-xl font-medium text-sm text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition-all"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Type-check**

```bash
npm run type-check
```
Expected: no errors.

---

### Task 3: Wire into kiosk layout

**Files:**
- Modify: `src/app/(kiosk)/layout.tsx`

**Step 1: Add imports at the top of `layout.tsx`**

Add these two imports alongside the existing ones:

```typescript
import { useNetworkStatus } from '@/hooks/use-network-status';
import { NetworkOfflineDialog } from '@/components/shared/network-offline-dialog';
```

**Step 2: Add hook call inside `KioskLayoutInner`**

After the existing `const { location, isLoaded, setLocation, clearLocation } = useKioskLocation();` line, add:

```typescript
const { isOnline, isChecking, retry } = useNetworkStatus();
```

**Step 3: Add the dialog before the closing `</div>` of `KioskLayoutInner`, after the existing `KioskPinDialog`**

Add this right after the `<KioskPinDialog ... />` block (before the idle warning overlay):

```tsx
{/* Network Offline Dialog */}
<NetworkOfflineDialog isOnline={isOnline} isChecking={isChecking} onRetry={retry} />
```

**Step 4: Type-check and verify**

```bash
npm run type-check
```
Expected: no errors.

**Step 5: Manual test**

1. Start dev server: `npm run dev`
2. Open `localhost:3000` (restaurant kiosk) and `localhost:3000/ocean-view`
3. In Chrome DevTools → Network tab → set throttling to **Offline**
4. Verify the dialog appears on both pages
5. Click **Retry Connection** — spinner shows, then dialog stays (still offline)
6. Click **Dismiss** — dialog hides
7. Wait 30 seconds — dialog reappears automatically
8. Restore network in DevTools → dialog auto-hides
9. Test during menu browsing (`/menu`), cart (`/cart`), and checkout

**Step 6: Commit**

```bash
git add src/hooks/use-network-status.ts src/components/shared/network-offline-dialog.tsx src/app/(kiosk)/layout.tsx
git commit -m "feat(kiosk): add dismissible network offline dialog to all kiosk pages"
```

---

## Summary

- `useNetworkStatus` — browser events + ping verification, safe unmount cleanup
- `NetworkOfflineDialog` — dismissible, auto-reappears after 30s, retry button with spinner
- Wired once in `KioskLayoutInner` — covers restaurant kiosk, ocean-view, menu, cart, checkout, confirmation, add-items
- z-index `200` — above idle warning (`100`) and all other overlays
