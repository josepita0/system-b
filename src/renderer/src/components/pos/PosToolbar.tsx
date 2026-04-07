import { Button } from '@renderer/components/ui/Button'
import { selectFieldClass } from '@renderer/components/pos/posFieldClasses'

type Props = {
  saleMode: 'cash' | 'tab'
  openTabs: { id: number; customerName: string; balance: number }[]
  selectedTabId: number | null
  onSelectTab: (id: number | null) => void
  onNewTab: () => void
}

export function PosToolbar({
  saleMode,
  openTabs,
  selectedTabId,
  onSelectTab,
  onNewTab,
}: Props) {
  if (saleMode !== 'tab') {
    return null
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-card p-4 shadow-sm">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Cuenta (pagaré)</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3">
          <label className="min-w-0 flex-1 text-xs font-medium text-slate-600">
            Cuenta activa
            <select
              className={`${selectFieldClass} mt-1.5 w-full min-w-0`}
              onChange={(e) => {
                const v = e.target.value
                onSelectTab(v === '' ? null : Number(v))
              }}
              value={selectedTabId ?? ''}
            >
              <option value="">Seleccione una cuenta...</option>
              {openTabs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.customerName} — {t.balance.toFixed(2)}
                </option>
              ))}
            </select>
          </label>
          <Button className="h-[42px] w-full shrink-0 sm:w-auto sm:min-w-[9rem]" onClick={onNewTab} variant="secondary">
            Nueva cuenta
          </Button>
        </div>
      </div>
    </div>
  )
}
