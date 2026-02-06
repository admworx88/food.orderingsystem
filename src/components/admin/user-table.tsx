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
  Shield,
  ShieldCheck,
  ShieldX,
  UserCog,
  UserX,
  UserCheck,
  Key,
} from 'lucide-react';
import { toast } from 'sonner';
import { deactivateUser, reactivateUser } from '@/services/user-service';
import type { StaffUser } from '@/services/user-service';

interface UserTableProps {
  users: StaffUser[];
}

function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (role) {
    case 'admin':
      return 'destructive';
    case 'cashier':
      return 'default';
    case 'kitchen':
      return 'secondary';
    default:
      return 'outline';
  }
}

function getRoleIcon(role: string) {
  switch (role) {
    case 'admin':
      return <ShieldCheck className="h-3 w-3" />;
    case 'cashier':
      return <Shield className="h-3 w-3" />;
    case 'kitchen':
      return <ShieldX className="h-3 w-3" />;
    default:
      return null;
  }
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
      <div className="text-center py-12 text-slate-500">
        <UserCog className="h-12 w-12 mx-auto mb-4 text-slate-300" />
        <p className="text-lg font-medium">No staff users yet</p>
        <p className="text-sm">Create your first staff user to get started</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-center">PIN</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="w-[70px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow
              key={user.id}
              className={`hover:bg-slate-50 ${!user.is_active ? 'opacity-60' : ''}`}
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
                <Badge
                  variant={getRoleBadgeVariant(user.role)}
                  className="gap-1 capitalize"
                >
                  {getRoleIcon(user.role)}
                  {user.role}
                </Badge>
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
                <Badge variant={user.is_active ? 'default' : 'secondary'}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
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
                    <DropdownMenuItem>
                      <UserCog className="h-4 w-4 mr-2" />
                      Edit User
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Key className="h-4 w-4 mr-2" />
                      Reset PIN
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleToggleActive(user)}
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
  );
}
