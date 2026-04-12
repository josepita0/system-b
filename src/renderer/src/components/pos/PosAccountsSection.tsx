import { Button } from '@renderer/components/ui/Button'

type OpenTab = { id: number; customerName: string; balance: number }

type Props = {
  openTabs: OpenTab[]
  loading: boolean
  settlePending: boolean
  removeLinePending: boolean
  selectedTabId: number | null
  showNewAccountButton: boolean
  onNewTab: () => void
  onSelectTab: (tabId: number) => void
  onSettleClick: (tab: OpenTab) => void
  settleError: string | null
  removeLineError: string | null
}

export function PosAccountsSection({
  openTabs,
  loading,
  settlePending,
  removeLinePending,
  selectedTabId,
  showNewAccountButton,
  onNewTab,
  onSelectTab,
  onSettleClick,
  settleError,
  removeLineError,
}: Props) {
  const hasPendingTabs = openTabs.length > 0

  return (
    <div className="rounded-2xl border border-border bg-surface-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
          <span>Liquidar cuenta</span>
          {hasPendingTabs ? (
            <span className="relative flex h-3 w-3" aria-label="Cuentas pendientes">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-orange-500" />
            </span>
          ) : null}
        </span>
        {showNewAccountButton ? (
          <Button className="shrink-0" onClick={onNewTab} type="button" variant="secondary">
            Nueva
          </Button>
        ) : null}
      </div>
      <div className="px-4 py-3">
        {loading ? (
          <p className="text-xs text-slate-500">Cargando cuentas...</p>
        ) : !openTabs.length ? (
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Sin cuentas</p>
        ) : (
          <ul className="space-y-2">
            {openTabs.map((t) => {
              const selected = selectedTabId === t.id
              return (
                <li key={t.id}>
                  <div
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 transition-colors ${
                      selected
                        ? 'border-brand/50 bg-brand/5 ring-1 ring-brand/20'
                        : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <button
                      className="min-w-0 flex-1 cursor-pointer rounded-lg text-left"
                      onClick={() => {
                        onSelectTab(t.id)
                      }}
                      type="button"
                    >
                      <p className="text-sm font-medium text-slate-900">{t.customerName}</p>
                      <p className="text-xs text-slate-500">Saldo: {t.balance.toFixed(2)}</p>
                    </button>
                    <Button
                      className="shrink-0"
                      disabled={settlePending || removeLinePending}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSettleClick(t)
                      }}
                      variant="secondary"
                    >
                      {t.balance <= 0 ? 'Gestionar' : 'Cobrar y cerrar'}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {settleError ? <p className="mt-2 text-xs text-rose-600">{settleError}</p> : null}
        {removeLineError ? <p className="mt-1 text-xs text-rose-600">{removeLineError}</p> : null}
      </div>
    </div>
  )
}
