'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, UtensilsCrossed, ClipboardList, Users, Settings, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { signOut } from '@/services/auth-service';
import { useState } from 'react';

const navItems = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/admin/menu-management',
    label: 'Menu',
    icon: UtensilsCrossed,
  },
  {
    href: '/admin/order-history',
    label: 'Orders',
    icon: ClipboardList,
  },
  {
    href: '/admin/users',
    label: 'Users',
    icon: Users,
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    icon: Settings,
  },
];

export function AdminLayoutClient({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      await signOut();
      // signOut() handles redirect to /login
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out. Please try again.');
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <aside className="w-64 min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white p-6 flex flex-col border-r border-slate-700/50 relative">
          {/* Subtle gradient border accent */}
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-amber-500/20 to-transparent" />

          <div className="mb-8">
            <h1 className="text-xl font-bold bg-gradient-to-r from-white via-amber-100 to-amber-200 bg-clip-text text-transparent">
              OrderFlow Admin
            </h1>
            <p className="text-xs text-slate-400 mt-1">Restaurant Management</p>
          </div>

          <nav className="space-y-1 flex-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/admin' && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative group',
                    isActive
                      ? 'bg-amber-500/10 text-white border-l-4 border-amber-500 -ml-6 pl-8 shadow-lg shadow-amber-500/10'
                      : 'text-slate-400 hover:bg-slate-700/30 hover:text-white'
                  )}
                >
                  <Icon className={cn(
                    'h-5 w-5 transition-transform',
                    isActive ? 'text-amber-500' : 'group-hover:scale-110'
                  )} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-4 border-t border-slate-700/50">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <span className="font-medium">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 p-8 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
