import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ConsumptionConfigModal } from '@renderer/components/inventory/ConsumptionConfigModal'
import { InventoryRowActionsMenu } from '@renderer/components/inventory/InventoryRowActionsMenu'
import { RegisterMovementModal } from '@renderer/components/inventory/RegisterMovementModal'
import { Card } from '@renderer/components/ui/Card'
import { TablePagination } from '@renderer/components/ui/TablePagination'
import { cn } from '@renderer/lib/cn'
import { tableTheadClass } from '@renderer/lib/tableStyles'
import type { InventoryBalanceRow } from '@shared/types/inventory'
import { DEFAULT_PAGE_SIZE } from '@shared/types/pagination'
import { formatInventoryStockDisplay, stockDeductionUnitLabel } from './inventoryLabels'

export function InventoryDashboardPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const summaryQuery = useQuery({
    queryKey: ['inventory', 'balanceSummary'],
    queryFn: () => window.api.inventory.balanceSummary(),
  })

  const balancePagedQuery = useQuery({
    queryKey: ['inventory', 'balancePaged', page, pageSize],
    queryFn: () => window.api.inventory.listBalancePaged({ page, pageSize }),
  })

  const rows = balancePagedQuery.data?.items ?? []
  const totalRows = balancePagedQuery.data?.total ?? 0

  const maxPage = useMemo(() => Math.max(1, Math.ceil(totalRows / pageSize)), [totalRows, pageSize])

  useEffect(() => {
    if (page > maxPage) {
      setPage(maxPage)
    }
  }, [page, maxPage])

  useEffect(() => {
    setPage(1)
  }, [pageSize])

  const totalProducts = summaryQuery.data?.totalProducts ?? 0
  const lowStockCount = summaryQuery.data?.lowStockCount ?? 0

  const [movementProduct, setMovementProduct] = useState<InventoryBalanceRow | null>(null)
  const [configProduct, setConfigProduct] = useState<InventoryBalanceRow | null>(null)

  const openMovement = (row: InventoryBalanceRow) => setMovementProduct(row)
  const openConfig = (row: InventoryBalanceRow) => setConfigProduct(row)

  const closeMovement = () => setMovementProduct(null)
  const closeConfig = () => setConfigProduct(null)

  const switchMovementToConfig = () => {
    if (movementProduct) {
      const p = movementProduct
      closeMovement()
      setConfigProduct(p)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="shadow-sm" padding="lg">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total de productos</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">
            {summaryQuery.isLoading ? '…' : totalProducts}
          </p>
          <p className="mt-1 text-xs text-slate-500">Productos simples con control de inventario.</p>
        </Card>
        <Card className="shadow-sm" padding="lg">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Bajo stock</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-amber-800">
            {summaryQuery.isLoading ? '…' : lowStockCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Saldo igual o por debajo del mínimo configurado.</p>
        </Card>
      </div>

      <Card className="min-h-0 overflow-visible shadow-sm" padding="lg">
        <h2 className="text-lg font-semibold text-slate-900">Stock por producto</h2>
        <p className="mt-1 text-xs text-slate-500">
          Use <span className="font-medium">Acciones</span> por fila para registrar movimientos o configurar consumo progresivo.
        </p>

        {balancePagedQuery.isLoading ? <div className="mt-4 text-sm text-slate-500">Cargando...</div> : null}
        {balancePagedQuery.error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {balancePagedQuery.error instanceof Error ? balancePagedQuery.error.message : 'No fue posible cargar el inventario.'}
          </div>
        ) : null}

        {!balancePagedQuery.isLoading && !balancePagedQuery.error ? (
          <div className="mt-4 w-full min-w-0 overflow-x-auto overflow-y-visible rounded-xl border-2 border-slate-200 bg-white shadow-inner">
            <table className="min-w-full text-left text-sm text-slate-800">
              <thead className={tableTheadClass}>
                <tr>
                  <th className="px-3 py-3">Producto</th>
                  <th className="px-3 py-3 text-right">Stock</th>
                  <th className="px-3 py-3">Unidad</th>
                  <th className="px-3 py-3 text-right">Stock mín.</th>
                  <th className="px-3 py-3">Modo</th>
                  <th className="px-3 py-3">Estatus</th>
                  <th className="px-3 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, index) => {
                  const isLow = r.stock <= r.minStock
                  return (
                    <tr
                      className={cn(
                        'border-t border-slate-200 transition-colors',
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/80',
                      )}
                      key={r.productId}
                    >
                      <td className="px-3 py-3 font-medium text-slate-900">{r.productName}</td>
                      <td
                        className={cn(
                          'px-3 py-3 text-right tabular-nums',
                          isLow ? 'font-semibold text-amber-800' : 'text-slate-900',
                        )}
                      >
                        {formatInventoryStockDisplay(r)}
                      </td>
                      <td
                        className="px-3 py-3 text-slate-600"
                        title={
                          r.consumptionMode === 'progressive'
                            ? 'Saldo en lotes con remanente (sellados o abiertos). El consumo por venta sigue en ml según reglas.'
                            : 'Unidad del saldo y del movimiento de inventario.'
                        }
                      >
                        {stockDeductionUnitLabel(r)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-700">{r.minStock}</td>
                      <td className="px-3 py-3 text-slate-700">{r.consumptionMode === 'progressive' ? 'Progresivo' : 'Unitario'}</td>
                      <td className="px-3 py-3">
                        {isLow ? (
                          <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                            Bajo stock
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <InventoryRowActionsMenu
                          onConfigureConsumption={openConfig}
                          onRegisterMovement={openMovement}
                          row={r}
                        />
                      </td>
                    </tr>
                  )
                })}
                {!rows.length ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>
                      Sin datos.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={totalRows}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        ) : null}
      </Card>

      <RegisterMovementModal
        onClose={closeMovement}
        onOpenConsumptionConfig={switchMovementToConfig}
        open={movementProduct != null}
        product={movementProduct}
      />

      <ConsumptionConfigModal onClose={closeConfig} open={configProduct != null} product={configProduct} />
    </div>
  )
}
