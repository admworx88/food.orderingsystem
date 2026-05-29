import { createServerClient } from '@/lib/supabase/server';
import { KioskPosLayout } from '@/components/kiosk/kiosk-pos-layout';

export default async function KioskMenuPage() {
  const supabase = await createServerClient();

  const [{ data: categories }, { data: menuItems }] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order'),
    supabase
      .from('menu_items')
      .select('*, category:categories(id, name)')
      .eq('is_available', true)
      .is('deleted_at', null)
      .order('display_order'),
  ]);

  return (
    <div className="h-full">
      <KioskPosLayout categories={categories || []} menuItems={menuItems || []} />
    </div>
  );
}
