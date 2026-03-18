import { create } from 'zustand'
import type { AuthenticatedUser } from '@shared/types/user'

interface AuthStore {
  user: AuthenticatedUser | null
  setUser: (user: AuthenticatedUser | null) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}))
