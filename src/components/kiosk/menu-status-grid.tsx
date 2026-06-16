'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Utensils, ToggleLeft, CheckCircle2, XCircle,
  Coffee, Flame, Fish, Leaf, Wheat, Star, GlassWater,
  Beef, Cookie, ChefHat, Sandwich, Soup, Egg, Sunrise,
  Drumstick, Salad, UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';
import { normalizeImageUrl } from '@/lib/utils/image';
import type { Database } from '@/lib/supabase/types';

type Category = Database['public']['Tables']['categories']['Row'];
type MenuItem = Database['public']['Tables']['menu_items']['Row'] & {
  category: { id: string; name: string; requires_kitchen: boolean } | null;
};

// ── Category icon map (duplicated from kiosk-pos-layout for module isolation) ──
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

// ── Menu Status Tab ──────────────────────────────────────────────────────────

type MenuStatusFilter = 'all' | 'available' | 'unavailable';

export interface MenuStatusGridProps {
  categories: Category[];
  menuItems: MenuItem[];
  availability: Record<string, boolean>;
  togglingIds: Record<string, boolean>;
  onToggle: (id: string, newValue: boolean) => void;
}

export function MenuStatusGrid({ categories, menuItems, availability, togglingIds, onToggle }: MenuStatusGridProps) {
  const [filter, setFilter] = useState<MenuStatusFilter>('all');

  // Only show items from non-kitchen categories (e.g. beverages, soft drinks)
  const nonKitchenItems = menuItems.filter((i) => i.category?.requires_kitchen === false);

  const availableCount = nonKitchenItems.filter((i) => availability[i.id] ?? i.is_available).length;
  const unavailableCount = nonKitchenItems.length - availableCount;

  const visibleItems = nonKitchenItems.filter((item) => {
    const isAvail = availability[item.id] ?? item.is_available;
    if (filter === 'available') return isAvail;
    if (filter === 'unavailable') return !isAvail;
    return true;
  });

  const grouped = categories
    .map((cat) => ({
      category: cat,
      items: visibleItems.filter((i) => i.category_id === cat.id),
    }))
    .filter((g) => g.items.length > 0);

  const FILTERS: { key: MenuStatusFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: nonKitchenItems.length },
    { key: 'available', label: 'Available', count: availableCount },
    { key: 'unavailable', label: 'Unavailable', count: unavailableCount },
  ];

  return (
    <div className="h-full flex flex-col bg-[#FAF7F2]">
      {/* Filter chips */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 bg-white border-b border-stone-100">
        <ToggleLeft className="w-4 h-4 text-stone-400 flex-shrink-0" strokeWidth={1.75} />
        <span className="text-[12px] font-semibold text-stone-400 mr-1">Filter:</span>
        {FILTERS.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-150',
              filter === key
                ? key === 'unavailable'
                  ? 'bg-red-100 text-red-700 border border-red-200'
                  : key === 'available'
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-100 text-amber-700 border border-amber-200'
                : 'bg-stone-100 text-stone-500 border border-transparent hover:bg-stone-200'
            )}
          >
            {label}
            <span className={cn(
              'text-[11px] font-bold px-1.5 py-0.5 rounded-full',
              filter === key
                ? key === 'unavailable' ? 'bg-red-200 text-red-800' : key === 'available' ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'
                : 'bg-stone-200 text-stone-600'
            )}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Scrollable grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center">
              <Utensils className="w-6 h-6 text-stone-300" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-semibold text-stone-400">No items match this filter</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ category, items }) => {
              const SectionIcon = getCategoryLucideIcon(category.name);
              return (
                <div key={category.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <SectionIcon className="w-3.5 h-3.5 text-amber-600" strokeWidth={2} />
                    </div>
                    <h2 className="text-[15px] font-bold text-stone-800 tracking-tight">{category.name}</h2>
                  </div>
                  <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                    {items.map((item) => {
                      const isAvail = availability[item.id] ?? item.is_available;
                      const isToggling = togglingIds[item.id] ?? false;
                      return (
                        <MenuStatusCard
                          key={item.id}
                          item={item}
                          isAvailable={isAvail}
                          isToggling={isToggling}
                          onToggle={() => onToggle(item.id, !isAvail)}
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
  );
}

interface MenuStatusCardProps {
  item: MenuItem;
  isAvailable: boolean;
  isToggling: boolean;
  onToggle: () => void;
}

function MenuStatusCard({ item, isAvailable, isToggling, onToggle }: MenuStatusCardProps) {
  return (
    <div className={cn(
      'relative bg-white rounded-2xl border flex flex-col overflow-hidden transition-all duration-200',
      isAvailable ? 'border-stone-100' : 'border-red-100 opacity-70'
    )}>
      {/* Image */}
      <div className="relative aspect-square bg-gradient-to-br from-stone-100 to-amber-50/40 overflow-hidden flex-shrink-0">
        {item.image_url ? (
          <Image
            src={normalizeImageUrl(item.image_url) || ''}
            alt={item.name}
            fill
            className={cn('object-cover transition-all duration-200', !isAvailable && 'grayscale')}
            sizes="(max-width: 1280px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Utensils className="w-7 h-7 text-stone-300" strokeWidth={1.25} />
          </div>
        )}

        {/* NOT AVAILABLE overlay */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-stone-900/55 flex items-center justify-center">
            <span
              className="text-white text-[11px] font-black tracking-[0.15em] uppercase px-2 py-1 border border-white/60 rounded"
              style={{ transform: 'rotate(-15deg)', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
            >
              Not Available
            </span>
          </div>
        )}

        {/* Status badge top-right */}
        <div className="absolute top-2 right-2">
          {isAvailable ? (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full shadow-sm">
              <CheckCircle2 className="w-3 h-3" strokeWidth={2.5} />
              Available
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full shadow-sm">
              <XCircle className="w-3 h-3" strokeWidth={2.5} />
              Unavailable
            </span>
          )}
        </div>
      </div>

      {/* Name */}
      <div className="px-3 pt-2.5 pb-1">
        <p className={cn('text-[13px] font-bold leading-snug line-clamp-2', isAvailable ? 'text-stone-900' : 'text-stone-400')}>
          {item.name}
        </p>
        <p className="text-[11px] text-stone-400 mt-0.5 tabular-nums">{formatCurrency(item.base_price)}</p>
      </div>

      {/* Toggle button — min h-11 for 44px touch target */}
      <div className="px-3 pb-3 mt-auto pt-1.5">
        <button
          onClick={onToggle}
          disabled={isToggling}
          className={cn(
            'w-full h-11 rounded-xl text-[13px] font-semibold transition-all duration-200 flex items-center justify-center gap-1.5',
            isToggling && 'opacity-50 cursor-not-allowed',
            isAvailable
              ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
          )}
          aria-label={isAvailable ? `Mark ${item.name} unavailable` : `Mark ${item.name} available`}
        >
          {isToggling ? (
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : isAvailable ? (
            <>
              <XCircle className="w-4 h-4" strokeWidth={2} />
              Mark Unavailable
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
              Mark Available
            </>
          )}
        </button>
      </div>
    </div>
  );
}
