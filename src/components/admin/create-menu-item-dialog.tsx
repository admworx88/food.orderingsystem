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
import { Plus } from 'lucide-react';
import { MenuItemForm } from './menu-item-form';
import { createMenuItem } from '@/services/menu-service';
import { toast } from 'sonner';
import type { Database } from '@/lib/supabase/types';

type Category = Database['public']['Tables']['categories']['Row'];

interface CreateMenuItemDialogProps {
  categories: Category[];
  trigger?: React.ReactNode;
}

export function CreateMenuItemDialog({ categories, trigger }: CreateMenuItemDialogProps) {
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
      const result = await createMenuItem(data);

      if (result.success) {
        toast.success('Menu item created successfully!');
        setOpen(false);
      } else {
        toast.error(result.error || 'Failed to create menu item');
      }
    } catch (error) {
      console.error('Create menu item error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all">
            <Plus className="h-4 w-4 mr-2" />
            Add Menu Item
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Create New Menu Item
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            Add a new item to your restaurant menu. Fill in the details below.
          </DialogDescription>
        </DialogHeader>

        <MenuItemForm
          categories={categories}
          onSubmit={handleSubmit}
          submitLabel="Create Menu Item"
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}
