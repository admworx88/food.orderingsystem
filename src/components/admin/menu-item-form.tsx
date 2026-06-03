'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Image as ImageIcon, ChevronDown } from 'lucide-react';
import { uploadMenuImage } from '@/services/menu-service';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ALLERGEN_OPTIONS, NUTRITIONAL_FIELDS, type NutritionalInfo } from '@/lib/constants/allergens';
import type { Database } from '@/lib/supabase/types';

type Category = Database['public']['Tables']['categories']['Row'];
type MenuItem = Database['public']['Tables']['menu_items']['Row'];

interface MenuItemFormProps {
  categories: Category[];
  defaultValues?: Partial<MenuItem>;
  onSubmit: (data: {
    name: string;
    slug: string;
    description: string | null;
    category_id: string;
    base_price: number;
    image_url: string | null;
    is_available: boolean;
    display_order: number;
    allergens: string[] | null;
    nutritional_info: NutritionalInfo | null;
  }) => Promise<void>;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export function MenuItemForm({
  categories,
  defaultValues,
  onSubmit,
  submitLabel = 'Create Item',
  isSubmitting = false,
}: MenuItemFormProps) {
  const [formData, setFormData] = useState({
    name: defaultValues?.name || '',
    slug: defaultValues?.slug || '',
    description: defaultValues?.description || '',
    category_id: defaultValues?.category_id || '',
    base_price: defaultValues?.base_price || 0,
    image_url: defaultValues?.image_url || null,
    is_available: defaultValues?.is_available ?? true,
    display_order: defaultValues?.display_order ?? 0,
    allergens: (defaultValues?.allergens as string[] | null) || [],
    nutritional_info: (defaultValues?.nutritional_info as NutritionalInfo | null) || {},
  });

  const [slugEdited, setSlugEdited] = useState(!!defaultValues?.slug);
  const [allergensOpen, setAllergensOpen] = useState(false);
  const [nutritionOpen, setNutritionOpen] = useState(false);

  const [imagePreview, setImagePreview] = useState<string | null>(
    defaultValues?.image_url || null
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'name' && !slugEdited) {
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

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Invalid file type. Use JPG, PNG, or WebP.');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB.');
      return;
    }

    setIsUploadingImage(true);

    try {
      // Upload first, then show preview on success
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      const result = await uploadMenuImage(formDataUpload);

      if (result.success) {
        // Only set preview after successful upload
        setImagePreview(result.data.url);
        setFormData((prev) => ({ ...prev, image_url: result.data.url }));
        toast.success('Image uploaded successfully');
      } else {
        toast.error(result.error || 'Failed to upload image');
        // Reset file input on failure
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload image');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeImage = () => {
    setFormData((prev) => ({ ...prev, image_url: null }));
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category_id) {
      toast.error('Please select a category');
      return;
    }

    if (!formData.base_price || Number(formData.base_price) <= 0) {
      toast.error('Price must be greater than ₱0');
      return;
    }

    // Clean up nutritional_info: remove keys with no value
    const cleanedNutrition = Object.fromEntries(
      Object.entries(formData.nutritional_info).filter(([, v]) => v != null && v !== '' && !isNaN(Number(v)))
        .map(([k, v]) => [k, Number(v)])
    );

    await onSubmit({
      ...formData,
      base_price: Number(formData.base_price),
      display_order: Number(formData.display_order),
      description: formData.description || null,
      allergens: formData.allergens.length > 0 ? formData.allergens : null,
      nutritional_info: Object.keys(cleanedNutrition).length > 0 ? cleanedNutrition : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Image Upload Section */}
      <div className="space-y-3">
        <Label htmlFor="image" className="text-sm font-medium">
          Menu Item Image
        </Label>

        {imagePreview ? (
          <div className="relative group">
            <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden border-2 border-slate-200">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-3 right-3 p-2 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              id="image"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageUpload}
              disabled={isUploadingImage}
              className="sr-only"
            />
            <label
              htmlFor="image"
              className="flex flex-col items-center justify-center aspect-video bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-slate-300 cursor-pointer hover:border-slate-400 hover:bg-slate-100 transition-all group"
            >
              <div className="flex flex-col items-center gap-2 text-slate-600">
                {isUploadingImage ? (
                  <>
                    <div className="animate-spin h-10 w-10 border-3 border-slate-300 border-t-amber-500 rounded-full" />
                    <span className="text-sm font-medium">Uploading...</span>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-white rounded-full shadow-sm group-hover:shadow-md transition-shadow">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-medium">Upload Image</span>
                    <span className="text-xs text-slate-500">
                      JPG, PNG or WebP (Max 5MB)
                    </span>
                  </>
                )}
              </div>
            </label>
          </div>
        )}
      </div>

      {/* Name & Slug Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Item Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            maxLength={100}
            placeholder="e.g., Chicken Adobo"
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
            onChange={(e) => {
              setSlugEdited(true);
              handleInputChange(e);
            }}
            required
            maxLength={100}
            placeholder="chicken-adobo"
            className="h-11 font-mono text-sm"
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          Description
        </Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description || ''}
          onChange={handleInputChange}
          maxLength={500}
          rows={3}
          placeholder="Describe your menu item..."
          className="resize-none"
        />
        <p className="text-xs text-slate-500 text-right">
          {formData.description?.length || 0}/500 characters
        </p>
      </div>

      {/* Category & Price Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category_id" className="text-sm font-medium">
            Category <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.category_id}
            onValueChange={(value: string) =>
              setFormData((prev) => ({ ...prev, category_id: value }))
            }
          >
            <SelectTrigger
              className={cn(
                'h-11',
                !formData.category_id && 'text-muted-foreground'
              )}
            >
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="base_price" className="text-sm font-medium">
            Price (₱) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="base_price"
            name="base_price"
            type="number"
            value={formData.base_price}
            onChange={handleInputChange}
            required
            min="0.01"
            step="0.01"
            placeholder="0.00"
            className="h-11"
          />
        </div>
      </div>

      {/* Display Order & Availability Row */}
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
          <Label className="text-sm font-medium">Availability</Label>
          <div className="flex items-center gap-4 h-11">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="is_available"
                checked={formData.is_available}
                onChange={() =>
                  setFormData((prev) => ({ ...prev, is_available: true }))
                }
                className="w-4 h-4 accent-green-600"
              />
              <span className="text-sm">Available</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="is_available"
                checked={!formData.is_available}
                onChange={() =>
                  setFormData((prev) => ({ ...prev, is_available: false }))
                }
                className="w-4 h-4 accent-red-600"
              />
              <span className="text-sm">Unavailable</span>
            </label>
          </div>
        </div>
      </div>

      {/* Allergens — collapsible */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setAllergensOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span>
            Allergens
            {formData.allergens.length > 0 && (
              <span className="ml-2 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                {formData.allergens.length} selected
              </span>
            )}
          </span>
          <ChevronDown
            className={cn('h-4 w-4 text-slate-400 transition-transform duration-200', allergensOpen && 'rotate-180')}
          />
        </button>
        {allergensOpen && (
          <div className="px-4 pb-4 pt-1 border-t border-slate-100">
            <div className="grid grid-cols-3 gap-3">
              {ALLERGEN_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-all',
                    formData.allergens.includes(option.value)
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={formData.allergens.includes(option.value)}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        allergens: e.target.checked
                          ? [...prev.allergens, option.value]
                          : prev.allergens.filter((a) => a !== option.value),
                      }));
                    }}
                    className="w-4 h-4 accent-amber-600"
                  />
                  <span className="text-base">{option.icon}</span>
                  <span className="text-sm font-medium">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Nutritional Info — collapsible */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setNutritionOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span>Nutritional Info (per serving)</span>
          <ChevronDown
            className={cn('h-4 w-4 text-slate-400 transition-transform duration-200', nutritionOpen && 'rotate-180')}
          />
        </button>
        {nutritionOpen && (
          <div className="px-4 pb-4 pt-1 border-t border-slate-100">
            <div className="grid grid-cols-3 gap-4">
              {NUTRITIONAL_FIELDS.map((field) => (
                <div key={field.key} className="space-y-1">
                  <label htmlFor={`nutrition-${field.key}`} className="text-xs text-slate-500">
                    {field.label} ({field.unit})
                  </label>
                  <Input
                    id={`nutrition-${field.key}`}
                    type="number"
                    min="0"
                    step={field.key === 'calories' ? '1' : '0.1'}
                    value={(formData.nutritional_info as Record<string, number | string>)[field.key] ?? ''}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        nutritional_info: {
                          ...prev.nutritional_info,
                          [field.key]: e.target.value === '' ? undefined : Number(e.target.value),
                        },
                      }));
                    }}
                    placeholder="0"
                    className="h-10"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button
          type="submit"
          disabled={isSubmitting || isUploadingImage}
          className="px-6 h-11 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              Saving...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}
