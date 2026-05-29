'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  UtensilsCrossed, Utensils, Search, X,
  ClipboardList, LayoutGrid, BellRing, CreditCard,
  Coffee, Flame, Fish, Leaf, Wheat, Star, GlassWater,
  Beef, Cookie, ChefHat, Sandwich, Soup, Egg, Sunrise,
  Drumstick, Salad,
  type LucideIcon,
} from 'lucide-react';
import { useStaffSessionStore } from '@/stores/staff-session-store';
import { ItemDetailSheet } from './item-detail-sheet';
import { KioskCartPanel } from './kiosk-cart-panel';
import { useCartStore } from '@/stores/cart-store';
import { formatCurrency } from '@/lib/utils/currency';
import { normalizeImageUrl } from '@/lib/utils/image';
import { cn } from '@/lib/utils';
import type { Database } from '@/lib/supabase/types';

type Category = Database['public']['Tables']['categories']['Row'];
type MenuItem = Database['public']['Tables']['menu_items']['Row'] & {
  category: { id: string; name: string } | null;
};

interface KioskPosLayoutProps {
  categories: Category[];
  menuItems: MenuItem[];
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

// Left nav items — role-gated
type NavItem = {
  icon: LucideIcon;
  label: string;
  href?: string;
};

const ALL_NAV_ITEMS: NavItem[] = [
  { icon: UtensilsCrossed, label: 'Menu' },
  { icon: ClipboardList,   label: 'Orders',   href: '/waiter/service' },
  { icon: LayoutGrid,      label: 'Tables',   href: '/waiter/service' },
  { icon: CreditCard,      label: 'Payments', href: '/cashier/payments' },
];

function getNavItems(role: string | undefined): NavItem[] {
  if (!role) return [ALL_NAV_ITEMS[0]];
  if (role === 'waiter') return ALL_NAV_ITEMS.slice(0, 3);
  if (role === 'cashier' || role === 'admin') return ALL_NAV_ITEMS;
  return [ALL_NAV_ITEMS[0]];
}

export function KioskPosLayout({ categories, menuItems }: KioskPosLayoutProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>(categories[0]?.id ?? '');
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [search, setSearch] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isScrollingRef = useRef(false);

  const router = useRouter();
  const staffRole = useStaffSessionStore((s) => s.session?.role);
  const navItems = getNavItems(staffRole);

  useEffect(() => {
    if (staffRole === 'kitchen') {
      router.replace('/kitchen/orders');
    }
  }, [staffRole, router]);

  const addItem = useCartStore((state) => state.addItem);

  const handleCategoryClick = useCallback((categoryId: string) => {
    setActiveCategoryId(categoryId);
    setSearch('');
    isScrollingRef.current = true;

    const el = sectionRefs.current[categoryId];
    const container = scrollRef.current;
    if (el && container) {
      container.scrollTo({ top: el.offsetTop - 8, behavior: 'smooth' });
    }
    setTimeout(() => { isScrollingRef.current = false; }, 600);
  }, []);

  const handleScroll = useCallback(() => {
    if (isScrollingRef.current || !scrollRef.current || search) return;
    const scrollTop = scrollRef.current.scrollTop + 64;

    let activeId = categories[0]?.id ?? '';
    for (const cat of categories) {
      const el = sectionRefs.current[cat.id];
      if (el && el.offsetTop <= scrollTop) activeId = cat.id;
    }
    setActiveCategoryId(activeId);
  }, [categories, search]);

  const handleItemClick = (item: MenuItem) => {
    setDetailItem(item);
    setDetailOpen(true);
  };

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
    .filter((g) => g.items.length > 0);

  return (
    <div className="h-full flex overflow-hidden">

      {/* ── Left icon nav ── */}
      <nav className="w-[60px] flex-shrink-0 bg-stone-900 flex flex-col items-center pt-2 pb-3">
        <div className="flex flex-col items-center gap-0.5 w-full px-2">
          {navItems.map(({ icon: Icon, label, href }) => {
            const isActive = label === 'Menu';
            return (
              <button
                key={label}
                onClick={() => href && router.push(href)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1.5 w-full py-3 rounded-xl transition-all duration-200 cursor-pointer',
                  isActive
                    ? 'bg-amber-500/20'
                    : 'hover:bg-white/[0.06] active:bg-white/10'
                )}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200',
                  isActive ? 'bg-amber-500/25' : 'bg-transparent'
                )}>
                  <Icon
                    className={cn('w-[18px] h-[18px] transition-colors duration-200', isActive ? 'text-amber-400' : 'text-stone-500')}
                    strokeWidth={isActive ? 2 : 1.75}
                  />
                </div>
                <span className={cn(
                  'text-[9px] font-semibold leading-none tracking-wide transition-colors duration-200',
                  isActive ? 'text-amber-400' : 'text-stone-500'
                )}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        {/* Call Staff — pinned bottom */}
        <div className="w-full px-2">
          <button
            className="flex flex-col items-center justify-center gap-1.5 w-full py-3 rounded-xl hover:bg-white/[0.06] active:bg-white/10 transition-all duration-200 cursor-pointer"
            aria-label="Call Staff"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              <BellRing className="w-[18px] h-[18px] text-stone-500" strokeWidth={1.75} />
            </div>
            <span className="text-[9px] font-semibold leading-none text-stone-500 tracking-wide whitespace-nowrap">
              Staff
            </span>
          </button>
        </div>
      </nav>

      {/* ── Category sidebar ── */}
      <div className="w-[190px] xl:w-[210px] flex-shrink-0 bg-white border-r border-stone-100 flex flex-col overflow-hidden">
        {/* Sidebar heading */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-stone-100 bg-stone-50">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.12em]">Categories</p>
        </div>

        {/* Category list */}
        <div className="flex-1 overflow-y-auto py-1">
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
                  'w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center transition-all duration-150',
                  isActive
                    ? 'bg-amber-100'
                    : 'bg-stone-100'
                )}>
                  {cat.image_url ? (
                    <img
                      src={cat.image_url}
                      alt=""
                      className="w-full h-full object-cover rounded-lg"
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-stone-50/50">
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
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 xl:p-5"
        >
          {search && filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center">
                <Search className="w-6 h-6 text-stone-300" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-500">No results for "{search}"</p>
                <p className="text-xs text-stone-400 mt-0.5">Try a different keyword</p>
              </div>
            </div>
          ) : (
            <div className="space-y-7">
              {groupedItems.map(({ category, items }) => {
                const SectionIcon = getCategoryLucideIcon(category.name);
                return (
                  <div
                    key={category.id}
                    ref={(el) => { sectionRefs.current[category.id] = el; }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <SectionIcon className="w-3.5 h-3.5 text-amber-600" strokeWidth={2} />
                      </div>
                      <h2 className="text-[15px] font-bold text-stone-800 tracking-tight">
                        {category.name}
                      </h2>
                    </div>
                    <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
                      {items.map((item) => (
                        <PosMenuCard
                          key={item.id}
                          item={item}
                          onClick={() => handleItemClick(item)}
                          onQuickAdd={() => addItem({
                            menuItemId: item.id,
                            name: item.name,
                            basePrice: item.base_price,
                            quantity: 1,
                            addons: [],
                            imageUrl: item.image_url || '',
                            specialInstructions: '',
                          })}
                        />
                      ))}
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
      <KioskCartPanel />

      {/* ── Item detail sheet ── */}
      <ItemDetailSheet
        item={detailItem}
        isOpen={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailItem(null); }}
      />
    </div>
  );
}

interface PosMenuCardProps {
  item: MenuItem;
  onClick: () => void;
  onQuickAdd: () => void;
}

function PosMenuCard({ item, onClick, onQuickAdd }: PosMenuCardProps) {
  return (
    <div className="group relative bg-white rounded-2xl border border-stone-100 overflow-hidden hover:border-amber-200 hover:shadow-md active:scale-[0.98] transition-all duration-150">
      {/* Card body — opens detail sheet for customization */}
      <button
        onClick={onClick}
        className="w-full text-left cursor-pointer"
      >
        {/* Square image */}
        <div className="relative aspect-square bg-gradient-to-br from-stone-100 to-stone-50 overflow-hidden">
          {item.image_url ? (
            <Image
              src={normalizeImageUrl(item.image_url) || ''}
              alt={item.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 1280px) 33vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Utensils className="w-8 h-8 text-stone-300" strokeWidth={1.25} />
            </div>
          )}
        </div>

        {/* Name + description */}
        <div className="px-3 pt-2.5 pb-1">
          <p className="text-[13px] font-semibold text-stone-800 leading-tight line-clamp-2 min-h-[2.25rem]">
            {item.name}
          </p>
          {item.description && (
            <p className="text-[11px] text-stone-400 leading-tight line-clamp-1 mt-0.5">
              {item.description}
            </p>
          )}
        </div>
      </button>

      {/* Price + quick-add — min 44px touch target */}
      <div className="px-3 pb-3 flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-amber-600 tabular-nums">
          {formatCurrency(item.base_price)}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onQuickAdd(); }}
          className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-90 flex items-center justify-center shadow-sm transition-all duration-150 cursor-pointer flex-shrink-0"
          aria-label={`Add ${item.name} to cart`}
        >
          <span className="text-white text-lg font-bold leading-none select-none">+</span>
        </button>
      </div>
    </div>
  );
}
