'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import {
  UtensilsCrossed, Utensils, Search, X, Plus, ChevronLeft,
  Coffee, Flame, Fish, Leaf, Wheat, Star, GlassWater,
  Beef, Cookie, ChefHat, Sandwich, Soup, Egg, Sunrise,
  Drumstick, Salad,
  PlayCircle, Loader2,
  type LucideIcon,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useStaffSessionStore } from '@/stores/staff-session-store';
// Intentional cross-module: kiosk embeds cashier POS + waiter queue for staff
// who sign in via PIN on the kiosk terminal (role-gated by staffRole check below).
import { CashierPosClient } from '@/components/cashier/cashier-pos-client';
import { RecentOrdersClient } from '@/components/cashier/recent-orders-client';
import { CollectionsView } from '@/components/cashier/collections-view';
import { WaiterOrderQueue } from '@/components/waiter/waiter-order-queue';
import { getRecentCompletedOrders, getOpenShift, getShiftDetails, getMostRecentClosedShift, startShift, getShiftCollections } from '@/services/payment-service';
import { toggleMenuItemAvailability } from '@/services/menu-service';
import type { RecentOrder, Shift, ShiftPaymentRow, ShiftDeduction, ShiftTotals, ShiftCollectionRecord } from '@/types/payment';
import { MenuStatusGrid } from './menu-status-grid';
import { ItemDetailSheet } from './item-detail-sheet';
import { EmployeePinDialog } from './employee-pin-dialog';
import { KioskNavSidebar } from './kiosk-nav-sidebar';
import { useKioskLocation } from '@/hooks/use-kiosk-location';
import type { KioskType } from '@/services/user-service';
import { KioskCartPanel, type AddItemsContext } from './kiosk-cart-panel';
import { useCartStore } from '@/stores/cart-store';
import { formatCurrency } from '@/lib/utils/currency';
import { normalizeImageUrl } from '@/lib/utils/image';
import { cn } from '@/lib/utils';
import type { Database } from '@/lib/supabase/types';

type Category = Database['public']['Tables']['categories']['Row'];
type MenuItem = Database['public']['Tables']['menu_items']['Row'] & {
  category: { id: string; name: string; requires_kitchen: boolean } | null;
};

import type { CashierOrder } from '@/types/payment';

interface KioskPosLayoutProps {
  categories: Category[];
  menuItems: MenuItem[];
  initialPendingOrders?: CashierOrder[];
  initialUnpaidBills?: CashierOrder[];
  kioskType?: KioskType;
  initialView?: 'menu' | 'orders' | 'payments';
  initialSelectedOrderId?: string;
  addItemsContext?: AddItemsContext;
}

// SVG icon map — no emojis (violates no-emoji-icons rule)
const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  'all-day breakfast': Sunrise,
  'breakfast': Coffee,
  'silog meals': Egg,
  'filipino favorites': Star,
  'grilled': Flame,
  'grilled & bbq': Flame,
  'bbq': Flame,
  'appetizers': Salad,
  'starters': Salad,
  'soups': Soup,
  'soup': Soup,
  'salads': Leaf,
  'rice meals': Wheat,
  'rice': Wheat,
  'rice varieties': Wheat,
  'chicken': Drumstick,
  'pork': Beef,
  'beef': Beef,
  'meat': Beef,
  'seafood': Fish,
  'pasta': UtensilsCrossed,
  'pasta & noodles': UtensilsCrossed,
  'noodles': UtensilsCrossed,
  'vegetarian': Leaf,
  'vegan': Leaf,
  'side dishes': Cookie,
  'sides': Cookie,
  'extra toppings': ChefHat,
  'hot beverages': Coffee,
  'cold beverages': GlassWater,
  'beverages': GlassWater,
  'drinks': GlassWater,
  'fresh juices': GlassWater,
  'soft drinks': GlassWater,
  'sandwiches': Sandwich,
  'desserts': Cookie,
  'sweets': Cookie,
  'specials': Star,
  "chef's specials": ChefHat,
  'mains': Utensils,
  'main dishes': Utensils,
  'main course': Utensils,
};

function getCategoryLucideIcon(name: string): LucideIcon {
  return CATEGORY_ICON_MAP[name.toLowerCase()] ?? Utensils;
}


export function KioskPosLayout({ categories, menuItems, initialPendingOrders = [], initialUnpaidBills = [], kioskType = 'restaurant', initialView, initialSelectedOrderId, addItemsContext }: KioskPosLayoutProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | 'all'>('all');
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeView, setActiveView] = useState<'menu' | 'orders' | 'payments'>(initialView ?? 'menu');
  const [cashierTab, setCashierTab] = useState<'payments' | 'recent' | 'collections' | 'menu-status'>('payments');
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [collectionsDetails, setCollectionsDetails] = useState<{
    shift: Shift | null;
    payments: ShiftPaymentRow[];
    deductions: ShiftDeduction[];
    totals: ShiftTotals;
    lastClosedShift: Shift | null;
    collectionHistory: ShiftCollectionRecord[];
  } | null>(null);
  const [recentLoading, setRecentLoading] = useState(false);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [kioskShiftChecked, setKioskShiftChecked] = useState(false);
  const [startShiftDialogOpen, setStartShiftDialogOpen] = useState(false);
  const [startingShift, setStartingShift] = useState(false);
  // Optimistic availability map — shared between kiosk menu + Menu Status tab
  const [itemAvailability, setItemAvailability] = useState<Record<string, boolean>>(
    () => Object.fromEntries(menuItems.map((i) => [i.id, i.is_available ?? true]))
  );
  const [togglingIds, setTogglingIds] = useState<Record<string, boolean>>({});
  const [pinDialogOpen, setPinDialogOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const session = useStaffSessionStore((s) => s.session);
  const staffRole = session?.role;
  const { location: kioskLocation } = useKioskLocation();

  const loadCollectionsData = useCallback(async (cashierId?: string) => {
    setCollectionsLoading(true);
    const emptyTotals: ShiftTotals = { grossTotal: 0, byMethod: { cash: { count: 0, total: 0 }, gcash: { count: 0, total: 0 }, ewallet: { count: 0, total: 0 }, card: { count: 0, total: 0 }, bill_later: { count: 0, total: 0 } }, refundsTotal: 0, deductionsTotal: 0, netCash: 0, totalOrders: 0 };
    const [shiftResult, lastClosedResult, historyResult] = await Promise.all([
      getOpenShift(cashierId),
      getMostRecentClosedShift(cashierId),
      getShiftCollections(cashierId),
    ]);
    const lastClosed = lastClosedResult.success ? lastClosedResult.data : null;
    const history = historyResult.success ? historyResult.data : [];
    if (shiftResult.success && shiftResult.data) {
      const detailsResult = await getShiftDetails(shiftResult.data.id, cashierId);
      if (detailsResult.success) {
        setCollectionsDetails({ shift: detailsResult.data.shift, payments: detailsResult.data.payments, deductions: detailsResult.data.deductions, totals: detailsResult.data.totals, lastClosedShift: lastClosed, collectionHistory: history });
      } else {
        setCollectionsDetails({ shift: shiftResult.data, payments: [], deductions: [], totals: emptyTotals, lastClosedShift: lastClosed, collectionHistory: history });
      }
    } else {
      setCollectionsDetails({ shift: null, payments: [], deductions: [], totals: emptyTotals, lastClosedShift: lastClosed, collectionHistory: history });
    }
    setCollectionsLoading(false);
  }, []);

  // Ocean View cashier sees only ocean_view orders; restaurant cashier sees all.
  // Server-side fetch returns all orders (no localStorage access on server), so filter client-side.
  const filteredPendingOrders = kioskLocation === 'ocean_view'
    ? initialPendingOrders.filter((o) => o.kiosk_location === 'ocean_view')
    : initialPendingOrders;
  const filteredUnpaidBills = kioskLocation === 'ocean_view'
    ? initialUnpaidBills.filter((o) => o.kiosk_location === 'ocean_view')
    : initialUnpaidBills;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (staffRole === 'kitchen') {
      setActiveView('payments');
      setCashierTab('menu-status');
    }
  }, [staffRole]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Reset shift check when a new staff member signs in
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKioskShiftChecked(false);
  }, [session?.id]);

  // Show start-shift dialog when cashier enters payments view with no open shift
  useEffect(() => {
    if (activeView !== 'payments') return;
    if (!session || (session.role !== 'cashier' && session.role !== 'admin')) return;
    if (kioskShiftChecked) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKioskShiftChecked(true);
    getOpenShift(session?.id ?? undefined).then((result) => {
      if (result.success && !result.data) {
        setStartShiftDialogOpen(true);
      }
    });
  }, [activeView, session, kioskShiftChecked]);

  const handleKioskStartShift = async () => {
    setStartingShift(true);
    const result = await startShift(session?.id ?? undefined);
    setStartingShift(false);
    if (result.success) {
      setStartShiftDialogOpen(false);
      toast.success('Shift started');
    } else {
      toast.error(result.error ?? 'Failed to start shift');
    }
  };

  const addItem = useCartStore((state) => state.addItem);

  const handleCategoryClick = useCallback((categoryId: string | 'all') => {
    setActiveCategoryId(categoryId);
    setSearch('');
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleItemClick = (item: MenuItem) => {
    if (itemAvailability[item.id] === false) return;
    setDetailItem(item);
    setDetailOpen(true);
  };

  const handleToggleAvailability = useCallback(async (id: string, newValue: boolean) => {
    setTogglingIds((prev) => ({ ...prev, [id]: true }));
    setItemAvailability((prev) => ({ ...prev, [id]: newValue }));
    const result = await toggleMenuItemAvailability(
      id,
      newValue,
      session ? { id: session.id, name: session.full_name, role: session.role } : undefined
    );
    if (!result.success) {
      setItemAvailability((prev) => ({ ...prev, [id]: !newValue }));
      toast.error(result.error ?? 'Failed to update availability');
    } else {
      toast.success(newValue ? 'Item marked as available' : 'Item marked as unavailable');
    }
    setTogglingIds((prev) => ({ ...prev, [id]: false }));
  }, [session]);

  const filteredItems = search
    ? menuItems.filter(
        (i) =>
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          i.description?.toLowerCase().includes(search.toLowerCase())
      )
    : menuItems;

  const groupedItems = categories
    .map((cat) => ({
      category: cat,
      items: filteredItems.filter((i) => i.category_id === cat.id),
    }))
    .filter((g) => g.items.length > 0)
    .filter((g) => activeCategoryId === 'all' || g.category.id === activeCategoryId)
    .sort((a, b) =>
      activeCategoryId === 'all'
        ? a.category.name.localeCompare(b.category.name)
        : 0
    );

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Add Items context banner ── */}
      {addItemsContext && (
        <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.history.back()}
                className="w-9 h-9 rounded-lg bg-amber-100 hover:bg-amber-200 flex items-center justify-center active:scale-95 transition-all"
                aria-label="Go back"
              >
                <ChevronLeft className="w-5 h-5 text-amber-700" strokeWidth={2} />
              </button>
              <div>
                <h2 className="text-sm font-bold text-amber-900">
                  Adding to Order #{addItemsContext.orderNumber}
                </h2>
                <p className="text-xs text-amber-700">
                  {addItemsContext.tableNumber ? `Table ${addItemsContext.tableNumber} · ` : ''}
                  {addItemsContext.currentItemsCount} existing item{addItemsContext.currentItemsCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-amber-700">Current total</p>
              <p className="text-sm font-bold text-amber-900">{formatCurrency(addItemsContext.currentTotal)}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">

      {/* ── Left icon nav — hidden in add items mode ── */}
      {!addItemsContext && (
        <KioskNavSidebar
          activeLabel={activeView === 'menu' ? 'Menu' : activeView === 'orders' ? 'Orders' : 'Payments'}
          onNavClick={(label) => {
            if (label === 'Menu') { setActiveView('menu'); }
            else if (label === 'Orders') { setActiveView('orders'); }
            else if (label === 'Payments') {
              if (!session) { setPinDialogOpen(true); }
              else { setActiveView('payments'); }
            }
          }}
        />
      )}

      {/* ── Payments view — light mode, matches kiosk palette ── */}
      {activeView === 'payments' && (
        <div className="kiosk-payments-embed flex-1 flex flex-col overflow-hidden bg-[#FAF7F2]">
          {/* Tab bar */}
          <div className="flex-shrink-0 flex items-center h-11 px-3 bg-white border-b border-stone-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            {(['payments', 'recent', 'collections', 'menu-status'] as const).filter((tab) => {
              if (tab === 'menu-status') return staffRole === 'cashier' || staffRole === 'admin' || staffRole === 'kitchen';
              if (tab === 'payments' || tab === 'recent' || tab === 'collections') return staffRole !== 'kitchen';
              return true;
            }).map((tab) => {
              const labels: Record<string, string> = { payments: 'Payments', recent: 'Recent Orders', collections: 'Collections', 'menu-status': 'Menu Status' };
              const isTabActive = cashierTab === tab;
              return (
                <button
                  key={tab}
                  onClick={async () => {
                    setCashierTab(tab);
                    if (tab === 'recent' && recentOrders.length === 0) {
                      setRecentLoading(true);
                      const r = await getRecentCompletedOrders();
                      if (r.success) setRecentOrders(r.data);
                      setRecentLoading(false);
                    }
                    if (tab === 'collections') {
                      await loadCollectionsData(session?.id ?? undefined);
                    }
                  }}
                  className={cn(
                    'relative h-full px-4 text-[13px] font-semibold transition-colors duration-150 whitespace-nowrap',
                    isTabActive
                      ? 'text-orange-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-orange-500 after:rounded-t-full'
                      : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'
                  )}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {cashierTab === 'payments' && (
              <CashierPosClient
                initialOrders={filteredPendingOrders}
                initialUnpaidBills={filteredUnpaidBills}
                cashierId={session?.id ?? ''}
                cashierName={session?.full_name ?? 'Staff'}
                isPayMongoEnabled={false}
                kioskTheme
                kioskLocation={kioskLocation}
                initialSelectedOrderId={initialSelectedOrderId}
              />
            )}
            {cashierTab === 'recent' && (
              recentLoading
                ? <div className="flex items-center justify-center h-full text-stone-400 text-sm">Loading…</div>
                : <RecentOrdersClient initialOrders={recentOrders} />
            )}
            {cashierTab === 'collections' && (
              <div className="h-full overflow-y-auto">
                {collectionsLoading
                  ? <div className="flex items-center justify-center h-full text-stone-400 text-sm">Loading…</div>
                  : collectionsDetails
                    ? <CollectionsView
                        shift={collectionsDetails.shift}
                        cashierName={session?.full_name ?? 'Staff'}
                        payments={collectionsDetails.payments}
                        initialDeductions={collectionsDetails.deductions}
                        totals={collectionsDetails.totals}
                        lastClosedShift={collectionsDetails.lastClosedShift}
                        collectionHistory={collectionsDetails.collectionHistory}
                        showStartShiftButton={false}
                        overrideCashierId={session?.id ?? undefined}
                        onShiftSubmitted={() => loadCollectionsData(session?.id ?? undefined)}
                      />
                    : null}
              </div>
            )}
            {cashierTab === 'menu-status' && (
              <MenuStatusGrid
                categories={categories}
                menuItems={menuItems}
                availability={itemAvailability}
                togglingIds={togglingIds}
                onToggle={handleToggleAvailability}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Orders view — waiter queue embedded ── */}
      {activeView === 'orders' && (
        <div className="flex-1 overflow-hidden waiter-bg">
          <WaiterOrderQueue initialOrders={[]} />
        </div>
      )}

      {/* ── Category sidebar ── */}
      <div className={cn('w-[190px] xl:w-[210px] flex-shrink-0 bg-white border-r border-stone-100 flex flex-col overflow-hidden', (activeView === 'payments' || activeView === 'orders') && 'hidden')}>
        {/* Sidebar heading */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-stone-100 bg-stone-50">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.12em]">Categories</p>
        </div>

        {/* Category list */}
        <div className="flex-1 overflow-y-auto py-1">
          {/* All Items */}
          <button
            onClick={() => handleCategoryClick('all')}
            className={cn(
              'w-full flex items-center gap-3 px-3 min-h-[52px] text-left transition-all duration-150 relative',
              activeCategoryId === 'all' && !search
                ? 'bg-amber-50'
                : 'hover:bg-stone-50 active:bg-stone-100'
            )}
          >
            {activeCategoryId === 'all' && !search && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 bg-amber-500 rounded-r-full" />
            )}
            <div className={cn(
              'w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center transition-all duration-150',
              activeCategoryId === 'all' && !search ? 'bg-amber-100' : 'bg-stone-100'
            )}>
              <UtensilsCrossed className={cn('w-4 h-4', activeCategoryId === 'all' && !search ? 'text-amber-600' : 'text-stone-500')} strokeWidth={1.75} />
            </div>
            <span className={cn(
              'text-[13px] font-medium leading-tight transition-colors duration-150',
              activeCategoryId === 'all' && !search ? 'text-amber-700 font-semibold' : 'text-stone-600'
            )}>
              All Items
            </span>
          </button>

          {categories.map((cat) => {
            const isActive = activeCategoryId === cat.id && !search;
            const Icon = getCategoryLucideIcon(cat.name);

            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 min-h-[52px] text-left transition-all duration-150 relative',
                  isActive
                    ? 'bg-amber-50'
                    : 'hover:bg-stone-50 active:bg-stone-100'
                )}
              >
                {/* Active indicator — left side */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 bg-amber-500 rounded-r-full" />
                )}

                {/* Icon container */}
                <div className={cn(
                  'relative w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center transition-all duration-150 overflow-hidden',
                  isActive
                    ? 'bg-amber-100'
                    : 'bg-stone-100'
                )}>
                  {cat.image_url ? (
                    <Image
                      src={normalizeImageUrl(cat.image_url) || ''}
                      alt=""
                      fill
                      className="object-cover rounded-lg"
                      sizes="32px"
                    />
                  ) : (
                    <Icon
                      className={cn(
                        'w-4 h-4 transition-colors duration-150',
                        isActive ? 'text-amber-600' : 'text-stone-500'
                      )}
                      strokeWidth={1.75}
                    />
                  )}
                </div>

                {/* Category name */}
                <span className={cn(
                  'text-[13px] font-medium leading-tight transition-colors duration-150',
                  isActive ? 'text-amber-700 font-semibold' : 'text-stone-600'
                )}>
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Menu content ── */}
      <div className={cn('flex-1 flex flex-col min-w-0 overflow-hidden bg-stone-100', (activeView === 'payments' || activeView === 'orders') && 'hidden')}>
        {/* Search bar */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-stone-100 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" strokeWidth={2} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search menu items..."
              className="w-full h-9 pl-9 pr-8 rounded-xl bg-stone-100 border-0 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        {/* Menu grid */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 xl:p-5"
        >
          {search && filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center">
                <Search className="w-6 h-6 text-stone-300" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-500">No results for &ldquo;{search}&rdquo;</p>
                <p className="text-xs text-stone-400 mt-0.5">Try a different keyword</p>
              </div>
            </div>
          ) : (
            <div className="space-y-7">
              {groupedItems.map(({ category, items }) => {
                const SectionIcon = getCategoryLucideIcon(category.name);
                return (
                  <div key={category.id}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <SectionIcon className="w-3.5 h-3.5 text-amber-600" strokeWidth={2} />
                      </div>
                      <h2 className="text-[15px] font-bold text-stone-800 tracking-tight">
                        {category.name}
                      </h2>
                    </div>
                    <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                      {items.map((item) => {
                        const isAvailable = itemAvailability[item.id] ?? item.is_available;
                        return (
                          <PosMenuCard
                            key={item.id}
                            item={item}
                            isAvailable={isAvailable}
                            onClick={() => handleItemClick(item)}
                            onQuickAdd={() => {
                              if (!isAvailable) return;
                              addItem({
                                menuItemId: item.id,
                                name: item.name,
                                basePrice: item.base_price,
                                quantity: 1,
                                addons: [],
                                imageUrl: item.image_url || '',
                                specialInstructions: '',
                              });
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="h-6" />
        </div>
      </div>

      {/* ── Cart panel ── */}
      {activeView === 'menu' && <KioskCartPanel addItemsContext={addItemsContext} />}

      {/* ── Item detail sheet ── */}
      {activeView === 'menu' && (
        <ItemDetailSheet
          item={detailItem}
          isOpen={detailOpen}
          onClose={() => { setDetailOpen(false); setDetailItem(null); }}
        />
      )}

      {/* ── Staff sign-in gate (Payments nav click when not signed in) ── */}
      <EmployeePinDialog
        open={pinDialogOpen}
        kioskType={kioskType}
        onOpenChange={(open) => {
          setPinDialogOpen(open);
          if (!open && session) setActiveView('payments');
        }}
      />

      {/* ── Start Shift prompt (no open shift when cashier enters payments) ── */}
      <Dialog open={startShiftDialogOpen} onOpenChange={setStartShiftDialogOpen}>
        <DialogContent className="bg-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-stone-800">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <PlayCircle className="w-5 h-5 text-amber-600" />
              </div>
              Start Your Shift
            </DialogTitle>
            <DialogDescription className="text-stone-500">
              No open shift found. You need to start a shift before processing payments.
            </DialogDescription>
          </DialogHeader>
          <button
            onClick={handleKioskStartShift}
            disabled={startingShift}
            className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold text-sm transition-colors disabled:opacity-60"
          >
            {startingShift ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
            {startingShift ? 'Starting…' : 'Start Shift'}
          </button>
        </DialogContent>
      </Dialog>

      </div>
    </div>
  );
}

interface PosMenuCardProps {
  item: MenuItem;
  isAvailable: boolean;
  onClick: () => void;
  onQuickAdd: () => void;
}

function PosMenuCard({ item, isAvailable, onClick, onQuickAdd }: PosMenuCardProps) {
  return (
    <div className={cn(
      'group relative bg-white rounded-2xl border overflow-hidden transition-all duration-200 flex flex-col shadow-[0_2px_8px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.10)]',
      isAvailable
        ? 'border-stone-100/60 hover:border-amber-200 hover:shadow-[0_6px_20px_rgba(0,0,0,0.14),0_14px_36px_rgba(0,0,0,0.12)] hover:-translate-y-1 active:scale-[0.98]'
        : 'border-stone-100/60 opacity-60 cursor-not-allowed'
    )}>
      {/* Clickable area — opens detail sheet */}
      <div
        onClick={isAvailable ? onClick : undefined}
        className={cn('w-full text-left flex-1 flex flex-col', isAvailable ? 'cursor-pointer' : 'cursor-not-allowed')}
      >
        {/* Image — 1:1 square, full-bleed */}
        <div className="relative aspect-square bg-gradient-to-br from-stone-100 to-amber-50/40 overflow-hidden flex-shrink-0">
          {item.image_url ? (
            <Image
              src={normalizeImageUrl(item.image_url) || ''}
              alt={item.name}
              fill
              className={cn('object-cover transition-transform duration-300', isAvailable && 'group-hover:scale-105')}
              sizes="(max-width: 1280px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Utensils className="w-7 h-7 text-stone-300" strokeWidth={1.25} />
            </div>
          )}

          {/* NOT AVAILABLE overlay */}
          {!isAvailable && (
            <div className="absolute inset-0 bg-stone-900/50 flex items-center justify-center">
              <span
                className="text-white text-[11px] font-black tracking-[0.15em] uppercase px-2 py-1 border border-white/60 rounded"
                style={{ transform: 'rotate(-15deg)', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
              >
                Not Available
              </span>
            </div>
          )}

          {/* Most ordered badge */}
          {item.is_featured && isAvailable && (
            <span className="absolute top-2 left-2 px-2.5 py-1 bg-red-500 text-white text-[10px] font-bold rounded-full shadow-sm tracking-wide">
              Most ordered
            </span>
          )}
        </div>

        {/* Name + description */}
        <div className="px-3 pt-3 pb-1 flex-1 flex flex-col">
          <p className={cn('text-sm font-bold leading-snug line-clamp-2', isAvailable ? 'text-stone-900' : 'text-stone-400')}>
            {item.name}
          </p>
          {item.description && (
            <p className="text-[11px] text-stone-400 leading-tight line-clamp-2 mt-1">
              {item.description}
            </p>
          )}
        </div>
      </div>

      {/* Price + quick-add */}
      <div className="px-3 pb-3 flex items-center justify-between gap-2">
        <span className={cn('text-sm font-bold tabular-nums', isAvailable ? 'text-stone-900' : 'text-stone-400')}>
          {formatCurrency(item.base_price)}
        </span>
        {isAvailable && (
          <button
            onClick={(e) => { e.stopPropagation(); onQuickAdd(); }}
            className="w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-90 flex items-center justify-center shadow-sm transition-all duration-150 flex-shrink-0"
            aria-label={`Add ${item.name}`}
          >
            <Plus className="w-4 h-4 text-white" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}

