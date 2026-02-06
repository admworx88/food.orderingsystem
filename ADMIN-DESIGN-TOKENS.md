# Admin Design Tokens - Quick Reference

**Design System**: Executive Precision (Slate + Amber)
**Last Updated**: February 6, 2026

---

## Color Palette

### Primary (Amber) - Use for main actions
```css
--admin-amber-500: #f59e0b;  /* Primary buttons, active states */
--admin-amber-600: #d97706;  /* Hover states */
```

**Tailwind Classes**:
- `bg-amber-500` / `text-amber-600`
- `from-amber-500 to-amber-600` (gradients)
- `border-amber-500` / `ring-amber-500`

---

### Neutral (Slate) - Use for text and secondary elements
```css
--admin-slate-50:  #f8fafc;  /* Light backgrounds */
--admin-slate-100: #f1f5f9;  /* Card backgrounds */
--admin-slate-200: #e2e8f0;  /* Borders */
--admin-slate-700: #334155;  /* Secondary text */
--admin-slate-800: #1e293b;  /* Primary text */
--admin-slate-900: #0f172a;  /* Headers, darkest */
```

**Tailwind Classes**:
- Text: `text-slate-600` (body), `text-slate-900` (headings)
- Backgrounds: `bg-slate-50` (page), `bg-slate-100` (cards)
- Borders: `border-slate-200`

---

### Success (Emerald) - Use for positive states
```css
--admin-emerald-500: #10b981;  /* Success messages, positive trends */
--admin-emerald-600: #059669;  /* Hover states */
```

**Tailwind Classes**:
- `text-emerald-600` / `bg-emerald-100`

---

### Danger (Rose) - Use for destructive actions
```css
--admin-rose-500: #f43f5e;  /* Delete buttons, errors */
--admin-rose-600: #e11d48;  /* Hover states */
```

**Tailwind Classes**:
- `text-rose-600` / `bg-rose-100`
- `from-rose-500 to-rose-600` (gradients)

---

## Typography Classes

### Page Headers
```tsx
<h1 className="text-3xl font-bold text-slate-900 tracking-tight">
  Dashboard
</h1>
<p className="text-slate-600 mt-1">
  Subtitle text here
</p>
```

### Section Headers
```tsx
<h2 className="text-xl font-semibold text-slate-800">
  Section Title
</h2>
```

### Data/Numbers (with tabular numerals)
```tsx
<span className="text-3xl font-bold admin-data text-slate-900">
  1,234
</span>
```

### Form Labels
```tsx
<label className="text-sm font-medium text-slate-700">
  Field Name
</label>
```

### Small Captions
```tsx
<span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
  Category
</span>
```

---

## Button Patterns

### Primary Button (CTAs)
```tsx
<button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-4 py-2 rounded-lg font-semibold transition-all">
  Save Changes
</button>
```

### Secondary Button
```tsx
<button className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white px-4 py-2 rounded-lg font-semibold transition-all">
  Cancel
</button>
```

### Danger Button
```tsx
<button className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white px-4 py-2 rounded-lg font-semibold transition-all">
  Delete
</button>
```

### Ghost Button
```tsx
<button className="text-slate-600 hover:bg-slate-100 px-4 py-2 rounded-lg font-medium transition-all">
  View Details
</button>
```

---

## Card Patterns

### Basic Card
```tsx
<div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
  Content
</div>
```

### Hoverable Card
```tsx
<div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-lg hover:border-slate-300 transition-all">
  Content
</div>
```

### Stat Card
```tsx
<div className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-lg hover:border-slate-200 transition-all group">
  <div className="flex items-start justify-between">
    <div className="flex-1">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
        Stat Label
      </p>
      <p className="text-3xl font-bold mt-3 admin-data text-slate-900">
        1,234
      </p>
    </div>
    <div className="p-3 rounded-xl bg-amber-100 transition-transform group-hover:scale-110">
      <Icon className="h-6 w-6 text-amber-600" />
    </div>
  </div>
</div>
```

---

## Form Input Patterns

### Text Input
```tsx
<input
  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all"
  type="text"
/>
```

### Select
```tsx
<select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all">
  <option>Option 1</option>
</select>
```

---

## Badge Patterns

### Status Badges
```tsx
{/* Active/Available */}
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
  Active
</span>

{/* Inactive/Unavailable */}
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
  Inactive
</span>

{/* Warning */}
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
  Pending
</span>

{/* Error */}
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
  Error
</span>
```

---

## Table Patterns

### Table Header
```tsx
<thead className="bg-slate-50">
  <tr>
    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
      Column Name
    </th>
  </tr>
</thead>
```

### Table Row
```tsx
<tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
    Cell Content
  </td>
</tr>
```

---

## Icon Container Patterns

### Primary Icon (Amber)
```tsx
<div className="p-3 rounded-xl bg-amber-100">
  <Icon className="h-6 w-6 text-amber-600" />
</div>
```

### Success Icon (Emerald)
```tsx
<div className="p-3 rounded-xl bg-emerald-100">
  <Icon className="h-6 w-6 text-emerald-600" />
</div>
```

### Neutral Icon (Slate)
```tsx
<div className="p-3 rounded-xl bg-slate-100">
  <Icon className="h-6 w-6 text-slate-600" />
</div>
```

### With Hover Scale
```tsx
<div className="p-3 rounded-xl bg-amber-100 transition-transform group-hover:scale-110">
  <Icon className="h-6 w-6 text-amber-600" />
</div>
```

---

## Loading States

### Spinner (Amber)
```tsx
<div className="animate-spin h-8 w-8 border-3 border-slate-300 border-t-amber-500 rounded-full" />
```

### Skeleton (uses shadcn component)
```tsx
<Skeleton className="h-4 w-32" />
```

---

## Empty States

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <Icon className="h-12 w-12 text-slate-400 mb-4" />
  <h3 className="text-lg font-semibold text-slate-900 mb-2">
    No Data Yet
  </h3>
  <p className="text-slate-500">
    Description of empty state
  </p>
</div>
```

---

## Error States

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <AlertCircle className="h-12 w-12 text-rose-500 mb-4" />
  <h3 className="text-lg font-semibold text-slate-900 mb-2">
    Error Title
  </h3>
  <p className="text-slate-500">
    Error description
  </p>
</div>
```

---

## Dialog/Modal Patterns

### Dialog Container
```tsx
<div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm">
  <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl mx-auto">
    Content
  </div>
</div>
```

---

## Chart Colors

### Recharts Color Palette
```javascript
// Line/Area charts
stroke: "#f59e0b"        // Amber
fill: "url(#gradient)"   // Amber gradient

// Bar charts
const COLORS = [
  '#f59e0b',  // Amber (primary)
  '#1e293b',  // Slate dark
  '#334155',  // Slate medium
  '#10b981',  // Emerald (success)
  '#475569',  // Slate light
];

// Pie charts
dine_in:      '#f59e0b'  // Amber
room_service: '#10b981'  // Emerald
takeout:      '#334155'  // Slate
```

---

## Spacing Scale

```
Gap/Margin/Padding:
- 1 = 4px   (tight spacing)
- 2 = 8px   (small spacing)
- 4 = 16px  (default spacing)
- 6 = 24px  (card padding)
- 8 = 32px  (section spacing)
```

---

## Border Radius

```
Buttons/Inputs:  rounded-lg  (0.5rem / 8px)
Cards:           rounded-xl  (0.75rem / 12px)
Icons:           rounded-xl  (0.75rem / 12px)
Badges:          rounded-full
```

---

## Shadow Scale

```
Card rest:   shadow-sm     (subtle)
Card hover:  shadow-lg     (medium lift)
Dialog:      shadow-2xl    (dramatic)
Icon hover:  shadow-md     (small lift)
```

---

## Transition Timing

```
Default:     transition-all (150ms)
Fast:        transition-colors (100ms)
Slow:        transition-transform (200ms)

Easing:      ease (default)
             ease-in-out (smooth)
```

---

## Usage Examples

### Dashboard Page Header
```tsx
<div className="mb-8">
  <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
    Dashboard
  </h1>
  <p className="text-slate-600 mt-1">
    Welcome back! Here's what's happening today.
  </p>
</div>
```

### Form Field
```tsx
<div className="space-y-2">
  <label className="text-sm font-medium text-slate-700">
    Item Name <span className="text-red-500">*</span>
  </label>
  <input
    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
    type="text"
    placeholder="e.g., Chicken Adobo"
  />
</div>
```

### Action Row
```tsx
<div className="flex items-center gap-3">
  <button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-4 py-2 rounded-lg font-semibold">
    Save
  </button>
  <button className="text-slate-600 hover:bg-slate-100 px-4 py-2 rounded-lg font-medium">
    Cancel
  </button>
</div>
```

---

## Don't Use

❌ **Avoid These**:
- `from-blue-*` (use `from-amber-*`)
- `text-gray-*` (use `text-slate-*`)
- `bg-red-*` (use `bg-rose-*` except for required asterisks)
- `from-violet-*` (use `from-slate-*` or `from-amber-*`)
- Gradient text on headers (use solid `text-slate-900`)

---

## Quick Reference: When to Use Each Color

| Color | Use For | Don't Use For |
|-------|---------|---------------|
| **Amber** | Primary actions, active states, brand accents | Body text, borders |
| **Slate** | Text, borders, secondary actions, neutral states | Primary buttons |
| **Emerald** | Success messages, positive trends, revenue | Danger actions |
| **Rose** | Delete buttons, errors, negative trends | Success states |

---

## Need Help?

**Full Documentation**: See `ADMIN-UI-REFINEMENT.md`
**Visual Guide**: See `ADMIN-VISUAL-CHANGELOG.md`
**Project Context**: See `CLAUDE.md`

---

**Status**: Production-Ready Design System ✅
