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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Undo2, ImageIcon, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { restoreMenuItem } from '@/services/menu-service';
import { formatDistanceToNow } from 'date-fns';
import type { Database } from '@/lib/supabase/types';

type MenuItem = Database['public']['Tables']['menu_items']['Row'] & {
  category: { id: string; name: string } | null;
};

interface DeletedItemsListProps {
  items: MenuItem[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function DeletedItemsList({ items }: DeletedItemsListProps) {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const handleRestore = async (id: string, name: string) => {
    setLoadingStates((prev) => ({ ...prev, [id]: true }));

    try {
      const result = await restoreMenuItem(id);
      if (result.success) {
        toast.success(`"${name}" has been restored`);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to restore item');
    } finally {
      setLoadingStates((prev) => ({ ...prev, [id]: false }));
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Trash2 className="h-12 w-12 mx-auto mb-4 text-slate-300" />
        <p className="text-lg font-medium">No deleted items</p>
        <p className="text-sm">Items you delete will appear here for recovery</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertCircle className="h-5 w-5 text-amber-600" />
        <p className="text-sm text-amber-800">
          Deleted items are kept for recovery. Restore them to make them available again.
        </p>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Deleted</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="hover:bg-slate-50">
                <TableCell>
                  <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden opacity-60">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover grayscale"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-slate-400" />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="opacity-75">
                    <p className="font-medium">{item.name}</p>
                    {item.description && (
                      <p className="text-sm text-slate-500 line-clamp-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="opacity-75">
                    {item.category?.name || 'Uncategorized'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium opacity-75">
                  {formatCurrency(Number(item.base_price))}
                </TableCell>
                <TableCell className="text-sm text-slate-500">
                  {item.deleted_at
                    ? formatDistanceToNow(new Date(item.deleted_at), { addSuffix: true })
                    : '-'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loadingStates[item.id]}
                    onClick={() => handleRestore(item.id, item.name)}
                    className="gap-1"
                  >
                    <Undo2 className="h-4 w-4" />
                    Restore
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
