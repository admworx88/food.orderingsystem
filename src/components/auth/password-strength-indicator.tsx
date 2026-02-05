'use client';

import { cn } from '@/lib/utils';
import { calculatePasswordStrength } from '@/lib/validators/auth';
import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { score, label, checks } = calculatePasswordStrength(password);

  if (!password) return null;

  const colors = {
    weak: 'bg-red-500',
    fair: 'bg-amber-500',
    good: 'bg-blue-500',
    strong: 'bg-emerald-500',
  };

  const labelColors = {
    weak: 'text-red-600',
    fair: 'text-amber-600',
    good: 'text-blue-600',
    strong: 'text-emerald-600',
  };

  const requirements = [
    { key: 'length', label: 'At least 8 characters', met: checks.length },
    { key: 'uppercase', label: 'One uppercase letter', met: checks.uppercase },
    { key: 'lowercase', label: 'One lowercase letter', met: checks.lowercase },
    { key: 'number', label: 'One number', met: checks.number },
  ];

  return (
    <div className="mt-4 space-y-4 animate-fade-in">
      {/* Strength bar */}
      <div className="space-y-2">
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-all duration-300',
                i < score ? colors[label] : 'bg-gray-200'
              )}
            />
          ))}
        </div>
        <p className={cn('text-xs font-medium font-body capitalize', labelColors[label])}>
          {label} password
        </p>
      </div>

      {/* Requirements checklist */}
      <ul className="space-y-2">
        {requirements.map((req) => (
          <li
            key={req.key}
            className={cn(
              'flex items-center gap-2.5 text-sm font-body transition-all duration-200',
              req.met ? 'text-emerald-600' : 'text-gray-400'
            )}
          >
            <div
              className={cn(
                'w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200',
                req.met ? 'bg-emerald-100' : 'bg-gray-100'
              )}
            >
              {req.met ? (
                <Check className="w-3 h-3" strokeWidth={3} />
              ) : (
                <X className="w-3 h-3" strokeWidth={3} />
              )}
            </div>
            {req.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
