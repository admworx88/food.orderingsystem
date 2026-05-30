'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UtensilsCrossed, ClipboardList, CreditCard, BellRing, MonitorCheck, type LucideIcon } from 'lucide-react';
import { useStaffSessionStore } from '@/stores/staff-session-store';
import { EmployeePinDialog } from '@/components/kiosk/employee-pin-dialog';
import { cn } from '@/lib/utils';

type NavItem = { icon: LucideIcon; label: string; href: string };

const ALL_NAV_ITEMS: NavItem[] = [
  { icon: UtensilsCrossed, label: 'Menu',     href: '/menu' },
  { icon: ClipboardList,   label: 'Orders',   href: '/service' },
  { icon: CreditCard,      label: 'Payments', href: '/menu?view=payments' },
];

const KDS_NAV_ITEM: NavItem = { icon: MonitorCheck, label: 'KDS', href: '/orders' };

function getNavItems(role: string | undefined): NavItem[] {
  if (!role) return [ALL_NAV_ITEMS[0], ALL_NAV_ITEMS[2]];
  if (role === 'kitchen') return [ALL_NAV_ITEMS[0], KDS_NAV_ITEM, ALL_NAV_ITEMS[2]]; // Menu, KDS, Payments
  if (role === 'waiter') return ALL_NAV_ITEMS.slice(0, 2);
  if (role === 'cashier' || role === 'admin') return ALL_NAV_ITEMS;
  return [ALL_NAV_ITEMS[0]];
}

interface KioskNavSidebarProps {
  activeLabel?: string;
  onNavClick?: (label: string) => void;
}

export function KioskNavSidebar({ activeLabel, onNavClick }: KioskNavSidebarProps) {
  const router = useRouter();
  const session = useStaffSessionStore((s) => s.session);
  const staffName = session?.full_name;
  const navItems = getNavItems(session?.role);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);

  return (
    <nav
      className="w-[76px] flex-shrink-0 flex flex-col items-center pt-3 pb-3"
      style={{ background: '#1A3D2B' }}
    >
      <div className="flex flex-col items-center gap-1 w-full px-2">
        {navItems.map(({ icon: Icon, label, href }) => {
          const isActive = label === activeLabel;
          return (
            <button
              key={label}
              onClick={() => href === '/orders' ? router.push(href) : (onNavClick ? onNavClick(label) : router.push(href))}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 w-full py-2.5 rounded-xl transition-all duration-200 cursor-pointer',
                isActive ? 'bg-white/[0.13]' : 'hover:bg-white/[0.06] active:bg-white/[0.10]'
              )}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-orange-400 rounded-r-full" />
              )}
              <Icon
                className={cn('w-5 h-5 transition-colors duration-200', isActive ? 'text-orange-400' : 'text-white/70')}
                strokeWidth={isActive ? 2 : 1.75}
              />
              <span className={cn(
                'text-[9px] font-semibold leading-none tracking-wide transition-colors duration-200',
                isActive ? 'text-orange-400' : 'text-white/55'
              )}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex-1" />
      <div className="w-8 h-px bg-white/[0.12] mb-2" />

      <div className="w-full px-2">
        <button
          onClick={() => setPinDialogOpen(true)}
          title={staffName ? 'Change staff PIN' : 'Staff sign-in'}
          className="flex flex-col items-center justify-center gap-1 w-full py-2.5 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors duration-150"
        >
          <BellRing className="w-5 h-5 text-white/55" strokeWidth={1.75} />
          {staffName ? (
            <span className="text-[9px] font-semibold leading-none text-orange-400 tracking-wide whitespace-nowrap max-w-[52px] truncate">
              {staffName.split(' ')[0]}
            </span>
          ) : (
            <span className="text-[9px] font-semibold leading-none text-white/40 tracking-wide whitespace-nowrap">
              Staff
            </span>
          )}
        </button>
      </div>

      <EmployeePinDialog
        open={pinDialogOpen}
        onOpenChange={setPinDialogOpen}
        kioskType="restaurant"
      />
    </nav>
  );
}
