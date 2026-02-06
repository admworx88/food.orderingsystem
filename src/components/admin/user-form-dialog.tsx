'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Loader2, Shield, ShieldCheck, ShieldX } from 'lucide-react';
import { toast } from 'sonner';
import { createStaffUser } from '@/services/user-service';
import { createUserSchema, type CreateUserInput } from '@/lib/validators/user';

interface UserFormDialogProps {
  trigger?: React.ReactNode;
}

const roleOptions = [
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full system access',
    icon: ShieldCheck,
  },
  {
    value: 'cashier',
    label: 'Cashier',
    description: 'Payment processing & POS',
    icon: Shield,
  },
  {
    value: 'kitchen',
    label: 'Kitchen',
    description: 'Order preparation & KDS',
    icon: ShieldX,
  },
] as const;

export function UserFormDialog({ trigger }: UserFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      full_name: '',
      role: undefined,
      pin: '',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: CreateUserInput) => {
    setIsSubmitting(true);

    try {
      const result = await createStaffUser(data);

      if (result.success) {
        toast.success('Staff user created successfully!');
        reset();
        setOpen(false);
      } else {
        toast.error(result.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Create user error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset();
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-blue-500/30">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Staff User
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Add Staff User
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            Create a new staff account with role-based access
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              placeholder="Enter full name"
              {...register('full_name')}
              className={errors.full_name ? 'border-red-500' : ''}
            />
            {errors.full_name && (
              <p className="text-sm text-red-500">{errors.full_name.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              {...register('email')}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) =>
                setValue('role', value as 'admin' | 'cashier' | 'kitchen', {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger className={errors.role ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <div className="flex items-center gap-2">
                      <role.icon className="h-4 w-4" />
                      <div>
                        <span className="font-medium">{role.label}</span>
                        <span className="text-slate-500 ml-2 text-xs">
                          {role.description}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-red-500">{errors.role.message}</p>
            )}
          </div>

          {/* PIN */}
          <div className="space-y-2">
            <Label htmlFor="pin">
              PIN <span className="text-slate-400 text-sm">(optional)</span>
            </Label>
            <Input
              id="pin"
              type="password"
              placeholder="4-6 digit PIN"
              maxLength={6}
              {...register('pin')}
              className={errors.pin ? 'border-red-500' : ''}
            />
            {errors.pin && (
              <p className="text-sm text-red-500">{errors.pin.message}</p>
            )}
            <p className="text-xs text-slate-500">
              Used for quick login at kiosk/POS terminals
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create User
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
