# Agent: Admin Module
# Scope: /(admin) route group — Restaurant management dashboard

---

## Mission

You own the admin dashboard — the nerve center for restaurant managers. Your goal
is to provide clear, actionable insights and intuitive management tools so the
restaurant manager can control menus, staff, and operations without technical help.

---

## Owned Files

```
src/app/(admin)/
├── layout.tsx                  # Sidebar nav + top bar with user info
├── page.tsx                    # Dashboard: today's KPIs at a glance
├── menu-management/page.tsx    # CRUD for items, categories, addons
├── users/page.tsx              # Staff account management
├── analytics/page.tsx          # Sales charts, reports, exports
└── settings/page.tsx           # System configuration

src/components/admin/
├── sidebar-nav.tsx             # Collapsible sidebar navigation
├── stats-cards.tsx             # KPI cards (orders today, revenue, etc.)
├── menu-item-form.tsx          # Create/edit menu item dialog
├── category-form.tsx           # Create/edit category dialog
├── addon-group-form.tsx        # Create/edit addon group + options
├── menu-item-table.tsx         # Sortable, filterable item list
├── category-list.tsx           # Draggable category reorder
├── user-form.tsx               # Create/edit staff user
├── user-table.tsx              # Staff list with role badges
├── sales-chart.tsx             # Revenue chart (daily/weekly/monthly)
├── top-items-chart.tsx         # Best selling items bar chart
├── order-type-breakdown.tsx    # Pie chart: dine-in vs room vs takeout
├── report-export.tsx           # CSV/PDF export for reports
├── settings-form.tsx           # Tax, service charge, hours config
└── audit-log.tsx               # System action log viewer

src/services/menu-service.ts     # Menu CRUD server actions
src/services/analytics-service.ts # Reporting queries
```

---

## Dashboard KPIs (Today's Stats)

```
┌────────────────┬────────────────┬────────────────┬────────────────┐
│  Orders Today  │ Revenue Today  │ Avg Order Value│ Active Orders  │
│     127        │   ₱45,230      │    ₱356.14     │      8         │
│   ▲ 12% vs yd │  ▲ 8% vs yd   │  ▼ 3% vs yd   │                │
└────────────────┴────────────────┴────────────────┴────────────────┘

┌──────────────────────────────┬───────────────────────────────────┐
│  Revenue Chart (Last 7 Days) │  Top 5 Items Today                │
│  ▁▃▅▇█▆▇                    │  1. Chicken Adobo (34 orders)    │
│  M T W T F S S               │  2. Sinigang na Baboy (28)       │
│                              │  3. Halo-Halo (22)               │
│                              │  4. Lechon Kawali (19)           │
│                              │  5. Mango Shake (17)             │
└──────────────────────────────┴───────────────────────────────────┘
```

### Dashboard Queries
```typescript
// Today's stats — use Supabase RPC for complex aggregations
const { data } = await supabase.rpc('get_dashboard_stats', {
  date_from: startOfToday,
  date_to: endOfToday
});

// Returns: { total_orders, total_revenue, avg_order_value, 
//            active_orders, orders_by_type, top_items }
```

---

## Menu Management

### Category CRUD
```typescript
// Server Actions
'use server'
async function createCategory(formData: FormData) {
  const input = categorySchema.parse({
    name: formData.get('name'),
    description: formData.get('description'),
    image: formData.get('image'),    // File upload → Supabase Storage
    display_order: formData.get('display_order'),
  });
  // Upload image → get URL → insert category
}

async function reorderCategories(orderedIds: string[]) {
  // Batch update display_order for all categories
}
```

### Menu Item CRUD
```typescript
interface MenuItemFormData {
  name: string;
  description: string;
  category_id: string;
  base_price: number;
  image: File | null;
  is_available: boolean;
  is_featured: boolean;
  preparation_time_minutes: number;
  addon_groups: {
    name: string;
    is_required: boolean;
    min_selections: number;
    max_selections: number;
    options: { name: string; additional_price: number }[];
  }[];
}
```

### Availability Toggle
- Quick toggle switch on each item in the list view
- When toggled OFF: item immediately disappears from kiosk menu
- When toggled ON: item immediately appears on kiosk menu
- Uses Supabase realtime — kiosk picks up changes instantly

---

## User Management

### Staff Roles
| Role | Access | Login Method |
|------|--------|-------------|
| admin | Full system access | Email + password |
| cashier | Payments, basic reports | Email + password, PIN shortcut |
| kitchen | KDS only | Email + password, PIN shortcut |

### PIN System
- 4-6 digit PIN for quick login on shared devices
- PIN is hashed (bcrypt) in the database, never stored plaintext
- PIN login creates a short-lived Supabase session (8 hours)
- Each staff member has a unique PIN

### User Management Actions
```typescript
'use server'
async function createStaffUser(input: {
  email: string;
  fullName: string;
  role: 'admin' | 'cashier' | 'kitchen';
  pin?: string;
}) {
  // 1. Create Supabase auth user
  // 2. Create profile with role
  // 3. Set PIN if provided
}

async function updateStaffRole(userId: string, newRole: string) {
  // Update profile role
  // This immediately changes their access via RLS policies
}

async function deactivateUser(userId: string) {
  // Soft delete: set is_active = false
  // Revoke all active sessions
}
```

---

## Analytics & Reports

### Sales Reports
- **Daily report**: Orders, revenue, breakdown by payment method
- **Weekly report**: Trend comparison, busiest hours heatmap
- **Monthly report**: Category performance, growth metrics
- **Custom range**: Any date range with exportable data

### Report Queries
```typescript
// Revenue by date range
const { data } = await supabase.rpc('get_sales_report', {
  date_from: '2026-01-01',
  date_to: '2026-01-31',
  group_by: 'day'  // 'day' | 'week' | 'month'
});

// Returns per period:
// { period, total_orders, total_revenue, avg_order_value,
//   orders_by_type, orders_by_payment_method, top_items }
```

### Export Formats
- **CSV**: Raw data export for spreadsheet analysis
- **PDF**: Formatted report with charts (generated server-side)

---

## System Settings

### Configurable Settings
```typescript
interface SystemSettings {
  restaurant_name: string;
  restaurant_address: string;
  tin: string;                      // Tax ID number
  tax_rate: number;                 // Default 0.12 (12% VAT)
  service_charge_rate: number;      // Default 0.05 (5%)
  service_charge_enabled: boolean;
  operating_hours: {
    [day: string]: { open: string; close: string; closed: boolean };
  };
  order_number_prefix: string;      // Default 'A'
  order_number_reset: 'daily' | 'never';
  idle_timeout_seconds: number;     // Kiosk idle timer
  kds_auto_hide_seconds: number;    // Kitchen served order hide delay
  currency_symbol: string;          // Default '₱'
  receipt_footer_text: string;      // Custom receipt message
}
```

### Settings Storage
Settings are stored in the `settings` table as key-value pairs with JSONB values.
The admin form reads all settings on load and writes changed values on save.

---

## Key Implementation Notes

1. **Image uploads**: Use Supabase Storage for menu item and category
   images. Compress and resize on upload (max 800px width, WebP format).
   Generate blur hash for placeholder loading.

2. **Drag-and-drop reorder**: Use `@dnd-kit/core` for category and
   item reordering. Persist new order to database on drop.

3. **Optimistic availability toggle**: Toggle immediately in UI,
   update database in background. Revert on failure.

4. **Chart library**: Use Recharts (already available in artifacts).
   Keep charts clean and readable — no chartjunk.

5. **Audit log**: Log all admin actions (create/update/delete) with
   timestamp, user, action type, and before/after values.
   Use a Supabase database trigger for automatic logging.

6. **Role guard**: The admin layout must verify the user's role
   on every request via middleware. Never rely on client-side checks alone.

---

## Dependencies

- `recharts` — Charts and graphs
- `@dnd-kit/core` + `@dnd-kit/sortable` — Drag and drop
- `date-fns` — Date formatting and ranges
- `zod` — Form validation
- shadcn/ui: Sidebar, Table, Dialog, Form, Switch, Tabs, Calendar
