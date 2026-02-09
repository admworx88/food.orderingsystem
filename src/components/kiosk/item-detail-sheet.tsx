'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { X, Minus, Plus, Clock, Info, AlertTriangle, Check, Loader2 } from 'lucide-react';
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
          'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-[2rem] max-h-[90vh] overflow-hidden transition-transform duration-300 ease-out',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all z-10"
          aria-label="Close"
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)] pb-4">
          {/* Image */}
          <div className="relative aspect-video bg-gradient-to-br from-amber-50 to-orange-50 mx-6 rounded-2xl overflow-hidden">
            {item.image_url ? (
              <>
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-100 via-orange-50 to-amber-100 animate-shimmer" />
                )}
                <Image
                  src={normalizeImageUrl(item.image_url) || ''}
                  alt={item.name}
                  fill
                  className={cn(
                    'object-cover transition-opacity duration-300',
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  )}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  onLoad={() => setImageLoaded(true)}
                  onError={(e) => {
                    console.error('Image load error (detail sheet):', item.name, item.image_url);
                  }}
                />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-8xl opacity-60">🍽️</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="px-6 pt-6 space-y-6">
            {/* Title and price */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-2xl font-bold text-gray-900">{item.name}</h2>
                <span className="text-2xl font-bold text-amber-600 whitespace-nowrap">
                  {formatCurrency(Number(item.base_price))}
                </span>
              </div>

              {/* Prep time */}
              {prepTime && (
                <div className="flex items-center gap-2 text-gray-500 mt-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Ready in ~{prepTime} minutes</span>
                </div>
              )}
            </div>

            {/* Description */}
            {item.description && (
              <p className="text-gray-600 leading-relaxed">{item.description}</p>
            )}

            {/* Allergen Warning */}
            {allergens.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-amber-900">Allergen Information</h3>
                </div>
                <AllergenList allergens={allergens} showLabels size="md" />
              </div>
            )}

            {/* Addon Groups */}
            {loadingAddons ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                <span className="ml-2 text-sm text-gray-500">Loading options...</span>
              </div>
            ) : (
              addonGroups.map((group) => {
                const isSingleSelect = group.max_selections === 1;
                const groupSelections = selectedAddons.get(group.id) || new Set();

                return (
                  <div key={group.id} className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-base font-bold text-gray-900">
                        {group.name}
                        {group.is_required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {group.is_required ? 'Required' : 'Optional'}
                        {group.max_selections && group.max_selections > 1 && ` (max ${group.max_selections})`}
                      </span>
                    </div>

                    <div className="space-y-2">
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
                                'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left min-h-[56px]',
                                isDisabled
                                  ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50'
                                  : isSelected
                                    ? 'border-amber-500 bg-amber-50'
                                    : 'border-gray-200 hover:border-gray-300 active:scale-[0.99]'
                              )}
                            >
                              {/* Radio / Checkbox indicator */}
                              <div
                                className={cn(
                                  'w-6 h-6 flex-shrink-0 flex items-center justify-center border-2 transition-all',
                                  isSingleSelect ? 'rounded-full' : 'rounded-md',
                                  isSelected
                                    ? 'border-amber-500 bg-amber-500'
                                    : 'border-gray-300'
                                )}
                              >
                                {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                              </div>

                              <span className={cn(
                                'flex-1 font-medium',
                                isDisabled ? 'text-gray-400' : 'text-gray-900'
                              )}>
                                {option.name}
                                {isDisabled && (
                                  <span className="ml-2 text-xs text-gray-400">Unavailable</span>
                                )}
                              </span>

                              {option.additional_price > 0 && (
                                <span className={cn(
                                  'text-sm font-semibold',
                                  isSelected ? 'text-amber-700' : 'text-gray-500'
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

            {/* Nutritional Info */}
            {nutritionalInfo && (
              <details className="group">
                <summary className="flex items-center gap-2 cursor-pointer text-gray-700 font-medium py-3 border-t border-gray-100">
                  <Info className="w-5 h-5" />
                  <span>Nutrition Facts</span>
                  <svg
                    className="w-5 h-5 ml-auto transition-transform group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  {nutritionalInfo.calories && (
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-gray-900">{nutritionalInfo.calories}</p>
                      <p className="text-sm text-gray-500">Calories</p>
                    </div>
                  )}
                  {nutritionalInfo.protein && (
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-gray-900">{nutritionalInfo.protein}g</p>
                      <p className="text-sm text-gray-500">Protein</p>
                    </div>
                  )}
                  {nutritionalInfo.carbs && (
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-gray-900">{nutritionalInfo.carbs}g</p>
                      <p className="text-sm text-gray-500">Carbs</p>
                    </div>
                  )}
                  {nutritionalInfo.fat && (
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-gray-900">{nutritionalInfo.fat}g</p>
                      <p className="text-sm text-gray-500">Fat</p>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Special Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Instructions (optional)
              </label>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value.slice(0, 200))}
                placeholder="Any allergies, preferences, or special requests..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all resize-none"
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{specialInstructions.length}/200</p>
            </div>
          </div>
        </div>

        {/* Fixed bottom action bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-5 flex items-center gap-4">
          {/* Quantity selector */}
          <div className="flex items-center bg-gray-100 rounded-2xl">
            <button
              onClick={decrementQuantity}
              disabled={quantity <= 1}
              className="w-14 h-14 flex items-center justify-center rounded-l-2xl hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Decrease quantity"
            >
              <Minus className="w-5 h-5 text-gray-700" />
            </button>
            <span className="w-12 text-center text-xl font-bold text-gray-900">
              {quantity}
            </span>
            <button
              onClick={incrementQuantity}
              disabled={quantity >= 10}
              className="w-14 h-14 flex items-center justify-center rounded-r-2xl hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Increase quantity"
            >
              <Plus className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Add to cart button */}
          <button
            onClick={handleAddToCart}
            disabled={!allRequiredSelected}
            className={cn(
              'flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold text-lg shadow-lg active:scale-[0.98] transition-all min-h-[56px]',
              allRequiredSelected
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none'
            )}
          >
            <span>Add to Cart</span>
            <span className={cn(
              'px-3 py-1 rounded-full',
              allRequiredSelected ? 'bg-white/20' : 'bg-gray-300/50'
            )}>
              {formatCurrency(totalPrice)}
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
