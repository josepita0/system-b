import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UiPrefsState = {
  posLargeText: boolean
  highContrast: boolean
  /** Sección «Liquidar cuenta» en el POS (colapsada = más espacio para el ticket). */
  posSettleAccountsExpanded: boolean
  togglePosLargeText: () => void
  toggleHighContrast: () => void
  setPosSettleAccountsExpanded: (expanded: boolean) => void
  togglePosSettleAccountsExpanded: () => void
}

export const useUiPrefsStore = create<UiPrefsState>()(
  persist(
    (set) => ({
      posLargeText: true,
      highContrast: false,
      posSettleAccountsExpanded: true,
      togglePosLargeText: () => set((s) => ({ posLargeText: !s.posLargeText })),
      toggleHighContrast: () => set((s) => ({ highContrast: !s.highContrast })),
      setPosSettleAccountsExpanded: (expanded) => set({ posSettleAccountsExpanded: expanded }),
      togglePosSettleAccountsExpanded: () =>
        set((s) => ({ posSettleAccountsExpanded: !s.posSettleAccountsExpanded })),
    }),
    { name: 'ui-prefs' },
  ),
)

