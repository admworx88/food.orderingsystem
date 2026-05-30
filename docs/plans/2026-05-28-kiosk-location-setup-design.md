# Kiosk Location Setup — Design

**Date:** 2026-05-28
**Status:** Approved for implementation
**Scope:** Kiosk module only — no backend changes required

---

## Problem

The kiosk currently shows all four order types (Dine In, Room Service, Take Out, Ocean View) on every device. There are two physical kiosk locations:

- **Restaurant** — main dining area; Ocean View is irrelevant here
- **Ocean View** — floating restaurant; order type is always Ocean View, no selection needed

---

## Solution

Each kiosk device stores its location in `localStorage`. On first launch, a setup screen prompts staff to choose the location. This is a one-time action, reset via a hidden 5-tap + admin PIN gesture.

> **Note (Capacitor):** Once Capacitor is integrated, migrate `localStorage` to `@capacitor/preferences` (wraps Android `SharedPreferences`). The `useKioskLocation()` hook interface stays identical — only the internals change.

---

## Flows

### Restaurant Kiosk

```
Welcome (/) → Order Type (/order-type) [3 options] → Menu
```

Order-type page renders: Dine In, Room Service, Take Out.
Ocean View card is **hidden**.

### Ocean View Kiosk

```
Ocean View Landing (/ocean-view) → Menu
```

- Skips welcome screen and order-type selection entirely
- Layout redirects `/` and `/order-type` to `/ocean-view`
- Cart is pre-set to `ocean_view` on "Start Order"

---

## Screens

### 1. Setup Screen (first launch)

Shown as a **full-screen blocking overlay** in the kiosk layout when `kiosk_location` is not set in `localStorage`.

- Matches kiosk aesthetic (amber gradient, stone colors)
- Two large cards side by side:
  - **Restaurant** — Coffee icon, "Main dining area"
  - **Ocean View** — OceanViewIcon, "Floating restaurant over the sea"
- Tapping a card saves the value to `localStorage` and dismisses the overlay
- No confirmation step — selection is immediate

### 2. Ocean View Landing (`/ocean-view`)

Replaces the normal welcome screen for Ocean View kiosks.

- **Background:** full-screen image carousel, auto-advancing, static images from `/public/ocean-view/` (e.g. `1.jpg`, `2.jpg`, `3.jpg`)
- **Overlay:** subtle dark gradient for text legibility
- **Content (centered):** Arena Blanca logo + resort name + tagline
- **CTA:** large "Start Order" button — sets cart `orderType` to `ocean_view`, navigates to `/menu`
- No back button, no language switcher needed (can be added later)

### 3. Order Type Page (Restaurant only)

No visual changes — Ocean View card is simply excluded from the rendered grid.
Filter: `Object.values(ORDER_TYPE_CONFIG).filter(c => c.value !== 'ocean_view')`

---

## 5-Tap + PIN Reset

**Trigger:** 5 taps on the Arena Blanca logo in the kiosk header within a 2-second window.

**Flow:**
1. Tap counter starts on first tap, resets after 2s of inactivity
2. On 5th tap → PIN dialog opens
3. Staff enters admin PIN (same manager PIN pattern as cashier refunds — verified against `profiles.pin_hash`)
4. **On success:** clears `kiosk_location` from `localStorage` → setup screen reappears
5. **On failure:** "Incorrect PIN" shown inline, input cleared
6. **3 failed attempts:** dialog closes silently (no lockout)

---

## New Files

| File | Purpose |
|------|---------|
| `src/hooks/use-kiosk-location.ts` | Read/write `kiosk_location` in localStorage |
| `src/app/(kiosk)/ocean-view/page.tsx` | Ocean View landing screen |
| `src/components/kiosk/kiosk-setup-screen.tsx` | First-launch location picker |
| `src/components/kiosk/kiosk-pin-dialog.tsx` | 5-tap PIN reset dialog |
| `public/ocean-view/1.jpg` (+ 2, 3) | Static carousel images |

## Modified Files

| File | Change |
|------|--------|
| `src/app/(kiosk)/layout.tsx` | Detect location, show setup overlay, redirect ocean_view to `/ocean-view` |
| `src/app/(kiosk)/order-type/page.tsx` | Filter out `ocean_view` card for restaurant kiosks |

---

## Data

```ts
// localStorage key
"kiosk_location": "restaurant" | "ocean_view"
```

```ts
// useKioskLocation hook interface
function useKioskLocation(): {
  location: 'restaurant' | 'ocean_view' | null;
  setLocation: (loc: 'restaurant' | 'ocean_view') => void;
  clearLocation: () => void;
}
```

---

## Out of Scope (tackle separately)

- Room Service QR code flow
- Capacitor migration (`@capacitor/preferences`)
- Admin UI for managing kiosk locations remotely
- Ocean View carousel image management via admin panel
