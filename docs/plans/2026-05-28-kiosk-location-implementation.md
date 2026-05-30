# Kiosk Location Setup — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make kiosks location-aware — Restaurant kiosks hide Ocean View, Ocean View kiosks show a branded landing page and skip order-type selection.

**Architecture:** A `useKioskLocation` hook reads/writes `kiosk_location` from `localStorage`. The kiosk layout shows a blocking setup screen on first launch, adds a 5-tap + PIN reset gesture on the logo, and redirects Ocean View kiosks away from `/` and `/order-type`. A new `/ocean-view` page serves as the Ocean View kiosk's landing screen.

**Tech Stack:** Next.js 15 App Router, React hooks, Zustand (cart-store), Tailwind v4, shadcn/ui Dialog, Supabase Server Actions (PIN verify)

---

## Task 1: `useKioskLocation` hook

**Files:**
- Create: `src/hooks/use-kiosk-location.ts`

**Step 1: Create the hook**

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';

export type KioskLocation = 'restaurant' | 'ocean_view';

const STORAGE_KEY = 'kiosk_location';

interface UseKioskLocationReturn {
  location: KioskLocation | null;
  isLoaded: boolean;
  setLocation: (loc: KioskLocation) => void;
  clearLocation: () => void;
}

export function useKioskLocation(): UseKioskLocationReturn {
  const [location, setLocationState] = useState<KioskLocation | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as KioskLocation | null;
    if (stored === 'restaurant' || stored === 'ocean_view') {
      setLocationState(stored);
    }
    setIsLoaded(true);
  }, []);

  const setLocation = useCallback((loc: KioskLocation) => {
    localStorage.setItem(STORAGE_KEY, loc);
    setLocationState(loc);
  }, []);

  const clearLocation = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setLocationState(null);
  }, []);

  return { location, isLoaded, setLocation, clearLocation };
}
```

**Step 2: Run type check**

```bash
npm run type-check
```
Expected: no errors

**Step 3: Commit**

```bash
git add src/hooks/use-kiosk-location.ts
git commit -m "feat(kiosk): add useKioskLocation hook for localStorage-backed location state"
```

---

## Task 2: `KioskSetupScreen` component

**Files:**
- Create: `src/components/kiosk/kiosk-setup-screen.tsx`

Dependencies: `useKioskLocation` from Task 1, `OceanViewIcon` from `src/components/kiosk/ocean-view-icon.tsx`, `Coffee` from `lucide-react`.

**Step 1: Create the component**

```typescript
'use client';

import { Coffee } from 'lucide-react';
import { OceanViewIcon } from '@/components/kiosk/ocean-view-icon';
import { cn } from '@/lib/utils';
import type { KioskLocation } from '@/hooks/use-kiosk-location';

interface KioskSetupScreenProps {
  onSelect: (location: KioskLocation) => void;
}

const OPTIONS: { value: KioskLocation; label: string; description: string; Icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
  {
    value: 'restaurant',
    label: 'Restaurant',
    description: 'Main dining area',
    Icon: Coffee,
  },
  {
    value: 'ocean_view',
    label: 'Ocean View',
    description: 'Floating restaurant over the sea',
    Icon: OceanViewIcon,
  },
];

export function KioskSetupScreen({ onSelect }: KioskSetupScreenProps) {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-white to-stone-50 px-6">
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-amber-200/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center">
        <h1 className="text-3xl font-bold text-stone-800 mb-2 tracking-tight">
          Kiosk Setup
        </h1>
        <p className="text-stone-500 mb-10">Select the location for this kiosk device</p>

        <div className="grid grid-cols-2 gap-4">
          {OPTIONS.map(({ value, label, description, Icon }) => (
            <button
              key={value}
              onClick={() => onSelect(value)}
              className={cn(
                'flex flex-col items-center justify-center p-8 rounded-2xl border-2 transition-all min-h-[180px]',
                'border-stone-200 bg-white/80 backdrop-blur-sm',
                'hover:border-amber-400 hover:bg-amber-50 hover:shadow-lg hover:shadow-amber-500/10',
                'active:scale-[0.97]'
              )}
            >
              <Icon className="w-12 h-12 mb-4 text-stone-400" strokeWidth={2} />
              <h3 className="text-lg font-bold text-stone-700 mb-1">{label}</h3>
              <p className="text-xs text-stone-500 text-center leading-tight">{description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Run type check**

```bash
npm run type-check
```
Expected: no errors

**Step 3: Commit**

```bash
git add src/components/kiosk/kiosk-setup-screen.tsx
git commit -m "feat(kiosk): add KioskSetupScreen first-launch location picker"
```

---

## Task 3: `KioskPinDialog` component

**Files:**
- Create: `src/components/kiosk/kiosk-pin-dialog.tsx`

This dialog opens after the 5-tap gesture. It verifies the PIN against `profiles.pin_hash` using the same Server Action pattern as cashier refunds. On success it calls `onSuccess()`.

**Step 1: Find the existing PIN verification Server Action**

```bash
grep -r "pin_hash\|verifyPin\|verify_pin\|manager.*pin\|pin.*manager" src/services/ --include="*.ts" -l
```

Note the file found — the plan references it below as `verifyManagerPin`. If the function has a different name, adjust the import accordingly.

**Step 2: Create the component**

```typescript
'use client';

import { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { verifyManagerPin } from '@/services/payment-service';

interface KioskPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const MAX_ATTEMPTS = 3;

export function KioskPinDialog({ open, onOpenChange, onSuccess }: KioskPinDialogProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setPin('');
    setError('');
    setAttempts(0);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleVerify = useCallback(async () => {
    if (!pin.trim() || isVerifying) return;
    setIsVerifying(true);
    setError('');

    try {
      const result = await verifyManagerPin(pin);
      if (result.success) {
        setPin('');
        setAttempts(0);
        onOpenChange(false);
        onSuccess();
      } else {
        const next = attempts + 1;
        setAttempts(next);
        setPin('');
        if (next >= MAX_ATTEMPTS) {
          handleClose();
        } else {
          setError(`Incorrect PIN. ${MAX_ATTEMPTS - next} attempt${MAX_ATTEMPTS - next === 1 ? '' : 's'} remaining.`);
          inputRef.current?.focus();
        }
      }
    } finally {
      setIsVerifying(false);
    }
  }, [pin, attempts, isVerifying, onOpenChange, onSuccess, handleClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleVerify();
  }, [handleVerify]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm rounded-2xl p-8">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl font-bold text-stone-800">Admin PIN Required</DialogTitle>
          <DialogDescription className="text-stone-500">
            Enter your admin PIN to change kiosk location
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(''); }}
            onKeyDown={handleKeyDown}
            placeholder="••••"
            autoFocus
            className={cn(
              'w-full h-20 text-5xl font-bold text-center rounded-xl border-2 outline-none transition-colors tracking-widest',
              'placeholder:text-stone-300 placeholder:text-2xl placeholder:font-normal',
              error
                ? 'border-red-400 focus:border-red-500'
                : 'border-stone-300 focus:border-amber-500'
            )}
          />
          {error && (
            <p className="mt-2 text-sm text-red-500 text-center">{error}</p>
          )}
        </div>

        <button
          onClick={handleVerify}
          disabled={!pin.trim() || isVerifying}
          className={cn(
            'mt-4 w-full h-14 rounded-xl font-bold text-base transition-all',
            'bg-gradient-to-r from-amber-500 to-amber-600 text-white',
            'shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40',
            'hover:scale-[1.02] active:scale-[0.98]',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100'
          )}
        >
          {isVerifying ? 'Verifying…' : 'Verify PIN'}
        </button>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 3: Run type check**

```bash
npm run type-check
```

If `verifyManagerPin` doesn't exist in `payment-service.ts`, check what the cashier refund flow calls and use that function name instead. The function should accept a PIN string and return `{ success: boolean }`.

**Step 4: Commit**

```bash
git add src/components/kiosk/kiosk-pin-dialog.tsx
git commit -m "feat(kiosk): add KioskPinDialog for 5-tap admin PIN reset"
```

---

## Task 4: Update `layout.tsx` — setup overlay + 5-tap + redirect

**Files:**
- Modify: `src/app/(kiosk)/layout.tsx`

This is the most complex task. Three additions to `KioskLayoutInner`:
1. Show `KioskSetupScreen` overlay when `isLoaded && location === null`
2. Add 5-tap counter on logo → open `KioskPinDialog` → `clearLocation()` on success
3. Redirect Ocean View kiosk from `/` and `/order-type` to `/ocean-view`

Also fix idle reset: when `location === 'ocean_view'`, reset to `/ocean-view` instead of `/`.

**Step 1: Read the current layout**

```bash
cat -n src/app/(kiosk)/layout.tsx
```

**Step 2: Add imports at the top of the file (after existing imports)**

```typescript
import { useKioskLocation } from '@/hooks/use-kiosk-location';
import { KioskSetupScreen } from '@/components/kiosk/kiosk-setup-screen';
import { KioskPinDialog } from '@/components/kiosk/kiosk-pin-dialog';
```

**Step 3: Add state and logic inside `KioskLayoutInner` (after existing state declarations)**

```typescript
const { location, isLoaded, setLocation, clearLocation } = useKioskLocation();
const [pinDialogOpen, setPinDialogOpen] = useState(false);
const tapCountRef = useRef(0);
const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

// Redirect ocean_view kiosk away from / and /order-type
useEffect(() => {
  if (!isLoaded || location !== 'ocean_view') return;
  if (pathname === '/' || pathname === '/order-type') {
    router.replace('/ocean-view');
  }
}, [isLoaded, location, pathname, router]);

const handleLogoTap = useCallback((e: React.MouseEvent) => {
  tapCountRef.current += 1;

  if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
  tapTimerRef.current = setTimeout(() => {
    tapCountRef.current = 0;
  }, 2000);

  if (tapCountRef.current >= 5) {
    tapCountRef.current = 0;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    e.preventDefault();
    setPinDialogOpen(true);
  }
}, []);

const handlePinSuccess = useCallback(() => {
  clearLocation();
}, [clearLocation]);
```

**Step 4: Update the logo Link to wire up the tap handler**

Find this in the JSX:
```tsx
<Link href="/" className="flex items-center gap-2 sm:gap-3 active:scale-[0.98] transition-transform">
```

Replace with:
```tsx
<Link href="/" onClick={handleLogoTap} className="flex items-center gap-2 sm:gap-3 active:scale-[0.98] transition-transform">
```

**Step 5: Update idle reset to respect kiosk location**

Find this in the idle timer:
```typescript
clearCart();
router.push('/');
```

Replace with:
```typescript
clearCart();
router.push(location === 'ocean_view' ? '/ocean-view' : '/');
```

**Step 6: Add setup overlay and PIN dialog at the bottom of the returned JSX (before the closing `</div>`)**

```tsx
{/* Kiosk Setup Screen — shown on first launch */}
{isLoaded && location === null && (
  <KioskSetupScreen onSelect={setLocation} />
)}

{/* Admin PIN Dialog — triggered by 5-tap on logo */}
<KioskPinDialog
  open={pinDialogOpen}
  onOpenChange={setPinDialogOpen}
  onSuccess={handlePinSuccess}
/>
```

**Step 7: Add missing import for `useRef` and `useCallback` (they may already be imported)**

Check the top of the file — ensure `useRef` and `useCallback` are in the React import.

**Step 8: Run type check**

```bash
npm run type-check
```
Expected: no errors

**Step 9: Commit**

```bash
git add src/app/(kiosk)/layout.tsx
git commit -m "feat(kiosk): wire up setup overlay, 5-tap PIN reset, and ocean_view redirect in layout"
```

---

## Task 5: Update `order-type/page.tsx` — hide Ocean View for restaurant kiosks

**Files:**
- Modify: `src/app/(kiosk)/order-type/page.tsx`

**Step 1: Add the import**

At the top of the file, add:
```typescript
import { useKioskLocation } from '@/hooks/use-kiosk-location';
```

**Step 2: Add hook call inside `OrderTypePage`**

After the existing hook calls (`useCartStore`, etc.):
```typescript
const { location } = useKioskLocation();
```

**Step 3: Filter the order types in the grid**

Find:
```typescript
{Object.values(ORDER_TYPE_CONFIG).map((config, index) => {
```

Replace with:
```typescript
{Object.values(ORDER_TYPE_CONFIG)
  .filter((config) => {
    if (location === 'restaurant') return config.value !== 'ocean_view';
    return true;
  })
  .map((config, index) => {
```

**Step 4: Run type check**

```bash
npm run type-check
```
Expected: no errors

**Step 5: Commit**

```bash
git add src/app/(kiosk)/order-type/page.tsx
git commit -m "feat(kiosk): hide ocean_view option on restaurant kiosks"
```

---

## Task 6: Create `/ocean-view` landing page

**Files:**
- Create: `src/app/(kiosk)/ocean-view/page.tsx`

This is the Ocean View kiosk's home screen. Full-screen image carousel (auto-advancing every 4s), dark gradient overlay, centered logo + title, and "Start Order" button.

**Step 1: Create the page**

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { cn } from '@/lib/utils';

const CAROUSEL_IMAGES = [
  '/ocean-view/1.jpg',
  '/ocean-view/2.jpg',
  '/ocean-view/3.jpg',
];

const CAROUSEL_INTERVAL = 4000;

export default function OceanViewPage() {
  const router = useRouter();
  const { setOrderType } = useCartStore();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, CAROUSEL_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  const handleStartOrder = useCallback(() => {
    setOrderType('ocean_view');
    router.push('/menu');
  }, [setOrderType, router]);

  return (
    <div className="h-full relative overflow-hidden">
      {/* Carousel images */}
      {CAROUSEL_IMAGES.map((src, index) => (
        <div
          key={src}
          className={cn(
            'absolute inset-0 transition-opacity duration-1000',
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          )}
        >
          <Image
            src={src}
            alt={`Ocean View ${index + 1}`}
            fill
            className="object-cover"
            priority={index === 0}
          />
        </div>
      ))}

      {/* Dark gradient overlay for legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60" />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 text-center">
        {/* Logo */}
        <Image
          src="/arenalogo.png"
          alt="Arena Blanca Resort"
          width={96}
          height={96}
          className="w-20 h-20 md:w-24 md:h-24 rounded-3xl object-contain shadow-2xl mb-6"
        />

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2 tracking-tight drop-shadow-lg">
          Ocean View
        </h1>
        <p className="text-lg md:text-xl text-white/80 font-medium mb-12 drop-shadow">
          Dine at our floating restaurant over the sea
        </p>

        {/* Start Order CTA */}
        <button
          onClick={handleStartOrder}
          className={cn(
            'inline-flex items-center gap-3',
            'bg-gradient-to-r from-amber-500 to-amber-600 text-white',
            'px-10 py-5 rounded-2xl text-xl font-bold',
            'shadow-2xl shadow-amber-500/40',
            'hover:shadow-amber-500/60 hover:scale-[1.02]',
            'active:scale-[0.98] transition-all',
            'group'
          )}
        >
          <span>Start Order</span>
          <ChevronRight
            className="w-6 h-6 group-hover:translate-x-1 transition-transform"
            strokeWidth={2.5}
          />
        </button>
      </div>

      {/* Carousel dots */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-10">
        {CAROUSEL_IMAGES.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={cn(
              'w-2 h-2 rounded-full transition-all',
              index === currentIndex
                ? 'bg-white w-6'
                : 'bg-white/50 hover:bg-white/75'
            )}
          />
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Run type check**

```bash
npm run type-check
```
Expected: no errors

**Step 3: Commit**

```bash
git add src/app/(kiosk)/ocean-view/page.tsx
git commit -m "feat(kiosk): add Ocean View landing page with carousel and Start Order CTA"
```

---

## Task 7: Add placeholder carousel images

**Files:**
- Create: `public/ocean-view/1.jpg`, `public/ocean-view/2.jpg`, `public/ocean-view/3.jpg`

Since real Ocean View photos aren't available yet, use placeholder images so the carousel renders without broken images.

**Step 1: Create the directory and download placeholders**

```bash
mkdir -p public/ocean-view
curl -o public/ocean-view/1.jpg "https://picsum.photos/seed/ocean1/1920/1080"
curl -o public/ocean-view/2.jpg "https://picsum.photos/seed/ocean2/1920/1080"
curl -o public/ocean-view/3.jpg "https://picsum.photos/seed/ocean3/1920/1080"
```

> Replace these with real Arena Blanca Ocean View photos before production.

**Step 2: Verify files exist**

```bash
ls -lh public/ocean-view/
```
Expected: 3 .jpg files

**Step 3: Commit**

```bash
git add public/ocean-view/
git commit -m "feat(kiosk): add placeholder ocean-view carousel images (replace before prod)"
```

---

## Task 8: Manual verification

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Test Restaurant kiosk**

1. Open `http://localhost:3000` in a fresh private window (no localStorage)
2. Setup screen should appear — select **Restaurant**
3. Navigate to `/order-type` — confirm **Ocean View card is NOT shown** (only 3 cards)
4. Go back to `/` — confirm normal welcome screen

**Step 3: Test Ocean View kiosk**

1. Clear localStorage (`kiosk_location` key) or open another private window
2. Setup screen appears — select **Ocean View**
3. Should auto-redirect to `/ocean-view` — confirm carousel and "Start Order" button
4. Click "Start Order" — confirm navigates to `/menu` with `orderType === 'ocean_view'` in cart store
5. Manually navigate to `/order-type` — confirm redirected back to `/ocean-view`

**Step 4: Test 5-tap reset**

1. With a location set (either), tap the Arena Blanca logo 5× quickly
2. PIN dialog should open
3. Enter wrong PIN → error message, attempt count decreases
4. Enter correct admin PIN → setup screen reappears
5. Tap logo quickly but < 5 times → no dialog

**Step 5: Run full type check and lint**

```bash
npm run type-check && npm run lint
```
Expected: no errors

---

## Summary of files changed

| File | Status |
|------|--------|
| `src/hooks/use-kiosk-location.ts` | New |
| `src/components/kiosk/kiosk-setup-screen.tsx` | New |
| `src/components/kiosk/kiosk-pin-dialog.tsx` | New |
| `src/app/(kiosk)/ocean-view/page.tsx` | New |
| `src/app/(kiosk)/layout.tsx` | Modified |
| `src/app/(kiosk)/order-type/page.tsx` | Modified |
| `public/ocean-view/1.jpg` + `2.jpg` + `3.jpg` | New (placeholders) |
