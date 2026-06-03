import { getStaffUsers } from '@/services/user-service';
import { UserTable } from '@/components/admin/user-table';
import { UserFormDialog } from '@/components/admin/user-form-dialog';
import { PageHeader } from '@/components/admin/page-header';
import { AlertCircle, Users, ShieldCheck, UtensilsCrossed, CreditCard } from 'lucide-react';
import { KpiCard } from '@/components/admin/kpi-card';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const result = await getStaffUsers();

  if (!result.success) {
    return (
      <div>
        <PageHeader title="Staff Users" description="Manage staff accounts and permissions." />
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load users</h2>
          <p className="text-gray-500">{result.error}</p>
        </div>
      </div>
    );
  }

  const users = result.data || [];

  return (
    <div>
      <PageHeader
        title="Staff Users"
        description="Manage staff accounts and permissions."
        actions={<UserFormDialog />}
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Total Staff"
          value={users.length.toString()}
          icon={Users}
          accentColor="amber"
        />
        <KpiCard
          label="Admins"
          value={users.filter((u) => u.role === 'admin').length.toString()}
          icon={ShieldCheck}
          accentColor="violet"
        />
        <KpiCard
          label="Cashiers"
          value={users.filter((u) => u.role === 'cashier').length.toString()}
          icon={CreditCard}
          accentColor="blue"
        />
        <KpiCard
          label="Kitchen"
          value={users.filter((u) => u.role === 'kitchen').length.toString()}
          icon={UtensilsCrossed}
          accentColor="green"
        />
      </div>

      <UserTable users={users} />
    </div>
  );
}
