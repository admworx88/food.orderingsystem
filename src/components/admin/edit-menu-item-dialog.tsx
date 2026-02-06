'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Edit2 } from 'lucide-react';
import { MenuItemForm } from './menu-item-form';
import { updateMenuItem } from '@/services/menu-service';
import { toast } from 'sonner';
import type { Database } from '@/lib/supabase/types';

type Category = Database['public']['Tables']['categories']['Row'];
type MenuItem = Database['public']['Tables']['menu_items']['Row'];

interface EditMenuItemDialogProps {
  item: MenuItem;
  categories: Category[];
  trigger?: React.ReactNode;
}

export function EditMenuItemDialog({ item, categories, trigger }: EditMenuItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: {
    name: string;
    slug: string;
    description: string | null;
    category_id: string;
    base_price: number;
    image_url: string | null;
    is_available: boolean;
    display_order: number;
  }) => {
    setIsSubmitting(true);

    try {
      const result = await updateMenuItem(item.id, data);

      if (result.success) {
        toast.success('Menu item updated successfully!');
        setOpen(false);
      } else {
        toast.error(result.error || 'Failed to update menu item');
      }
    } catch (error) {
      console.error('Update menu item error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Edit Menu Item
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            Update the details for <span className="font-semibold text-slate-900">{item.name}</span>
          </DialogDescription>
        </DialogHeader>

        <MenuItemForm
          categories={categories}
          defaultValues={item}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}
