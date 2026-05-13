import { create } from "zustand";

type AuthState = {
  token: string | null;
  /** Phone captured during OTP flow (E.164-ish) for sign-up. */
  pendingPhone: string | null;
  setToken: (t: string | null) => void;
  setPendingPhone: (p: string | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  pendingPhone: null,
  setToken: (token) => set({ token }),
  setPendingPhone: (pendingPhone) => set({ pendingPhone }),
}));
