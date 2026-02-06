# Kiosk Visual Design Guide

> Quick reference for the visual design system used in the OrderFlow Kiosk

---

## 🎨 Color Palette

### Primary Colors (Amber/Warm)
```
Amber 50:  #FFFBEB  (lightest - backgrounds)
Amber 100: #FEF3C7  (highlights)
Amber 400: #FBBF24  (light accent)
Amber 500: #F59E0B  ← PRIMARY BRAND COLOR (CTAs, badges)
Amber 600: #D97706  (hover state)
Amber 700: #B45309  (pressed state)
```

### Neutral Colors (Stone)
```
Stone 50:  #FAFAF9  (body background)
Stone 100: #F5F5F4  (secondary background)
Stone 200: #E7E5E4  (borders)
Stone 300: #D6D3D1  (hover borders)
Stone 400: #A8A29E  (muted text)
Stone 500: #78716C  (secondary text)
Stone 600: #57534E  (emphasized text)
Stone 700: #44403C  (dark text)
Stone 800: #292524  (primary text)
Stone 900: #1C1917  (darkest text)
```

### Semantic Colors
```
Green 50:   #F0FDF4  (success background)
Green 500:  #22C55E  (success icon)
Green 600:  #16A34A  (success emphasis)

Red 50:     #FEF2F2  (error background)
Red 500:    #EF4444  (error/destructive)
Red 600:    #DC2626  (error emphasis)

Blue 50:    #EFF6FF  (info background)
Blue 500:   #3B82F6  (info)
Blue 600:   #2563EB  (info emphasis)
```

---

## 🔤 Typography

### Font Families
```css
--font-display: 'Cabinet Grotesk', system-ui, sans-serif;  /* Headings, hero text */
--font-body: 'Satoshi', system-ui, sans-serif;             /* Body, UI text */
```

### Font Sizes
```
text-xs:    12px  (captions, helper text)
text-sm:    14px  (labels, secondary text)
text-base:  16px  (body text)
text-lg:    18px  (emphasized body)
text-xl:    20px  (subheadings)
text-2xl:   24px  (small headings)
text-3xl:   30px  (medium headings)
text-4xl:   36px  (large headings)
text-5xl:   48px  (hero headings)
text-9xl:   144px (order number - MASSIVE)
```

### Font Weights
```
font-normal:    400  (body text)
font-medium:    500  (subtle emphasis)
font-semibold:  600  (labels, headings)
font-bold:      700  (CTAs, prices)
font-black:     900  (order number)
```

---

## 📐 Spacing System

### Padding Scale
```
p-1:  4px
p-2:  8px
p-3:  12px
p-4:  16px
p-5:  20px   ← Standard card padding
p-6:  24px   ← Large card padding
p-8:  32px
p-10: 40px
```

### Gap Scale (Grid/Flex)
```
gap-2:  8px
gap-3:  12px
gap-4:  16px  ← Standard gap
gap-5:  20px
gap-6:  24px
```

### Height Scale (Touch Targets)
```
h-10: 40px
h-11: 44px
h-12: 48px  ← Minimum touch target
h-14: 56px  ← Large button
h-16: 64px
```

---

## 🎯 Border Radius

```
rounded-md:   6px   (small elements)
rounded-lg:   8px   (inputs, small buttons)
rounded-xl:   12px  ← Standard button/input
rounded-2xl:  16px  ← Standard card
rounded-3xl:  24px  (large cards, hero elements)
rounded-full: 50%   (badges, avatars, pills)
```

---

## 🌑 Shadows

### Standard Shadows
```css
/* Subtle (cards at rest) */
shadow-sm: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04)

/* Medium (hover states) */
shadow-md: 0 4px 6px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.06)

/* Large (modals, overlays) */
shadow-lg: 0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)

/* Extra Large (hero elements) */
shadow-2xl: 0 25px 50px rgba(0,0,0,0.25)
```

### Colored Shadows (Brand Glow)
```css
shadow-amber-500/30   /* 30% opacity amber glow */
shadow-green-500/30   /* Success glow */
```

---

## ✨ Animation Patterns

### Entrance Animations
```css
/* Fade in from below */
animate-fade-in-up
animation-delay-200  /* Stagger by 200ms */

/* Simple fade in */
animate-fade-in

/* Scale in (modals) */
animate-scale-in

/* Slide in from sides */
animate-slide-in-left
animate-slide-in-right
```

### Micro-interactions
```css
/* Press feedback */
active:scale-[0.98]

/* Hover lift */
hover:shadow-lg

/* Icon translation (chevrons) */
group-hover:translate-x-1
```

### Background Effects
```css
/* Pulsing blur orbs */
animate-pulse

/* Shimmer effect */
animate-shimmer
```

---

## 🎨 Gradient Recipes

### Primary CTA
```css
bg-gradient-to-r from-amber-500 to-amber-600
hover:from-amber-600 hover:to-amber-700
```

### Success Indicator
```css
bg-gradient-to-br from-green-400 to-green-600
```

### Background Blur Orb (Welcome Page)
```css
/* Large amber orb */
w-64 h-64 bg-amber-200/20 rounded-full blur-3xl animate-pulse

/* Offset amber orb */
w-96 h-96 bg-amber-300/10 rounded-full blur-3xl animate-pulse
(with animation-delay: 1s)
```

### Background Blur Orb (Confirmation Page)
```css
/* Green success orb */
w-96 h-96 bg-green-200/20 rounded-full blur-3xl animate-pulse

/* Amber complementary orb */
w-96 h-96 bg-amber-200/20 rounded-full blur-3xl animate-pulse
```

### Order Number Text
```css
text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-700
```

---

## 📦 Component Patterns

### Primary Button
```css
h-14
px-8 py-4
bg-gradient-to-r from-amber-500 to-amber-600
hover:from-amber-600 hover:to-amber-700
text-white text-lg font-bold
rounded-xl
shadow-lg
active:scale-[0.98]
transition-all
```

### Card (Standard)
```css
bg-white
rounded-2xl
border border-stone-200
p-6
shadow-sm
hover:shadow-md
transition-all
```

### Card (Selected State)
```css
border-2 border-amber-500
bg-amber-50
shadow-md
```

### Badge
```css
px-3 py-1
text-xs font-semibold
rounded-full
bg-amber-500 text-white  (active)
bg-stone-100 text-stone-500  (inactive)
```

### Input Field
```css
h-12
px-4
border border-stone-200
rounded-xl
text-base
focus:ring-2 focus:ring-amber-500 focus:border-amber-500
transition-all
```

### Icon Container (Accent)
```css
w-12 h-12
rounded-xl
bg-amber-100
flex items-center justify-center
text-amber-600
```

---

## 🎭 State Variations

### Default → Hover → Active → Disabled

#### Button
```
Default:  bg-amber-500
Hover:    bg-amber-600 shadow-lg
Active:   bg-amber-700 scale-[0.98]
Disabled: bg-stone-300 opacity-50 cursor-not-allowed
```

#### Card
```
Default:  border-stone-200 shadow-sm
Hover:    border-stone-300 shadow-md
Selected: border-amber-500 bg-amber-50 shadow-md
```

#### Input
```
Default:  border-stone-200
Focus:    border-amber-500 ring-2 ring-amber-500
Error:    border-red-500 ring-2 ring-red-500
```

---

## 📱 Layout Patterns

### Split View (Cart, Checkout)
```
┌─────────────────────────────┬──────────┐
│                             │          │
│   Main Content Area         │ Summary  │
│   (flex-1)                  │ (w-96)   │
│                             │          │
└─────────────────────────────┴──────────┘
```

### Category Sidebar (Menu)
```
┌────────┬──────────────────────────────────┐
│        │                                  │
│ Side   │   Menu Grid                      │
│ Nav    │   (responsive columns)           │
│(220px) │                                  │
│        │                                  │
└────────┴──────────────────────────────────┘
```

### Full-Screen Hero (Welcome, Confirmation)
```
┌──────────────────────────────────────────┐
│                                          │
│         Centered Content                 │
│         (max-w-2xl/3xl)                  │
│                                          │
└──────────────────────────────────────────┘
```

---

## 🔢 Numeric Formatting

### Currency
```
Format: ₱1,234.56
Font: font-bold tabular-nums
Size: text-xl to text-2xl (context-dependent)
```

### Order Number
```
Format: 4 digits (0001, 1234)
Font: font-black tabular-nums
Size: text-9xl (144px)
Effect: text-transparent bg-clip-text gradient
```

### Countdown Timer
```
Format: 15 seconds, 2:30 minutes
Font: font-bold tabular-nums
Color: text-amber-600 (emphasis)
```

---

## 🎬 Animation Timing

### Entrance Stagger
```
Base:     0ms
Step 1:   200ms delay
Step 2:   400ms delay
Step 3:   600ms delay
Step 4:   800ms delay
```

### Transitions
```
Fast:     150ms (icon hover)
Standard: 200ms (button hover)
Slow:     300ms (modal open)
```

### Easing
```
ease-out  (entrances, most transitions)
ease-in   (exits)
ease      (simple state changes)
```

---

## 📊 Grid Systems

### Menu Grid
```
grid-cols-2              (mobile)
md:grid-cols-3          (tablet)
lg:grid-cols-4          (desktop)
2xl:grid-cols-5         (large screens)
gap-5
```

### Feature Cards (Welcome)
```
grid-cols-3
gap-4
```

### Order Type Selection (Checkout)
```
grid-cols-3
gap-4
```

---

## 🎯 Touch Target Checklist

✅ All buttons: `h-12` minimum (48px)
✅ Large CTAs: `h-14` (56px)
✅ Icon buttons: `w-11 h-11` (44px)
✅ Card tap areas: entire card surface
✅ Gaps between targets: `gap-3` minimum (12px)

---

## 🖼️ Image Handling

### Placeholder (Before Load)
```css
w-24 h-24  (cart items)
rounded-xl
bg-gradient-to-br from-amber-100 to-amber-200
flex items-center justify-center
text-3xl (emoji fallback)
```

### Aspect Ratios
```
Menu item cards: 4:3 (portrait)
Hero images:     16:9 (landscape)
Icons/Badges:    1:1 (square)
```

---

## 📍 Z-Index Layers

```
z-0:    Base layer (backgrounds)
z-10:   Content layer (cards, text)
z-50:   Floating UI (cart button, badges)
z-[100]: Overlays (idle warning modal)
```

---

## 🎨 Pro Tips

### Consistency
- Use `cn()` helper for conditional classes
- Stick to spacing scale (avoid arbitrary values)
- Maintain 8px grid (multiples of 8)

### Performance
- Use `transform` for animations (GPU-accelerated)
- Avoid `margin` animations (use `translate` instead)
- Keep gradients simple (2-3 stops max)

### Accessibility
- Always include `aria-label` on icon-only buttons
- Use semantic HTML (`<button>` vs `<div>`)
- Maintain color contrast ratios (WCAG AA)
- Include focus rings (`focus-visible:ring-2`)

### Touch Optimization
- Active state should be immediate (`active:scale-[0.98]`)
- No hover-dependent features (tooltips, dropdowns)
- Visual feedback on every tap
- Avoid tiny click targets

---

## 📖 Quick Copy-Paste Components

### Large Primary Button
```tsx
<button className="h-14 px-8 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-lg font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all">
  Button Text
</button>
```

### Card with Hover
```tsx
<div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm hover:shadow-md transition-all">
  Card Content
</div>
```

### Icon Container
```tsx
<div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
  <Icon className="w-6 h-6 text-amber-600" />
</div>
```

### Success Badge
```tsx
<div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full">
  <CheckCircle className="w-4 h-4 text-green-600" />
  <span className="text-sm font-semibold text-green-900">Success</span>
</div>
```

---

## 🎉 Design Philosophy Summary

**Core Principles**:
1. **Warm & Inviting**: Amber palette stimulates appetite
2. **Touch-First**: Every element designed for fingers, not mice
3. **Clear Hierarchy**: One obvious action per screen
4. **Confident Motion**: Smooth, premium-feeling animations
5. **Accessible**: WCAG compliant, keyboard navigable

**Avoid**:
- ❌ Generic fonts (Inter, Roboto, system defaults)
- ❌ Purple gradients (overused AI aesthetic)
- ❌ Tiny touch targets (< 44px)
- ❌ Excessive motion (distracting animations)
- ❌ Low contrast text (fails WCAG)

**Embrace**:
- ✅ Distinctive typography (Cabinet Grotesk + Satoshi)
- ✅ Warm, appetite-stimulating colors
- ✅ Generous spacing and touch targets
- ✅ Purposeful, orchestrated animations
- ✅ High-contrast, readable text
