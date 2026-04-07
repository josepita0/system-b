import { Button } from '@renderer/components/ui/Button'
import { cn } from '@renderer/lib/cn'

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const

type Props = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  disabled?: boolean
  className?: string
}

export function TablePagination({ page, pageSize, total, onPageChange, onPageSizeChange, disabled, className }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const end = Math.min(total, safePage * pageSize)

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700',
        className,
      )}
    >
      <p className="tabular-nums text-slate-600">{total === 0 ? 'Sin resultados' : `${start}–${end} de ${total}`}</p>
      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange ? (
          <label className="flex items-center gap-2 text-xs text-slate-600">
            Por página
            <select
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-inner"
              disabled={disabled}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              value={pageSize}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <Button
          className="px-3 py-1.5 text-xs"
          disabled={disabled || safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          type="button"
          variant="secondary"
        >
          Anterior
        </Button>
        <span className="tabular-nums text-xs text-slate-600">
          Pagina {safePage} / {totalPages}
        </span>
        <Button
          className="px-3 py-1.5 text-xs"
          disabled={disabled || safePage >= totalPages || total === 0}
          onClick={() => onPageChange(safePage + 1)}
          type="button"
          variant="secondary"
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}
