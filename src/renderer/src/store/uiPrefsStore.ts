import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UiPrefsState = {
  posLargeText: boolean
  highContrast: boolean
  togglePosLargeText: () => void
  toggleHighContrast: () => void
}

export const useUiPrefsStore = create<UiPrefsState>()(
  persist(
    (set) => ({
      posLargeText: true,
      highContrast: false,
      togglePosLargeText: () => set((s) => ({ posLargeText: !s.posLargeText })),
      toggleHighContrast: () => set((s) => ({ highContrast: !s.highContrast })),
    }),
    { name: 'ui-prefs' },
  ),
)

