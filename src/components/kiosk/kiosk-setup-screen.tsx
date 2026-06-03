'use client';

import { Coffee } from 'lucide-react';
import { OceanViewIcon } from '@/components/kiosk/ocean-view-icon';
import { cn } from '@/lib/utils';
import type { KioskLocation } from '@/hooks/use-kiosk-location';

interface KioskSetupScreenProps {
  onSelect: (location: KioskLocation) => void;
}

const OPTIONS: {
  value: KioskLocation;
  label: string;
  description: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}[] = [
  {
    value: 'restaurant',
    label: 'Restaurant',
    description: 'Main dining area',
    Icon: Coffee,
  },
  {
    value: 'ocean_view',
    label: 'Ocean View',
    description: 'Floating restaurant over the sea',
    Icon: OceanViewIcon,
  },
];

export function KioskSetupScreen({ onSelect }: KioskSetupScreenProps) {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-white to-stone-50 px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-amber-200/20 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-20 right-10 w-96 h-96 bg-amber-300/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center">
        <h1 className="text-3xl font-bold text-stone-800 mb-2 tracking-tight">
          Kiosk Setup
        </h1>
        <p className="text-stone-500 mb-10">
          Select the location for this kiosk device
        </p>

        <div className="grid grid-cols-2 gap-4">
          {OPTIONS.map(({ value, label, description, Icon }) => (
            <button
              key={value}
              onClick={() => onSelect(value)}
              className={cn(
                'flex flex-col items-center justify-center p-8 rounded-2xl border-2 transition-all min-h-[180px]',
                'border-stone-200 bg-white/80 backdrop-blur-sm',
                'hover:border-amber-400 hover:bg-amber-50 hover:shadow-lg hover:shadow-amber-500/10',
                'active:scale-[0.97]'
              )}
            >
              <Icon className="w-12 h-12 mb-4 text-stone-400" strokeWidth={2} />
              <h3 className="text-lg font-bold text-stone-700 mb-1">{label}</h3>
              <p className="text-xs text-stone-500 text-center leading-tight">
                {description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
