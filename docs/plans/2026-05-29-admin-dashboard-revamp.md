# Admin Dashboard Design Revamp — Implementation Plan

> **Created:** 2026-05-29  
> **Scope:** All 8 admin pages + shell layout  
> **Design System:** Data-Dense Dashboard / Professional / Arena Blanca Brand (Amber)  
> **Stack:** Next.js 16, Tailwind v4, shadcn/ui, Lucide icons, Recharts

---

## 1. Design System Decisions

### 1.1 Color Tokens (amend `src/app/globals.css` `@theme {}`)

The current amber brand is retained but placed into a proper semantic token system. Blue is dropped in favor of the established amber identity.

| Token | Light Value | Dark Value | Usage |
|-------|------------|------------|-------|
| `--admin-bg` | `#F8FAFC` | `#0F172A` | Page background |
| `--admin-surface` | `#FFFFFF` | `#1E293B` | Cards, panels |
| `--admin-surface-raised` | `#FFFFFF` | `#293548` | Modals, dropdowns |
| `--admin-border` | `#E2E8F0` | `#334155` | All borders |
| `--admin-text-primary` | `#0F172A` | `#F8FAFC` | Headings, body |
| `--admin-text-secondary` | `#64748B` | `#94A3B8` | Labels, captions |
| `--admin-text-muted` | `#94A3B8` | `#64748B` | Disabled, hint |
| `--admin-accent` | `#F59E0B` | `#FBBF24` | Brand amber (CTAs, active nav) |
| `--admin-accent-subtle` | `#FEF3C7` | `#451A03` | Accent backgrounds |
| `--admin-success` | `#10B981` | `#34D399` | Paid, active, online |
| `--admin-danger` | `#EF4444` | `#F87171` | Delete, cancel, error |
| `--admin-warning` | `#F59E0B` | `#FCD34D` | Pending, caution |
| `--admin-info` | `#3B82F6` | `#60A5FA` | Info badges, charts |
| `--admin-sidebar-bg` | `#0F172A` | `#080F1A` | Sidebar |
| `--admin-sidebar-active` | `rgba(245,158,11,0.12)` | `rgba(251,191,36,0.10)` | Active nav item bg |

### 1.2 Typography Scale

Replace ad-hoc font sizes with a named scale applied consistently across all admin pages:

| Role | Class | Size / Weight | Usage |
|------|-------|--------------|-------|
| Page title | `.admin-page-title` | `text-2xl font-bold tracking-tight` | `<h1>` on every page |
| Page subtitle | `.admin-page-subtitle` | `text-sm text-slate-500` | Description under h1 |
| Section heading | `.admin-section-title` | `text-base font-semibold text-slate-700` | Card/section headers |
| Table header | `.admin-th` | `text-xs font-semibold uppercase tracking-wider text-slate-400` | `<th>` elements |
| Table body | `.admin-td` | `text-sm text-slate-700` | `<td>` elements |
| Metric value | `.admin-metric` | `text-3xl font-bold tabular-nums` | KPI numbers |
| Metric label | `.admin-metric-label` | `text-xs font-medium text-slate-500 uppercase tracking-wide` | Below KPI number |
| Badge | `.admin-badge` | `text-xs font-semibold` | Status chips |

### 1.3 Spacing & Layout Rules

- **Page padding:** `p-8` on desktop → `p-4` on tablet (md:p-8 on main element)
- **Card padding:** `p-6` standard, `p-4` compact
- **Section gap:** `space-y-6` between page sections
- **Card gap:** `gap-4` in grids (KPI cards), `gap-6` in content sections
- **Border radius:** `rounded-xl` for cards/panels, `rounded-lg` for inputs/buttons, `rounded-md` for badges
- **Shadow:** `shadow-sm` for cards, `shadow-lg` for modals — never `shadow-none` on white cards on white bg

### 1.4 Interaction Standards

- Hover transitions: `transition-all duration-150`
- Table row hover: `hover:bg-slate-50` (light) — always on `<tbody tr>`
- Button loading: spinner + disabled state — already used, keep consistent
- Toast: Sonner already wired — 4s auto-dismiss, no changes needed
- Empty states: icon (64px, slate-200) + heading + subtext + optional CTA

---

## 2. Shell (Layout) Revamp

**Files:** `src/app/admin/layout-client.tsx`, `src/app/admin/layout.tsx`

### 2.1 Sidebar Upgrades

Current issues:
- No user identity displayed
- No visual indicator for current section breadcrumb
- Nav items use border-l trick that shifts padding (fragile)
- No collapse affordance
- No version / environment indicator

Revamp:
```
┌─────────────────────────────┐
│  [Logo] Arena Blanca Admin  │  ← brand lockup, not just text
│  Hotel Management System    │
├─────────────────────────────┤
│  MAIN                       │  ← section group label
│  ▪ Dashboard                │
│  ▪ Menu                     │
│  OPERATIONS                 │
│  ▪ Orders                   │
│  ▪ Promos                   │
│  ▪ Reports                  │
│  ADMIN                      │
│  ▪ Users                    │
│  ▪ Audit Log                │
│  ▪ Settings                 │
├─────────────────────────────┤
│  [Avatar] Admin Name        │  ← user identity
│  admin@arenaBlanca.com      │
│  [Logout]                   │
└─────────────────────────────┘
```

Key changes:
- Group nav items under section labels (`text-[10px] uppercase tracking-widest text-slate-500`)
- Active state: full-width `bg-amber-500/12` pill, left border → **left pill indicator** (4px, amber, `rounded-r-full`) — no padding shift
- Logo: use `/public/arenalogo.png` in a `h-8` container
- User block at bottom: show full name + role from `getCurrentUser()` passed as prop from `layout.tsx`
- Add `title` tooltip on each nav item for accessibility

### 2.2 Top Bar / Page Header (New Component)

Add a **consistent page header bar** inside `<main>` instead of each page defining its own `<h1>` block differently:

New component: `src/components/admin/page-header.tsx`
```tsx
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;  // buttons/dropdowns on the right
  breadcrumbs?: { label: string; href?: string }[];
}
```

Appearance:
```
Home > Reports > Sales                    [Export CSV] [Date Range ▾]
────────────────────────────────────────────────────────────────────
Sales Report
Jan 1 – May 29, 2026
```

### 2.3 Main Content Wrapper

- Add `max-w-[1400px] mx-auto` to prevent ultra-wide stretching on 4K monitors
- Padding: `px-6 py-8` on `<main>` (currently `p-8` — keep similar)
- Content background stays `bg-slate-50` (light grey, distinguishes from white cards)

---

## 3. Page-by-Page Revamp Plan

### Page 1: Dashboard (`/admin`)

**Current state:** h1 heading + `<DashboardClient>` (stats cards + charts)  
**Target state:** Rich ops overview with real-time indicators

#### 3.1 Stats Cards (`src/components/admin/stats-cards.tsx`)

Current: Basic white cards with icon + number  
Target: 4-up KPI grid with trend indicator

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Today Revenue│  │ Orders Today │  │ Avg Order Val│  │ Active Tables│
│ ₱12,450      │  │ 47           │  │ ₱265         │  │ 8 / 12       │
│ ↑ 18% vs ydy │  │ ↑ 5 today    │  │ ↔ same       │  │ ● LIVE       │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

Changes:
- Add `trend` prop: `{ value: number; direction: 'up' | 'down' | 'neutral' }` with colored arrow
- Accent color bar at top of card (2px, amber for revenue, blue for orders, etc.)
- Icon moves to top-right corner (20px, slate-300 — decorative)
- "LIVE" badge with `animate-pulse` green dot for real-time metrics
- Use `tabular-nums` on the metric value

#### 3.2 Sales Chart (`src/components/admin/sales-chart.tsx`)

Current: Basic Recharts line chart  
Target: Area chart with gradient fill + period toggle

Changes:
- Switch `<LineChart>` → `<AreaChart>` with gradient `<defs>` fill (amber 20% → 0%)
- Add period toggle buttons: `Today | 7D | 30D` — pill group above chart right
- Grid lines: `stroke="#E2E8F0"` (subtle), no Y-axis line
- Tooltip: custom styled, white bg, `rounded-lg shadow-lg`, shows ₱ formatted value
- Chart height: `h-64` (currently may vary) — fix consistent

#### 3.3 Order Type Breakdown (`src/components/admin/order-type-breakdown.tsx`)

Current: Likely a pie/bar chart  
Target: Donut chart (max 4 segments) + legend with percentage labels

Changes:
- Use `<PieChart>` with `innerRadius` for donut style
- Legend: stacked list to the right, color dot + label + count + %
- Colors: amber (kiosk), blue (dine-in), green (takeout), slate (bill later)

#### 3.4 Top Items Chart (`src/components/admin/top-items-chart.tsx`)

Current: Some chart showing top items  
Target: Horizontal bar chart (easier to read long item names)

Changes:
- Switch to `<BarChart layout="vertical">` — horizontal bars
- Item names on Y-axis (left), values on X-axis
- Bars: amber fill, `rounded-r-lg` via custom shape
- Show count AND revenue on hover tooltip
- Limit to top 8 items (truncate names at 25 chars with tooltip)

#### 3.5 Dashboard Layout Grid

```
[KPI] [KPI] [KPI] [KPI]        ← 4 cols
[─────────────────────]  [───]  ← 3/4 + 1/4
[ Sales Area Chart    ]  [Top]  ← 
[                     ]  [Itm]  ←
[                     ]  [Chrt]
[───────────────────────────]   ← full width
[   Order Type Donut  ] [Ord Activity Feed]
```

---

### Page 2: Menu Management (`/admin/menu-management`)

**Files:** `menu-management-tabs.tsx`, `menu-item-cards.tsx`, `menu-item-table.tsx`, `menu-filters.tsx`, `category-cards.tsx`, `category-list.tsx`, `menu-item-form.tsx`

#### 3.6 Tab Design (`menu-management-tabs.tsx`)

Current: shadcn Tabs (likely default styling)  
Target: Pill-style tab switcher

- Replace `<TabsList>` default with custom `bg-slate-100 rounded-xl p-1` container
- Active tab: `bg-white shadow-sm rounded-lg` — pill within pill pattern
- Tabs: "Categories" | "Menu Items" | "Deleted Items" with item count badge

#### 3.7 Menu Item Cards (`menu-item-cards.tsx`)

Target card anatomy:
```
┌─────────────────────────┐
│ [Image 100%] ░░░░░░░░░  │  ← image placeholder if no image
│ [Active] [Edit] [Delete]│  ← action bar overlaid top-right
├─────────────────────────┤
│ Chicken Adobo           │  ← name, font-semibold
│ ₱185                    │  ← price, amber
│ Filipino · Available    │  ← category + stock
└─────────────────────────┘
```
- Card hover: `shadow-md` + `scale-[1.01]` (subtle)
- Image: `aspect-[4/3] object-cover` (not `h-24` fixed)
- Price: `text-amber-600 font-bold`
- Unavailable: 50% opacity overlay + "Unavailable" chip

#### 3.8 Menu Item Table (`menu-item-table.tsx`)

Changes:
- Add image thumbnail column (40px circle/square)
- Sticky header: `sticky top-0 bg-white z-10`
- Row actions: inline icon buttons (edit, toggle availability, delete) — appear on row hover
- Sort indicators on column headers (Name, Price, Category, Order)
- `overflow-x-auto` wrapper for mobile

#### 3.9 Menu Filters (`menu-filters.tsx`)

Target: Filter bar between tabs and content
```
[Search items...] [Category ▾] [Status ▾] [Sort ▾]   [+ Add Item]
```
- All filters inline, not in a separate card
- `+ Add Item` button right-aligned, amber bg

#### 3.10 Menu Item Form Dialogs

Changes:
- Form inside `<Dialog>` with `max-w-2xl` width
- Two-column layout for fields: left (name, description, price, category) / right (image upload preview + switches)
- Image upload: drag-drop zone with preview — currently may just be an input
- Required field asterisks
- `<PasswordStrengthIndicator>`-style feedback for: price validation, name length counter

---

### Page 3: Order History (`/admin/order-history`)

**Files:** `order-history-filters.tsx`, `order-history-table.tsx`, `order-detail-dialog.tsx`

#### 3.11 Filter Bar (`order-history-filters.tsx`)

```
[Search order # or name]  [Date Range ▾]  [Status ▾]  [Payment ▾]  [Export CSV]
```
- Date range: use a date range picker (shadcn Calendar inside Popover)
- Chips for active filters below the bar (dismissible)

#### 3.12 Orders Table (`order-history-table.tsx`)

| # | Order ID | Customer | Type | Status | Payment | Total | Time | Actions |

Changes:
- Color-coded status badges (use semantic colors from §1.1)
- `text-amber-600 font-bold` on total
- Row click opens detail dialog (entire row clickable, not just a button)
- Pagination: `← Previous [1] 2 3 ... 12 Next →` at bottom
- Table: `rounded-xl border border-slate-200` container with `overflow-hidden`

#### 3.13 Order Detail Dialog (`order-detail-dialog.tsx`)

Target: Split-panel inside Dialog
```
┌────────────────────────────────────────┐
│ Order #A-0042               ✕          │
├──────────────┬─────────────────────────┤
│ ORDER INFO   │ ITEMS                   │
│ Status: Paid │ 2× Chicken Adobo ₱370  │
│ Type: Kiosk  │ 1× Rice         ₱ 45   │
│ Time: 2:34pm │ ─────────────────────  │
│              │ Subtotal        ₱415   │
│ PAYMENT      │ VAT 12%         ₱ 50   │
│ Cash ₱500    │ Svc Charge 10%  ₱ 42   │
│ Change ₱85   │ TOTAL           ₱507   │
│              │ [Print Receipt]         │
└──────────────┴─────────────────────────┘
```

---

### Page 4: Promo Codes (`/admin/promo-codes`)

**Files:** `promo-code-filters.tsx`, `promo-code-table.tsx`, `promo-code-form-dialog.tsx`

#### 3.14 Page Layout

```
Promo Codes                              [+ New Promo Code]
──────────────────────────────────────────────────────────
[Search codes...]  [Status: All ▾]  [Type: All ▾]

[Code]   [Discount] [Valid Until] [Usage]    [Status]  [Actions]
WELCOME  20% off    Jun 30, 2026  12/100     ● Active  [Edit][Del]
STAFF50  ₱50 off    —             ∞          ● Active  [Edit][Del]
EXPIRED  15% off    Apr 1, 2026   8/50       ○ Expired [Edit][Del]
```

Changes:
- Usage shown as `used/max` with a thin progress bar underneath
- Expired codes: 60% opacity
- Status badge: green pill (Active), amber pill (Upcoming), slate pill (Expired)
- Copy code button (clipboard icon) next to each code string

---

### Page 5: Reports (`/admin/reports`)

**Files:** `sales-report-client.tsx`, `report-summary-cards.tsx`, `report-by-category-chart.tsx`, `report-by-payment-chart.tsx`, `report-by-item-table.tsx`, `report-export.tsx`

#### 3.15 Report Header

```
Sales Report                            [📅 May 1 – May 29, 2026 ▾]  [Export ▾]
```
- Date range selector as a prominent filter (not buried)
- Export: dropdown with CSV and PDF options

#### 3.16 Summary Cards (`report-summary-cards.tsx`)

Same KPI card pattern as dashboard but 3-up:
- Total Revenue / Total Orders / Average Order Value
- Add: "vs. previous period" comparison

#### 3.17 Category Chart (`report-by-category-chart.tsx`)

Target: Donut chart + ranked list
- Left: Donut (category proportions)  
- Right: Ranked list with color dot, name, ₱ amount, %

#### 3.18 Payment Chart (`report-by-payment-chart.tsx`)

Target: Horizontal bar chart
- Cash | GCash | Card | Bill Later
- Bars with counts and amounts

#### 3.19 Top Items Table (`report-by-item-table.tsx`)

| Rank | Item | Category | Qty Sold | Revenue | % of Total |
- Rank: `#1`, `#2` — bold amber for top 3
- Revenue column: `tabular-nums text-right`
- Sortable columns

---

### Page 6: Users (`/admin/users`)

**Files:** `user-table.tsx`, `user-form-dialog.tsx`

#### 3.20 Users Page Layout

```
Users                                    [+ Invite User]
──────────────────────────────────────────────────────────
[Search name or email]  [Role ▾]  [Status ▾]

[Avatar] [Name]          [Email]            [Role]    [Status]  [Joined]  [Actions]
  JD     Juan Dela Cruz  juan@...           Admin     ● Active  Jan 2026  [Edit]
  MA     Maria Antonia   maria@...          Cashier   ● Active  Feb 2026  [Edit]
  JS     Jose Santos     jose@...           Kitchen   ○ Inactive Mar 2026 [Edit]
```

Changes:
- Avatar: initials circle (colored by role), or photo if available
- Role badge: color-coded (`admin`=amber, `cashier`=blue, `kitchen`=green, `waiter`=violet)
- Status toggle: inline switch on the row
- `[Edit]` opens form dialog to change role/name/status

#### 3.21 User Form Dialog (`user-form-dialog.tsx`)

- Tabs inside dialog: "Profile" / "Security" (change password)
- Role select: visual radio cards (not just `<select>`) showing role name + description
- Deactivate user: red "Deactivate Account" button in destructive section at bottom

---

### Page 7: Audit Log (`/admin/audit-log`)

**Files:** `audit-log-filters.tsx`, `audit-log-table.tsx`, `audit-log-diff-viewer.tsx`

#### 3.22 Audit Log Layout

```
Audit Log                               [Filter ▾]  [Export ▾]
──────────────────────────────────────────────────────────────
[Date range] [Action type ▾] [User ▾] [Table ▾]   [Clear filters]

TIME          USER          ACTION    TABLE       RECORD ID
2:45pm        Juan D.       UPDATE    menu_items  #uuid-abc...  [View diff]
2:30pm        Maria A.      CREATE    orders      #uuid-def...  [View diff]
2:15pm        System        DELETE    promo_codes #uuid-ghi...  [View diff]
```

Changes:
- Action color coding: `CREATE` = green, `UPDATE` = amber, `DELETE` = red
- Timeline feel: thin left border connecting rows in the same session
- Diff viewer: opens in a side panel (Sheet) instead of inline — `before` and `after` columns with changed fields highlighted

---

### Page 8: Settings (`/admin/settings`)

**Files:** `settings-client.tsx` (already built)

Already has 4-tab structure. Design alignment changes only:

- Match tab pill style to Menu Management tabs (§3.6)
- `<SettingsSection>` cards: add subtle `border-l-4 border-amber-500` on left side (visual grouping)
- Form rows: currently `grid-cols-3` — add a help icon `ⓘ` that shows a tooltip with extended explanation
- Save button: `w-full` on mobile, `w-auto` on desktop (currently `justify-end` which is fine)
- Add a "Changes saved" confirmation animation (checkmark) instead of just toast

---

## 4. Shared Components to Create/Update

### 4.1 `src/components/admin/page-header.tsx` (NEW)

Consistent page header for every admin page. Replaces the ad-hoc `<div className="mb-8">` + `<h1>` pattern across all pages.

```tsx
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}
```

### 4.2 `src/components/admin/data-card.tsx` (NEW)

Standardized card wrapper used across all pages:

```tsx
interface DataCardProps {
  title?: string;
  description?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  padding?: 'default' | 'none' | 'compact';
  className?: string;
}
```

### 4.3 `src/components/admin/kpi-card.tsx` (REPLACE stats-cards.tsx logic)

Reusable KPI metric card:

```tsx
interface KpiCardProps {
  label: string;
  value: string;
  trend?: { value: number; direction: 'up' | 'down' | 'neutral'; label: string };
  icon: LucideIcon;
  accentColor?: 'amber' | 'blue' | 'green' | 'violet';
  live?: boolean;
}
```

### 4.4 `src/components/admin/status-badge.tsx` (REPLACE inline badge patterns)

Single source of truth for all status badges across orders, users, promos:

```tsx
type StatusVariant = 
  | 'pending_payment' | 'paid' | 'preparing' | 'ready' | 'served' | 'cancelled'
  | 'active' | 'inactive' | 'expired' | 'upcoming'
  | 'admin' | 'cashier' | 'kitchen' | 'waiter'
  | 'cash' | 'gcash' | 'card' | 'bill_later';
```

### 4.5 `src/components/admin/empty-state.tsx` (NEW)

Consistent empty state across all tables/lists:

```tsx
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}
```

---

## 5. Implementation Phases

### Phase A: Foundation (Do First)
1. Add semantic color tokens to `globals.css`
2. Create `page-header.tsx`, `data-card.tsx`, `kpi-card.tsx`, `status-badge.tsx`, `empty-state.tsx`
3. Revamp `layout-client.tsx` (sidebar groups, user block, nav indicator fix)

### Phase B: High-Impact Pages (Most Visible)
4. Dashboard — KPI cards, charts (area, donut, horizontal bar)
5. Menu Management — card images, filter bar, item table
6. Order History — table, filter chips, detail dialog

### Phase C: Operational Pages
7. Reports — summary cards, charts, export dropdown
8. Promo Codes — usage bar, copy button
9. Users — role cards, avatar initials

### Phase D: Utility Pages
10. Audit Log — action color coding, side-panel diff viewer
11. Settings — tab style alignment, help tooltips

---

## 6. Pre-Delivery Checklist (per page)

- [ ] Uses `<PageHeader>` — no ad-hoc h1 blocks
- [ ] All tables have `overflow-x-auto` wrapper
- [ ] Empty state defined for every list/table
- [ ] Loading skeleton defined for every async section
- [ ] Status badges use `<StatusBadge>` component — no inline class mixing
- [ ] KPI numbers use `tabular-nums` class
- [ ] All chart tooltips show ₱-formatted values
- [ ] Buttons show loading state during mutations
- [ ] Destructive actions (delete) have confirmation dialog
- [ ] Mobile: all interactive targets ≥ 44×44px
- [ ] Color contrast on all text passes 4.5:1 (check slate-400 on white — borderline)
- [ ] `transition-all duration-150` on hover states (not missing, not too long)
- [ ] No emojis as icons — Lucide only

---

## 7. Files Touch Map

| File | Change Type | Phase |
|------|------------|-------|
| `src/app/globals.css` | ADD tokens | A |
| `src/app/admin/layout-client.tsx` | REVAMP | A |
| `src/components/admin/page-header.tsx` | CREATE | A |
| `src/components/admin/data-card.tsx` | CREATE | A |
| `src/components/admin/kpi-card.tsx` | CREATE | A |
| `src/components/admin/status-badge.tsx` | CREATE | A |
| `src/components/admin/empty-state.tsx` | CREATE | A |
| `src/components/admin/stats-cards.tsx` | REVAMP (use kpi-card) | B |
| `src/components/admin/sales-chart.tsx` | REVAMP (area + gradient) | B |
| `src/components/admin/top-items-chart.tsx` | REVAMP (horizontal bar) | B |
| `src/components/admin/order-type-breakdown.tsx` | REVAMP (donut) | B |
| `src/components/admin/dashboard-client.tsx` | UPDATE (grid layout) | B |
| `src/app/admin/page.tsx` | UPDATE (use PageHeader) | B |
| `src/components/admin/menu-filters.tsx` | REVAMP (inline filter bar) | B |
| `src/components/admin/menu-item-cards.tsx` | REVAMP (aspect ratio, hover) | B |
| `src/components/admin/menu-item-table.tsx` | REVAMP (thumbnail, sticky header) | B |
| `src/components/admin/menu-management-tabs.tsx` | REVAMP (pill tabs) | B |
| `src/components/admin/category-cards.tsx` | UPDATE (consistent with item cards) | B |
| `src/components/admin/order-history-filters.tsx` | REVAMP (date range, chips) | C |
| `src/components/admin/order-history-table.tsx` | REVAMP (row click, pagination) | C |
| `src/components/admin/order-detail-dialog.tsx` | REVAMP (split panel) | C |
| `src/components/admin/report-summary-cards.tsx` | UPDATE (use kpi-card) | C |
| `src/components/admin/report-by-category-chart.tsx` | REVAMP (donut + ranked list) | C |
| `src/components/admin/report-by-payment-chart.tsx` | REVAMP (horizontal bar) | C |
| `src/components/admin/report-by-item-table.tsx` | REVAMP (rank column) | C |
| `src/components/admin/promo-code-table.tsx` | REVAMP (usage bar, copy btn) | C |
| `src/components/admin/promo-code-filters.tsx` | UPDATE (inline bar) | C |
| `src/components/admin/user-table.tsx` | REVAMP (avatar, role badges) | D |
| `src/components/admin/user-form-dialog.tsx` | REVAMP (role radio cards) | D |
| `src/components/admin/audit-log-table.tsx` | REVAMP (action colors, timeline) | D |
| `src/components/admin/audit-log-diff-viewer.tsx` | REVAMP (side Sheet panel) | D |
| `src/components/admin/settings-client.tsx` | UPDATE (tab style, help tooltips) | D |
