import { create } from 'zustand'

interface PosStore {
  activeSessionId: number | null
  setActiveSessionId: (id: number | null) => void
}

export const usePosStore = create<PosStore>((set) => ({
  activeSessionId: null,
  setActiveSessionId: (id) => set({ activeSessionId: id }),
}))
