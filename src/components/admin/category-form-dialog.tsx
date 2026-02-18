'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit2, Trash2, X, Image as ImageIcon } from 'lucide-react';
import { createCategory, updateCategory, deleteCategory, uploadMenuImage } from '@/services/menu-service';
import { toast } from 'sonner';
import type { Database } from '@/lib/supabase/types';

type Category = Database['public']['Tables']['categories']['Row'];

interface CategoryFormDialogProps {
  mode: 'create' | 'edit' | 'delete';
  category?: Category;
  trigger?: React.ReactNode;
}

export function CategoryFormDialog({ mode, category, trigger }: CategoryFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(category?.image_url ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Memoized initial form data getter
  const getInitialFormData = useCallback(() => ({
    name: category?.name || '',
    slug: category?.slug || '',
    display_order: category?.display_order || 0,
    is_active: category?.is_active ?? true,
  }), [category?.name, category?.slug, category?.display_order, category?.is_active]);

  const [formData, setFormData] = useState(getInitialFormData);

  // Reset form when category changes or dialog opens
  useEffect(() => {
    if (open) {
      setFormData(getInitialFormData());
      setImageUrl(category?.image_url ?? null);
    }
  }, [open, category?.id, category?.image_url, getInitialFormData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-generate slug from name
    if (name === 'name' && mode === 'create') {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setFormData((prev) => ({ ...prev, slug }));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Invalid file type. Use JPG, PNG, or WebP.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB.');
      return;
    }

    setIsUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      const result = await uploadMenuImage(formDataUpload);

      if (result.success) {
        setImageUrl(result.data.url);
        toast.success('Image uploaded successfully');
      } else {
        toast.error(result.error || 'Failed to upload image');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload image');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let result;
      const payload = { ...formData, image_url: imageUrl };

      if (mode === 'create') {
        result = await createCategory(payload);
      } else if (mode === 'edit' && category) {
        result = await updateCategory(category.id, payload);
      } else if (mode === 'delete' && category) {
        result = await deleteCategory(category.id);
      }

      if (result?.success) {
        toast.success(
          mode === 'create'
            ? 'Category created successfully!'
            : mode === 'edit'
            ? 'Category updated successfully!'
            : 'Category deleted successfully!'
        );
        setOpen(false);
        if (mode === 'create') {
          setFormData({ name: '', slug: '', display_order: 0, is_active: true });
          setImageUrl(null);
        }
      } else {
        toast.error(result?.error || `Failed to ${mode} category`);
      }
    } catch (error) {
      console.error(`${mode} category error:`, error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTriggerButton = () => {
    if (trigger) return trigger;

    if (mode === 'create') {
      return (
        <Button
          size="sm"
          className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-md shadow-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/40 transition-all"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Category
        </Button>
      );
    }

    if (mode === 'edit') {
      return (
        <Button
          variant="outline"
          size="sm"
          className="hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-colors"
        >
          <Edit2 className="h-3.5 w-3.5 mr-1.5" />
          Edit
        </Button>
      );
    }

    return (
      <Button
        variant="outline"
        size="sm"
        className="hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
        Delete
      </Button>
    );
  };

  const getDialogContent = () => {
    if (mode === 'delete') {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Delete Category
            </DialogTitle>
            <DialogDescription className="text-slate-600 pt-2">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-slate-900">{category?.name}</span>? This will
              also affect all menu items in this category.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 my-4">
            <p className="text-sm text-rose-900">
              <span className="font-semibold">Warning:</span> This action cannot be undone.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-red-800 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 transition-all"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete Category'
              )}
            </Button>
          </div>
        </>
      );
    }

    return (
      <>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            {mode === 'create' ? 'Create New Category' : 'Edit Category'}
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            {mode === 'create'
              ? 'Add a new category to organize your menu items.'
              : 'Update the category details below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Category Image (optional) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Category Image (optional)</Label>

            {imageUrl ? (
              <div className="relative group">
                <div className="h-32 bg-slate-100 rounded-xl overflow-hidden border-2 border-slate-200">
                  <img
                    src={imageUrl}
                    alt="Category preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="category-image"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  className="sr-only"
                />
                <label
                  htmlFor="category-image"
                  className="flex flex-col items-center justify-center h-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-slate-300 cursor-pointer hover:border-slate-400 hover:bg-slate-100 transition-all group"
                >
                  <div className="flex flex-col items-center gap-1.5 text-slate-600">
                    {isUploading ? (
                      <>
                        <div className="animate-spin h-8 w-8 border-3 border-slate-300 border-t-amber-500 rounded-full" />
                        <span className="text-sm font-medium">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <div className="p-2 bg-white rounded-full shadow-sm group-hover:shadow-md transition-shadow">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-medium">Upload Image</span>
                        <span className="text-xs text-slate-500">JPG, PNG or WebP (Max 5MB)</span>
                      </>
                    )}
                  </div>
                </label>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Category Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                maxLength={50}
                placeholder="e.g., Main Dishes"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug" className="text-sm font-medium">
                URL Slug <span className="text-red-500">*</span>
              </Label>
              <Input
                id="slug"
                name="slug"
                value={formData.slug}
                onChange={handleInputChange}
                required
                maxLength={50}
                placeholder="main-dishes"
                className="h-11 font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="display_order" className="text-sm font-medium">
                Display Order
              </Label>
              <Input
                id="display_order"
                name="display_order"
                type="number"
                value={formData.display_order}
                onChange={handleInputChange}
                min="0"
                placeholder="0"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <div className="flex items-center gap-4 h-11">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={() => setFormData((prev) => ({ ...prev, is_active: true }))}
                    className="w-4 h-4 accent-green-600"
                  />
                  <span className="text-sm">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="is_active"
                    checked={!formData.is_active}
                    onChange={() => setFormData((prev) => ({ ...prev, is_active: false }))}
                    className="w-4 h-4 accent-gray-600"
                  />
                  <span className="text-sm">Inactive</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="px-6 h-11 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-medium shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Saving...
                </>
              ) : mode === 'create' ? (
                'Create Category'
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{getTriggerButton()}</DialogTrigger>
      <DialogContent className="max-w-md">{getDialogContent()}</DialogContent>
    </Dialog>
  );
}
