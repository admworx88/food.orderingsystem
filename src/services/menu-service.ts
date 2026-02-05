'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { menuItemSchema, type MenuItemInput } from '@/lib/validators/menu-item';
import { categorySchema, type CategoryInput } from '@/lib/validators/category';
import type { Database } from '@/lib/supabase/types';

type Category = Database['public']['Tables']['categories']['Row'];
type MenuItem = Database['public']['Tables']['menu_items']['Row'];
type MenuItemWithCategory = MenuItem & {
  category: { id: string; name: string } | null;
};

// UUID validation helper
const uuidSchema = z.string().uuid('Invalid ID format');

function validateId(id: string): { valid: true } | { valid: false; error: string } {
  const result = uuidSchema.safeParse(id);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: result.error.issues[0]?.message || 'Invalid ID' };
}

// Service result types
type ServiceSuccess<T> = {
  success: true;
  data: T;
};

type ServiceError = {
  success: false;
  error: string;
  validationErrors?: Record<string, string[]>;
};

type ServiceResult<T> = ServiceSuccess<T> | ServiceError;

export async function getCategories(): Promise<ServiceResult<Category[]>> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (error) {
    console.error('getCategories failed:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data || [] };
}

export async function getMenuItems(): Promise<ServiceResult<MenuItemWithCategory[]>> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('menu_items')
    .select('*, category:categories(id, name)')
    .is('deleted_at', null)
    .order('display_order');

  if (error) {
    console.error('getMenuItems failed:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: (data || []) as MenuItemWithCategory[] };
}

export async function createMenuItem(input: MenuItemInput): Promise<ServiceResult<MenuItem>> {
  try {
    const validated = menuItemSchema.parse(input);
    const supabase = await createServerClient();

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('menu_items')
      .select('id')
      .eq('slug', validated.slug)
      .is('deleted_at', null)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'A menu item with this URL slug already exists' };
    }

    const { data, error } = await supabase
      .from('menu_items')
      .insert(validated)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/menu-management');
    revalidatePath('/menu');
    return { success: true, data };
  } catch (error) {
    console.error('createMenuItem failed:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation failed',
        validationErrors: error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create menu item',
    };
  }
}

export async function updateMenuItem(id: string, input: MenuItemInput): Promise<ServiceResult<MenuItem>> {
  try {
    // Validate ID
    const idValidation = validateId(id);
    if (!idValidation.valid) {
      return { success: false, error: idValidation.error };
    }

    const validated = menuItemSchema.parse(input);
    const supabase = await createServerClient();

    // Check slug uniqueness (excluding current item)
    const { data: existing } = await supabase
      .from('menu_items')
      .select('id')
      .eq('slug', validated.slug)
      .neq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'A menu item with this URL slug already exists' };
    }

    const { data, error } = await supabase
      .from('menu_items')
      .update(validated)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/menu-management');
    revalidatePath('/menu');
    return { success: true, data };
  } catch (error) {
    console.error('updateMenuItem failed:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation failed',
        validationErrors: error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update menu item',
    };
  }
}

export async function deleteMenuItem(id: string): Promise<ServiceResult<null>> {
  try {
    // Validate ID
    const idValidation = validateId(id);
    if (!idValidation.valid) {
      return { success: false, error: idValidation.error };
    }

    const supabase = await createServerClient();

    // Soft delete by setting deleted_at timestamp
    const { error } = await supabase
      .from('menu_items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/menu-management');
    revalidatePath('/menu');
    return { success: true, data: null };
  } catch (error) {
    console.error('deleteMenuItem failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete menu item',
    };
  }
}

export async function createCategory(input: CategoryInput): Promise<ServiceResult<Category>> {
  try {
    const validated = categorySchema.parse(input);
    const supabase = await createServerClient();

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', validated.slug)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'A category with this URL slug already exists' };
    }

    const { data, error } = await supabase
      .from('categories')
      .insert(validated)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/menu-management');
    revalidatePath('/menu');
    return { success: true, data };
  } catch (error) {
    console.error('createCategory failed:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation failed',
        validationErrors: error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create category',
    };
  }
}

export async function updateCategory(id: string, input: CategoryInput): Promise<ServiceResult<Category>> {
  try {
    // Validate ID
    const idValidation = validateId(id);
    if (!idValidation.valid) {
      return { success: false, error: idValidation.error };
    }

    const validated = categorySchema.parse(input);
    const supabase = await createServerClient();

    // Check slug uniqueness (excluding current category)
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', validated.slug)
      .neq('id', id)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'A category with this URL slug already exists' };
    }

    const { data, error } = await supabase
      .from('categories')
      .update(validated)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/menu-management');
    revalidatePath('/menu');
    return { success: true, data };
  } catch (error) {
    console.error('updateCategory failed:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation failed',
        validationErrors: error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update category',
    };
  }
}

export async function deleteCategory(id: string): Promise<ServiceResult<null>> {
  try {
    // Validate ID
    const idValidation = validateId(id);
    if (!idValidation.valid) {
      return { success: false, error: idValidation.error };
    }

    const supabase = await createServerClient();

    // Check for associated menu items
    const { count, error: countError } = await supabase
      .from('menu_items')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id)
      .is('deleted_at', null);

    if (countError) throw countError;

    if (count && count > 0) {
      return {
        success: false,
        error: `Cannot delete category with ${count} associated menu item${count > 1 ? 's' : ''}. Remove or reassign items first.`,
      };
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/menu-management');
    revalidatePath('/menu');
    return { success: true, data: null };
  } catch (error) {
    console.error('deleteCategory failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete category',
    };
  }
}

/**
 * Get all soft-deleted menu items
 */
export async function getDeletedMenuItems(): Promise<ServiceResult<MenuItemWithCategory[]>> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('menu_items')
    .select('*, category:categories(id, name)')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) {
    console.error('getDeletedMenuItems failed:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: (data || []) as MenuItemWithCategory[] };
}

/**
 * Restore a soft-deleted menu item
 */
export async function restoreMenuItem(id: string): Promise<ServiceResult<MenuItem>> {
  try {
    const idValidation = validateId(id);
    if (!idValidation.valid) {
      return { success: false, error: idValidation.error };
    }

    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('menu_items')
      .update({ deleted_at: null })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/menu-management');
    revalidatePath('/menu');
    return { success: true, data };
  } catch (error) {
    console.error('restoreMenuItem failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore menu item',
    };
  }
}

/**
 * Toggle menu item availability (optimistic UI support)
 */
export async function toggleMenuItemAvailability(
  id: string,
  isAvailable: boolean
): Promise<ServiceResult<MenuItem>> {
  try {
    const idValidation = validateId(id);
    if (!idValidation.valid) {
      return { success: false, error: idValidation.error };
    }

    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('menu_items')
      .update({ is_available: isAvailable })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/menu-management');
    revalidatePath('/menu');
    return { success: true, data };
  } catch (error) {
    console.error('toggleMenuItemAvailability failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update availability',
    };
  }
}

/**
 * Reorder categories by updating display_order
 */
export async function reorderCategories(
  orderedIds: string[]
): Promise<ServiceResult<null>> {
  try {
    // Validate all IDs
    for (const id of orderedIds) {
      const idValidation = validateId(id);
      if (!idValidation.valid) {
        return { success: false, error: `Invalid ID: ${idValidation.error}` };
      }
    }

    const supabase = await createServerClient();

    // Update each category's display_order
    const updates = orderedIds.map((id, index) =>
      supabase
        .from('categories')
        .update({ display_order: index })
        .eq('id', id)
    );

    const results = await Promise.all(updates);

    // Check for errors
    const failedUpdate = results.find((r) => r.error);
    if (failedUpdate?.error) {
      throw failedUpdate.error;
    }

    revalidatePath('/menu-management');
    revalidatePath('/menu');
    return { success: true, data: null };
  } catch (error) {
    console.error('reorderCategories failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reorder categories',
    };
  }
}

/**
 * Reorder menu items by updating display_order
 */
export async function reorderMenuItems(
  orderedIds: string[]
): Promise<ServiceResult<null>> {
  try {
    // Validate all IDs
    for (const id of orderedIds) {
      const idValidation = validateId(id);
      if (!idValidation.valid) {
        return { success: false, error: `Invalid ID: ${idValidation.error}` };
      }
    }

    const supabase = await createServerClient();

    // Update each item's display_order
    const updates = orderedIds.map((id, index) =>
      supabase
        .from('menu_items')
        .update({ display_order: index })
        .eq('id', id)
    );

    const results = await Promise.all(updates);

    // Check for errors
    const failedUpdate = results.find((r) => r.error);
    if (failedUpdate?.error) {
      throw failedUpdate.error;
    }

    revalidatePath('/menu-management');
    revalidatePath('/menu');
    return { success: true, data: null };
  } catch (error) {
    console.error('reorderMenuItems failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reorder menu items',
    };
  }
}

export async function uploadMenuImage(formData: FormData): Promise<ServiceResult<{ url: string }>> {
  try {
    const file = formData.get('file') as File | null;
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return { success: false, error: 'Invalid file type. Use JPG, PNG, or WebP.' };
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return { success: false, error: 'File too large. Max size is 2MB.' };
    }

    const supabase = await createServerClient();
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `menu-items/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('menu-images')
      .getPublicUrl(filePath);

    return { success: true, data: { url: publicUrl } };
  } catch (error) {
    console.error('uploadMenuImage failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload image',
    };
  }
}
