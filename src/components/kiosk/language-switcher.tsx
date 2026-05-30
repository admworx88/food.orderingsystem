'use client';

import { useLocale } from '@/lib/i18n/locale-context';
import { SUPPORTED_LOCALES } from '@/lib/constants/locales';

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex bg-stone-100 rounded-md sm:rounded-lg p-0.5 sm:p-1">
      {SUPPORTED_LOCALES.map((loc) => (
        <button
          key={loc.value}
          onClick={() => setLocale(loc.value)}
          className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-all ${
            locale === loc.value
              ? 'bg-white text-amber-600 shadow-sm'
              : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          {loc.flag}
        </button>
      ))}
    </div>
  );
}
