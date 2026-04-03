import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@renderer/components/ui/Button'
import { Card } from '@renderer/components/ui/Card'
import { Field } from '@renderer/components/ui/Field'
import { Input } from '@renderer/components/ui/Input'
import { resolveShiftForDate } from '@renderer/utils/resolveShiftForDate'
import type { ShiftCloseReport } from '@shared/types/report'
import type { ShiftSessionDetail } from '@shared/types/shift'

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

function formatNowClock(ts: number) {
  return new Date(ts).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function ShiftSessionMovementsLists(props: {
  isLoading: boolean
  error: Error | null
  detail: ShiftSessionDetail | undefined
  compact?: boolean
}) {
  const { isLoading, error, detail, compact } = props
  const box = compact ? 'p-2 text-xs' : 'p-3 text-sm'
  const heading = compact ? 'mb-1.5 text-xs font-medium text-slate-400' : 'mb-2 text-sm font-medium text-slate-300'

  if (isLoading) {
    return <p className="text-sm text-slate-500">Cargando movimientos...</p>
  }
  if (error) {
    return <p className="text-sm text-rose-400">{error.message ?? 'No se pudo cargar el detalle.'}</p>
  }
  if (!detail) {
    return null
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className={heading}>Movimientos de venta</h4>
        <ul className={`max-h-48 space-y-2 overflow-y-auto ${compact ? 'pr-1' : ''}`}>
          {detail.sales.length === 0 ? (
            <li className="text-sm text-slate-500">Sin ventas registradas.</li>
          ) : (
            detail.sales.map((sale) => (
              <li className={`rounded-lg border border-slate-800 bg-slate-950/40 ${box}`} key={sale.id}>
                <div className="flex flex-wrap justify-between gap-2 text-slate-200">
                  <span>
                    #{sale.id} · {saleTypeLabel(sale.saleType)}
                    {sale.tabCustomerName ? ` · Cuenta: ${sale.tabCustomerName}` : ''} · {sale.createdAt}
                  </span>
                  <span className="font-medium text-cyan-300">{sale.total.toFixed(2)}</span>
                </div>
                {sale.lines.length > 0 ? (
                  <ul className="mt-2 space-y-0.5 text-xs text-slate-400">
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
        <h4 className={heading}>Cuentas (pagarés)</h4>
        <ul className={`max-h-36 space-y-2 overflow-y-auto ${compact ? 'pr-1' : ''}`}>
          {detail.tabs.length === 0 ? (
            <li className="text-sm text-slate-500">Sin cuentas vinculadas a este turno.</li>
          ) : (
            detail.tabs.map((tab) => (
              <li className={`rounded-lg border border-slate-800 bg-slate-950/40 ${box}`} key={tab.id}>
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
  )
}

export function ShiftsPage() {
  const queryClient = useQueryClient()
  const [detailSessionId, setDetailSessionId] = useState<number | null>(null)
  const [closeModalOpen, setCloseModalOpen] = useState(false)
  const [closePassword, setClosePassword] = useState('')
  const [closeFeedback, setCloseFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const [nowTick, setNowTick] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

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

  const closeModalSessionId = currentQuery.data?.status === 'open' ? currentQuery.data.id : undefined
  const closeModalDetailQuery = useQuery({
    queryKey: ['shift', 'closeModal', closeModalSessionId],
    queryFn: () => window.api.shifts.getSessionDetail(closeModalSessionId!),
    enabled: closeModalOpen && typeof closeModalSessionId === 'number',
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

  const confirmCloseMutation = useMutation({
    mutationFn: async (password: string) => {
      const session = currentQuery.data
      if (!session || session.status !== 'open') {
        throw new Error('No hay sesion abierta.')
      }
      await window.api.auth.verifyPassword({ password })
      await window.api.shifts.close({ sessionId: session.id, countedCash: session.openingCash })
      try {
        const report = await window.api.reports.generateShiftClose(session.id)
        return { report: report as ShiftCloseReport, reportError: null as Error | null }
      } catch (e) {
        return {
          report: null as ShiftCloseReport | null,
          reportError: e instanceof Error ? e : new Error(String(e)),
        }
      }
    },
    onSuccess: async (data) => {
      setCloseModalOpen(false)
      setClosePassword('')
      await queryClient.invalidateQueries({ queryKey: ['shift', 'current'] })
      await queryClient.invalidateQueries({ queryKey: ['shift', 'history'] })
      await queryClient.invalidateQueries({ queryKey: ['reports', 'pending-emails'] })
      if (data.reportError) {
        setCloseFeedback({
          ok: true,
          message: `Turno cerrado correctamente. No se pudo generar el PDF o el envío: ${data.reportError.message}`,
        })
        return
      }
      if (data.report) {
        const r = data.report
        let msg = 'Turno cerrado. PDF de cierre generado.'
        if (r.emailSentImmediately && r.reportRecipientEmail) {
          msg += ` Correo enviado a ${r.reportRecipientEmail}.`
        } else if (r.emailEnqueued && r.reportRecipientEmail) {
          msg += ` No se pudo enviar ahora; correo en cola para ${r.reportRecipientEmail} (reintente desde Reportes).`
        } else {
          msg += ' No se configuró envío por correo (revise destinatario en el panel de licencia).'
        }
        setCloseFeedback({ ok: true, message: msg })
      }
    },
    onError: (e) => {
      setCloseFeedback({ ok: false, message: e instanceof Error ? e.message : 'No se pudo cerrar el turno.' })
    },
  })

  const closeDetail = useCallback(() => {
    setDetailSessionId(null)
  }, [])

  const openCloseModal = () => {
    setCloseFeedback(null)
    setClosePassword('')
    setCloseModalOpen(true)
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">Turnos y caja</h1>
        <p className="text-sm text-slate-400">Apertura, cierre, histórico y conciliación de pagarés.</p>
      </div>
      <Card padding="lg">
        {currentQuery.data ? (
          <div className="space-y-3 text-slate-200">
            <p>Sesion abierta: #{currentQuery.data.id}</p>
            <p>
              Fecha operativa: {currentQuery.data.businessDate} · {formatNowClock(nowTick)}
            </p>
            {closeFeedback ? (
              <p className={`text-sm ${closeFeedback.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{closeFeedback.message}</p>
            ) : null}
            <Button
              disabled={confirmCloseMutation.isPending}
              onClick={openCloseModal}
              variant="warning"
            >
              Cerrar turno
            </Button>
          </div>
        ) : (
          <div className="space-y-3 text-slate-200">
            <p>No hay turno activo.</p>
            <Button onClick={() => openMutation.mutate()} variant="primary">
              Abrir turno actual
            </Button>
          </div>
        )}
      </Card>

      {closeModalOpen && currentQuery.data?.status === 'open' ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 py-8">
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl"
            role="dialog"
            aria-labelledby="close-shift-title"
            aria-modal="true"
          >
            <h2 className="text-lg font-semibold text-white" id="close-shift-title">
              Confirmar cierre de turno
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Se cerrará la sesión #{currentQuery.data.id} (fecha operativa {currentQuery.data.businessDate}). Tras el cierre se generará el PDF y se
              intentará enviar el correo con el adjunto al momento; si el envío falla o falta SMTP, quedará en cola para reintentar desde Reportes.
              Ingrese su contraseña para confirmar.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Hora actual: {formatNowClock(nowTick)}
            </p>

            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <h3 className="mb-2 text-sm font-medium text-slate-200">Movimientos del turno hasta ahora</h3>
              <ShiftSessionMovementsLists
                compact
                detail={closeModalDetailQuery.data}
                error={closeModalDetailQuery.isError ? (closeModalDetailQuery.error as Error) : null}
                isLoading={closeModalDetailQuery.isLoading}
              />
            </div>

            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                confirmCloseMutation.mutate(closePassword)
              }}
            >
              <Field label="Contraseña">
                <Input
                  autoComplete="current-password"
                  onChange={(e) => setClosePassword(e.target.value)}
                  placeholder="••••••••"
                  type="password"
                  value={closePassword}
                />
              </Field>
              {confirmCloseMutation.isError ? (
                <p className="text-sm text-rose-400">
                  {(confirmCloseMutation.error as Error)?.message ?? 'Error al confirmar.'}
                </p>
              ) : null}
              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  disabled={confirmCloseMutation.isPending}
                  onClick={() => {
                    setCloseModalOpen(false)
                    setClosePassword('')
                  }}
                  type="button"
                  variant="secondary"
                >
                  Cancelar
                </Button>
                <Button disabled={confirmCloseMutation.isPending || closePassword.length < 8} type="submit" variant="warning">
                  {confirmCloseMutation.isPending ? 'Cerrando...' : 'Confirmar cierre'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <Card padding="lg">
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
      </Card>

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
              <ShiftSessionMovementsLists detail={detailQuery.data} error={null} isLoading={false} />
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
