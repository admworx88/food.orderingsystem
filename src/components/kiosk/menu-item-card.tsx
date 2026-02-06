'use client';

import { useState } from 'react';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils/currency';
import { Plus, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/stores/cart-store';
import type { Database } from '@/lib/supabase/types';

type MenuItem = Database['public']['Tables']['menu_items']['Row'];

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart?: (item: MenuItem) => void;
  compact?: boolean;
}

// Allergen icons
const ALLERGEN_ICONS: Record<string, { icon: string; label: string }> = {
  dairy: { icon: '🥛', label: 'Dairy' },
  nuts: { icon: '🥜', label: 'Nuts' },
  gluten: { icon: '🌾', label: 'Gluten' },
  shellfish: { icon: '🦐', label: 'Shellfish' },
  eggs: { icon: '🥚', label: 'Eggs' },
  soy: { icon: '🫘', label: 'Soy' },
  fish: { icon: '🐟', label: 'Fish' },
  sesame: { icon: '🫙', label: 'Sesame' },
};

// Professional placeholder icon component
function PlaceholderIcon({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const iconSize = size === 'sm' ? 'w-8 h-8' : 'w-12 h-12';
  return (
    <svg className={cn(iconSize, 'text-stone-300')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.125-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z" />
    </svg>
  );
}

export function MenuItemCard({ item, onAddToCart, compact = false }: MenuItemCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  const allergens = item.allergens || [];
  const prepTime = item.preparation_time_minutes;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Add to cart store
    addItem({
      menuItemId: item.id,
      name: item.name,
      basePrice: item.base_price,
      quantity: 1,
      addons: [],
      allergens: allergens,
      imageUrl: item.image_url || undefined,
    });

    // Optional: Show toast notification
    // toast.success(`${item.name} added to cart`);

    // Call optional callback
    onAddToCart?.(item);
  };

  // Compact/List View
  if (compact) {
    return (
      <div className="kiosk-card flex items-center gap-5 p-5 hover:border-stone-300">
        {/* Image */}
        <div className="relative w-24 h-24 rounded-xl bg-stone-100 flex-shrink-0 overflow-hidden">
          {item.image_url && !imageError ? (
            <>
              {!imageLoaded && <div className="absolute inset-0 bg-stone-100 animate-pulse" />}
              <Image
                src={item.image_url}
                alt={item.name}
                fill
                className={cn('object-cover', imageLoaded ? 'opacity-100' : 'opacity-0')}
                sizes="96px"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-50">
              <PlaceholderIcon size="sm" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 py-1">
          <h3 className="text-base font-bold text-stone-900 line-clamp-1 mb-1">{item.name}</h3>
          {item.description && (
            <p className="text-sm text-stone-500 line-clamp-1 mb-2">{item.description}</p>
          )}
          <p className="text-xl font-bold text-stone-900 mt-2">
            {formatCurrency(Number(item.base_price))}
          </p>
        </div>

        {/* Add Button */}
        <button
          onClick={handleAddToCart}
          className="flex-shrink-0 w-12 h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-md"
          aria-label={`Add ${item.name} to cart`}
        >
          <Plus className="w-6 h-6" strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  // Grid View - Premium Card
  return (
    <div className="kiosk-card overflow-hidden h-full flex flex-col group hover:shadow-lg transition-shadow">
      {/* Image Container */}
      <div className="relative aspect-square bg-stone-100 overflow-hidden">
        {item.image_url && !imageError ? (
          <>
            {!imageLoaded && <div className="absolute inset-0 bg-stone-100 animate-pulse" />}
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              className={cn(
                'object-cover transition-transform duration-300 group-hover:scale-105',
                imageLoaded ? 'opacity-100' : 'opacity-0'
              )}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-50">
            <PlaceholderIcon />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-4 left-4 right-4 flex items-start justify-between pointer-events-none">
          {/* Popular Badge */}
          {item.is_featured && (
            <span className="px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg shadow-md">
              Popular
            </span>
          )}

          {/* Prep Time Badge */}
          {prepTime && (
            <span className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-sm text-stone-700 text-xs font-semibold rounded-lg shadow-md">
              <Clock className="w-3.5 h-3.5" />
              {prepTime}m
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        {/* Title */}
        <h3 className="text-base font-bold text-stone-900 line-clamp-1 mb-2">
          {item.name}
        </h3>

        {/* Description */}
        {item.description && (
          <p className="text-sm text-stone-500 line-clamp-2 mb-4 flex-1 leading-relaxed">
            {item.description}
          </p>
        )}

        {/* Allergens */}
        {allergens.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            {allergens.slice(0, 4).map((allergen) => {
              const info = ALLERGEN_ICONS[allergen];
              return (
                <span
                  key={allergen}
                  className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-sm"
                  title={info?.label || allergen}
                >
                  {info?.icon || '⚠️'}
                </span>
              );
            })}
            {allergens.length > 4 && (
              <span className="text-xs text-stone-500 font-semibold">+{allergens.length - 4}</span>
            )}
          </div>
        )}

        {/* Price & Add Button */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-stone-100">
          <span className="text-xl font-black text-stone-900">
            {formatCurrency(Number(item.base_price))}
          </span>

          <button
            onClick={handleAddToCart}
            className="flex items-center gap-2 h-12 px-5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl active:scale-95 transition-all shadow-md"
            aria-label={`Add ${item.name} to cart`}
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
            <span>Add</span>
          </button>
        </div>
      </div>
    </div>
  );
}
