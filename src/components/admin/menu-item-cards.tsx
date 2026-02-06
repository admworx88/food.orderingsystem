'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { toggleMenuItemAvailability } from '@/services/menu-service';
import type { Database } from '@/lib/supabase/types';
import { EditMenuItemDialog } from './edit-menu-item-dialog';
import { DeleteMenuItemDialog } from './delete-menu-item-dialog';

type Category = Database['public']['Tables']['categories']['Row'];
type MenuItem = Database['public']['Tables']['menu_items']['Row'] & {
  category: { id: string; name: string } | null;
};

interface MenuItemCardsProps {
  items: MenuItem[];
  categories: Category[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function MenuItemCards({ items, categories }: MenuItemCardsProps) {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const handleToggleAvailability = async (id: string, currentValue: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [id]: true }));

    try {
      const result = await toggleMenuItemAvailability(id, !currentValue);
      if (result.success) {
        toast.success(`Item ${!currentValue ? 'available' : 'unavailable'}`);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to update availability');
    } finally {
      setLoadingStates((prev) => ({ ...prev, [id]: false }));
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <ImageIcon className="h-12 w-12 mx-auto mb-4 text-slate-300" />
        <p className="text-lg font-medium">No menu items found</p>
        <p className="text-sm">Add your first menu item to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card
          key={item.id}
          className={`overflow-hidden transition-all hover:shadow-md ${
            !item.is_available ? 'opacity-60' : ''
          }`}
        >
          {/* Image */}
          <div className="relative aspect-[4/3] bg-slate-100">
            {item.image_url ? (
              <Image
                src={item.image_url}
                alt={item.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-12 w-12 text-slate-300" />
              </div>
            )}
            {/* Category Badge */}
            <Badge
              variant="secondary"
              className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm"
            >
              {item.category?.name || 'Uncategorized'}
            </Badge>
            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 bg-white/90 backdrop-blur-sm hover:bg-white"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <EditMenuItemDialog
                  item={item}
                  categories={categories}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  }
                />
                <DeleteMenuItemDialog
                  item={item}
                  trigger={
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="text-rose-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  }
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <CardContent className="p-4">
            {/* Name and Description */}
            <div className="mb-3">
              <h3 className="font-semibold text-slate-900 line-clamp-1">
                {item.name}
              </h3>
              {item.description && (
                <p className="text-sm text-slate-500 line-clamp-2 mt-1">
                  {item.description}
                </p>
              )}
            </div>

            {/* Price and Availability */}
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-amber-600">
                {formatCurrency(Number(item.base_price))}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  {item.is_available ? 'Available' : 'Unavailable'}
                </span>
                <Switch
                  checked={item.is_available ?? false}
                  disabled={loadingStates[item.id]}
                  onCheckedChange={() =>
                    handleToggleAvailability(item.id, item.is_available ?? false)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
