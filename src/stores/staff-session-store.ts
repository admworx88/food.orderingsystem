import { create } from 'zustand';

interface StaffSession {
  id: string;
  name: string;
  role: string;
}

interface StaffSessionStore {
  session: StaffSession | null;
  setSession: (session: StaffSession | null) => void;
  clearSession: () => void;
}

export const useStaffSessionStore = create<StaffSessionStore>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  clearSession: () => set({ session: null }),
}));
