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
import { GripVertical, Pencil, Trash2, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { reorderCategories } from '@/services/menu-service';
import { CategoryFormDialog } from './category-form-dialog';
import type { Database } from '@/lib/supabase/types';

type Category = Database['public']['Tables']['categories']['Row'];

interface CategoryListProps {
  categories: Category[];
}

interface SortableRowProps {
  category: Category;
}

function SortableRow({ category }: SortableRowProps) {
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
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'bg-amber-50 shadow-lg ring-2 ring-amber-500 z-10' : 'hover:bg-slate-50'}`}
    >
      <TableCell className="w-[50px]">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-slate-100 rounded transition-colors"
        >
          <GripVertical className="h-4 w-4 text-slate-400" />
        </button>
      </TableCell>
      <TableCell className="font-medium">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
            <FolderOpen className="h-5 w-5 text-white" />
          </div>
          <span>{category.name}</span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <Badge
          variant={category.is_active ? 'default' : 'secondary'}
          className={category.is_active ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}
        >
          {category.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
      <TableCell className="text-center text-slate-500">
        {category.display_order}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
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
                className="h-8 w-8 text-rose-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            }
          />
        </div>
      </TableCell>
    </TableRow>
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
      <div className="text-center py-12 text-slate-500">
        <FolderOpen className="h-12 w-12 mx-auto mb-4 text-slate-300" />
        <p className="text-lg font-medium">No categories yet</p>
        <p className="text-sm">Create your first category to organize menu items</p>
      </div>
    );
  }

  return (
    <div className={isSaving ? 'opacity-70 pointer-events-none' : ''}>
      <div className="rounded-lg border overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center w-[120px]">Status</TableHead>
                <TableHead className="text-center w-[100px]">Order</TableHead>
                <TableHead className="text-right w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <SortableContext
                items={categories.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {categories.map((category) => (
                  <SortableRow key={category.id} category={category} />
                ))}
              </SortableContext>
            </TableBody>
          </Table>
        </DndContext>
      </div>
    </div>
  );
}
