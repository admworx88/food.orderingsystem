'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2, AlertTriangle } from 'lucide-react';
import { deleteMenuItem } from '@/services/menu-service';
import { toast } from 'sonner';
import type { Database } from '@/lib/supabase/types';

type MenuItem = Database['public']['Tables']['menu_items']['Row'];

interface DeleteMenuItemDialogProps {
  item: MenuItem;
  trigger?: React.ReactNode;
}

export function DeleteMenuItemDialog({ item, trigger }: DeleteMenuItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const result = await deleteMenuItem(item.id);

      if (result.success) {
        toast.success('Menu item deleted successfully');
        setOpen(false);
      } else {
        toast.error(result.error || 'Failed to delete menu item');
      }
    } catch (error) {
      console.error('Delete menu item error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-rose-100 rounded-full">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Delete Menu Item
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-600 pt-2">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-slate-900">{item.name}</span>? This action will
            soft-delete the item from your menu.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-4">
          <p className="text-sm text-amber-900">
            <span className="font-semibold">Note:</span> This item will be hidden from the menu
            but preserved in historical orders.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isDeleting}
            className="hover:bg-slate-100"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-red-800 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 transition-all"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Item
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
