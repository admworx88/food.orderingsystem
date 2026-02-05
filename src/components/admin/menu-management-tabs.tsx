'use client';

import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, UtensilsCrossed, FolderTree, Trash2 } from 'lucide-react';
import { MenuItemTable } from './menu-item-table';
import { MenuFilters } from './menu-filters';
import { CategoryList } from './category-list';
import { DeletedItemsList } from './deleted-items-list';
import { CreateMenuItemDialog } from './create-menu-item-dialog';
import { CategoryFormDialog } from './category-form-dialog';
import type { Database } from '@/lib/supabase/types';

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
            <span className="text-xs text-gray-500">({menuItems.length})</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <FolderTree className="h-4 w-4" />
            <span className="hidden sm:inline">Categories</span>
            <span className="sm:hidden">Cats</span>
            <span className="text-xs text-gray-500">({categories.length})</span>
          </TabsTrigger>
          <TabsTrigger value="deleted" className="gap-2">
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Deleted</span>
            <span className="sm:hidden">Del</span>
            <span className="text-xs text-gray-500">({deletedItems.length})</span>
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
                className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/30"
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
        <MenuFilters
          categories={categories}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          availabilityFilter={availabilityFilter}
          onAvailabilityChange={setAvailabilityFilter}
        />

        {searchQuery || selectedCategory !== 'all' || availabilityFilter !== 'all' ? (
          <p className="text-sm text-gray-500">
            Showing {filteredItems.length} of {menuItems.length} items
          </p>
        ) : null}

        <MenuItemTable items={filteredItems} categories={categories} />
      </TabsContent>

      {/* Categories Tab */}
      <TabsContent value="categories" className="mt-0">
        <CategoryList categories={categories} />
      </TabsContent>

      {/* Deleted Items Tab */}
      <TabsContent value="deleted" className="mt-0">
        <DeletedItemsList items={deletedItems} />
      </TabsContent>
    </Tabs>
  );
}
