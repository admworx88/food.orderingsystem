'use client';

import { Badge } from '@/components/ui/badge';
import { ALLERGEN_OPTIONS } from '@/lib/constants/allergens';
import { cn } from '@/lib/utils';

interface AllergenBadgesProps {
  allergens: string[];
  className?: string;
}

export function AllergenBadges({ allergens, className }: AllergenBadgesProps) {
  if (!allergens || allergens.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {allergens.map((allergen) => {
        const option = ALLERGEN_OPTIONS.find((o) => o.value === allergen);
        if (!option) return null;

        return (
          <Badge
            key={allergen}
            variant="outline"
            className="text-xs px-2 py-0.5 border-amber-300 bg-amber-50 text-amber-800"
          >
            <span className="mr-1">{option.icon}</span>
            {option.label}
          </Badge>
        );
      })}
    </div>
  );
}
