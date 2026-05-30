'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  UserCog,
  UserX,
  UserCheck,
  Key,
} from 'lucide-react';
import { toast } from 'sonner';
import { deactivateUser, reactivateUser } from '@/services/user-service';
import type { StaffUser } from '@/services/user-service';
import { DataCard } from '@/components/admin/data-card';
import { EmptyState } from '@/components/admin/empty-state';
import { StatusBadge } from '@/components/admin/status-badge';
import { ResetPinDialog } from '@/components/admin/reset-pin-dialog';
import { EditUserDialog } from '@/components/admin/edit-user-dialog';
import { cn } from '@/lib/utils';

interface UserTableProps {
  users: StaffUser[];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function UserTable({ users }: UserTableProps) {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [pinDialogUser, setPinDialogUser] = useState<StaffUser | null>(null);
  const [editDialogUser, setEditDialogUser] = useState<StaffUser | null>(null);

  const handleToggleActive = async (user: StaffUser) => {
    const action = user.is_active ? deactivateUser : reactivateUser;
    const actionName = user.is_active ? 'deactivate' : 'reactivate';

    setLoadingStates((prev) => ({ ...prev, [user.id]: true }));

    try {
      const result = await action(user.id);
      if (result.success) {
        toast.success(`User ${actionName}d successfully`);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error(`Failed to ${actionName} user`);
    } finally {
      setLoadingStates((prev) => ({ ...prev, [user.id]: false }));
    }
  };

  if (users.length === 0) {
    return (
      <DataCard padding="none">
        <EmptyState
          icon={UserCog}
          title="No staff users yet"
          description="Create your first staff user to get started."
          className="py-14"
        />
      </DataCard>
    );
  }

  return (
    <>
    <DataCard padding="none">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">User</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400">Role</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-center">PIN</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-center">Status</TableHead>
              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow
                key={user.id}
                className={cn('hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0', !user.is_active ? 'opacity-60' : '')}
              >
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar_url || undefined} alt={user.full_name} />
                    <AvatarFallback className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                      {getInitials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user.full_name}</span>
                </div>
              </TableCell>
              <TableCell className="text-slate-500">{user.email || '-'}</TableCell>
              <TableCell>
                <StatusBadge status={user.role} />
              </TableCell>
              <TableCell className="text-center">
                {user.pin_hash ? (
                  <Badge variant="outline" className="gap-1">
                    <Key className="h-3 w-3" />
                    Set
                  </Badge>
                ) : (
                  <span className="text-slate-400 text-sm">-</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                <StatusBadge status={user.is_active ? 'active' : 'inactive'} dot />
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={loadingStates[user.id]}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {/* onSelect fires after the dropdown starts closing — avoids Radix focus conflict with Dialog */}
                    <DropdownMenuItem onSelect={() => setEditDialogUser(user)}>
                      <UserCog className="h-4 w-4 mr-2" />
                      Edit User
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setPinDialogUser(user)}>
                      <Key className="h-4 w-4 mr-2" />
                      Reset PIN
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => handleToggleActive(user)}
                      className={user.is_active ? 'text-rose-600' : 'text-green-600'}
                    >
                      {user.is_active ? (
                        <>
                          <UserX className="h-4 w-4 mr-2" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4 mr-2" />
                          Reactivate
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          </TableBody>
        </Table>
      </div>
    </DataCard>

    {pinDialogUser && (
      <ResetPinDialog
        open={!!pinDialogUser}
        onOpenChange={(open) => { if (!open) setPinDialogUser(null); }}
        userId={pinDialogUser.id}
        userName={pinDialogUser.full_name}
        hasPin={!!pinDialogUser.pin_hash}
      />
    )}

    {editDialogUser && (
      <EditUserDialog
        open={!!editDialogUser}
        onOpenChange={(open) => { if (!open) setEditDialogUser(null); }}
        user={editDialogUser}
      />
    )}
    </>
  );
}
