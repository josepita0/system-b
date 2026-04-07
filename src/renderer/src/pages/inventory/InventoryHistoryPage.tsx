import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@renderer/components/ui/Card'
import { TablePagination } from '@renderer/components/ui/TablePagination'
import { tableTheadClass } from '@renderer/lib/tableStyles'
import { DEFAULT_PAGE_SIZE } from '@shared/types/pagination'
import { movementTypeLabel, referenceLabel } from './inventoryLabels'

export function InventoryHistoryPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const historyQuery = useQuery({
    queryKey: ['inventory', 'movementHistory', 'paged', page, pageSize],
    queryFn: () => window.api.inventory.listMovementHistoryPaged({ page, pageSize }),
  })

  const rows = historyQuery.data?.items ?? []
  const total = historyQuery.data?.total ?? 0

  const maxPage = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  useEffect(() => {
    if (page > maxPage) {
      setPage(maxPage)
    }
  }, [page, maxPage])

  useEffect(() => {
    setPage(1)
  }, [pageSize])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Historial de movimientos</h2>
        <p className="mt-1 text-sm text-slate-500">
          Entradas, ajustes, ventas y movimientos asociados a lotes. Orden cronológico descendente (más reciente
          primero).
        </p>
      </div>

      <Card className="min-h-0 shadow-sm" padding="lg">
        {historyQuery.isLoading ? <div className="text-sm text-slate-500">Cargando historial...</div> : null}
        {historyQuery.error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {historyQuery.error instanceof Error ? historyQuery.error.message : 'No fue posible cargar el historial.'}
          </div>
        ) : null}

        {!historyQuery.isLoading && !historyQuery.error ? (
          <div className="w-full min-w-0 overflow-x-auto rounded-xl border-2 border-slate-200 bg-white shadow-inner">
            <table className="min-w-full text-left text-sm text-slate-800">
              <thead className={tableTheadClass}>
                <tr>
                  <th className="px-3 py-3">Fecha</th>
                  <th className="px-3 py-3">Producto</th>
                  <th className="px-3 py-3">Tipo</th>
                  <th className="px-3 py-3 text-right">Cantidad</th>
                  <th className="px-3 py-3">Origen</th>
                  <th className="px-3 py-3">Nota</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m, index) => (
                  <tr
                    className={index % 2 === 0 ? 'border-t border-slate-200 bg-white' : 'border-t border-slate-200 bg-slate-50/80'}
                    key={m.id}
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-600">{m.createdAt}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-900">{m.productName}</td>
                    <td className="px-3 py-2.5 text-slate-700">{movementTypeLabel(m.movementType)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium text-slate-900">
                      {m.quantity >= 0 ? '+' : ''}
                      {m.quantity.toFixed(2)}
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2.5 text-xs text-slate-600" title={m.referenceType}>
                      {referenceLabel(m.referenceType)}
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-2.5 text-xs text-slate-600" title={m.note ?? ''}>
                      {m.note ?? '—'}
                    </td>
                  </tr>
                ))}
                {!rows.length ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-slate-500" colSpan={6}>
                      Sin movimientos registrados.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        ) : null}
      </Card>
    </div>
  )
}
