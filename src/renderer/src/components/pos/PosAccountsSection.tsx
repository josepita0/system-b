import { useEffect, useState } from 'react'
import { Button } from '@renderer/components/ui/Button'

type OpenTab = { id: number; customerName: string; balance: number }

type Props = {
  openTabs: OpenTab[]
  loading: boolean
  settlePending: boolean
  removeLinePending: boolean
  onSettleClick: (tab: OpenTab) => void
  settleError: string | null
  removeLineError: string | null
}

export function PosAccountsSection({
  openTabs,
  loading,
  settlePending,
  removeLinePending,
  onSettleClick,
  settleError,
  removeLineError,
}: Props) {
  const [open, setOpen] = useState(false)
  const hasPendingTabs = openTabs.length > 0
  const [manualClosed, setManualClosed] = useState(false)

  useEffect(() => {
    if (!hasPendingTabs) {
      setManualClosed(false)
      return
    }

    if (!open && !manualClosed) setOpen(true)
  }, [hasPendingTabs, manualClosed, open])

  return (
    <div className="rounded-2xl border border-border bg-surface-card shadow-sm">
      <button
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-slate-800"
        onClick={() => {
          setOpen((v) => {
            const next = !v
            setManualClosed(!next)
            return next
          })
        }}
        type="button"
      >
        <span className="inline-flex items-center gap-2">
          <span>Liquidar cuenta</span>
          {hasPendingTabs ? (
            <span className="relative flex h-3 w-3" aria-label="Cuentas pendientes">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-orange-500" />
            </span>
          ) : null}
        </span>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>
      {open ? (
        <div className="border-t border-border px-4 py-3">
          {loading ? (
            <p className="text-xs text-slate-500">Cargando cuentas...</p>
          ) : !openTabs.length ? (
            <p className="text-xs text-slate-500">No hay cuentas abiertas.</p>
          ) : (
            <ul className="space-y-2">
              {openTabs.map((t) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                  key={t.id}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{t.customerName}</p>
                    <p className="text-xs text-slate-500">Saldo: {t.balance.toFixed(2)}</p>
                  </div>
                  <Button
                    className="shrink-0"
                    disabled={settlePending || removeLinePending}
                    onClick={() => {
                      onSettleClick(t)
                    }}
                    variant="secondary"
                  >
                    {t.balance <= 0 ? 'Gestionar' : 'Cobrar y cerrar'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {settleError ? <p className="mt-2 text-xs text-rose-600">{settleError}</p> : null}
          {removeLineError ? <p className="mt-1 text-xs text-rose-600">{removeLineError}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
