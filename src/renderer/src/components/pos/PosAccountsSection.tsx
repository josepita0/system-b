import { useState } from 'react'
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

  return (
    <div className="rounded-2xl border border-border bg-surface-card shadow-sm">
      <button
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-slate-800"
        onClick={() => {
          setOpen((v) => !v)
        }}
        type="button"
      >
        <span>Liquidar cuenta (efectivo)</span>
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
                    disabled={t.balance <= 0 || settlePending || removeLinePending}
                    onClick={() => {
                      onSettleClick(t)
                    }}
                    variant="secondary"
                  >
                    Cobrar y cerrar
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
