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
} from 'lucide-react';
import { toast } from 'sonner';
import { signOut } from '@/services/auth-service';
import { useState } from 'react';
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
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-60 min-h-screen bg-slate-900 text-white flex flex-col shrink-0 fixed inset-y-0 left-0 z-30">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800">
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
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
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
                      {/* Active indicator */}
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
            className="flex items-center gap-3 px-3 py-2 rounded-lg w-full text-sm font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>{isLoggingOut ? 'Logging out…' : 'Logout'}</span>
          </button>
        </div>
      </aside>

      {/* Main content — offset for fixed sidebar */}
      <main className="flex-1 ml-60 min-h-screen">
        <div className="max-w-[1400px] mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
