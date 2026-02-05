'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/currency';
import type { Database } from '@/lib/supabase/types';

type MenuItem = Database['public']['Tables']['menu_items']['Row'];

interface MenuItemCardProps {
  item: MenuItem;
}

export function MenuItemCard({ item }: MenuItemCardProps) {
  const handleAddToCart = () => {
    // TODO: Implement cart functionality in Phase 2
    console.log('Add to cart:', item.id);
  };

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
      <CardHeader>
        {item.image_url && (
          <div className="aspect-video bg-gray-200 rounded-md mb-4 overflow-hidden">
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
          </div>
        )}
        <CardTitle className="text-lg">{item.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {item.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <span className="text-xl font-bold">{formatCurrency(Number(item.base_price))}</span>
        <Button onClick={handleAddToCart} size="sm">
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
}
