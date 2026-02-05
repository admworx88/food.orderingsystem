# Agent: Admin Module
# Scope: /(admin) route group — Restaurant management dashboard

**Version:** 2.0 (Updated for PRD v1.1)
**Date:** February 5, 2026
**Status:** Aligned with PRD v1.1 and Architecture v2.0

---

## Mission

You own the admin dashboard — the nerve center for restaurant managers. Your goal
is to provide clear, actionable insights and intuitive management tools so the
restaurant manager can control menus, staff, operations, and promotions without technical help.

---

## Owned Files

```
src/app/(admin)/
├── layout.tsx                  # Sidebar nav + top bar with user info
├── page.tsx                    # Dashboard: today's KPIs at a glance
├── menu-management/page.tsx    # CRUD for items, categories, addons
├── promo-codes/page.tsx        # NEW: Promo code management (F-A10)
├── users/page.tsx              # Staff account management
├── analytics/page.tsx          # Sales charts, reports, exports
├── order-history/page.tsx      # NEW: Guest order history lookup
├── bir-config/page.tsx         # NEW: BIR receipt configuration (F-A11)
└── settings/page.tsx           # System configuration

src/components/admin/
├── sidebar-nav.tsx             # Collapsible sidebar navigation
├── stats-cards.tsx             # KPI cards (orders today, revenue, etc.)
├── menu-item-form.tsx          # Create/edit menu item dialog (ENHANCED)
├── category-form.tsx           # Create/edit category dialog
├── addon-group-form.tsx        # Create/edit addon group + options
├── menu-item-table.tsx         # Sortable, filterable item list
├── category-list.tsx           # Draggable category reorder
├── promo-code-form.tsx         # NEW: Create/edit promo code
├── promo-code-table.tsx        # NEW: Promo code list with status
├── user-form.tsx               # Create/edit staff user
├── user-table.tsx              # Staff list with role badges
├── order-history-search.tsx    # NEW: Search orders by phone number
├── bir-config-form.tsx         # NEW: BIR receipt settings
├── sales-chart.tsx             # Revenue chart (daily/weekly/monthly)
├── top-items-chart.tsx         # Best selling items bar chart
├── order-type-breakdown.tsx    # Pie chart: dine-in vs room vs takeout
├── report-export.tsx           # CSV/PDF export for reports
├── settings-form.tsx           # Tax, service charge, hours config
└── audit-log.tsx               # System action log viewer

src/services/menu-service.ts     # Menu CRUD server actions
src/services/promo-service.ts    # NEW: Promo code CRUD server actions
src/services/analytics-service.ts # Reporting queries
src/services/bir-service.ts      # NEW: BIR config management
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

## Menu Management (ENHANCED for PRD v1.1)

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

### Menu Item CRUD (ENHANCED)
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

  // NEW in PRD v1.1:
  allergens: string[];              // e.g., ['dairy', 'nuts', 'gluten', 'shellfish']
  nutritional_info: {               // Optional nutritional facts
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sodium?: number;
  };
  translations: {                   // Multi-language support
    en: { name: string; description: string };
    tl?: { name: string; description: string };
  };
  kitchen_stations: string[];       // Array of kitchen station IDs

  addon_groups: {
    name: string;
    is_required: boolean;
    min_selections: number;
    max_selections: number;
    options: { name: string; additional_price: number }[];
  }[];
}
```

### Soft Delete Pattern
```typescript
// NEVER hard delete menu items
'use server'
async function deleteMenuItem(id: string) {
  // Soft delete: set deleted_at timestamp
  await supabase
    .from('menu_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  revalidatePath('/admin/menu-management');
}

// Restore soft-deleted item
async function restoreMenuItem(id: string) {
  await supabase
    .from('menu_items')
    .update({ deleted_at: null })
    .eq('id', id);
}

// View deleted items
async function getDeletedMenuItems() {
  const { data } = await supabase
    .from('menu_items')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  return data;
}
```

### Availability Toggle
- Quick toggle switch on each item in the list view
- When toggled OFF: item immediately disappears from kiosk menu
- When toggled ON: item immediately appears on kiosk menu
- Uses Supabase realtime — kiosk picks up changes instantly

---

## Promo Code Management (NEW - F-A10)

### Promo Code CRUD
```typescript
interface PromoCodeFormData {
  code: string;                     // Unique, case-insensitive, alphanumeric
  description: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;           // e.g., 20 (for 20% off) or 100 (for ₱100 off)
  min_order_amount: number | null;  // Minimum order subtotal required
  max_usage_count: number | null;   // NULL = unlimited
  valid_from: Date;
  valid_until: Date;
  is_active: boolean;
}
```

### Server Actions
```typescript
'use server'
async function createPromoCode(input: PromoCodeFormData) {
  // 1. Validate with Zod
  const validated = promoCodeSchema.parse(input);

  // 2. Ensure code is unique (case-insensitive)
  const { data: existing } = await supabase
    .from('promo_codes')
    .select('code')
    .ilike('code', validated.code)
    .single();

  if (existing) throw new Error('Promo code already exists');

  // 3. Insert promo code
  const { data, error } = await supabase
    .from('promo_codes')
    .insert({
      ...validated,
      code: validated.code.toUpperCase(), // Store uppercase
      current_usage_count: 0,
    })
    .select()
    .single();

  if (error) throw error;
  revalidatePath('/admin/promo-codes');
  return data;
}

async function validatePromoCode(code: string, orderSubtotal: number) {
  const { data } = await supabase
    .from('promo_codes')
    .select('*')
    .ilike('code', code)
    .eq('is_active', true)
    .single();

  if (!data) throw new Error('Invalid promo code');

  // Validation checks
  const now = new Date();
  if (now < new Date(data.valid_from) || now > new Date(data.valid_until)) {
    throw new Error('Promo code expired or not yet valid');
  }

  if (data.max_usage_count && data.current_usage_count >= data.max_usage_count) {
    throw new Error('Promo code usage limit reached');
  }

  if (data.min_order_amount && orderSubtotal < data.min_order_amount) {
    throw new Error(`Minimum order amount is ₱${data.min_order_amount}`);
  }

  // Calculate discount
  const discountAmount = data.discount_type === 'percentage'
    ? (orderSubtotal * data.discount_value / 100)
    : data.discount_value;

  return { promo: data, discountAmount };
}
```

### Promo Code Table View
- Code, description, type, value, usage count, valid dates, status
- Quick toggle for is_active
- Edit/delete actions
- Filter by: active/inactive, expired/upcoming, usage count
- Sort by: created date, valid_until, usage count

---

## BIR Receipt Configuration (NEW - F-A11)

### BIR Config Form
```typescript
interface BIRConfigData {
  tin: string;                      // Tax Identification Number
  business_name: string;
  business_address: string;
  permit_number: string;
  permit_date_issued: Date;
  receipt_series_start: number;     // Starting receipt number
  receipt_series_current: number;   // Current receipt number
  accreditation_number: string;
  accreditation_date: Date;
  pos_machine_id: string;
  terminal_id: string;
}
```

### Server Actions
```typescript
'use server'
async function updateBIRConfig(input: BIRConfigData) {
  const validated = birConfigSchema.parse(input);

  // Update or insert BIR config (singleton record)
  const { error } = await supabase
    .from('bir_receipt_config')
    .upsert(validated);

  if (error) throw error;
  revalidatePath('/admin/bir-config');
}

async function getNextReceiptNumber() {
  const { data: config } = await supabase
    .from('bir_receipt_config')
    .select('receipt_series_current')
    .single();

  if (!config) throw new Error('BIR config not set up');

  const nextNumber = config.receipt_series_current + 1;

  // Update current number
  await supabase
    .from('bir_receipt_config')
    .update({ receipt_series_current: nextNumber })
    .single();

  return nextNumber;
}
```

**BIR Compliance Notes:**
- Receipt numbers must be sequential with no gaps
- Receipts must include TIN, business name, address
- Must display "THIS INVOICE/RECEIPT SHALL BE VALID FOR FIVE (5) YEARS FROM THE DATE OF THE PERMIT TO USE"
- Must show BIR accreditation info
- Required by Philippine law for all businesses

---

## Guest Order History Lookup (NEW)

### Search by Phone Number
```typescript
'use server'
async function getOrdersByPhone(phoneNumber: string) {
  const { data } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(*, order_item_addons(*))
    `)
    .eq('guest_phone', phoneNumber)
    .eq('payment_status', 'paid')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  return data;
}
```

### UI Features
- Search bar with phone number input
- Results table: order number, date, type, total, status
- Click row to view full order details
- Reorder button (creates new cart with same items)
- Filter by date range, order type

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

### Configurable Settings (ENHANCED)
```typescript
interface SystemSettings {
  restaurant_name: string;
  restaurant_address: string;
  tin: string;                      // Tax ID number
  tax_rate: number;                 // Default 0.12 (12% VAT)
  service_charge_rate: number;      // Default 0.10 (10%)
  service_charge_enabled: boolean;
  unpaid_order_timeout_minutes: number;  // NEW: Default 15
  order_grace_period_minutes: number;    // NEW: Default 5
  operating_hours: {
    [day: string]: { open: string; close: string; closed: boolean };
  };
  order_number_prefix: string;      // Default 'A'
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

## Kitchen Stations Management (NEW)

### Kitchen Stations CRUD
```typescript
interface KitchenStationData {
  name: string;              // 'Grill', 'Fryer', 'Salad', 'Dessert'
  description: string;
  is_active: boolean;
}

// Assign menu items to kitchen stations
async function assignMenuItemToStations(
  menuItemId: string,
  stationIds: string[]
) {
  // Delete existing assignments
  await supabase
    .from('menu_item_stations')
    .delete()
    .eq('menu_item_id', menuItemId);

  // Insert new assignments
  const assignments = stationIds.map(stationId => ({
    menu_item_id: menuItemId,
    kitchen_station_id: stationId
  }));

  await supabase
    .from('menu_item_stations')
    .insert(assignments);
}
```

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

7. **Soft delete pattern**:
   - Menu items and orders use `deleted_at` instead of hard deletes
   - Add "View Deleted Items" section in menu management
   - Restore functionality for accidentally deleted items
   - Permanently delete after 90 days (optional cleanup job)

8. **Promo code validation**:
   - Case-insensitive code matching
   - Date range validation (valid_from to valid_until)
   - Usage limit enforcement
   - Minimum order amount check
   - Applied BEFORE tax calculation

9. **BIR compliance**:
   - Sequential receipt numbering (no gaps)
   - All required fields must be filled
   - Backup receipt series data daily
   - Generate official receipt PDF with all BIR-required fields

---

## Dependencies

- `recharts` — Charts and graphs
- `@dnd-kit/core` + `@dnd-kit/sortable` — Drag and drop
- `date-fns` — Date formatting and ranges
- `zod` — Form validation
- `react-pdf` — BIR receipt PDF generation (NEW)
- shadcn/ui: Sidebar, Table, Dialog, Form, Switch, Tabs, Calendar, Select, Badge

---

## Version History

### Version 2.0 (February 5, 2026)
**Status**: Updated for PRD v1.1 and Architecture v2.0 alignment

**Major Updates**:
- ✅ Added promo code management (F-A10 from PRD v1.1)
- ✅ Added BIR receipt configuration (F-A11 from PRD v1.1)
- ✅ Enhanced menu item form with allergens, nutritional_info, translations
- ✅ Added kitchen stations management
- ✅ Added guest order history lookup
- ✅ Documented soft delete pattern
- ✅ Added order expiration timeout settings
- ✅ Updated system settings interface
- ✅ Added react-pdf dependency for BIR receipts

### Version 1.0 (February 2, 2026)
- Initial admin module specification

---

## Related Documents

- **[PRD.md](../prd/PRD.md)** — Product Requirements Document v1.1
- **[ARCHITECTURE.md](../architecture/ARCHITECTURE.md)** — System Architecture v2.0
- **[AGENT-DATABASE.md](./AGENT-DATABASE.md)** — Database schema v2.0
