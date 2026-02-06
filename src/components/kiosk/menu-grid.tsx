'use client';

import { useState, useRef } from 'react';
import { MenuItemCard } from './menu-item-card';
import { cn } from '@/lib/utils';
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
  const menuScrollRef = useRef<HTMLDivElement>(null);

  const filteredItems =
    selectedCategory === 'all'
      ? menuItems
      : menuItems.filter((item) => item.category_id === selectedCategory);

  const selectedCategoryName = selectedCategory === 'all'
    ? 'All Items'
    : categories.find(c => c.id === selectedCategory)?.name || 'Menu';

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Left Sidebar - Category Navigation */}
      <aside className="w-full lg:w-[260px] flex-shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-stone-200 flex flex-col">
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
        <div className="flex-shrink-0 px-6 lg:px-8 py-5 bg-white border-b border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-stone-900 mb-1">
              {selectedCategoryName}
            </h2>
            <p className="text-base text-stone-500">
              {filteredItems.length} {filteredItems.length === 1 ? 'dish' : 'dishes'} available
            </p>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1.5 bg-stone-100 rounded-lg p-1.5">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'w-11 h-11 rounded-lg flex items-center justify-center transition-all',
                viewMode === 'grid'
                  ? 'bg-white shadow-sm text-amber-600'
                  : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
              )}
              aria-label="Grid view"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'w-11 h-11 rounded-lg flex items-center justify-center transition-all',
                viewMode === 'list'
                  ? 'bg-white shadow-sm text-amber-600'
                  : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
              )}
              aria-label="List view"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Menu Items */}
        <div
          ref={menuScrollRef}
          className="flex-1 overflow-y-auto p-6 lg:p-8"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#d6d3d1 transparent' }}
        >
          {filteredItems.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center py-20 px-4">
              <div className="w-28 h-28 mb-8 rounded-3xl bg-stone-100 flex items-center justify-center">
                <svg className="w-14 h-14 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-stone-800 mb-3">
                No dishes available
              </h3>
              <p className="text-stone-500 text-base max-w-sm mb-8">
                There are no items in this category yet. Try browsing another category.
              </p>
              <button
                onClick={() => setSelectedCategory('all')}
                className="px-8 h-14 bg-amber-500 hover:bg-amber-600 text-white text-base font-bold rounded-xl active:scale-[0.98] transition-all shadow-md"
              >
                View All Items
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View - Responsive columns */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {filteredItems.map((item, index) => (
                <div
                  key={item.id}
                  className="animate-fade-in-up"
                  style={{
                    animationDelay: `${Math.min(index * 40, 400)}ms`,
                    animationFillMode: 'both'
                  }}
                >
                  <MenuItemCard item={item} />
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="space-y-4 max-w-4xl mx-auto">
              {filteredItems.map((item, index) => (
                <div
                  key={item.id}
                  className="animate-fade-in-up"
                  style={{
                    animationDelay: `${Math.min(index * 40, 400)}ms`,
                    animationFillMode: 'both'
                  }}
                >
                  <MenuItemCard item={item} compact />
                </div>
              ))}
            </div>
          )}

          {/* Bottom padding for cart button */}
          <div className="h-32" />
        </div>
      </main>
    </div>
  );
}
