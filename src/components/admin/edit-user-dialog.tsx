'use client';

import { useState, useEffect } from 'react';
import { UserCog, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { updateStaffUser } from '@/services/user-service';
import type { StaffUser } from '@/services/user-service';

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: StaffUser;
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'waiter', label: 'Waiter' },
] as const;

export function EditUserDialog({ open, onOpenChange, user }: EditUserDialogProps) {
  const [fullName, setFullName] = useState(user.full_name);
  const [role, setRole] = useState(user.role);
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (open) {
      setFullName(user.full_name);
      setRole(user.role);
      setNameError('');
    }
  }, [open, user]);

  const handleSave = async () => {
    if (fullName.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      return;
    }

    setLoading(true);
    try {
      const result = await updateStaffUser(user.id, { full_name: fullName, role });
      if (result.success) {
        toast.success('User updated successfully');
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = fullName.trim() !== user.full_name || role !== user.role;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <UserCog className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-slate-900 leading-tight">
                Edit User
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                {user.email || user.full_name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-full-name" className="text-xs font-medium text-slate-700">
              Full Name
            </Label>
            <Input
              id="edit-full-name"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (nameError) setNameError('');
              }}
              placeholder="Enter full name"
              className={nameError ? 'border-red-400' : ''}
              disabled={loading}
            />
            {nameError && (
              <p className="text-xs text-red-500">{nameError}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Role</Label>
            <Select
              value={role}
              onValueChange={(val) => setRole(val as typeof role)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
            onClick={handleSave}
            disabled={loading || !hasChanges}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
