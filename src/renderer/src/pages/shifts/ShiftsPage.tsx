import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { resolveShiftForDate } from '@renderer/utils/resolveShiftForDate'

function displayExpected(row: { status: string; expectedCash: number | null; liveExpectedCash?: number | null }) {
  if (row.status === 'open' && row.liveExpectedCash != null) {
    return row.liveExpectedCash.toFixed(2)
  }
  return row.expectedCash != null ? row.expectedCash.toFixed(2) : '—'
}

function displayPendingReconcile(row: {
  status: string
  pendingReconcileTotal: number | null
  livePendingReconcile?: number | null
}) {
  if (row.status === 'open' && row.livePendingReconcile != null) {
    return row.livePendingReconcile.toFixed(2)
  }
  return row.pendingReconcileTotal != null ? row.pendingReconcileTotal.toFixed(2) : '—'
}

function saleTypeLabel(saleType: string) {
  if (saleType === 'pos') {
    return 'Contado'
  }
  if (saleType === 'tab_charge') {
    return 'Cargo a cuenta'
  }
  if (saleType === 'tab_payment') {
    return 'Cobro pagaré'
  }
  return saleType
}

export function ShiftsPage() {
  const queryClient = useQueryClient()
  const [detailSessionId, setDetailSessionId] = useState<number | null>(null)

  const currentQuery = useQuery({
    queryKey: ['shift', 'current'],
    queryFn: () => window.api.shifts.current(),
  })

  /** Incluir id de sesión actual en la clave evita listas cacheadas sin el turno "En curso" tras abrir caja o al cargar la vista. */
  const historyQuery = useQuery({
    queryKey: ['shift', 'history', currentQuery.data?.id ?? 'none'],
    queryFn: () => window.api.shifts.listHistory(),
    enabled: !currentQuery.isLoading,
    refetchInterval: currentQuery.data?.status === 'open' ? 8000 : false,
  })

  /** Si el listado aún no incluye la sesión abierta (caché / carrera), se antepone una fila desde `current()`. */
  const historyRows = useMemo(() => {
    const rows = historyQuery.data ?? []
    const cur = currentQuery.data
    if (!cur || cur.status !== 'open') {
      return rows
    }
    if (rows.some((r) => r.id === cur.id)) {
      return rows
    }
    return [
      {
        id: cur.id,
        shiftId: cur.shiftId,
        shiftName: 'Turno actual',
        businessDate: cur.businessDate,
        openedAt: cur.openedAt,
        closedAt: cur.closedAt,
        openedByUserId: cur.openedByUserId ?? null,
        openedByLabel: null,
        openingCash: cur.openingCash,
        expectedCash: cur.expectedCash,
        countedCash: cur.countedCash,
        differenceCash: cur.differenceCash,
        pendingReconcileTotal: cur.pendingReconcileTotal,
        status: 'open' as const,
        liveExpectedCash: cur.liveExpectedCash ?? null,
        livePendingReconcile: cur.livePendingReconcile ?? null,
      },
      ...rows,
    ]
  }, [historyQuery.data, currentQuery.data])

  const detailQuery = useQuery({
    queryKey: ['shift', 'detail', detailSessionId],
    queryFn: () => window.api.shifts.getSessionDetail(detailSessionId!),
    enabled: typeof detailSessionId === 'number',
  })

  const openMutation = useMutation({
    mutationFn: () =>
      window.api.shifts.open({
        shiftCode: resolveShiftForDate(new Date()),
        businessDate: new Date().toISOString().slice(0, 10),
        openingCash: 0,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shift', 'current'] })
      await queryClient.invalidateQueries({ queryKey: ['shift', 'history'] })
    },
  })

  const closeMutation = useMutation({
    mutationFn: async () => {
      const session = currentQuery.data
      if (!session) {
        return null
      }
      return window.api.shifts.close({ sessionId: session.id, countedCash: session.openingCash })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shift', 'current'] })
      await queryClient.invalidateQueries({ queryKey: ['shift', 'history'] })
    },
  })

  const closeDetail = useCallback(() => {
    setDetailSessionId(null)
  }, [])

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">Turnos y caja</h1>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-200">
        {currentQuery.data ? (
          <div className="space-y-3">
            <p>Sesion abierta: #{currentQuery.data.id}</p>
            <p>Fecha operativa: {currentQuery.data.businessDate}</p>
            <button className="rounded-lg bg-amber-500 px-4 py-2 text-slate-950" onClick={() => closeMutation.mutate()} type="button">
              Cerrar turno
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p>No hay turno activo.</p>
            <button className="rounded-lg bg-cyan-500 px-4 py-2 text-slate-950" onClick={() => openMutation.mutate()} type="button">
              Abrir turno actual
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-3 text-lg font-medium text-white">Historico de turnos</h2>
        <p className="mb-3 text-sm text-slate-500">
          Incluye el turno en curso (si hay caja abierta) con totales en vivo para seguimiento del efectivo y pagarés.
        </p>
        {currentQuery.isLoading || historyQuery.isLoading ? (
          <p className="text-sm text-slate-400">Cargando...</p>
        ) : historyQuery.isError ? (
          <p className="text-sm text-rose-400">No se pudo cargar el historico.</p>
        ) : !historyRows.length ? (
          <p className="text-sm text-slate-400">No hay datos de turnos para mostrar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-200">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Fecha op.</th>
                  <th className="py-2 pr-3">Turno</th>
                  <th className="py-2 pr-3">Abrio</th>
                  <th className="py-2 pr-3 text-right">Apertura caja</th>
                  <th className="py-2 pr-3 text-right">Esperado</th>
                  <th className="py-2 pr-3 text-right">Contado</th>
                  <th className="py-2 pr-3 text-right">Dif.</th>
                  <th className="py-2 pr-3 text-right">Por conciliar</th>
                  <th className="py-2 pr-3" />
                </tr>
              </thead>
              <tbody>
                {historyRows.map((row) => (
                  <tr
                    className={`border-b border-slate-800 ${row.status === 'open' ? 'bg-emerald-950/20' : ''}`}
                    key={row.id}
                  >
                    <td className="py-2 pr-3 font-mono text-slate-300">#{row.id}</td>
                    <td className="py-2 pr-3">
                      {row.status === 'open' ? (
                        <span className="rounded bg-emerald-600/30 px-2 py-0.5 text-xs text-emerald-200">En curso</span>
                      ) : (
                        <span className="text-slate-500">Cerrado</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">{row.businessDate}</td>
                    <td className="py-2 pr-3">{row.shiftName}</td>
                    <td className="py-2 pr-3">{row.openedByLabel ?? '—'}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.openingCash.toFixed(2)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{displayExpected(row)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.countedCash != null ? row.countedCash.toFixed(2) : '—'}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.differenceCash != null ? row.differenceCash.toFixed(2) : '—'}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{displayPendingReconcile(row)}</td>
                    <td className="py-2 pr-3">
                      <button
                        className="text-cyan-400 hover:underline"
                        onClick={() => setDetailSessionId(row.id)}
                        type="button"
                      >
                        Detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailSessionId != null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Detalle turno #{detailSessionId}
                  {detailQuery.data?.session?.status === 'open' ? (
                    <span className="ml-2 text-sm font-normal text-emerald-400">(en curso)</span>
                  ) : null}
                </h3>
                {detailQuery.data?.session ? (
                  <p className="mt-1 text-sm text-slate-400">
                    {detailQuery.data.session.businessDate} · {detailQuery.data.session.shiftName}
                  </p>
                ) : null}
              </div>
              <button
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-200"
                onClick={closeDetail}
                type="button"
              >
                Cerrar
              </button>
            </div>

            {detailQuery.isLoading ? (
              <p className="text-slate-400">Cargando...</p>
            ) : detailQuery.isError ? (
              <p className="text-rose-400">{(detailQuery.error as Error)?.message ?? 'No se pudo cargar el detalle.'}</p>
            ) : detailQuery.data ? (
              <div className="space-y-6">
                <div>
                  <h4 className="mb-2 text-sm font-medium text-slate-300">Movimientos de venta</h4>
                  <ul className="space-y-3">
                    {detailQuery.data.sales.length === 0 ? (
                      <li className="text-sm text-slate-500">Sin ventas registradas.</li>
                    ) : (
                      detailQuery.data.sales.map((sale) => (
                        <li className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm" key={sale.id}>
                          <div className="flex flex-wrap justify-between gap-2 text-slate-200">
                            <span>
                              #{sale.id} · {saleTypeLabel(sale.saleType)} · {sale.createdAt}
                            </span>
                            <span className="font-medium text-cyan-300">{sale.total.toFixed(2)}</span>
                          </div>
                          {sale.lines.length > 0 ? (
                            <ul className="mt-2 space-y-1 text-xs text-slate-400">
                              {sale.lines.map((line, idx) => (
                                <li key={`${sale.id}-${idx}`}>
                                  {line.productName} × {line.quantity} = {line.subtotal.toFixed(2)}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </li>
                      ))
                    )}
                  </ul>
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-medium text-slate-300">Cuentas (pagarés)</h4>
                  <ul className="space-y-2">
                    {detailQuery.data.tabs.length === 0 ? (
                      <li className="text-sm text-slate-500">Sin cuentas vinculadas a este turno.</li>
                    ) : (
                      detailQuery.data.tabs.map((tab) => (
                        <li className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm" key={tab.id}>
                          <p className="font-medium text-slate-100">{tab.customerName}</p>
                          <p className="text-xs text-slate-500">
                            Estado: {tab.status}
                            {tab.openedHere ? ' · Apertura en este turno' : ''}
                            {tab.settledHere ? ' · Liquidacion en este turno' : ''}
                          </p>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
