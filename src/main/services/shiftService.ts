import { closeShiftSchema, openShiftSchema } from '../../shared/schemas/shiftSchema'
import type { PagedResult } from '../../shared/types/pagination'
import type { AuthenticatedUser } from '../../shared/types/user'
import { offsetForPage } from '../../shared/schemas/paginationSchema'
import type {
  CashSessionHistoryEntry,
  CloseShiftInput,
  OpenShiftInput,
  ShiftSessionDetail,
} from '../../shared/types/shift'
import { AuthorizationError, NotFoundError, ShiftStateError, ValidationError } from '../errors'
import { hasAtLeastRole } from './authorizationService'
import { ShiftRepository } from '../repositories/shiftRepository'
import { SettingsService } from './settingsService'

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
  constructor(
    private readonly repository: ShiftRepository,
    private readonly settings: SettingsService | null = null,
  ) {}

  definitions() {
    return this.repository.listDefinitions()
  }

  current() {
    const s = this.repository.getCurrentSession()
    if (!s || s.status !== 'open') {
      return s
    }
    const cashSales = this.repository.getSalesTotalForSession(s.id)
    const pending = this.repository.getTotalPendingReconcileOpenTabs()
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

    const minOpeningCash = this.settings?.getCashSettingsPublic().minOpeningCash ?? 0
    const noteRaw =
      parsed.data.openingCashNote !== undefined ? parsed.data.openingCashNote : null
    const note = typeof noteRaw === 'string' ? noteRaw.trim() : null
    if (parsed.data.openingCash < minOpeningCash) {
      if (!note) {
        throw new ValidationError('Indique el motivo: el monto de apertura es menor al mínimo configurado.')
      }
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

    return this.repository.createSession(
      shift.id,
      parsed.data.businessDate,
      parsed.data.openingCash,
      openedByUserId,
      note,
    )
  }

  listHistory(actor: AuthenticatedUser): CashSessionHistoryEntry[] {
    if (hasAtLeastRole(actor.role, 'manager')) {
      const ids = this.repository.listClosedSessionsForManager(200, 0)
      const closed = this.repository.getHistoryEntriesByIds(ids)
      return this.prependCurrentOpenSession(closed, actor)
    }

    const idsOwn = this.repository.listEmployeeEligibleSessionIds(actor.id)
    const entries = this.repository.getHistoryEntriesByIds(idsOwn)
    entries.sort((a, b) => {
      const ta = a.closedAt ?? ''
      const tb = b.closedAt ?? ''
      const c = tb.localeCompare(ta)
      if (c !== 0) {
        return c
      }
      return b.id - a.id
    })
    return this.prependCurrentOpenSession(entries, actor)
  }

  listHistoryPaged(actor: AuthenticatedUser, page: number, pageSize: number): PagedResult<CashSessionHistoryEntry> {
    if (hasAtLeastRole(actor.role, 'manager')) {
      const closedCount = this.repository.countClosedSessions()
      const cur = this.repository.getCurrentSession()
      const openRow = cur && cur.status === 'open' ? this.repository.getHistoryEntryById(cur.id) : null
      const hasOpen = Boolean(openRow)
      const total = closedCount + (hasOpen ? 1 : 0)
      const linearStart = (page - 1) * pageSize

      if (total === 0 || linearStart >= total) {
        return { items: [], total, page, pageSize }
      }

      let items: CashSessionHistoryEntry[]
      if (hasOpen && openRow && linearStart === 0) {
        const takeClosed = Math.max(pageSize - 1, 0)
        const closedIds = this.repository.listClosedSessionsForManager(takeClosed, 0)
        const closedEntries = this.repository.getHistoryEntriesByIds(closedIds)
        items = [openRow, ...closedEntries]
      } else if (hasOpen && openRow) {
        const closedSkip = linearStart - 1
        const closedIds = this.repository.listClosedSessionsForManager(pageSize, closedSkip)
        items = this.repository.getHistoryEntriesByIds(closedIds)
      } else {
        const closedIds = this.repository.listClosedSessionsForManager(pageSize, linearStart)
        items = this.repository.getHistoryEntriesByIds(closedIds)
      }
      return { items, total, page, pageSize }
    }

    const full = this.listHistory(actor)
    const total = full.length
    const offset = offsetForPage(page, pageSize)
    const items = full.slice(offset, offset + pageSize)
    return { items, total, page, pageSize }
  }

  /** Incluye el turno abierto al inicio para seguimiento en tiempo real del efectivo y pagarés. */
  private prependCurrentOpenSession(entries: CashSessionHistoryEntry[], actor: AuthenticatedUser) {
    const cur = this.repository.getCurrentSession()
    if (!cur || cur.status !== 'open') {
      return entries
    }
    if (!hasAtLeastRole(actor.role, 'manager')) {
      if (cur.openedByUserId == null || cur.openedByUserId !== actor.id) {
        return entries
      }
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
        const openedBySelf = entry.openedByUserId != null && entry.openedByUserId === actor.id
        if (!isCurrentOpen || !openedBySelf) {
          throw new AuthorizationError('No puede ver el detalle de este turno abierto.')
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

    const closingNote = parsed.data.closingNote.trim()
    if (!closingNote) {
      throw new ValidationError('Indique una nota de cierre.')
    }

    const session = this.repository.getSessionById(parsed.data.sessionId)
    if (!session) {
      throw new ShiftStateError('Sesion de caja no encontrada.')
    }

    if (session.status === 'closed') {
      throw new ShiftStateError('La sesion ya fue cerrada.')
    }

    const expectedCash = session.openingCash + this.repository.getSalesTotalForSession(session.id)
    const pendingReconcileTotal = this.repository.getTotalPendingReconcileOpenTabs()
    return this.repository.closeSession(session.id, expectedCash, parsed.data.countedCash, pendingReconcileTotal, closingNote)
  }
}
