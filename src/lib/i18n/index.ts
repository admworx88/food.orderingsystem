import en from './dictionaries/en';
import tl from './dictionaries/tl';
import type { Locale } from '@/lib/constants/locales';

// Use a recursive mapped type to widen string literals to string
type DeepStringify<T> = T extends string
  ? string
  : T extends object
    ? { [K in keyof T]: DeepStringify<T[K]> }
    : T;

export type Dictionary = DeepStringify<typeof en>;

const dictionaries: Record<Locale, Dictionary> = { en, tl };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] || dictionaries.en;
}
