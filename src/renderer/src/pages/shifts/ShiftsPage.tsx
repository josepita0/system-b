import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@renderer/components/ui/Button'
import { Card } from '@renderer/components/ui/Card'
import { Field } from '@renderer/components/ui/Field'
import { Input } from '@renderer/components/ui/Input'
import { Modal } from '@renderer/components/ui/Modal'
import { tableTheadClass } from '@renderer/lib/tableStyles'
import { TablePagination } from '@renderer/components/ui/TablePagination'
import { DEFAULT_PAGE_SIZE } from '@shared/types/pagination'
import type { ShiftCloseReport } from '@shared/types/report'
import type { CashSession, ShiftSessionDetail } from '@shared/types/shift'
import type { UserRole } from '@shared/types/user'
import { useAuthStore } from '@renderer/store/authStore'
import { OpenShiftModal } from '@renderer/components/shifts/OpenShiftModal'

/** Administrador / Encargado: cualquier caja abierta. Empleado: solo la que él abrió. */
function canManageOpenCashSession(role: UserRole | undefined, userId: number | undefined, session: CashSession | null | undefined) {
  if (!session || session.status !== 'open') {
    return false
  }
  if (role === 'admin' || role === 'manager') {
    return true
  }
  return session.openedByUserId != null && userId != null && session.openedByUserId === userId
}

function displayExpected(row: {
  status: string
  openingCash: number
  expectedCash: number | null
  liveExpectedCash?: number | null
}) {
  // "Esperado" en UI = movimientos en efectivo del turno (sin contemplar la apertura).
  if (row.status === 'open' && row.liveExpectedCash != null) {
    return (row.liveExpectedCash - row.openingCash).toFixed(2)
  }
  return row.expectedCash != null ? (row.expectedCash - row.openingCash).toFixed(2) : '—'
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

function displayCounted(row: {
  status: string
  openingCash: number
  countedCash: number | null
  liveExpectedCash?: number | null
}) {
  // "Contado" en UI = movimientos en efectivo según lo contado (sin contemplar la apertura).
  // Para turno abierto, se muestra el esperado en vivo como proxy (apertura + ventas/cobros) sin apertura.
  if (row.status === 'open' && row.liveExpectedCash != null) {
    return (row.liveExpectedCash - row.openingCash).toFixed(2)
  }
  return row.countedCash != null ? (row.countedCash - row.openingCash).toFixed(2) : '—'
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
  const heading = compact
    ? 'mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600'
    : 'mb-2 text-sm font-semibold text-slate-800'

  if (isLoading) {
    return <p className="text-sm text-slate-500">Cargando movimientos...</p>
  }
  if (error) {
    return <p className="text-sm text-rose-600">{error.message ?? 'No se pudo cargar el detalle.'}</p>
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
              <li className={`rounded-xl border border-border bg-slate-50 ${box}`} key={sale.id}>
                <div className="flex flex-wrap justify-between gap-2 text-slate-800">
                  <span>
                    #{sale.id} · {saleTypeLabel(sale.saleType)}
                    {sale.tabCustomerName ? ` · Cuenta: ${sale.tabCustomerName}` : ''}
                    {sale.vipCustomerName ? ` · VIP: ${sale.vipCustomerName}` : ''} · {sale.createdAt}
                  </span>
                  <span className="font-semibold tabular-nums text-brand">{sale.total.toFixed(2)}</span>
                </div>
                {sale.lines.length > 0 ? (
                  <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
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
              <li className={`rounded-xl border border-border bg-slate-50 ${box}`} key={tab.id}>
                <p className="font-medium text-slate-900">{tab.customerName}</p>
                <p className="text-xs text-slate-600">
                  Estado: {tab.status}
                  {tab.openedHere ? ' · Apertura en este turno' : ''}
                  {tab.settledHere ? ' · Liquidacion en este turno' : ''}
                  {tab.cancelledHere ? ' · Cancelada en este turno' : ''}
                </p>
                {tab.status === 'cancelled' && tab.cancelReason ? (
                  <p className="mt-1 text-xs text-rose-700">Motivo: {tab.cancelReason}</p>
                ) : null}
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
  const user = useAuthStore((s) => s.user)
  const [detailSessionId, setDetailSessionId] = useState<number | null>(null)
  const [closeModalOpen, setCloseModalOpen] = useState(false)
  const [openModalOpen, setOpenModalOpen] = useState(false)
  const [closePassword, setClosePassword] = useState('')
  const [closeCountedCash, setCloseCountedCash] = useState<number | ''>('')
  const [closeNote, setCloseNote] = useState('')
  const [closeFeedback, setCloseFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const [resendFeedback, setResendFeedback] = useState<{ ok: boolean; message: string; sessionId: number } | null>(null)
  const [nowTick, setNowTick] = useState(() => Date.now())
  const [historyPage, setHistoryPage] = useState(1)
  const [historyPageSize, setHistoryPageSize] = useState(DEFAULT_PAGE_SIZE)

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
    queryKey: ['shift', 'historyPaged', currentQuery.data?.id ?? 'none', historyPage, historyPageSize],
    queryFn: () => window.api.shifts.listHistoryPaged({ page: historyPage, pageSize: historyPageSize }),
    enabled: !currentQuery.isLoading,
    refetchInterval: currentQuery.data?.status === 'open' ? 8000 : false,
  })

  const totalHistory = historyQuery.data?.total ?? 0

  const maxHistoryPage = useMemo(() => Math.max(1, Math.ceil(totalHistory / historyPageSize)), [totalHistory, historyPageSize])

  useEffect(() => {
    if (historyPage > maxHistoryPage) {
      setHistoryPage(maxHistoryPage)
    }
  }, [historyPage, maxHistoryPage])

  useEffect(() => {
    setHistoryPage(1)
  }, [historyPageSize])

  /** Si el listado aún no incluye la sesión abierta (caché / carrera), se antepone una fila desde `current()` — solo si el usuario puede gestionarla (misma regla que el backend). */
  const historyRows = useMemo(() => {
    const rows = historyQuery.data?.items ?? []
    const cur = currentQuery.data
    if (!cur || cur.status !== 'open') {
      return rows
    }
    if (!canManageOpenCashSession(user?.role, user?.id, cur)) {
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
        openingCashNote: cur.openingCashNote ?? null,
        closingNote: cur.closingNote ?? null,
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
  }, [historyQuery.data, currentQuery.data, user?.id, user?.role])

  const detailQuery = useQuery({
    queryKey: ['shift', 'detail', detailSessionId],
    queryFn: () => window.api.shifts.getSessionDetail(detailSessionId!),
    enabled: typeof detailSessionId === 'number',
  })

  const canManageCurrentOpen = canManageOpenCashSession(user?.role, user?.id, currentQuery.data ?? undefined)
  const closeModalSessionId =
    canManageCurrentOpen && currentQuery.data?.status === 'open' ? currentQuery.data.id : undefined
  const closeModalDetailQuery = useQuery({
    queryKey: ['shift', 'closeModal', closeModalSessionId],
    queryFn: () => window.api.shifts.getSessionDetail(closeModalSessionId!),
    enabled: closeModalOpen && typeof closeModalSessionId === 'number',
  })

  // Apertura de turno ahora se gestiona con modal (`OpenShiftModal`).

  const confirmCloseMutation = useMutation({
    mutationFn: async (password: string) => {
      const session = currentQuery.data
      if (!session || session.status !== 'open') {
        throw new Error('No hay sesion abierta.')
      }
      const countedCashRaw = closeCountedCash
      if (countedCashRaw === '' || Number.isNaN(Number(countedCashRaw))) {
        throw new Error('Indique el efectivo contado para cerrar el turno.')
      }
      await window.api.auth.verifyPassword({ password })
      const note = closeNote.trim()
      if (!note) {
        throw new Error('Indique una nota de cierre para cerrar el turno.')
      }
      await window.api.shifts.close({ sessionId: session.id, countedCash: Number(countedCashRaw), closingNote: note })
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
      setCloseNote('')
      await queryClient.invalidateQueries({ queryKey: ['shift'] })
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

  const resendShiftClosePdfMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const report = await window.api.reports.generateShiftClose(sessionId)
      return report as ShiftCloseReport
    },
    onSuccess: async (r) => {
      await queryClient.invalidateQueries({ queryKey: ['reports', 'pending-emails'] })
      let msg = `PDF de cierre regenerado para sesión #${r.sessionId}.`
      if (r.emailSentImmediately && r.reportRecipientEmail) {
        msg += ` Correo enviado a ${r.reportRecipientEmail}.`
      } else if (r.emailEnqueued && r.reportRecipientEmail) {
        msg += ` No se pudo enviar ahora; correo en cola para ${r.reportRecipientEmail} (reintente desde Reportes).`
      } else {
        msg += ' No se configuró envío por correo (revise destinatario en el panel de licencia).'
      }
      setResendFeedback({ ok: true, message: msg, sessionId: r.sessionId })
    },
    onError: (e, sessionId) => {
      setResendFeedback({
        ok: false,
        sessionId,
        message: e instanceof Error ? e.message : 'No se pudo reenviar el PDF.',
      })
    },
  })

  const openCloseModal = () => {
    setCloseFeedback(null)
    setClosePassword('')
    setCloseNote('')
    const s = currentQuery.data
    if (s?.status === 'open') {
      const suggested = s.liveExpectedCash ?? s.openingCash
      setCloseCountedCash(Number.isFinite(suggested) ? Math.round(suggested * 100) / 100 : '')
    } else {
      setCloseCountedCash('')
    }
    setCloseModalOpen(true)
  }

  const closeShiftModalOpen = closeModalOpen && canManageCurrentOpen && currentQuery.data?.status === 'open'

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Turnos y caja</h1>
        <p className="text-sm text-slate-500">Apertura, cierre, histórico y conciliación de pagarés.</p>
      </div>
      <Card className="shadow-sm" padding="lg">
        {currentQuery.isLoading || (currentQuery.data?.status === 'open' && !user) ? (
          <p className="text-sm text-slate-500">Cargando estado de caja...</p>
        ) : currentQuery.data?.status === 'open' ? (
          canManageCurrentOpen ? (
            <div className="space-y-3 text-slate-700">
              <p className="font-medium text-slate-900">Sesión abierta: #{currentQuery.data.id}</p>
              <p className="text-sm">
                Fecha operativa: {currentQuery.data.businessDate} · {formatNowClock(nowTick)}
              </p>
              {closeFeedback ? (
                <p className={`text-sm ${closeFeedback.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{closeFeedback.message}</p>
              ) : null}
              <Button disabled={confirmCloseMutation.isPending} onClick={openCloseModal} variant="warning">
                Cerrar turno
              </Button>
            </div>
          ) : (
            <div className="space-y-3 text-slate-700">
              <p className="font-medium text-slate-900">Caja abierta en otra sesión</p>
              <p className="text-sm text-slate-600">
                Hay un turno en curso (#{currentQuery.data.id}, fecha operativa {currentQuery.data.businessDate}). Fue abierto por
                otro usuario; no puede cerrarlo ni verlo en su historial. Use Ventas con normalidad mientras la caja siga abierta.
              </p>
            </div>
          )
        ) : (
          <div className="space-y-3 text-slate-700">
            <p>No hay turno activo.</p>
            <Button onClick={() => setOpenModalOpen(true)} variant="primary">
              Abrir turno actual
            </Button>
          </div>
        )}
      </Card>

      <OpenShiftModal onClose={() => setOpenModalOpen(false)} open={openModalOpen} />

      <Modal
        maxWidthClass="max-w-2xl"
        onClose={() => {
          setCloseModalOpen(false)
          setClosePassword('')
          setCloseCountedCash('')
          setCloseNote('')
        }}
        open={closeShiftModalOpen}
        title="Confirmar cierre de turno"
      >
        {currentQuery.data?.status === 'open' ? (
          <>
            <p className="text-sm leading-relaxed text-slate-600">
              Se cerrará la sesión #{currentQuery.data.id} (fecha operativa {currentQuery.data.businessDate}).
              Ingrese su contraseña para confirmar.
            </p>
            <p className="mt-2 text-xs text-slate-500">Hora actual: {formatNowClock(nowTick)}</p>

            <div className="mt-4 rounded-xl border border-border bg-slate-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Movimientos del turno hasta ahora</h3>
              <ShiftSessionMovementsLists
                compact
                detail={closeModalDetailQuery.data}
                error={closeModalDetailQuery.isError ? (closeModalDetailQuery.error as Error) : null}
                isLoading={closeModalDetailQuery.isLoading}
              />
            </div>

            <form
              className="mt-4 space-y-4 border-t border-border pt-4"
              onSubmit={(e) => {
                e.preventDefault()
                confirmCloseMutation.mutate(closePassword)
              }}
            >
              {/* <Field hint="Monto total contado en caja (incluye la apertura)." label="Efectivo contado">
                <Input
                  inputMode="decimal"
                  onChange={(e) => {
                    const v = e.target.value
                    if (v.trim() === '') {
                      setCloseCountedCash('')
                      return
                    }
                    const n = Number(v)
                    setCloseCountedCash(Number.isNaN(n) ? '' : n)
                  }}
                  placeholder="0.00"
                  type="number"
                  value={closeCountedCash === '' ? '' : String(closeCountedCash)}
                />
              </Field> */}
              <Field label="Contraseña">
                <Input
                  autoComplete="current-password"
                  onChange={(e) => setClosePassword(e.target.value)}
                  placeholder="••••••••"
                  type="password"
                  value={closePassword}
                />
              </Field>
              <Field hint="Obligatoria. Se incluirá en el detalle del turno." label="Nota de cierre">
                <textarea
                  className="min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  onChange={(e) => setCloseNote(e.target.value)}
                  placeholder="Ej. incidencia caja, observaciones, ajustes..."
                  value={closeNote}
                />
              </Field>
              {confirmCloseMutation.isError ? (
                <p className="text-sm text-rose-600">{(confirmCloseMutation.error as Error)?.message ?? 'Error al confirmar.'}</p>
              ) : null}
              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  disabled={confirmCloseMutation.isPending}
                  onClick={() => {
                    setCloseModalOpen(false)
                    setClosePassword('')
                    setCloseCountedCash('')
                  }}
                  type="button"
                  variant="secondary"
                >
                  Cancelar
                </Button>
                <Button
                  disabled={confirmCloseMutation.isPending || closePassword.length < 8 || closeNote.trim().length === 0}
                  type="submit"
                  variant="warning"
                >
                  {confirmCloseMutation.isPending ? 'Cerrando...' : 'Confirmar cierre'}
                </Button>
              </div>
            </form>
          </>
        ) : null}
      </Modal>

      <Card className="shadow-sm" padding="lg">
        <h2 className="text-lg font-semibold text-slate-900">Historico de turnos</h2>
        <p className="mt-1 text-sm text-slate-500">
          Incluye el turno en curso (si hay caja abierta) con totales en vivo para seguimiento del efectivo y pagarés.
        </p>
        {resendFeedback ? (
          <p className={`mt-3 text-sm ${resendFeedback.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{resendFeedback.message}</p>
        ) : null}
        {currentQuery.isLoading || historyQuery.isLoading ? (
          <p className="mt-4 text-sm text-slate-500">Cargando...</p>
        ) : historyQuery.isError ? (
          <p className="mt-4 text-sm text-rose-600">No se pudo cargar el historico.</p>
        ) : totalHistory === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No hay datos de turnos para mostrar.</p>
        ) : (
          <div className="mt-4 w-full min-w-0 overflow-x-auto rounded-xl border-2 border-slate-200 bg-white shadow-inner">
            <table className="min-w-full text-left text-sm text-slate-800">
              <thead className={tableTheadClass}>
                <tr>
                  <th className="px-3 py-3">ID</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="px-3 py-3">Fecha op.</th>
                  <th className="px-3 py-3">Turno</th>
                  <th className="px-3 py-3">Abrio</th>
                  <th className="px-3 py-3 text-right">Apertura caja</th>
                  <th className="px-3 py-3 text-right">Esperado</th>
                  <th className="px-3 py-3 text-right">Contado</th>
                  <th className="px-3 py-3 text-right">Dif.</th>
                  <th className="px-3 py-3 text-right">Por conciliar</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {historyRows.map((row, index) => (
                  <tr
                    className={`border-t border-slate-200 ${
                      row.status === 'open'
                        ? 'bg-emerald-50/90'
                        : index % 2 === 0
                          ? 'bg-white hover:bg-slate-50'
                          : 'bg-slate-50/80 hover:bg-slate-100/80'
                    }`}
                    key={row.id}
                  >
                    <td className="px-3 py-3 font-mono text-slate-800">#{row.id}</td>
                    <td className="px-3 py-3">
                      {row.status === 'open' ? (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">En curso</span>
                      ) : (
                        <span className="text-slate-600">Cerrado</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-800">{row.businessDate}</td>
                    <td className="px-3 py-3 text-slate-800">{row.shiftName}</td>
                    <td className="px-3 py-3 text-slate-700">{row.openedByLabel ?? '—'}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-900">{row.openingCash.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-900">{displayExpected(row)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-900">{displayCounted(row)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-900">{row.differenceCash != null ? row.differenceCash.toFixed(2) : '—'}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-900">{displayPendingReconcile(row)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button className="px-2 py-1.5 text-xs" onClick={() => setDetailSessionId(row.id)} type="button" variant="secondary">
                          Detalle
                        </Button>
                        {row.status === 'open' ? null : (
                          <Button
                            className="px-2 py-1.5 text-xs"
                            disabled={resendShiftClosePdfMutation.isPending}
                            onClick={() => {
                              setResendFeedback(null)
                              resendShiftClosePdfMutation.mutate(row.id)
                            }}
                            type="button"
                            variant="primary"
                          >
                            Reenviar PDF
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePagination
              page={historyPage}
              pageSize={historyPageSize}
              total={totalHistory}
              onPageChange={setHistoryPage}
              onPageSizeChange={setHistoryPageSize}
            />
          </div>
        )}
      </Card>

      <Modal
        footer={
          <Button onClick={closeDetail} type="button" variant="secondary">
            Cerrar
          </Button>
        }
        maxWidthClass="max-w-3xl"
        onClose={closeDetail}
        open={detailSessionId != null}
        title={detailSessionId != null ? `Detalle de sesión #${detailSessionId}` : 'Detalle de sesión'}
      >
        {detailQuery.isLoading ? <p className="text-sm text-slate-500">Cargando...</p> : null}
        {detailQuery.isError ? (
          <p className="text-sm text-rose-600">{(detailQuery.error as Error)?.message ?? 'No se pudo cargar el detalle.'}</p>
        ) : null}
        {detailQuery.data?.session ? (
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            {detailQuery.data.session.status === 'open' ? (
              <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                En curso
              </span>
            ) : null}
            <span>
              {detailQuery.data.session.businessDate} · {detailQuery.data.session.shiftName}
            </span>
          </div>
        ) : null}
        {!detailQuery.isLoading && detailQuery.data ? (
          <div className="mt-4">
            <ShiftSessionMovementsLists detail={detailQuery.data} error={null} isLoading={false} />
          </div>
        ) : null}
      </Modal>
    </section>
  )
}
