'use client';

import { useState, useEffect, useCallback } from 'react';

export type KioskLocation = 'restaurant' | 'ocean_view';

const STORAGE_KEY = 'kiosk_location';

interface UseKioskLocationReturn {
  location: KioskLocation | null;
  isLoaded: boolean;
  setLocation: (loc: KioskLocation) => void;
  clearLocation: () => void;
}

export function useKioskLocation(): UseKioskLocationReturn {
  const [location, setLocationState] = useState<KioskLocation | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as KioskLocation | null;
    if (stored === 'restaurant' || stored === 'ocean_view') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocationState(stored);
    }
    setIsLoaded(true);
  }, []);

  const setLocation = useCallback((loc: KioskLocation) => {
    localStorage.setItem(STORAGE_KEY, loc);
    setLocationState(loc);
  }, []);

  const clearLocation = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setLocationState(null);
  }, []);

  return { location, isLoaded, setLocation, clearLocation };
}
