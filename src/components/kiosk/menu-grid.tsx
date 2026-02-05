'use client';

import { useState } from 'react';
import { MenuItemCard } from './menu-item-card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { Database } from '@/lib/supabase/types';

type Category = Database['public']['Tables']['categories']['Row'];
type MenuItem = Database['public']['Tables']['menu_items']['Row'] & {
  category: { id: string; name: string } | null;
};

interface MenuGridProps {
  categories: Category[];
  menuItems: MenuItem[];
}

export function MenuGrid({ categories, menuItems }: MenuGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');

  const filteredItems =
    selectedCategory === 'all'
      ? menuItems
      : menuItems.filter((item) => item.category_id === selectedCategory);

  return (
    <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        {categories.map((cat) => (
          <TabsTrigger key={cat.id} value={cat.id}>
            {cat.name}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value={selectedCategory} className="mt-6">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No items available in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
