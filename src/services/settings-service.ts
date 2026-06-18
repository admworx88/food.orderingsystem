'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Database } from '@/lib/supabase/types';

type Json = Database['public']['Tables']['settings']['Row']['value'];
type BirConfig = Database['public']['Tables']['bir_receipt_config']['Row'];
type BirConfigUpdate = Database['public']['Tables']['bir_receipt_config']['Update'];

type ServiceResult<T> = { success: true; data: T } | { success: false; error: string };

export async function getAllSettings(): Promise<ServiceResult<Record<string, Json>>> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.from('settings').select('key, value');
    if (error) throw error;
    const map: Record<string, Json> = {};
    (data || []).forEach((row) => {
      map[row.key] = row.value;
    });
    return { success: true, data: map };
  } catch (error) {
    console.error('getAllSettings failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch settings',
    };
  }
}

export async function updateSettings(
  updates: Record<string, Json>
): Promise<ServiceResult<null>> {
  try {
    const supabase = await createServerClient();
    const results = await Promise.all(
      Object.entries(updates).map(([key, value]) =>
        supabase.from('settings').upsert({ key, value }, { onConflict: 'key' })
      )
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw failed.error;
    revalidatePath('/admin/settings');
    return { success: true, data: null };
  } catch (error) {
    console.error('updateSettings failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update settings',
    };
  }
}

export async function getBirConfig(): Promise<ServiceResult<BirConfig | null>> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('bir_receipt_config')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('getBirConfig failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch BIR config',
    };
  }
}

export async function updateBirConfig(
  id: string,
  data: BirConfigUpdate
): Promise<ServiceResult<null>> {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from('bir_receipt_config').update(data).eq('id', id);
    if (error) throw error;
    revalidatePath('/admin/settings');
    return { success: true, data: null };
  } catch (error) {
    console.error('updateBirConfig failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update BIR config',
    };
  }
}

export async function getKioskRates(): Promise<{ taxRate: number; serviceChargeRate: number }> {
  const result = await getAllSettings();
  if (!result.success) return { taxRate: 0, serviceChargeRate: 0 };
  const taxRate = typeof result.data.tax_rate === 'number' ? result.data.tax_rate : 0;
  const serviceChargeRate = typeof result.data.service_charge === 'number' ? result.data.service_charge : 0;
  return { taxRate, serviceChargeRate };
}

export async function validateKioskPin(pin: string): Promise<{ success: boolean }> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'kiosk_pin')
      .maybeSingle();
    if (error) throw error;
    const storedPin = String(data?.value ?? '1234').trim();
    return { success: pin.trim() === storedPin };
  } catch (error) {
    console.error('validateKioskPin failed:', error);
    return { success: false };
  }
}

export async function getKioskPin(): Promise<ServiceResult<string>> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'kiosk_pin')
      .maybeSingle();
    if (error) throw error;
    const pin = String(data?.value ?? '1234').trim();
    return { success: true, data: pin };
  } catch (error) {
    console.error('getKioskPin failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch kiosk PIN',
    };
  }
}

export async function updateKioskPin(pin: string): Promise<ServiceResult<null>> {
  if (!/^\d{4}$/.test(pin)) {
    return { success: false, error: 'PIN must be exactly 4 digits' };
  }
  const result = await updateSettings({ kiosk_pin: pin });
  if (!result.success) return result;
  revalidatePath('/admin/settings');
  return { success: true, data: null };
}
