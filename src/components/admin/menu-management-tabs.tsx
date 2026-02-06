'use client';

import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, UtensilsCrossed, FolderTree, Trash2, LayoutGrid, List } from 'lucide-react';
import { MenuItemTable } from './menu-item-table';
import { MenuItemCards } from './menu-item-cards';
import { MenuFilters } from './menu-filters';
import { CategoryList } from './category-list';
import { CategoryCards } from './category-cards';
import { DeletedItemsList } from './deleted-items-list';
import { CreateMenuItemDialog } from './create-menu-item-dialog';
import { CategoryFormDialog } from './category-form-dialog';
import type { Database } from '@/lib/supabase/types';

type ViewMode = 'table' | 'cards';

type Category = Database['public']['Tables']['categories']['Row'];
type MenuItem = Database['public']['Tables']['menu_items']['Row'] & {
  category: { id: string; name: string } | null;
};

interface MenuManagementTabsProps {
  categories: Category[];
  menuItems: MenuItem[];
  deletedItems: MenuItem[];
}

export function MenuManagementTabs({
  categories,
  menuItems,
  deletedItems,
}: MenuManagementTabsProps) {
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'unavailable'>('all');

  // View mode states
  const [menuViewMode, setMenuViewMode] = useState<ViewMode>('table');
  const [categoryViewMode, setCategoryViewMode] = useState<ViewMode>('table');

  // Filter menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());

      // Category filter
      const matchesCategory =
        selectedCategory === 'all' || item.category_id === selectedCategory;

      // Availability filter
      const matchesAvailability =
        availabilityFilter === 'all' ||
        (availabilityFilter === 'available' && item.is_available) ||
        (availabilityFilter === 'unavailable' && !item.is_available);

      return matchesSearch && matchesCategory && matchesAvailability;
    });
  }, [menuItems, searchQuery, selectedCategory, availabilityFilter]);

  return (
    <Tabs defaultValue="items" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <TabsList className="grid w-full sm:w-auto grid-cols-3">
          <TabsTrigger value="items" className="gap-2">
            <UtensilsCrossed className="h-4 w-4" />
            <span className="hidden sm:inline">Menu Items</span>
            <span className="sm:hidden">Items</span>
            <span className="text-xs text-slate-500">({menuItems.length})</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <FolderTree className="h-4 w-4" />
            <span className="hidden sm:inline">Categories</span>
            <span className="sm:hidden">Cats</span>
            <span className="text-xs text-slate-500">({categories.length})</span>
          </TabsTrigger>
          <TabsTrigger value="deleted" className="gap-2">
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Deleted</span>
            <span className="sm:hidden">Del</span>
            <span className="text-xs text-slate-500">({deletedItems.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <CategoryFormDialog
            mode="create"
            trigger={
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Category</span>
              </Button>
            }
          />
          <CreateMenuItemDialog
            categories={categories}
            trigger={
              <Button
                size="sm"
                className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-blue-500/30"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Item</span>
              </Button>
            }
          />
        </div>
      </div>

      {/* Menu Items Tab */}
      <TabsContent value="items" className="space-y-4 mt-0">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <MenuFilters
            categories={categories}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            availabilityFilter={availabilityFilter}
            onAvailabilityChange={setAvailabilityFilter}
          />

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <Button
              variant={menuViewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setMenuViewMode('table')}
              className="gap-2"
              title="Table view"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Table</span>
            </Button>
            <Button
              variant={menuViewMode === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setMenuViewMode('cards')}
              className="gap-2"
              title="Cards view"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Cards</span>
            </Button>
          </div>
        </div>

        {searchQuery || selectedCategory !== 'all' || availabilityFilter !== 'all' ? (
          <p className="text-sm text-slate-500">
            Showing {filteredItems.length} of {menuItems.length} items
          </p>
        ) : null}

        {/* Render view based on menuViewMode */}
        {menuViewMode === 'table' && (
          <MenuItemTable items={filteredItems} categories={categories} />
        )}
        {menuViewMode === 'cards' && (
          <MenuItemCards items={filteredItems} categories={categories} />
        )}
      </TabsContent>

      {/* Categories Tab */}
      <TabsContent value="categories" className="space-y-4 mt-0">
        {/* View Toggle for Categories */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {categoryViewMode === 'table'
              ? 'Drag and drop to reorder categories. Changes are saved automatically.'
              : 'View your categories at a glance. Switch to list view to reorder.'}
          </p>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <Button
              variant={categoryViewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setCategoryViewMode('table')}
              className="gap-2"
              title="List view"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">List</span>
            </Button>
            <Button
              variant={categoryViewMode === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setCategoryViewMode('cards')}
              className="gap-2"
              title="Cards view"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Cards</span>
            </Button>
          </div>
        </div>

        {/* Render view based on categoryViewMode */}
        {categoryViewMode === 'table' && (
          <CategoryList categories={categories} />
        )}
        {categoryViewMode === 'cards' && (
          <CategoryCards categories={categories} />
        )}
      </TabsContent>

      {/* Deleted Items Tab */}
      <TabsContent value="deleted" className="mt-0">
        <DeletedItemsList items={deletedItems} />
      </TabsContent>
    </Tabs>
  );
}
