'use client';

import { NUTRITIONAL_FIELDS, type NutritionalInfo } from '@/lib/constants/allergens';
import { cn } from '@/lib/utils';

interface NutritionTableProps {
  nutritionalInfo: NutritionalInfo;
  className?: string;
}

export function NutritionTable({ nutritionalInfo, className }: NutritionTableProps) {
  const hasAnyValue = NUTRITIONAL_FIELDS.some(
    (field) => nutritionalInfo[field.key as keyof NutritionalInfo] != null
  );

  if (!hasAnyValue) return null;

  return (
    <div className={cn('rounded-lg border border-slate-200 overflow-hidden', className)}>
      <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
        <h4 className="text-sm font-semibold text-slate-700">Nutrition Facts</h4>
      </div>
      <div className="divide-y divide-slate-100">
        {NUTRITIONAL_FIELDS.map((field) => {
          const value = nutritionalInfo[field.key as keyof NutritionalInfo];
          if (value == null) return null;

          return (
            <div
              key={field.key}
              className="flex items-center justify-between px-3 py-1.5 text-sm"
            >
              <span className="text-slate-600">{field.label}</span>
              <span className="font-medium text-slate-900">
                {value} {field.unit}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
