import { Button } from '@renderer/components/ui/Button'
import { selectFieldClass } from '@renderer/components/pos/posFieldClasses'

type Props = {
  saleMode: 'cash' | 'tab'
  openTabs: { id: number; customerName: string; balance: number }[]
  tabsLoading: boolean
  selectedTabId: number | null
  onSelectTab: (id: number | null) => void
  onNewTab: () => void
  vipCustomers: { id: number; name: string; conditionType: string }[]
  vipLoading: boolean
  selectedVipCustomerId: number | null
  onSelectVip: (id: number | null) => void
  vipNote: string | null
}

export function PosToolbar({
  saleMode,
  openTabs,
  tabsLoading,
  selectedTabId,
  onSelectTab,
  onNewTab,
  vipCustomers,
  vipLoading,
  selectedVipCustomerId,
  onSelectVip,
  vipNote,
}: Props) {
  return (
    <div className="rounded-2xl border border-border bg-surface-card p-4 shadow-sm">
      {/* Cuenta abierta: bloque propio, sin columnas forzadas en lg */}
      {saleMode === 'tab' ? (
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
          {/* <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Los cargos van al pagaré (no suman a la caja de este turno hasta liquidar en efectivo).
            {tabsLoading ? ' Cargando cuentas...' : null}
          </p> */}
        </div>
      ) : null}

      {/* Cliente VIP: ancho completo, debajo del resto */}
      <div
        className={saleMode === 'tab' ? 'mt-4 border-t border-slate-100 pt-4' : 'border-t border-slate-100 pt-4'}
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente VIP</p>
        <label className="block max-w-full text-xs font-medium text-slate-600 sm:max-w-md">
          Opcional
          <select
            className={`${selectFieldClass} mt-1.5 w-full`}
            disabled={vipLoading}
            onChange={(e) => {
              const v = e.target.value
              onSelectVip(v === '' ? null : Number(v))
            }}
            value={selectedVipCustomerId ?? ''}
          >
            <option value="">{vipLoading ? 'Cargando...' : 'Sin VIP'}</option>
            {vipCustomers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.conditionType === 'exempt' ? 'Exonerado' : 'Manual'}
              </option>
            ))}
          </select>
        </label>
        {vipNote ? <p className="mt-2 text-xs text-slate-500">{vipNote}</p> : null}
      </div>
    </div>
  )
}
