'use client';

import { cn } from '@/lib/utils';

interface AllergenBadgeProps {
  type: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ALLERGEN_DATA: Record<string, { icon: string; label: string; color: string }> = {
  dairy: { icon: '🥛', label: 'Dairy', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  nuts: { icon: '🥜', label: 'Nuts', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  gluten: { icon: '🌾', label: 'Gluten', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  shellfish: { icon: '🦐', label: 'Shellfish', color: 'bg-red-50 text-red-700 border-red-200' },
  eggs: { icon: '🥚', label: 'Eggs', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  soy: { icon: '🫘', label: 'Soy', color: 'bg-green-50 text-green-700 border-green-200' },
  fish: { icon: '🐟', label: 'Fish', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  sesame: { icon: '🫙', label: 'Sesame', color: 'bg-stone-50 text-stone-700 border-stone-200' },
};

const SIZES = {
  sm: 'text-sm px-2 py-1 gap-1',
  md: 'text-base px-3 py-1.5 gap-1.5',
  lg: 'text-lg px-4 py-2 gap-2',
};

const ICON_SIZES = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-xl',
};

export function AllergenBadge({ type, showLabel = true, size = 'md' }: AllergenBadgeProps) {
  const allergen = ALLERGEN_DATA[type.toLowerCase()] || {
    icon: '⚠️',
    label: type,
    color: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        allergen.color,
        SIZES[size]
      )}
      title={`Contains ${allergen.label}`}
    >
      <span className={ICON_SIZES[size]}>{allergen.icon}</span>
      {showLabel && <span>{allergen.label}</span>}
    </span>
  );
}

interface AllergenListProps {
  allergens: string[];
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
  maxDisplay?: number;
}

export function AllergenList({
  allergens,
  showLabels = false,
  size = 'md',
  maxDisplay,
}: AllergenListProps) {
  if (!allergens || allergens.length === 0) return null;

  const displayAllergens = maxDisplay ? allergens.slice(0, maxDisplay) : allergens;
  const remaining = maxDisplay ? allergens.length - maxDisplay : 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {displayAllergens.map((allergen) => (
        <AllergenBadge
          key={allergen}
          type={allergen}
          showLabel={showLabels}
          size={size}
        />
      ))}
      {remaining > 0 && (
        <span className="text-sm text-gray-500 font-medium">
          +{remaining} more
        </span>
      )}
    </div>
  );
}
