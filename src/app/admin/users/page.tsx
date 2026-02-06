import { getStaffUsers } from '@/services/user-service';
import { UserTable } from '@/components/admin/user-table';
import { UserFormDialog } from '@/components/admin/user-form-dialog';
import { AlertCircle, Users } from 'lucide-react';

export default async function UsersPage() {
  const result = await getStaffUsers();

  if (!result.success) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Staff Users
          </h1>
          <p className="text-slate-600 mt-1">
            Manage staff accounts and permissions
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Failed to load users
          </h2>
          <p className="text-gray-500">{result.error}</p>
        </div>
      </div>
    );
  }

  const users = result.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Staff Users
          </h1>
          <p className="text-slate-600 mt-1">
            Manage staff accounts and permissions
          </p>
        </div>
        <UserFormDialog />
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold admin-data text-slate-900">{users.length}</p>
              <p className="text-xs text-slate-500 font-medium">Total Users</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <span className="text-slate-600 font-semibold text-sm">A</span>
            </div>
            <div>
              <p className="text-2xl font-bold admin-data text-slate-900">
                {users.filter((u) => u.role === 'admin').length}
              </p>
              <p className="text-xs text-slate-500 font-medium">Admins</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <span className="text-emerald-600 font-semibold text-sm">C</span>
            </div>
            <div>
              <p className="text-2xl font-bold admin-data text-slate-900">
                {users.filter((u) => u.role === 'cashier').length}
              </p>
              <p className="text-xs text-slate-500 font-medium">Cashiers</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <span className="text-amber-600 font-semibold text-sm">K</span>
            </div>
            <div>
              <p className="text-2xl font-bold admin-data text-slate-900">
                {users.filter((u) => u.role === 'kitchen').length}
              </p>
              <p className="text-xs text-slate-500 font-medium">Kitchen</p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border">
        <UserTable users={users} />
      </div>
    </div>
  );
}
