import { closeShiftSchema, openShiftSchema } from '../../shared/schemas/shiftSchema'
import type { AuthenticatedUser } from '../../shared/types/user'
import type {
  CashSessionHistoryEntry,
  CloseShiftInput,
  OpenShiftInput,
  ShiftSessionDetail,
} from '../../shared/types/shift'
import { AuthorizationError, NotFoundError, ShiftStateError, ValidationError } from '../errors'
import { hasAtLeastRole } from './authorizationService'
import { ShiftRepository } from '../repositories/shiftRepository'

export function resolveShiftForDate(date: Date) {
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const absoluteMinutes = hours * 60 + minutes

  if (absoluteMinutes >= 10 * 60 && absoluteMinutes < 19 * 60) {
    return 'day' as const
  }

  return 'night' as const
}

export class ShiftService {
  constructor(private readonly repository: ShiftRepository) {}

  definitions() {
    return this.repository.listDefinitions()
  }

  current() {
    const s = this.repository.getCurrentSession()
    if (!s || s.status !== 'open') {
      return s
    }
    const cashSales = this.repository.getSalesTotalForSession(s.id)
    const pending = this.repository.getPendingReconcileForSession(s.id)
    return {
      ...s,
      liveExpectedCash: Math.round((s.openingCash + cashSales) * 100) / 100,
      livePendingReconcile: Math.round(pending * 100) / 100,
    }
  }

  open(input: OpenShiftInput, openedByUserId: number) {
    const parsed = openShiftSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((issue) => issue.message).join(', '))
    }

    const current = this.repository.getCurrentSession()
    if (current) {
      throw new ShiftStateError('Ya existe un turno abierto.')
    }

    const definitions = this.repository.listDefinitions()
    const shift = definitions.find((item: { code: string }) => item.code === parsed.data.shiftCode)
    if (!shift) {
      throw new ShiftStateError('Turno no configurado.')
    }

    return this.repository.createSession(shift.id, parsed.data.businessDate, parsed.data.openingCash, openedByUserId)
  }

  listHistory(actor: AuthenticatedUser): CashSessionHistoryEntry[] {
    if (hasAtLeastRole(actor.role, 'manager')) {
      const ids = this.repository.listClosedSessionsForManager(200, 0)
      const closed = this.repository.getHistoryEntriesByIds(ids)
      return this.prependCurrentOpenSession(closed)
    }

    const idsOwn = this.repository.listEmployeeEligibleSessionIds(actor.id)
    const latestId = this.repository.getLatestClosedSessionId()
    const merged = [...new Set([...(latestId != null ? [latestId] : []), ...idsOwn])]
    const entries = this.repository.getHistoryEntriesByIds(merged)
    entries.sort((a, b) => {
      const ta = a.closedAt ?? ''
      const tb = b.closedAt ?? ''
      const c = tb.localeCompare(ta)
      if (c !== 0) {
        return c
      }
      return b.id - a.id
    })
    return this.prependCurrentOpenSession(entries)
  }

  /** Incluye el turno abierto al inicio para seguimiento en tiempo real del efectivo y pagarés. */
  private prependCurrentOpenSession(entries: CashSessionHistoryEntry[]) {
    const cur = this.repository.getCurrentSession()
    if (!cur || cur.status !== 'open') {
      return entries
    }
    const row = this.repository.getHistoryEntryById(cur.id)
    if (!row) {
      return entries
    }
    const rest = entries.filter((e) => e.id !== cur.id)
    return [row, ...rest]
  }

  getSessionDetail(sessionId: number, actor: AuthenticatedUser): ShiftSessionDetail {
    const entry = this.repository.getHistoryEntryById(sessionId)
    if (!entry) {
      throw new NotFoundError('Sesion no encontrada.')
    }

    if (entry.status === 'open') {
      const current = this.repository.getCurrentSession()
      const isCurrentOpen = current != null && current.id === sessionId
      if (!hasAtLeastRole(actor.role, 'manager')) {
        if (!isCurrentOpen) {
          throw new AuthorizationError('No puede ver el detalle de un turno abierto que no sea el actual.')
        }
      }
    } else if (!hasAtLeastRole(actor.role, 'manager')) {
      if (!this.repository.canEmployeeViewSession(actor.id, sessionId)) {
        throw new AuthorizationError('No puede ver el detalle de esta sesion.')
      }
    }

    return {
      session: entry,
      sales: this.repository.getSessionSalesDetail(sessionId),
      tabs: this.repository.getSessionTabsDetail(sessionId),
    }
  }

  close(input: CloseShiftInput) {
    const parsed = closeShiftSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((issue) => issue.message).join(', '))
    }

    const session = this.repository.getSessionById(parsed.data.sessionId)
    if (!session) {
      throw new ShiftStateError('Sesion de caja no encontrada.')
    }

    if (session.status === 'closed') {
      throw new ShiftStateError('La sesion ya fue cerrada.')
    }

    const expectedCash = session.openingCash + this.repository.getSalesTotalForSession(session.id)
    const pendingReconcileTotal = this.repository.getPendingReconcileForSession(session.id)
    return this.repository.closeSession(session.id, expectedCash, parsed.data.countedCash, pendingReconcileTotal)
  }
}
