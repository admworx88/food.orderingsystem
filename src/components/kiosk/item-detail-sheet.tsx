'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { X, Minus, Plus, Clock, Info, AlertTriangle, Check, Loader2, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { normalizeImageUrl } from '@/lib/utils/image';
import { AllergenList } from './allergen-badge';
import { cn } from '@/lib/utils';
import { useCartStore, type CartAddon } from '@/stores/cart-store';
import { getMenuItemAddons } from '@/services/order-service';
import type { Database } from '@/lib/supabase/types';

type MenuItem = Database['public']['Tables']['menu_items']['Row'];

interface AddonOption {
  id: string;
  name: string;
  additional_price: number;
  is_available: boolean | null;
  display_order: number | null;
}

interface AddonGroup {
  id: string;
  name: string;
  is_required: boolean | null;
  min_selections: number | null;
  max_selections: number | null;
  display_order: number | null;
  addon_options: AddonOption[];
}

interface ItemDetailSheetProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ItemDetailSheet({ item, isOpen, onClose }: ItemDetailSheetProps) {
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<Map<string, Set<string>>>(new Map());
  const [loadingAddons, setLoadingAddons] = useState(false);

  const addItem = useCartStore((state) => state.addItem);
  const addToOrderId = useCartStore((state) => state.addToOrderId);
  const setDetailSheetOpen = useCartStore((state) => state.setDetailSheetOpen);

  useEffect(() => {
    setDetailSheetOpen(isOpen);
  }, [isOpen, setDetailSheetOpen]);

  // Reset state when a new item is opened
  const [prevItemId, setPrevItemId] = useState<string | null>(null);
  if (item && isOpen && item.id !== prevItemId) {
    setPrevItemId(item.id);
    setLoadingAddons(true);
    setSelectedAddons(new Map());
    setQuantity(1);
    setSpecialInstructions('');
    setImageLoaded(false);
    setAddonGroups([]);
  }

  // Fetch addon groups when item changes
  useEffect(() => {
    if (!item || !isOpen || !loadingAddons) return;

    let cancelled = false;
    getMenuItemAddons(item.id).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setAddonGroups(result.data);
      } else {
        setAddonGroups([]);
      }
      setLoadingAddons(false);
    });

    return () => { cancelled = true; };
  }, [item, isOpen, loadingAddons]);

  const toggleAddon = useCallback((groupId: string, optionId: string, maxSelections: number | null) => {
    setSelectedAddons((prev) => {
      const next = new Map(prev);
      const groupSet = new Set(prev.get(groupId) || []);

      if (groupSet.has(optionId)) {
        groupSet.delete(optionId);
      } else {
        // Single-select (max_selections = 1): replace selection
        if (maxSelections === 1) {
          groupSet.clear();
        }
        // Multi-select with limit: check if at max
        if (maxSelections !== null && maxSelections > 1 && groupSet.size >= maxSelections) {
          return prev; // Don't add if at max
        }
        groupSet.add(optionId);
      }

      next.set(groupId, groupSet);
      return next;
    });
  }, []);

  if (!item) return null;

  const allergens = item.allergens || [];
  const nutritionalInfo = item.nutritional_info as {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  } | null;
  const prepTime = item.preparation_time_minutes;

  // Calculate total with addons
  const selectedAddonItems: CartAddon[] = [];
  for (const group of addonGroups) {
    const groupSelections = selectedAddons.get(group.id);
    if (groupSelections) {
      for (const optionId of groupSelections) {
        const option = group.addon_options.find((o) => o.id === optionId);
        if (option) {
          selectedAddonItems.push({
            id: option.id,
            name: option.name,
            price: option.additional_price,
          });
        }
      }
    }
  }

  const addonsTotal = selectedAddonItems.reduce((sum, a) => sum + a.price, 0);
  const totalPrice = (Number(item.base_price) + addonsTotal) * quantity;

  // Check if all required addon groups have selections
  const allRequiredSelected = addonGroups.every((group) => {
    if (!group.is_required) return true;
    const minSelections = group.min_selections ?? 1;
    const groupSelections = selectedAddons.get(group.id);
    return groupSelections && groupSelections.size >= minSelections;
  });

  const handleAddToCart = () => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      basePrice: Number(item.base_price),
      quantity,
      addons: selectedAddonItems,
      specialInstructions: specialInstructions || undefined,
      allergens: allergens,
      imageUrl: item.image_url || undefined,
    });

    // Reset state
    setQuantity(1);
    setSpecialInstructions('');
    setSelectedAddons(new Map());
    onClose();
  };

  const incrementQuantity = () => setQuantity((q) => Math.min(q + 1, 10));
  const decrementQuantity = () => setQuantity((q) => Math.max(q - 1, 1));

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/60 backdrop-blur-[6px] z-[60] transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-[60] bg-stone-50 rounded-t-[1.75rem] max-h-[92vh] overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* Drag indicator */}
        <div className="flex justify-center pt-3 pb-1 relative z-20">
          <div className="w-10 h-1 bg-stone-300/80 rounded-full" />
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto max-h-[calc(92vh-140px)] overscroll-contain">
          {/* Hero Image — edge-to-edge with gradient fade */}
          <div className="relative w-full h-48 sm:h-56 lg:h-64 bg-stone-200 overflow-hidden">
            {item.image_url ? (
              <>
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-gradient-to-br from-stone-200 via-stone-100 to-stone-200 animate-pulse" />
                )}
                <Image
                  src={normalizeImageUrl(item.image_url) || ''}
                  alt={item.name}
                  fill
                  className={cn(
                    'object-cover object-center transition-all duration-500',
                    imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                  )}
                  sizes="100vw"
                  priority
                  onLoad={() => setImageLoaded(true)}
                  onError={() => {
                    console.error('Image load error (detail sheet):', item.name, item.image_url);
                  }}
                />
                {/* Bottom gradient for text legibility */}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-stone-50 via-stone-50/60 to-transparent pointer-events-none" />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
                <span className="text-7xl opacity-50">🍽️</span>
              </div>
            )}

            {/* Close button — floating over image */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white active:scale-90 transition-all shadow-sm z-10"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-stone-700" strokeWidth={2.5} />
            </button>

            {/* Featured badge */}
            {item.is_featured && (
              <div className="absolute top-3 left-3 z-10">
                <span className="px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-full shadow-lg shadow-amber-500/30">
                  Popular
                </span>
              </div>
            )}

            {/* Prep time badge — floating bottom-left over image */}
            {prepTime && (
              <div className="absolute bottom-12 left-4 z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-sm text-stone-700 text-xs font-semibold rounded-full shadow-sm">
                  <Clock className="w-3.5 h-3.5 text-stone-500" />
                  ~{prepTime} min
                </span>
              </div>
            )}
          </div>

          {/* Content body */}
          <div className="px-5 sm:px-6 -mt-3 relative z-10 space-y-5 pb-4">
            {/* Title + Price header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-stone-900 leading-tight">
                  {item.name}
                </h2>
                {item.description && (
                  <p className="text-sm text-stone-500 mt-1.5 leading-relaxed line-clamp-3">
                    {item.description}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0 text-right">
                <span className="text-xl sm:text-2xl font-bold text-amber-600">
                  {formatCurrency(Number(item.base_price))}
                </span>
              </div>
            </div>

            {/* Allergen Warning — compact pill design */}
            {allergens.length > 0 && (
              <div className="flex items-start gap-3 bg-amber-50/80 border border-amber-200/60 rounded-xl p-3.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-800 mb-1.5">Contains allergens</p>
                  <AllergenList allergens={allergens} showLabels size="md" />
                </div>
              </div>
            )}

            {/* Addon Groups */}
            {loadingAddons ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                <span className="ml-2 text-sm text-stone-400">Loading options...</span>
              </div>
            ) : (
              addonGroups.map((group) => {
                const groupSelections = selectedAddons.get(group.id) || new Set();

                return (
                  <div key={group.id}>
                    {/* Group header */}
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-stone-800">
                          {group.name}
                        </h3>
                        {group.is_required && (
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded uppercase tracking-wide">
                            Required
                          </span>
                        )}
                      </div>
                      {group.max_selections && group.max_selections > 1 && (
                        <span className="text-xs text-stone-400">
                          Pick up to {group.max_selections}
                        </span>
                      )}
                    </div>

                    {/* Options as compact, tappable cards */}
                    <div className="space-y-1.5">
                      {group.addon_options
                        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                        .map((option) => {
                          const isSelected = groupSelections.has(option.id);
                          const isDisabled = option.is_available === false;

                          return (
                            <button
                              key={option.id}
                              onClick={() => !isDisabled && toggleAddon(group.id, option.id, group.max_selections ?? null)}
                              disabled={isDisabled}
                              className={cn(
                                'w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 transition-all text-left',
                                isDisabled
                                  ? 'opacity-40 cursor-not-allowed bg-stone-50 text-stone-400'
                                  : isSelected
                                    ? 'bg-amber-50 ring-2 ring-amber-400 text-stone-900'
                                    : 'bg-white border border-stone-200 text-stone-700 hover:border-stone-300 active:scale-[0.99]'
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {/* Selection indicator */}
                                <div className={cn(
                                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                                  isSelected
                                    ? 'bg-amber-500 border-amber-500'
                                    : 'border-stone-300 bg-white'
                                )}>
                                  {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                </div>
                                <span className={cn(
                                  'text-sm truncate',
                                  isSelected ? 'font-semibold' : 'font-medium'
                                )}>
                                  {option.name}
                                </span>
                              </div>

                              {option.additional_price > 0 && (
                                <span className={cn(
                                  'text-sm flex-shrink-0',
                                  isSelected ? 'text-amber-700 font-semibold' : 'text-stone-400'
                                )}>
                                  +{formatCurrency(option.additional_price)}
                                </span>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                );
              })
            )}

            {/* Nutritional Info — collapsible */}
            {nutritionalInfo && (
              <details className="group rounded-xl bg-white border border-stone-200 overflow-hidden">
                <summary className="flex items-center gap-2.5 cursor-pointer px-4 py-3 text-stone-600 font-medium text-sm hover:bg-stone-50 transition-colors select-none">
                  <Info className="w-4 h-4 text-stone-400" />
                  <span>Nutrition Facts</span>
                  <svg
                    className="w-4 h-4 ml-auto transition-transform duration-200 group-open:rotate-180 text-stone-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="grid grid-cols-4 gap-2 px-4 pb-4">
                  {nutritionalInfo.calories !== undefined && (
                    <div className="bg-stone-50 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-stone-900">{nutritionalInfo.calories}</p>
                      <p className="text-[10px] text-stone-500 font-medium uppercase tracking-wide">Cal</p>
                    </div>
                  )}
                  {nutritionalInfo.protein !== undefined && (
                    <div className="bg-stone-50 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-stone-900">{nutritionalInfo.protein}g</p>
                      <p className="text-[10px] text-stone-500 font-medium uppercase tracking-wide">Protein</p>
                    </div>
                  )}
                  {nutritionalInfo.carbs !== undefined && (
                    <div className="bg-stone-50 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-stone-900">{nutritionalInfo.carbs}g</p>
                      <p className="text-[10px] text-stone-500 font-medium uppercase tracking-wide">Carbs</p>
                    </div>
                  )}
                  {nutritionalInfo.fat !== undefined && (
                    <div className="bg-stone-50 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-stone-900">{nutritionalInfo.fat}g</p>
                      <p className="text-[10px] text-stone-500 font-medium uppercase tracking-wide">Fat</p>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Special Instructions — minimal textarea */}
            <div>
              <label className="block text-sm font-bold text-stone-800 mb-2">
                Special Instructions
                <span className="text-stone-400 font-normal ml-1">(optional)</span>
              </label>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value.slice(0, 200))}
                placeholder="Any allergies, preferences, or special requests..."
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition-all resize-none text-sm text-stone-700 placeholder:text-stone-400"
                rows={2}
                maxLength={200}
              />
              {specialInstructions.length > 0 && (
                <p className="text-[10px] text-stone-400 mt-1 text-right">{specialInstructions.length}/200</p>
              )}
            </div>
          </div>
        </div>

        {/* Fixed bottom action bar */}
        <div className="bg-white border-t border-stone-100 px-5 sm:px-6 py-4 flex items-center gap-3 safe-area-inset-bottom">
          {/* Quantity selector — compact */}
          <div className="flex items-center bg-stone-100 rounded-xl overflow-hidden">
            <button
              onClick={decrementQuantity}
              disabled={quantity <= 1}
              className="w-11 h-11 flex items-center justify-center hover:bg-stone-200 active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Decrease quantity"
            >
              <Minus className="w-4 h-4 text-stone-700" strokeWidth={2.5} />
            </button>
            <span className="w-9 text-center text-base font-bold text-stone-900 tabular-nums">
              {quantity}
            </span>
            <button
              onClick={incrementQuantity}
              disabled={quantity >= 10}
              className="w-11 h-11 flex items-center justify-center hover:bg-stone-200 active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Increase quantity"
            >
              <Plus className="w-4 h-4 text-stone-700" strokeWidth={2.5} />
            </button>
          </div>

          {/* Add to cart button */}
          <button
            onClick={handleAddToCart}
            disabled={!allRequiredSelected}
            className={cn(
              'flex-1 flex items-center justify-center gap-2.5 h-12 rounded-xl font-bold text-[15px] shadow-md active:scale-[0.98] transition-all',
              allRequiredSelected
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'
            )}
          >
            <ShoppingBag className="w-4.5 h-4.5" strokeWidth={2.5} />
            <span>{addToOrderId ? 'Add to Order' : 'Add to Cart'}</span>
            <span className="text-amber-100/90 font-semibold">
              {formatCurrency(totalPrice)}
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
