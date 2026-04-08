import { Button } from '@renderer/components/ui/Button'
import { selectFieldClass } from '@renderer/components/pos/posFieldClasses'
import { cn } from '@renderer/lib/cn'
import { useUiPrefsStore } from '@renderer/store/uiPrefsStore'

export type TicketCartLine = {
  key: string
  productName: string
  quantity: number
  unitPrice: number
  /** Precio de catálogo al agregar la línea (referencia para cambios). */
  catalogUnitPrice: number
  discount: number
  formatLabel?: string | null
  complementLabel?: string | null
  priceChangeNote: string | null
  canEditPrice?: boolean
}

type Props = {
  lines: TicketCartLine[]
  cartTotal: number
  saleMode: 'cash' | 'tab'
  selectedTabId: number | null
  salePending: boolean
  saleError: string | null
  hasVipSelected: boolean
  vipCustomers: { id: number; name: string; conditionType: string }[]
  vipLoading: boolean
  selectedVipCustomerId: number | null
  onSelectVip: (id: number | null) => void
  vipNote: string | null
  onQuantityChange: (key: string, quantity: number) => void
  onDiscountChange: (key: string, discount: number) => void
  onRemoveLine: (key: string) => void
  onConfirmClick: () => void
  onEditPriceClick: (key: string) => void
  onEditComplementClick?: (key: string) => void
}

function LineMeta({ line }: { line: TicketCartLine }) {
  const parts: string[] = []
  if (line.formatLabel) {
    parts.push(line.formatLabel)
  }
  if (line.complementLabel) {
    parts.push(`+ ${line.complementLabel}`)
  }
  if (parts.length === 0) {
    return null
  }
  return <p className="text-xs text-slate-500">{parts.join(' · ')}</p>
}

function lineTotal(line: TicketCartLine): number {
  return line.quantity * line.unitPrice - line.discount
}

function priceWasChanged(line: TicketCartLine): boolean {
  return Math.abs(line.unitPrice - line.catalogUnitPrice) > 0.000_001
}

export function PosTicketPanel({
  lines,
  cartTotal,
  saleMode,
  selectedTabId,
  salePending,
  saleError,
  hasVipSelected,
  vipCustomers,
  vipLoading,
  selectedVipCustomerId,
  onSelectVip,
  vipNote,
  onQuantityChange,
  onDiscountChange,
  onRemoveLine,
  onConfirmClick,
  onEditPriceClick,
  onEditComplementClick,
}: Props) {
  const confirmDisabled =
    lines.length === 0 || salePending || (saleMode === 'tab' && selectedTabId == null)
  const posLargeText = useUiPrefsStore((s) => s.posLargeText)
  const highContrast = useUiPrefsStore((s) => s.highContrast)

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border shadow-sm',
        highContrast ? 'border-white/20 bg-slate-950' : 'bg-white',
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center justify-between border-b px-4 py-3',
          highContrast ? 'border-white/15' : 'border-slate-200',
        )}
      >
        <div>
          <h2 className={cn('font-semibold', posLargeText ? 'text-xl' : 'text-lg', highContrast ? 'text-white' : 'text-slate-900')}>
            Ticket
          </h2>
          <p className={cn('text-xs', highContrast ? 'text-white/70' : 'text-slate-500')}>Orden actual</p>
        </div>
      </div>

      <div
        className={cn(
          'shrink-0 border-b px-3 py-2',
          highContrast ? 'border-white/10 bg-slate-900/60' : 'border-slate-100 bg-slate-50/60',
        )}
      >
        <label className="flex items-center gap-2">
          <span
            className={cn(
              'shrink-0 text-[11px] font-medium uppercase tracking-wide',
              highContrast ? 'text-white/60' : 'text-slate-400',
            )}
            title="Opcional"
          >
            VIP
          </span>
          <select
            aria-label="Cliente VIP (opcional)"
            className={`${selectFieldClass} min-w-0 flex-1 py-1.5 text-sm`}
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
        {vipNote ? (
          <p className={cn('mt-1.5 line-clamp-2 text-[11px] leading-snug', highContrast ? 'text-white/70' : 'text-slate-500')}>
            {vipNote}
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3">
        {lines.length === 0 ? (
          <p className={cn('py-6 text-center text-sm', highContrast ? 'text-white/70' : 'text-slate-500')}>
            Sin lineas. Agregue productos del catalogo.
          </p>
        ) : (
          <ul className={cn('divide-y', highContrast ? 'divide-white/10' : 'divide-slate-200')}>
            {lines.map((line) => (
              <li className="py-3" key={line.key}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'font-semibold leading-snug',
                        posLargeText ? 'text-base' : 'text-sm',
                        highContrast ? 'text-white' : 'text-slate-900',
                      )}
                    >
                      {line.productName}{' '}
                      <span className={cn('font-normal', highContrast ? 'text-white/70' : 'text-slate-500')}>({line.quantity})</span>
                    </p>
                    <p
                      className={cn(
                        'mt-0.5 font-medium tabular-nums',
                        posLargeText ? 'text-base' : 'text-sm',
                        highContrast ? 'text-white' : 'text-slate-800',
                      )}
                    >
                      {lineTotal(line).toFixed(2)}
                    </p>
                    <LineMeta line={line} />
                    {priceWasChanged(line) ? (
                      <p className={cn('mt-1 text-[11px]', highContrast ? 'text-white/70' : 'text-slate-500')}>
                        P. unit. cat.: {line.catalogUnitPrice.toFixed(2)}
                        {line.priceChangeNote ? (
                          <span className={cn('mt-0.5 block', highContrast ? 'text-white/80' : 'text-slate-600')}>
                            “{line.priceChangeNote}”
                          </span>
                        ) : hasVipSelected ? (
                          <span className={cn('ml-1', highContrast ? 'text-white/60' : 'text-slate-400')}>(VIP)</span>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <div
                      className={cn(
                        'flex items-center overflow-hidden rounded-lg border',
                        highContrast ? 'border-white/15 bg-white/10' : 'border-slate-200 bg-slate-50',
                      )}
                      title="Unidades vendidas (no modifica el precio unitario)"
                    >
                      <button
                        aria-label="Restar una unidad"
                        className={cn(
                          'px-2 py-1.5 text-base leading-none transition-colors',
                          highContrast ? 'text-white hover:bg-white/10' : 'text-slate-700 hover:bg-slate-200/80',
                        )}
                        onClick={() => {
                          const next = Math.max(1, round2(line.quantity - 1))
                          onQuantityChange(line.key, next)
                        }}
                        type="button"
                      >
                        −
                      </button>
                      <span
                        className={cn(
                          'min-w-[2rem] px-0.5 text-center font-semibold tabular-nums',
                          posLargeText ? 'text-base' : 'text-sm',
                          highContrast ? 'text-white' : 'text-slate-900',
                        )}
                      >
                        {formatUnits(line.quantity)}
                      </span>
                      <button
                        aria-label="Sumar una unidad"
                        className={cn(
                          'px-2 py-1.5 text-base leading-none transition-colors',
                          highContrast ? 'text-white hover:bg-white/10' : 'text-slate-700 hover:bg-slate-200/80',
                        )}
                        onClick={() => {
                          onQuantityChange(line.key, round2(line.quantity + 1))
                        }}
                        type="button"
                      >
                        +
                      </button>
                    </div>
                    <button
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-colors',
                        highContrast
                          ? 'text-white/70 hover:bg-white/10 hover:text-white'
                          : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600',
                      )}
                      onClick={() => {
                        onRemoveLine(line.key)
                      }}
                      title="Quitar linea"
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {/* <label className="flex items-center gap-1.5 text-xs text-slate-600">
                    Desc.
                    <input
                      className="w-[4.5rem] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm tabular-nums text-slate-900"
                      min={0}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        onDiscountChange(line.key, Number.isFinite(v) ? v : line.discount)
                      }}
                      step={0.01}
                      type="number"
                      value={line.discount}
                    />
                  </label> */}
                  {line.canEditPrice === false ? null : (
                    <Button
                      className="text-xs"
                      onClick={() => {
                        onEditPriceClick(line.key)
                      }}
                      type="button"
                      variant="secondary"
                    >
                      Cambiar precio
                    </Button>
                  )}
                  {onEditComplementClick && line.complementLabel ? (
                    <Button
                      className="text-xs"
                      onClick={() => {
                        onEditComplementClick(line.key)
                      }}
                      type="button"
                      variant="secondary"
                    >
                      Cambiar complemento
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        className={cn(
          'shrink-0 space-y-3 border-t px-4 py-4',
          highContrast ? 'border-white/15 bg-slate-900/60' : 'border-slate-200 bg-slate-50/80',
        )}
      >
        <div className={cn('space-y-2', posLargeText ? 'text-base' : 'text-sm')}>
          <div className={cn('flex justify-between', highContrast ? 'text-white/80' : 'text-slate-600')}>
            <span>Subtotal</span>
            <span className={cn('tabular-nums', highContrast ? 'text-white' : 'text-slate-900')}>{cartTotal.toFixed(2)}</span>
          </div>
          <div
            className={cn(
              'flex justify-between border-t border-dashed pt-2 font-semibold',
              posLargeText ? 'text-xl' : 'text-base',
              highContrast ? 'border-white/15 text-white' : 'border-slate-200 text-slate-900',
            )}
          >
            <span>Total</span>
            <span className="tabular-nums text-brand">{cartTotal.toFixed(2)}</span>
          </div>
        </div>
        <Button
          className={cn('w-full font-semibold', posLargeText ? 'py-4 text-lg' : 'py-3 text-base')}
          disabled={confirmDisabled}
          onClick={onConfirmClick}
          variant="primary"
        >
          {salePending
            ? 'Registrando...'
            : saleMode === 'tab'
              ? 'Registrar a cuenta'
              : 'Confirmar venta'}
        </Button>
        {saleError ? <p className="text-center text-sm text-rose-600">{saleError}</p> : null}
      </div>
    </div>
  )
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Muestra cantidad como entero si aplica, para no parecer monto monetario. */
function formatUnits(q: number): string {
  const r = round2(q)
  return Number.isInteger(r) || Math.abs(r - Math.round(r)) < 0.000_001 ? String(Math.round(r)) : r.toFixed(2)
}
