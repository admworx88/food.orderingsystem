'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

interface MenuItemTableProps {
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

export function MenuItemTable({ items, categories }: MenuItemTableProps) {
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
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="w-[80px]">Image</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-center w-[100px]">Available</TableHead>
            <TableHead className="w-[70px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className="hover:bg-slate-50">
              <TableCell>
                <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-slate-400" />
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{item.name}</p>
                  {item.description && (
                    <p className="text-sm text-slate-500 line-clamp-1">
                      {item.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {item.category?.name || 'Uncategorized'}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(Number(item.base_price))}
              </TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={item.is_available ?? false}
                  disabled={loadingStates[item.id]}
                  onCheckedChange={() =>
                    handleToggleAvailability(item.id, item.is_available ?? false)
                  }
                />
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
