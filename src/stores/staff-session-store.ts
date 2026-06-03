import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type StaffRole = 'admin' | 'cashier' | 'kitchen' | 'waiter' | 'kiosk';

export interface StaffSession {
  id: string;
  full_name: string;
  role: StaffRole;
  kioskType: 'restaurant' | 'ocean_view';
}

interface StaffSessionStore {
  session: StaffSession | null;
  setSession: (session: StaffSession) => void;
  clearSession: () => void;
}

export const useStaffSessionStore = create<StaffSessionStore>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),
    }),
    { name: 'staff-session' }
  )
);
