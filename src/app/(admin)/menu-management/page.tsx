import { getCategories, getMenuItems, getDeletedMenuItems } from '@/services/menu-service';
import { MenuManagementTabs } from '@/components/admin/menu-management-tabs';
import { AlertCircle } from 'lucide-react';

export default async function MenuManagementPage() {
  const [categoriesResult, menuItemsResult, deletedItemsResult] = await Promise.all([
    getCategories(),
    getMenuItems(),
    getDeletedMenuItems(),
  ]);

  if (!categoriesResult.success || !menuItemsResult.success || !deletedItemsResult.success) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Menu Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your restaurant&apos;s menu items and categories
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Failed to load menu data
          </h2>
          <p className="text-gray-500">
            {!categoriesResult.success && categoriesResult.error}
            {!menuItemsResult.success && menuItemsResult.error}
            {!deletedItemsResult.success && deletedItemsResult.error}
          </p>
        </div>
      </div>
    );
  }

  const categories = categoriesResult.data || [];
  const menuItems = menuItemsResult.data || [];
  const deletedItems = deletedItemsResult.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Menu Management
        </h1>
        <p className="text-gray-600 mt-1">
          Manage your restaurant&apos;s menu items and categories
        </p>
      </div>

      {/* Tabbed Content */}
      <MenuManagementTabs
        categories={categories}
        menuItems={menuItems}
        deletedItems={deletedItems}
      />
    </div>
  );
}
