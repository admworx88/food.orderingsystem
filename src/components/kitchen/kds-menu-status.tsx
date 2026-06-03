'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { CheckCircle2, XCircle, Utensils, ToggleLeft } from 'lucide-react';
import { toast } from 'sonner';
import { getMenuItems, toggleMenuItemAvailability } from '@/services/menu-service';
import { useStaffSessionStore } from '@/stores/staff-session-store';
import { formatCurrency } from '@/lib/utils/currency';
import { normalizeImageUrl } from '@/lib/utils/image';
import { cn } from '@/lib/utils';
import type { Database } from '@/lib/supabase/types';

type MenuItem = Database['public']['Tables']['menu_items']['Row'] & {
  category: { id: string; name: string } | null;
};

type MenuStatusFilter = 'all' | 'available' | 'unavailable';

export function KdsMenuStatus() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [togglingIds, setTogglingIds] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<MenuStatusFilter>('all');
  const session = useStaffSessionStore((s) => s.session);

  useEffect(() => {
    getMenuItems().then((result) => {
      if (result.success) {
        setItems(result.data as MenuItem[]);
        setAvailability(
          Object.fromEntries(result.data.map((i) => [i.id, i.is_available ?? true]))
        );
      }
      setLoading(false);
    });
  }, []);

  const handleToggle = async (id: string, newValue: boolean) => {
    setTogglingIds((prev) => ({ ...prev, [id]: true }));
    setAvailability((prev) => ({ ...prev, [id]: newValue }));
    const result = await toggleMenuItemAvailability(
      id,
      newValue,
      session ? { id: session.id, name: session.full_name, role: session.role } : undefined
    );
    if (!result.success) {
      setAvailability((prev) => ({ ...prev, [id]: !newValue }));
      toast.error(result.error ?? 'Failed to update');
    } else {
      toast.success(newValue ? 'Item marked available' : 'Item marked unavailable');
    }
    setTogglingIds((prev) => ({ ...prev, [id]: false }));
  };

  const availableCount = items.filter((i) => availability[i.id] ?? true).length;
  const unavailableCount = items.length - availableCount;

  const visibleItems = items.filter((item) => {
    const isAvail = availability[item.id] ?? true;
    if (filter === 'available') return isAvail;
    if (filter === 'unavailable') return !isAvail;
    return true;
  });

  // Group by category
  const categoryMap = new Map<string, { name: string; items: MenuItem[] }>();
  for (const item of visibleItems) {
    const catId = item.category_id ?? 'uncategorized';
    const catName = item.category?.name ?? 'Uncategorized';
    if (!categoryMap.has(catId)) categoryMap.set(catId, { name: catName, items: [] });
    categoryMap.get(catId)!.items.push(item);
  }

  const FILTERS: { key: MenuStatusFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All Items', count: items.length },
    { key: 'available', label: 'Available', count: availableCount },
    { key: 'unavailable', label: 'Unavailable', count: unavailableCount },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Filter bar */}
      <div className="flex-shrink-0 flex items-center gap-2 mb-4">
        <ToggleLeft className="w-4 h-4 text-zinc-500 flex-shrink-0" strokeWidth={1.75} />
        <span className="text-xs font-semibold text-zinc-500 mr-1">Filter:</span>
        {FILTERS.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 border',
              filter === key
                ? key === 'unavailable'
                  ? 'bg-red-500/20 border-red-500/50 text-red-300'
                  : key === 'available'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-zinc-800/50 border-white/[0.08] text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
            )}
          >
            {label}
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-white/10">{count}</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        {categoryMap.size === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Utensils className="w-10 h-10 text-zinc-600" strokeWidth={1.25} />
            <p className="text-sm text-zinc-500">No items match this filter</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(categoryMap.entries()).map(([catId, { name, items: catItems }]) => (
              <div key={catId}>
                <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.12em] mb-3 flex items-center gap-2">
                  <span className="w-4 h-px bg-zinc-700" />
                  {name}
                  <span className="w-4 h-px bg-zinc-700" />
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {catItems.map((item) => {
                    const isAvail = availability[item.id] ?? true;
                    const isToggling = togglingIds[item.id] ?? false;
                    return (
                      <KdsMenuCard
                        key={item.id}
                        item={item}
                        isAvailable={isAvail}
                        isToggling={isToggling}
                        onToggle={() => handleToggle(item.id, !isAvail)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="h-6" />
      </div>
    </div>
  );
}

interface KdsMenuCardProps {
  item: MenuItem;
  isAvailable: boolean;
  isToggling: boolean;
  onToggle: () => void;
}

function KdsMenuCard({ item, isAvailable, isToggling, onToggle }: KdsMenuCardProps) {
  return (
    <div className={cn(
      'relative rounded-xl border flex flex-col overflow-hidden transition-all duration-200',
      isAvailable
        ? 'bg-zinc-800/60 border-white/[0.08] hover:border-zinc-600'
        : 'bg-zinc-900/80 border-red-900/40 opacity-70'
    )}>
      {/* Image */}
      <div className="relative aspect-square bg-zinc-900 overflow-hidden flex-shrink-0">
        {item.image_url ? (
          <Image
            src={normalizeImageUrl(item.image_url) || ''}
            alt={item.name}
            fill
            className={cn('object-cover transition-all duration-200', !isAvailable && 'grayscale')}
            sizes="200px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Utensils className="w-6 h-6 text-zinc-600" strokeWidth={1.25} />
          </div>
        )}

        {/* NOT AVAILABLE overlay */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span
              className="text-white text-[10px] font-black tracking-[0.15em] uppercase px-2 py-1 border border-white/40 rounded"
              style={{ transform: 'rotate(-15deg)' }}
            >
              Not Available
            </span>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-1.5 right-1.5">
          {isAvailable ? (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/90 text-white text-[9px] font-bold rounded-full">
              <CheckCircle2 className="w-2.5 h-2.5" strokeWidth={2.5} />
              OK
            </span>
          ) : (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-600/90 text-white text-[9px] font-bold rounded-full">
              <XCircle className="w-2.5 h-2.5" strokeWidth={2.5} />
              OFF
            </span>
          )}
        </div>
      </div>

      {/* Name + price */}
      <div className="px-2.5 pt-2 pb-1">
        <p className={cn('text-[12px] font-bold leading-snug line-clamp-2', isAvailable ? 'text-zinc-100' : 'text-zinc-500')}>
          {item.name}
        </p>
        <p className="text-[11px] text-zinc-500 mt-0.5 tabular-nums">{formatCurrency(item.base_price)}</p>
      </div>

      {/* Toggle button — min h-11 touch target */}
      <div className="px-2.5 pb-2.5 mt-auto pt-1.5">
        <button
          onClick={onToggle}
          disabled={isToggling}
          className={cn(
            'w-full h-10 rounded-lg text-[12px] font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 border',
            isToggling && 'opacity-50 cursor-not-allowed',
            isAvailable
              ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400 border-red-800/50'
              : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-700/50'
          )}
          aria-label={isAvailable ? `Mark ${item.name} unavailable` : `Mark ${item.name} available`}
        >
          {isToggling ? (
            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : isAvailable ? (
            <>
              <XCircle className="w-3.5 h-3.5" strokeWidth={2} />
              Mark Unavailable
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} />
              Mark Available
            </>
          )}
        </button>
      </div>
    </div>
  );
}
