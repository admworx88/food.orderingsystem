'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  Tag,
  BarChart3,
  Users,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { signOut } from '@/services/auth-service';
import { useState, useEffect } from 'react';
import type { UserProfile } from '@/types/auth';

const navGroups = [
  {
    label: 'Main',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/admin/menu-management', label: 'Menu', icon: UtensilsCrossed, exact: false },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/admin/order-history', label: 'Orders', icon: ClipboardList, exact: false },
      { href: '/admin/promo-codes', label: 'Promos', icon: Tag, exact: false },
      { href: '/admin/reports', label: 'Reports', icon: BarChart3, exact: false },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users, exact: false },
      { href: '/admin/audit-log', label: 'Audit Log', icon: FileText, exact: false },
      { href: '/admin/settings', label: 'Settings', icon: Settings, exact: false },
    ],
  },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const roleLabel: Record<string, string> = {
  admin: 'Administrator',
  cashier: 'Cashier',
  kitchen: 'Kitchen Staff',
  waiter: 'Waiter',
  kiosk: 'Kiosk',
};

export function AdminLayoutClient({
  children,
  user,
}: Readonly<{ children: React.ReactNode; user: UserProfile | null }>) {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    try {
      setIsLoggingOut(true);
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out. Please try again.');
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile overlay backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col',
          'transition-transform duration-300 ease-in-out motion-reduce:transition-none',
          'lg:w-60 lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Sidebar navigation"
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg overflow-hidden shrink-0 bg-amber-500/20">
              <Image
                src="/arenalogo.png"
                alt="Arena Blanca"
                width={32}
                height={32}
                className="h-8 w-8 object-cover"
                priority
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate leading-tight">Arena Blanca</p>
              <p className="text-[10px] text-slate-400 leading-tight">Admin Dashboard</p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto" aria-label="Main navigation">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500 select-none">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      className={cn(
                        'group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                        isActive
                          ? 'bg-amber-500/[0.12] text-white'
                          : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute left-0 top-2 bottom-2 w-0.5 rounded-r bg-amber-500 transition-opacity duration-150',
                          isActive ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-colors',
                          isActive ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'
                        )}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="px-3 py-4 border-t border-slate-800 space-y-1">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
              <div className="h-8 w-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-amber-400">{getInitials(user.fullName)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-200 truncate">{user.fullName}</p>
                <p className="text-[10px] text-slate-500 truncate">{roleLabel[user.role] ?? user.role}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-3 px-3 py-2 rounded-lg w-full text-sm font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>{isLoggingOut ? 'Logging out…' : 'Logout'}</span>
          </button>
        </div>
      </aside>

      {/* Main content — offset for fixed sidebar on lg+ */}
      <div className="lg:ml-60 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 lg:hidden bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 -ml-1 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded overflow-hidden bg-amber-500/20 shrink-0">
              <Image
                src="/arenalogo.png"
                alt="Arena Blanca"
                width={24}
                height={24}
                className="h-6 w-6 object-cover"
              />
            </div>
            <span className="font-semibold text-slate-900 text-sm">Arena Blanca</span>
          </div>
        </header>

        <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
