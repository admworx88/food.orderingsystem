'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, FolderOpen, Hash } from 'lucide-react';
import { CategoryFormDialog } from './category-form-dialog';
import type { Database } from '@/lib/supabase/types';

type Category = Database['public']['Tables']['categories']['Row'];

interface CategoryCardsProps {
  categories: Category[];
}

export function CategoryCards({ categories }: CategoryCardsProps) {
  if (categories.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <FolderOpen className="h-12 w-12 mx-auto mb-4 text-slate-300" />
        <p className="text-lg font-medium">No categories yet</p>
        <p className="text-sm">Create your first category to organize menu items</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {categories.map((category) => (
        <Card
          key={category.id}
          className={`overflow-hidden transition-all hover:shadow-md ${
            !category.is_active ? 'opacity-60' : ''
          }`}
        >
          {/* Header with gradient */}
          <div className="h-24 bg-gradient-to-br from-amber-500 to-amber-600 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <FolderOpen className="h-10 w-10 text-white/30" />
            </div>
            {/* Status Badge */}
            <Badge
              variant={category.is_active ? 'default' : 'secondary'}
              className="absolute top-3 left-3 bg-white/90 text-slate-700"
            >
              {category.is_active ? 'Active' : 'Inactive'}
            </Badge>
            {/* Actions */}
            <div className="absolute top-3 right-3 flex gap-1">
              <CategoryFormDialog
                mode="edit"
                category={category}
                trigger={
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7 bg-white/90 hover:bg-white"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                }
              />
              <CategoryFormDialog
                mode="delete"
                category={category}
                trigger={
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7 bg-white/90 hover:bg-white text-rose-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                }
              />
            </div>
          </div>

          <CardContent className="p-4">
            {/* Category Name */}
            <h3 className="font-semibold text-slate-900 text-lg mb-2">
              {category.name}
            </h3>

            {/* Display Order */}
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Hash className="h-4 w-4" />
              <span>Display Order: {category.display_order}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
