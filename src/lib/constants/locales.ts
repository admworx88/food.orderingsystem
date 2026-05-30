export type Locale = 'en' | 'tl';

export const DEFAULT_LOCALE: Locale = 'en';

export const SUPPORTED_LOCALES: { value: Locale; label: string; flag: string }[] = [
  { value: 'en', label: 'English', flag: 'EN' },
  { value: 'tl', label: 'Tagalog', flag: 'TL' },
];
