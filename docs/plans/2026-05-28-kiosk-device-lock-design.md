# Kiosk Device-Lock PIN — Design

**Date:** 2026-05-28
**Status:** Approved

---

## Goal

Allow staff to reconfigure a kiosk device (switch location, reset session) via a hidden PIN-protected overlay — without touching the guest ordering flow.

## Architecture

The feature is a client-side overlay gated by a server-side PIN check. No new routes. No auth tokens. The guest ordering flow is completely unaffected.

---

## Trigger

- A hidden tap counter on the Arena Blanca logo on both `/` and `/ocean-view`
- **5 taps within 3 seconds** opens the PIN overlay
- No visible UI change for guests

---

## PIN Overlay (Step 1)

- Full-screen modal overlay with a 4-digit numeric keypad
- PIN validated via Server Action `validateKioskPin(pin)` against `settings.kiosk_pin`
- The PIN value is **never returned to the client** — server action returns `{ success: boolean }` only
- On failure: input clears, error message shown
- After **3 failed attempts**: overlay auto-closes (prevents brute force)
- On success: transitions to the Config Panel

---

## Config Panel (Step 2)

Shown after successful PIN entry. Contains:

| Element | Behaviour |
|---------|-----------|
| Current location badge | Green = Restaurant, Blue = Ocean View |
| "Set to Restaurant" button | Calls `setLocation('restaurant')`, reloads page |
| "Set to Ocean View" button | Calls `setLocation('ocean_view')`, reloads page |
| "Reset Session" button | Clears Zustand cart, clears `localStorage`, redirects to `/` |
| "Close" button | Dismisses overlay, no changes |

Location switching is purely client-side (`useKioskLocation` → `localStorage`) — no server call required.

---

## Database

**Migration:** `ALTER TABLE settings ADD COLUMN IF NOT EXISTS kiosk_pin TEXT DEFAULT '1234';`

**Server Action:** `validateKioskPin(pin: string): Promise<{ success: boolean }>`
- Reads `kiosk_pin` from `settings` table (single-row config table)
- Constant-time comparison to prevent timing attacks
- Returns `{ success: true }` or `{ success: false }` only

---

## Admin Panel

The existing admin settings page gets a "Kiosk PIN" field so the resort manager can update the PIN without touching the DB.

---

## Files to Create / Modify

| File | Change |
|------|--------|
| `supabase/migrations/TIMESTAMP_add_kiosk_pin_setting.sql` | Add `kiosk_pin` column to `settings` |
| `src/services/settings-service.ts` | Add `validateKioskPin()` server action |
| `src/components/kiosk/kiosk-admin-overlay.tsx` | New: PIN keypad + config panel overlay |
| `src/app/(kiosk)/page.tsx` | Add logo tap counter + overlay trigger |
| `src/app/(kiosk)/ocean-view/page.tsx` | Add logo tap counter + overlay trigger |
| `src/app/admin/settings/` | Add Kiosk PIN field (new or existing settings page) |

---

## Security Notes

- PIN never leaves the server — only `{ success: boolean }` returned to client
- 3-attempt lockout per overlay open (client-side counter, sufficient for this threat model)
- No session tokens needed — PIN re-entry required each time overlay is opened
- `kiosk_pin` column is only readable by `admin` role via RLS (same as other settings)
