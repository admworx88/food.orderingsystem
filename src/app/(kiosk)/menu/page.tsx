import { createServerClient } from '@/lib/supabase/server';
import { MenuGrid } from '@/components/kiosk/menu-grid';

export default async function KioskMenuPage() {
  const supabase = await createServerClient();

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('*, category:categories(id, name)')
    .eq('is_available', true)
    .is('deleted_at', null)
    .order('display_order');

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Menu</h2>
      <MenuGrid categories={categories || []} menuItems={menuItems || []} />
    </div>
  );
}
