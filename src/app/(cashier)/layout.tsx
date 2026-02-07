import { AuthGuard } from '@/components/auth/auth-guard';

export default function CashierLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthGuard allowedRoles={['cashier', 'admin']}>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-blue-600 text-white">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold">Point of Sale</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
