'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { promoCodeSchema, type PromoCodeInput } from '@/lib/validators/promo-code';
import type { Database } from '@/lib/supabase/types';

type PromoCode = Database['public']['Tables']['promo_codes']['Row'];

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

const uuidSchema = z.string().uuid('Invalid ID format');

function validateId(id: string): { valid: true } | { valid: false; error: string } {
  const result = uuidSchema.safeParse(id);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: result.error.issues[0]?.message || 'Invalid ID' };
}

export interface PromoCodeFilters {
  search?: string;
  status?: 'all' | 'active' | 'expired' | 'depleted';
}

export async function getPromoCodes(
  filters?: PromoCodeFilters
): Promise<ServiceResult<PromoCode[]>> {
  const supabase = await createServerClient();
  let query = supabase.from('promo_codes').select('*').order('created_at', { ascending: false });

  if (filters?.search) {
    query = query.ilike('code', `%${filters.search}%`);
  }

  if (filters?.status === 'active') {
    const now = new Date().toISOString();
    query = query
      .eq('is_active', true)
      .lte('valid_from', now)
      .gte('valid_until', now);
  } else if (filters?.status === 'expired') {
    const now = new Date().toISOString();
    query = query.lt('valid_until', now);
  }
  // 'depleted' is filtered client-side since it requires comparing current_usage_count >= max_usage_count

  const { data, error } = await query;

  if (error) {
    console.error('getPromoCodes failed:', error);
    return { success: false, error: error.message };
  }

  let filtered = data || [];

  if (filters?.status === 'depleted') {
    filtered = filtered.filter(
      (p) => p.max_usage_count !== null && (p.current_usage_count ?? 0) >= p.max_usage_count
    );
  }

  return { success: true, data: filtered };
}

export async function createPromoCode(
  input: PromoCodeInput
): Promise<ServiceResult<PromoCode>> {
  try {
    const validated = promoCodeSchema.parse(input);
    const supabase = await createServerClient();

    // Check code uniqueness
    const { data: existing } = await supabase
      .from('promo_codes')
      .select('id')
      .eq('code', validated.code)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'A promo code with this code already exists (E5001)' };
    }

    const { data, error } = await supabase
      .from('promo_codes')
      .insert({
        code: validated.code,
        discount_type: validated.discount_type,
        discount_value: validated.discount_value,
        valid_from: validated.valid_from,
        valid_until: validated.valid_until,
        max_usage_count: validated.max_usage_count ?? null,
        min_order_amount: validated.min_order_amount ?? null,
        description: validated.description ?? null,
        is_active: validated.is_active,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/admin/promo-codes');
    return { success: true, data };
  } catch (error) {
    console.error('createPromoCode failed:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation failed',
        validationErrors: error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create promo code',
    };
  }
}

export async function updatePromoCode(
  id: string,
  input: PromoCodeInput
): Promise<ServiceResult<PromoCode>> {
  try {
    const idValidation = validateId(id);
    if (!idValidation.valid) {
      return { success: false, error: idValidation.error };
    }

    const validated = promoCodeSchema.parse(input);
    const supabase = await createServerClient();

    // Check code uniqueness (excluding current)
    const { data: existing } = await supabase
      .from('promo_codes')
      .select('id')
      .eq('code', validated.code)
      .neq('id', id)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'A promo code with this code already exists (E5001)' };
    }

    const { data, error } = await supabase
      .from('promo_codes')
      .update({
        code: validated.code,
        discount_type: validated.discount_type,
        discount_value: validated.discount_value,
        valid_from: validated.valid_from,
        valid_until: validated.valid_until,
        max_usage_count: validated.max_usage_count ?? null,
        min_order_amount: validated.min_order_amount ?? null,
        description: validated.description ?? null,
        is_active: validated.is_active,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/admin/promo-codes');
    return { success: true, data };
  } catch (error) {
    console.error('updatePromoCode failed:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation failed',
        validationErrors: error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update promo code',
    };
  }
}

export async function togglePromoCodeStatus(id: string): Promise<ServiceResult<PromoCode>> {
  try {
    const idValidation = validateId(id);
    if (!idValidation.valid) {
      return { success: false, error: idValidation.error };
    }

    const supabase = await createServerClient();

    // Fetch current status
    const { data: current, error: fetchError } = await supabase
      .from('promo_codes')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from('promo_codes')
      .update({ is_active: !current.is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/admin/promo-codes');
    return { success: true, data };
  } catch (error) {
    console.error('togglePromoCodeStatus failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle promo code status',
    };
  }
}

export async function deletePromoCode(id: string): Promise<ServiceResult<null>> {
  try {
    const idValidation = validateId(id);
    if (!idValidation.valid) {
      return { success: false, error: idValidation.error };
    }

    const supabase = await createServerClient();

    const { error } = await supabase
      .from('promo_codes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/admin/promo-codes');
    return { success: true, data: null };
  } catch (error) {
    console.error('deletePromoCode failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete promo code',
    };
  }
}
