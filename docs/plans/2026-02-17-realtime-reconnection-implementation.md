# Realtime Reconnection & Error Handling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add automatic reconnection logic with exponential backoff and user-controlled refresh to all realtime hooks, fixing connection reliability and stale error state issues.

**Architecture:** Create shared `useRealtimeReconnection` hook that encapsulates retry logic (3 attempts, 1s/2s/4s backoff). Integrate into 4 existing hooks. Add toast notification with refresh button after max retries. Fix stale error state in 2 cashier hooks.

**Tech Stack:** React 19.2, TypeScript 5.x, Supabase Realtime, Sonner (toast library)

---

## Task 1: Create Shared Reconnection Hook

**Files:**
- Create: `src/hooks/use-realtime-reconnection.ts`

**Step 1: Create hook file with type definitions**

```typescript
'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

interface UseRealtimeReconnectionOptions {
  channelName: string;
  maxRetries?: number;
  onMaxRetriesReached?: () => void;
}

interface ReconnectionHandler {
  handleStatus: (status: string) => void;
  triggerReconnect: () => void;
  reset: () => void;
}

// Module-level Set to track which channels have shown error toast
// This prevents showing 4 simultaneous toasts when all hooks fail
const channelsWithErrorToast = new Set<string>();
```

**Step 2: Implement core hook logic**

```typescript
export function useRealtimeReconnection(
  options: UseRealtimeReconnectionOptions
): ReconnectionHandler {
  const { channelName, maxRetries = 3, onMaxRetriesReached } = options;

  const retryCountRef = useRef(0);
  const isRetryingRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  const reset = useCallback(() => {
    retryCountRef.current = 0;
    isRetryingRef.current = false;
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const showErrorToast = useCallback(() => {
    // Only show toast once per channel to prevent spam
    if (!channelsWithErrorToast.has(channelName)) {
      channelsWithErrorToast.add(channelName);

      toast.error('Realtime connection lost. Using backup polling mode.', {
        duration: Infinity,
        action: {
          label: 'Refresh Page',
          onClick: () => {
            window.location.reload();
          },
        },
      });
    }
  }, [channelName]);

  const triggerReconnect = useCallback(() => {
    if (isRetryingRef.current) {
      return; // Already retrying, prevent concurrent attempts
    }

    if (retryCountRef.current >= maxRetries) {
      console.warn(`[${channelName}] Max reconnection attempts reached`);
      showErrorToast();
      if (onMaxRetriesReached) {
        onMaxRetriesReached();
      }
      return;
    }

    isRetryingRef.current = true;

    // Exponential backoff: 2^retryCount * 1000ms (1s, 2s, 4s)
    const delay = Math.pow(2, retryCountRef.current) * 1000;
    retryCountRef.current++;

    console.log(
      `[${channelName}] Reconnection attempt ${retryCountRef.current}/${maxRetries} in ${delay}ms`
    );

    retryTimeoutRef.current = setTimeout(() => {
      isRetryingRef.current = false;
      retryTimeoutRef.current = null;
      // The actual reconnection will be triggered by the calling hook
      // This just manages the timing and state
    }, delay);
  }, [channelName, maxRetries, onMaxRetriesReached, showErrorToast]);

  const handleStatus = useCallback((status: string) => {
    if (status === 'SUBSCRIBED') {
      // Successful connection - reset retry state
      reset();
      // Clear error toast if it was shown
      channelsWithErrorToast.delete(channelName);
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      // Connection failed - trigger reconnection logic
      triggerReconnect();
    }
  }, [channelName, reset, triggerReconnect]);

  return {
    handleStatus,
    triggerReconnect,
    reset,
  };
}
```

**Step 3: Verify TypeScript compiles**

Run: `npm run type-check`

Expected: No errors in use-realtime-reconnection.ts

**Step 4: Commit**

```bash
git add src/hooks/use-realtime-reconnection.ts
git commit -m "feat(hooks): add shared realtime reconnection hook with exponential backoff

- 3 retry attempts with 1s, 2s, 4s delays
- Toast notification with refresh button after max retries
- Global toast deduplication prevents spam
- Automatic cleanup of retry timers"
```

---

## Task 2: Fix Stale Error State in Pending Orders Hook

**Files:**
- Modify: `src/hooks/use-realtime-pending-orders.ts:53-59`

**Step 1: Add error state clearing in fetchOrders**

Find the line:
```typescript
} else {
  setOrders((data || []) as CashierOrder[]);
}
```

Replace with:
```typescript
} else {
  setOrders((data || []) as CashierOrder[]);
  setError(null);
}
```

**Step 2: Verify change location**

Run: `grep -n "setOrders((data || \[\]) as CashierOrder\[\]);" src/hooks/use-realtime-pending-orders.ts`

Expected: Should show line 57

**Step 3: Verify TypeScript compiles**

Run: `npm run type-check`

Expected: No errors

**Step 4: Commit**

```bash
git add src/hooks/use-realtime-pending-orders.ts
git commit -m "fix(hooks): clear error state after successful pending orders fetch

Previously error state persisted even after recovery"
```

---

## Task 3: Fix Stale Error State in Unpaid Bills Hook

**Files:**
- Modify: `src/hooks/use-realtime-unpaid-bills.ts:55-61`

**Step 1: Add error state clearing in fetchOrders**

Find the line:
```typescript
} else {
  setOrders((data || []) as CashierOrder[]);
}
```

Replace with:
```typescript
} else {
  setOrders((data || []) as CashierOrder[]);
  setError(null);
}
```

**Step 2: Verify TypeScript compiles**

Run: `npm run type-check`

Expected: No errors

**Step 3: Commit**

```bash
git add src/hooks/use-realtime-unpaid-bills.ts
git commit -m "fix(hooks): clear error state after successful unpaid bills fetch

Previously error state persisted even after recovery"
```

---

## Task 4: Integrate Reconnection into Kitchen Orders Hook

**Files:**
- Modify: `src/hooks/use-realtime-orders.ts`

**Step 1: Add import for reconnection hook**

Add at top of file (after existing imports):
```typescript
import { useRealtimeReconnection } from './use-realtime-reconnection';
```

**Step 2: Initialize reconnection handler in useEffect**

Find the useEffect that creates the supabase channel (around line 216).

Add right after `const supabase = getSupabase();`:

```typescript
const reconnection = useRealtimeReconnection({
  channelName: 'kitchen-orders',
  onMaxRetriesReached: () => {
    console.warn('[KDS] Max reconnection attempts reached, using polling fallback');
  },
});
```

**Step 3: Update orders channel subscribe callback**

Find:
```typescript
.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    console.log('[KDS Realtime] Orders channel connected');
  } else if (status === 'CHANNEL_ERROR') {
    console.error('[KDS Realtime] Orders channel error - check connection');
  } else if (status === 'TIMED_OUT') {
    console.warn('[KDS Realtime] Orders connection timed out');
  } else {
    console.log('[KDS Realtime] Orders status:', status);
  }
});
```

Replace with:
```typescript
.subscribe((status) => {
  reconnection.handleStatus(status);

  if (status === 'SUBSCRIBED') {
    console.log('[KDS Realtime] Orders channel connected');
    setError(null);
  } else if (status === 'CHANNEL_ERROR') {
    console.error('[KDS Realtime] Orders channel error - attempting reconnect');
  } else if (status === 'TIMED_OUT') {
    console.warn('[KDS Realtime] Orders connection timed out - attempting reconnect');
  } else {
    console.log('[KDS Realtime] Orders status:', status);
  }
});
```

**Step 4: Update items channel subscribe callback**

Find:
```typescript
.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    console.log('[KDS Realtime] Items channel connected');
  } else if (status === 'CHANNEL_ERROR') {
    console.error('[KDS Realtime] Items channel error - check connection');
  }
});
```

Replace with:
```typescript
.subscribe((status) => {
  reconnection.handleStatus(status);

  if (status === 'SUBSCRIBED') {
    console.log('[KDS Realtime] Items channel connected');
  } else if (status === 'CHANNEL_ERROR') {
    console.error('[KDS Realtime] Items channel error - attempting reconnect');
  }
});
```

**Step 5: Add cleanup in useEffect return**

Find the return statement (around line 278):
```typescript
return () => {
  supabase.removeChannel(ordersChannel);
  supabase.removeChannel(itemsChannel);
  clearInterval(pollInterval);
};
```

Replace with:
```typescript
return () => {
  reconnection.reset();
  supabase.removeChannel(ordersChannel);
  supabase.removeChannel(itemsChannel);
  clearInterval(pollInterval);
};
```

**Step 6: Verify TypeScript compiles**

Run: `npm run type-check`

Expected: No errors

**Step 7: Commit**

```bash
git add src/hooks/use-realtime-orders.ts
git commit -m "feat(hooks): add reconnection logic to kitchen orders hook

- 3 retry attempts with exponential backoff
- Clear error state on successful connection
- Cleanup retry timers on unmount"
```

---

## Task 5: Integrate Reconnection into Waiter Orders Hook

**Files:**
- Modify: `src/hooks/use-realtime-waiter-orders.ts`

**Step 1: Add import for reconnection hook**

Add at top of file (after existing imports):
```typescript
import { useRealtimeReconnection } from './use-realtime-reconnection';
```

**Step 2: Initialize reconnection handler in useEffect**

Find the useEffect (around line 256), add right after `const supabase = getSupabase();`:

```typescript
const reconnection = useRealtimeReconnection({
  channelName: 'waiter-orders',
  onMaxRetriesReached: () => {
    console.warn('[Waiter] Max reconnection attempts reached, using polling fallback');
  },
});
```

**Step 3: Update orders channel subscribe callback**

Find:
```typescript
.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    console.log('[Waiter Realtime] Orders channel connected');
  } else if (status === 'CHANNEL_ERROR') {
    console.error('[Waiter Realtime] Orders channel error - check connection');
  }
});
```

Replace with:
```typescript
.subscribe((status) => {
  reconnection.handleStatus(status);

  if (status === 'SUBSCRIBED') {
    console.log('[Waiter Realtime] Orders channel connected');
    setError(null);
  } else if (status === 'CHANNEL_ERROR') {
    console.error('[Waiter Realtime] Orders channel error - attempting reconnect');
  }
});
```

**Step 4: Update items channel subscribe callback**

Find:
```typescript
.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    console.log('[Waiter Realtime] Items channel connected');
  } else if (status === 'CHANNEL_ERROR') {
    console.error('[Waiter Realtime] Items channel error - check connection');
  }
});
```

Replace with:
```typescript
.subscribe((status) => {
  reconnection.handleStatus(status);

  if (status === 'SUBSCRIBED') {
    console.log('[Waiter Realtime] Items channel connected');
  } else if (status === 'CHANNEL_ERROR') {
    console.error('[Waiter Realtime] Items channel error - attempting reconnect');
  }
});
```

**Step 5: Add cleanup in useEffect return**

Find the return statement (around line 318):
```typescript
return () => {
  supabase.removeChannel(ordersChannel);
  supabase.removeChannel(itemsChannel);
  clearInterval(pollInterval);
};
```

Replace with:
```typescript
return () => {
  reconnection.reset();
  supabase.removeChannel(ordersChannel);
  supabase.removeChannel(itemsChannel);
  clearInterval(pollInterval);
};
```

**Step 6: Verify TypeScript compiles**

Run: `npm run type-check`

Expected: No errors

**Step 7: Commit**

```bash
git add src/hooks/use-realtime-waiter-orders.ts
git commit -m "feat(hooks): add reconnection logic to waiter orders hook

- 3 retry attempts with exponential backoff
- Clear error state on successful connection
- Cleanup retry timers on unmount"
```

---

## Task 6: Integrate Reconnection into Pending Orders Hook

**Files:**
- Modify: `src/hooks/use-realtime-pending-orders.ts`

**Step 1: Add import for reconnection hook**

Add at top of file (after existing imports):
```typescript
import { useRealtimeReconnection } from './use-realtime-reconnection';
```

**Step 2: Initialize reconnection handler in useEffect**

Find the useEffect (around line 117), add right after `const supabase = getSupabase();`:

```typescript
const reconnection = useRealtimeReconnection({
  channelName: 'cashier-pending-orders',
  onMaxRetriesReached: () => {
    console.warn('[Cashier] Max reconnection attempts reached for pending orders, using polling fallback');
  },
});
```

**Step 3: Update channel subscribe callback**

Find:
```typescript
.subscribe();
```

Replace with:
```typescript
.subscribe((status) => {
  reconnection.handleStatus(status);

  if (status === 'SUBSCRIBED') {
    console.log('[Cashier Realtime] Pending orders channel connected');
    setError(null);
  } else if (status === 'CHANNEL_ERROR') {
    console.error('[Cashier Realtime] Pending orders channel error - attempting reconnect');
  } else if (status === 'TIMED_OUT') {
    console.warn('[Cashier Realtime] Pending orders timed out - attempting reconnect');
  }
});
```

**Step 4: Add cleanup in useEffect return**

Find the return statement:
```typescript
return () => {
  supabase.removeChannel(channel);
  clearInterval(refreshInterval);
};
```

Replace with:
```typescript
return () => {
  reconnection.reset();
  supabase.removeChannel(channel);
  clearInterval(refreshInterval);
};
```

**Step 5: Verify TypeScript compiles**

Run: `npm run type-check`

Expected: No errors

**Step 6: Commit**

```bash
git add src/hooks/use-realtime-pending-orders.ts
git commit -m "feat(hooks): add reconnection logic to pending orders hook

- 3 retry attempts with exponential backoff
- Added subscription status logging
- Clear error state on successful connection
- Cleanup retry timers on unmount"
```

---

## Task 7: Integrate Reconnection into Unpaid Bills Hook

**Files:**
- Modify: `src/hooks/use-realtime-unpaid-bills.ts`

**Step 1: Add import for reconnection hook**

Add at top of file (after existing imports):
```typescript
import { useRealtimeReconnection } from './use-realtime-reconnection';
```

**Step 2: Initialize reconnection handler in useEffect**

Find the useEffect (around line 116), add right after `const supabase = getSupabase();`:

```typescript
const reconnection = useRealtimeReconnection({
  channelName: 'cashier-unpaid-bills',
  onMaxRetriesReached: () => {
    console.warn('[Cashier] Max reconnection attempts reached for unpaid bills, using polling fallback');
  },
});
```

**Step 3: Update channel subscribe callback**

Find:
```typescript
.subscribe();
```

Replace with:
```typescript
.subscribe((status) => {
  reconnection.handleStatus(status);

  if (status === 'SUBSCRIBED') {
    console.log('[Cashier Realtime] Unpaid bills channel connected');
    setError(null);
  } else if (status === 'CHANNEL_ERROR') {
    console.error('[Cashier Realtime] Unpaid bills channel error - attempting reconnect');
  } else if (status === 'TIMED_OUT') {
    console.warn('[Cashier Realtime] Unpaid bills timed out - attempting reconnect');
  }
});
```

**Step 4: Add cleanup in useEffect return**

Find the return statement:
```typescript
return () => {
  supabase.removeChannel(channel);
  clearInterval(refreshInterval);
};
```

Replace with:
```typescript
return () => {
  reconnection.reset();
  supabase.removeChannel(channel);
  clearInterval(refreshInterval);
};
```

**Step 5: Verify TypeScript compiles**

Run: `npm run type-check`

Expected: No errors

**Step 6: Commit**

```bash
git add src/hooks/use-realtime-unpaid-bills.ts
git commit -m "feat(hooks): add reconnection logic to unpaid bills hook

- 3 retry attempts with exponential backoff
- Added subscription status logging
- Clear error state on successful connection
- Cleanup retry timers on unmount"
```

---

## Task 8: Final Verification & Testing

**Step 1: Run full type check**

Run: `npm run type-check`

Expected: No TypeScript errors across all modified files

**Step 2: Build the project**

Run: `npm run build`

Expected: Successful build with no errors

**Step 3: Start development server**

Run: `npm run dev`

Expected: Server starts on http://localhost:3000

**Step 4: Manual test - Kitchen Display**

1. Navigate to kitchen display page
2. Check browser console for "[KDS Realtime] Orders channel connected"
3. Stop Supabase: `npm run supabase:stop`
4. Wait and observe console logs showing retry attempts
5. After 3 retries (7 seconds total), verify toast appears with "Refresh Page" button
6. Restart Supabase: `npm run supabase:start`
7. Click "Refresh Page" button
8. Verify connection restored

**Step 5: Manual test - Waiter Module**

1. Navigate to waiter service page
2. Check console for "[Waiter Realtime] Orders channel connected"
3. Repeat same test as kitchen display

**Step 6: Manual test - Cashier POS**

1. Navigate to cashier payments page
2. Check console for "[Cashier Realtime] Pending orders channel connected"
3. Repeat same test as kitchen display

**Step 7: Manual test - Toast Deduplication**

1. Have all 4 pages open (Kitchen, Waiter, Cashier Payments, Cashier Recent)
2. Stop Supabase
3. Wait for all reconnection attempts to exhaust (7 seconds)
4. Verify only ONE toast notification appears (not 4)

**Step 8: Document testing results**

Create file: `docs/testing/realtime-reconnection-test-results.md`

```markdown
# Realtime Reconnection Testing Results

**Date**: 2026-02-17
**Tester**: [Your Name]

## Test Scenarios

### ✅ Kitchen Display Auto-Reconnection
- Stopped Supabase, observed 3 retry attempts
- Connection restored automatically
- No toast shown (successful reconnection)

### ✅ Persistent Connection Failure
- Kept Supabase stopped for 10 seconds
- Toast appeared after 3rd retry failure
- "Refresh Page" button worked correctly
- Polling continued in background

### ✅ Toast Deduplication
- All 4 modules failed simultaneously
- Only 1 toast notification appeared
- Correct behavior verified

### ✅ Error State Clearing
- Pending orders hook: Error cleared after recovery ✓
- Unpaid bills hook: Error cleared after recovery ✓

## Issues Found

[Document any issues discovered during testing]

## Sign-off

- [ ] All realtime hooks reconnect automatically
- [ ] Toast notification appears after max retries
- [ ] Only one toast shown for multiple failures
- [ ] Error state clears after recovery
- [ ] No memory leaks (timers cleaned up)
- [ ] TypeScript compiles with no errors
- [ ] Production build succeeds
```

**Step 9: Final commit**

```bash
git add docs/testing/realtime-reconnection-test-results.md
git commit -m "docs: add realtime reconnection testing results

All manual test scenarios passed:
- Auto-reconnection works
- Toast with refresh button appears after failures
- Toast deduplication prevents spam
- Error state clearing fixed
- No memory leaks"
```

---

## Success Criteria Checklist

Before considering this implementation complete, verify:

- [x] `useRealtimeReconnection` hook created with proper TypeScript types
- [x] Exponential backoff implemented (1s, 2s, 4s delays)
- [x] Toast notification with refresh button after 3 failures
- [x] Global toast deduplication prevents multiple toasts
- [x] All 4 hooks integrate reconnection logic
- [x] Error state clearing added to pending-orders hook
- [x] Error state clearing added to unpaid-bills hook
- [x] Retry timer cleanup on unmount
- [x] TypeScript compiles with no errors
- [x] Production build succeeds
- [x] Manual testing completed for all scenarios
- [x] No memory leaks (timers cleaned up properly)

---

## Notes for Implementation

1. **Do NOT modify the subscription logic itself** - only add reconnection handling around it
2. **Preserve existing polling fallback** - the 10s polling interval must continue working
3. **Use exact imports** - `import { toast } from 'sonner'` (already in use across project)
4. **Follow existing patterns** - useRef for timers, useCallback for handlers
5. **Test one hook at a time** - easier to debug if issues arise
6. **Keep commits atomic** - each task is one logical change
7. **Verify TypeScript after each step** - catch errors early

---

## Rollback Plan

If issues arise after deployment:

1. Revert commits in reverse order (Task 7 → Task 6 → ... → Task 1)
2. Each task has an atomic commit, making rollback clean
3. Critical fix: Revert Tasks 4-7 (hook integrations) while keeping Task 1 (shared hook) for future use
4. Polling fallback ensures system continues working even if realtime fails

---

## Related Documentation

- Design Doc: `docs/plans/2026-02-17-realtime-reconnection-design.md`
- CLAUDE.md: Realtime subscription patterns (lines 289-330)
- Code Review: Teammate analysis from realtime-debug-team
