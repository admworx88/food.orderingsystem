'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { reorderCategories } from '@/services/menu-service';
import { CategoryFormDialog } from './category-form-dialog';
import type { Database } from '@/lib/supabase/types';

type Category = Database['public']['Tables']['categories']['Row'];

interface CategoryListProps {
  categories: Category[];
}

interface SortableCategoryItemProps {
  category: Category;
}

function SortableCategoryItem({ category }: SortableCategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`mb-2 ${isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''}`}
    >
      <CardContent className="p-4 flex items-center gap-4">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
        >
          <GripVertical className="h-5 w-5 text-gray-400" />
        </button>

        {/* Category Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{category.name}</span>
            <Badge variant={category.is_active ? 'default' : 'secondary'}>
              {category.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-sm text-gray-500">Order: {category.display_order}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <CategoryFormDialog
            mode="edit"
            category={category}
            trigger={
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />
          <CategoryFormDialog
            mode="delete"
            category={category}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function CategoryList({ categories: initialCategories }: CategoryListProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((c) => c.id === active.id);
      const newIndex = categories.findIndex((c) => c.id === over.id);

      const newCategories = arrayMove(categories, oldIndex, newIndex);
      setCategories(newCategories);

      // Save to server
      setIsSaving(true);
      try {
        const orderedIds = newCategories.map((c) => c.id);
        const result = await reorderCategories(orderedIds);

        if (result.success) {
          toast.success('Category order updated');
        } else {
          // Revert on failure
          setCategories(initialCategories);
          toast.error(result.error);
        }
      } catch {
        setCategories(initialCategories);
        toast.error('Failed to update category order');
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (categories.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg font-medium">No categories yet</p>
        <p className="text-sm">Create your first category to organize menu items</p>
      </div>
    );
  }

  return (
    <div className={isSaving ? 'opacity-70 pointer-events-none' : ''}>
      <p className="text-sm text-gray-500 mb-4">
        Drag and drop to reorder categories. Changes are saved automatically.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={categories.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {categories.map((category) => (
            <SortableCategoryItem key={category.id} category={category} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
