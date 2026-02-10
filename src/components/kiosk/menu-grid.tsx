'use client';

import { useState, useRef } from 'react';
import { MenuItemCard } from './menu-item-card';
import { ItemDetailSheet } from './item-detail-sheet';
import { cn } from '@/lib/utils';
import { ChevronDown, X, Filter } from 'lucide-react';
import type { Database } from '@/lib/supabase/types';

type Category = Database['public']['Tables']['categories']['Row'];
type MenuItem = Database['public']['Tables']['menu_items']['Row'] & {
  category: { id: string; name: string } | null;
};

interface MenuGridProps {
  categories: Category[];
  menuItems: MenuItem[];
}

// Category icons - refined emoji set
const CATEGORY_ICONS: Record<string, string> = {
  'appetizers': '🥗',
  'starters': '🥗',
  'mains': '🍛',
  'main course': '🍛',
  'main dishes': '🍛',
  'entrees': '🍛',
  'desserts': '🍰',
  'sweets': '🍰',
  'beverages': '☕',
  'drinks': '🍹',
  'breakfast': '🍳',
  'all-day breakfast': '🍳',
  'lunch': '🥘',
  'dinner': '🍽️',
  'seafood': '🦞',
  'meat': '🥩',
  'vegetarian': '🥬',
  'vegan': '🌱',
  'pasta': '🍝',
  'noodles': '🍜',
  'noodles & pasta': '🍝',
  'soup': '🍲',
  'soups': '🍲',
  'rice': '🍚',
  'rice meals': '🍚',
  'salads': '🥗',
  'sides': '🍟',
  'side dishes': '🍟',
  'specials': '⭐',
  "chef's specials": '👨‍🍳',
  'filipino favorites': '🇵🇭',
  'grilled': '🔥',
  'grilled & bbq': '🔥',
  'sandwiches': '🥪',
  'sandwiches & merienda': '🥪',
  'kids menu': '🧒',
  'room service specials': '🛎️',
  'default': '🍴',
};

function getCategoryIcon(name: string): string {
  const key = name.toLowerCase();
  return CATEGORY_ICONS[key] || CATEGORY_ICONS['default'];
}

export function MenuGrid({ categories, menuItems }: MenuGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const menuScrollRef = useRef<HTMLDivElement>(null);
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleItemClick = (item: MenuItem) => {
    setDetailItem(item);
    setDetailOpen(true);
  };

  const handleCategorySelect = (categoryId: string | 'all') => {
    setSelectedCategory(categoryId);
    setMobileFilterOpen(false);
  };

  const filteredItems =
    selectedCategory === 'all'
      ? menuItems
      : menuItems.filter((item) => item.category_id === selectedCategory);

  const selectedCategoryName = selectedCategory === 'all'
    ? 'All Items'
    : categories.find(c => c.id === selectedCategory)?.name || 'Menu';

  return (
    <div className="flex h-full flex-col">
      {/* Mobile Category Selector - Horizontal scroll on small screens */}
      <div className="lg:hidden flex-shrink-0 bg-white border-b border-stone-200">
        {/* Horizontal scrolling category pills for mobile */}
        <div
          className="flex gap-2 px-3 py-3 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>

          {/* All Items pill */}
          <button
            onClick={() => handleCategorySelect('all')}
            className={cn(
              'flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap',
              selectedCategory === 'all'
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            )}
          >
            <span className="text-base">🍴</span>
            <span>All</span>
            <span className={cn(
              'px-1.5 py-0.5 text-xs rounded-full',
              selectedCategory === 'all' ? 'bg-white/20' : 'bg-stone-200'
            )}>
              {menuItems.length}
            </span>
          </button>

          {/* Category pills */}
          {categories.map((cat) => {
            const itemCount = menuItems.filter(item => item.category_id === cat.id).length;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className={cn(
                  'flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap',
                  isSelected
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                )}
              >
                <span className="text-base">{getCategoryIcon(cat.name)}</span>
                <span>{cat.name}</span>
                <span className={cn(
                  'px-1.5 py-0.5 text-xs rounded-full',
                  isSelected ? 'bg-white/20' : 'bg-stone-200'
                )}>
                  {itemCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar - Category Navigation (Desktop only) */}
        <aside className="hidden lg:flex w-[260px] flex-shrink-0 bg-white border-r border-stone-200 flex-col">
          {/* Sidebar Header */}
          <div className="px-6 py-5 border-b border-stone-200">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">Categories</h2>
          </div>

          {/* Scrollable Category List */}
          <nav
            className="flex-1 overflow-y-auto py-3 px-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style jsx>{`nav::-webkit-scrollbar { display: none; }`}</style>

            {/* All Items */}
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                'w-full flex items-center gap-4 px-4 py-4 mb-2 transition-all',
                'border border-stone-200 rounded-none min-h-[60px]',
                selectedCategory === 'all'
                  ? 'bg-amber-50 border-l-4 border-l-amber-500 border-t-stone-200 border-r-stone-200 border-b-stone-200'
                  : 'hover:bg-stone-50 hover:border-stone-300'
              )}
            >
              <span className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-xl rounded-lg bg-white shadow-sm border border-stone-200">
                🍴
              </span>
              <div className="flex-1 min-w-0 text-left">
                <span className={cn(
                  'block text-base truncate',
                  selectedCategory === 'all' ? 'font-bold text-stone-900' : 'font-semibold text-stone-700'
                )}>
                  All Items
                </span>
              </div>
              <span className={cn(
                'px-3 py-1.5 text-sm font-bold rounded-full flex-shrink-0',
                selectedCategory === 'all'
                  ? 'bg-amber-500 text-white'
                  : 'bg-stone-200 text-stone-600'
              )}>
                {menuItems.length}
              </span>
            </button>

            {/* Divider */}
            <div className="my-3 h-px bg-stone-200" />

            {/* Category List */}
            {categories.map((cat) => {
              const itemCount = menuItems.filter(item => item.category_id === cat.id).length;
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'w-full flex items-center gap-4 px-4 py-4 mb-2 transition-all',
                    'border border-stone-200 rounded-none min-h-[60px]',
                    isSelected
                      ? 'bg-amber-50 border-l-4 border-l-amber-500 border-t-stone-200 border-r-stone-200 border-b-stone-200'
                      : 'hover:bg-stone-50 hover:border-stone-300'
                  )}
                >
                  <span className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-xl rounded-lg bg-white shadow-sm border border-stone-200">
                    {getCategoryIcon(cat.name)}
                  </span>
                  <div className="flex-1 min-w-0 text-left">
                    <span className={cn(
                      'block text-base truncate',
                      isSelected ? 'font-bold text-stone-900' : 'font-semibold text-stone-700'
                    )}>
                      {cat.name}
                    </span>
                  </div>
                  <span className={cn(
                    'px-3 py-1.5 text-sm font-bold rounded-full flex-shrink-0',
                    isSelected
                      ? 'bg-amber-500 text-white'
                      : 'bg-stone-200 text-stone-600'
                  )}>
                    {itemCount}
                  </span>
                </button>
              );
            })}

            {/* Bottom spacing */}
            <div className="h-6" />
          </nav>
        </aside>

        {/* Right Content Area - Menu Items */}
        <main className="flex-1 flex flex-col min-w-0 bg-[var(--kiosk-bg)]">
          {/* Content Header */}
          <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 bg-white border-b border-stone-200 flex flex-row items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-stone-900 mb-0.5 sm:mb-1 truncate">
                {selectedCategoryName}
              </h2>
              <p className="text-xs sm:text-sm lg:text-base text-stone-500">
                {filteredItems.length} {filteredItems.length === 1 ? 'dish' : 'dishes'}
              </p>
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 sm:gap-1.5 bg-stone-100 rounded-lg p-1 sm:p-1.5 flex-shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-md sm:rounded-lg flex items-center justify-center transition-all',
                  viewMode === 'grid'
                    ? 'bg-white shadow-sm text-amber-600'
                    : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                )}
                aria-label="Grid view"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-md sm:rounded-lg flex items-center justify-center transition-all',
                  viewMode === 'list'
                    ? 'bg-white shadow-sm text-amber-600'
                    : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                )}
                aria-label="List view"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Scrollable Menu Items */}
          <div
            ref={menuScrollRef}
            className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 xl:p-8"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#d6d3d1 transparent' }}
          >
            {filteredItems.length === 0 ? (
              /* Empty State */
              <div className="h-full flex flex-col items-center justify-center text-center py-12 sm:py-16 lg:py-20 px-4">
                <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 mb-6 sm:mb-8 rounded-2xl sm:rounded-3xl bg-stone-100 flex items-center justify-center">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-stone-800 mb-2 sm:mb-3">
                  No dishes available
                </h3>
                <p className="text-stone-500 text-sm sm:text-base max-w-sm mb-6 sm:mb-8">
                  There are no items in this category yet. Try browsing another category.
                </p>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="px-6 sm:px-8 h-12 sm:h-14 bg-amber-500 hover:bg-amber-600 text-white text-sm sm:text-base font-bold rounded-xl active:scale-[0.98] transition-all shadow-md"
                >
                  View All Items
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              /* Grid View - Responsive columns with better mobile spacing */
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
                {filteredItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="animate-fade-in-up"
                    style={{
                      animationDelay: `${Math.min(index * 40, 400)}ms`,
                      animationFillMode: 'both'
                    }}
                  >
                    <MenuItemCard item={item} onItemClick={() => handleItemClick(item)} />
                  </div>
                ))}
              </div>
            ) : (
              /* List View */
              <div className="space-y-3 sm:space-y-4 max-w-4xl mx-auto">
                {filteredItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="animate-fade-in-up"
                    style={{
                      animationDelay: `${Math.min(index * 40, 400)}ms`,
                      animationFillMode: 'both'
                    }}
                  >
                    <MenuItemCard item={item} compact onItemClick={() => handleItemClick(item)} />
                  </div>
                ))}
              </div>
            )}

            {/* Bottom padding for cart button */}
            <div className="h-24 sm:h-28 lg:h-32" />
          </div>
        </main>
      </div>

      {/* Item Detail Sheet */}
      <ItemDetailSheet
        item={detailItem}
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
