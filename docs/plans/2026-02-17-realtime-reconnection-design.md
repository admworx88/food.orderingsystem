# Realtime Reconnection & Error Handling Design

**Date**: 2026-02-17
**Status**: Approved
**Author**: Claude (with user approval)

## Problem Statement

The current realtime hooks (`use-realtime-orders.ts`, `use-realtime-waiter-orders.ts`, `use-realtime-pending-orders.ts`, `use-realtime-unpaid-bills.ts`) have three critical issues:

1. **No reconnection logic** - When CHANNEL_ERROR or TIMED_OUT occurs, the subscription dies permanently until page refresh
2. **Stale error state** - Two hooks (`use-realtime-pending-orders`, `use-realtime-unpaid-bills`) never clear `error` state after recovery
3. **Inconsistent error handling** - Different patterns across hooks, making debugging difficult

## User Impact

- Kitchen staff lose realtime order updates silently, causing delayed food preparation
- Cashiers miss new pending orders, leading to longer customer wait times
- Waiter service tracking stops updating, resulting in poor table service
- Users have no visibility into connection issues and no clear remedy

## Solution Overview

Implement **Approach B1: Conservative reconnection with user-controlled refresh**

- Retry 3 times with exponential backoff (1s, 2s, 4s)
- After 3rd failure: Show toast notification with "Refresh Page" button
- Continue with 10s polling fallback (already exists)
- User controls when to refresh, minimizing workflow disruption

## Architecture

### Core Component: `useRealtimeReconnection` Hook

A shared custom hook that encapsulates all reconnection logic:

```typescript
interface UseRealtimeReconnectionOptions {
  channelName: string;
  maxRetries?: number;        // Default: 3
  onMaxRetriesReached?: () => void;
}

interface ReconnectionHandler {
  handleStatus: (status: string) => void;
  triggerReconnect: () => void;
  reset: () => void;
}

function useRealtimeReconnection(
  options: UseRealtimeReconnectionOptions
): ReconnectionHandler
```

### State Management

- `retryCount` - Current retry attempt (0-3)
- `isRetrying` - Boolean flag to prevent concurrent retries
- `retryTimeout` - Timer reference for cleanup
- Global `Set<string>` to track which channels have shown error toast (prevents duplicate toasts)

### Reconnection Flow

```
CHANNEL_ERROR or TIMED_OUT
  ↓
Retry count < 3?
  YES → Wait delay (2^retryCount * 1000ms) → Call triggerReconnect()
  NO  → Show toast with refresh button → Stop retrying
  ↓
SUBSCRIBED
  → Reset retry count to 0
  → Clear error state
```

### Exponential Backoff Schedule

- Retry 1: 1 second delay (2^0 * 1000ms)
- Retry 2: 2 seconds delay (2^1 * 1000ms)
- Retry 3: 4 seconds delay (2^2 * 1000ms)
- After 3 failures: Show toast, stop retrying, rely on polling

## Implementation Details

### Files to Create

- `src/hooks/use-realtime-reconnection.ts` - Shared reconnection hook

### Files to Modify

- `src/hooks/use-realtime-orders.ts` - Kitchen Display System
- `src/hooks/use-realtime-waiter-orders.ts` - Waiter service tracking
- `src/hooks/use-realtime-pending-orders.ts` - Cashier pending orders queue
- `src/hooks/use-realtime-unpaid-bills.ts` - Cashier unpaid bills queue

### Integration Pattern

Each hook will integrate the reconnection logic:

```typescript
const reconnection = useRealtimeReconnection({
  channelName: 'kitchen-orders',
  onMaxRetriesReached: () => {
    console.warn('[KDS] Max reconnection attempts reached, using polling');
  },
});

const ordersChannel = supabase
  .channel('kitchen-orders')
  .on(...)
  .subscribe((status) => {
    reconnection.handleStatus(status);

    if (status === 'SUBSCRIBED') {
      console.log('[KDS Realtime] Orders channel connected');
      setError(null); // Clear any previous errors
    } else if (status === 'CHANNEL_ERROR') {
      console.error('[KDS Realtime] Orders channel error');
      reconnection.triggerReconnect();
    } else if (status === 'TIMED_OUT') {
      console.warn('[KDS Realtime] Orders timed out');
      reconnection.triggerReconnect();
    }
  });

// Cleanup
return () => {
  reconnection.reset();
  supabase.removeChannel(ordersChannel);
};
```

### Toast Implementation

Using the existing toast system (sonner):

```typescript
import { toast } from 'sonner';

toast.error('Realtime connection lost. Using backup polling mode.', {
  duration: Infinity,
  action: {
    label: 'Refresh Page',
    onClick: () => window.location.reload(),
  },
});
```

### Toast Deduplication

Prevent showing multiple toasts when all 4 hooks fail simultaneously:

```typescript
// Module-level Set
const channelsWithErrorToast = new Set<string>();

if (!channelsWithErrorToast.has(channelName)) {
  channelsWithErrorToast.add(channelName);
  toast.error(...);
}
```

### Error State Clearing

Fix stale error state in pending-orders and unpaid-bills hooks:

```typescript
// In fetchOrders() success path
} else {
  setOrders((data || []) as CashierOrder[]);
  setError(null); // ← Add this line
}
```

## Reconnection Mechanics

Supabase Realtime channels cannot be "reconnected" - they must be recreated:

1. Remove old channel: `supabase.removeChannel(oldChannel)`
2. Wait exponential delay
3. Recreate channel with same configuration
4. Subscribe again
5. Increment retry count

This ensures clean state and proper resource cleanup.

## Error Handling

### Connection Errors
- `CHANNEL_ERROR`: Log error, trigger reconnection
- `TIMED_OUT`: Log warning, trigger reconnection
- `SUBSCRIBED`: Clear error state, reset retry count

### Fetch Errors
- Log to console with context
- Set error state for UI display
- **Clear error state on successful refetch** (currently missing in 2 hooks)

### Edge Cases
- Multiple hooks failing: Only show one toast
- User closes tab during retry: Cleanup handled by useEffect
- Successful reconnection: Reset all state, clear error
- Page refresh: All state reset naturally

## Testing Strategy

### Manual Testing Scenarios

1. **Temporary network failure**
   - Stop Supabase locally → Should retry 3x → Auto-reconnect
   - Expected: Realtime restored, no toast shown

2. **Persistent connection failure**
   - Keep Supabase stopped → 3 retries → Toast appears
   - Expected: Toast with refresh button, polling continues

3. **Multiple hooks failing**
   - Kill all realtime connections → Check toast count
   - Expected: Only 1 toast shown, not 4

4. **User refresh from toast**
   - Click "Refresh Page" button → Page reloads
   - Expected: All hooks reconnect successfully

5. **WiFi disconnect/reconnect**
   - Disable WiFi → Wait 5s → Re-enable WiFi
   - Expected: Auto-reconnection within 7s (1+2+4)

### Success Criteria

- ✅ No permanent realtime failures (auto-reconnection works)
- ✅ Clear user feedback when connection fails
- ✅ Polling fallback keeps UI functional
- ✅ Only one toast shown regardless of hook count
- ✅ Error state cleared after successful recovery
- ✅ No memory leaks (timers cleaned up properly)

## Backward Compatibility

This change is fully backward compatible:

- No changes to hook API (same return types)
- No breaking changes to consuming components
- Polling fallback already exists (10s interval)
- UI continues working even if realtime fails
- Graceful degradation maintained

## Performance Considerations

- Minimal overhead: One useRef, one useState per hook
- Global Set for toast deduplication prevents UI spam
- Retry delays are reasonable (max 7s total for 3 attempts)
- Polling fallback prevents indefinite retry loops
- Proper cleanup prevents memory leaks

## Future Enhancements (Out of Scope)

- Exponential backoff with jitter (randomize delays slightly)
- Configurable max retries per environment
- Admin dashboard showing connection health
- Metrics/analytics for reconnection frequency
- Automatic reconnection on window focus/network change events

## Implementation Plan

See accompanying implementation plan document created by writing-plans skill.

## References

- **Issue**: [KDS Realtime] Orders channel error: undefined
- **Code Review**: Teammate analysis from realtime-debug-team
- **Related Docs**: CLAUDE.md, ARCHITECTURE.md, AGENT-KITCHEN.md, AGENT-CASHIER.md, AGENT-WAITER.md
