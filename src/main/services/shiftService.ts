import { closeShiftSchema, openShiftSchema } from '../../shared/schemas/shiftSchema'
import type { CloseShiftInput, OpenShiftInput } from '../../shared/types/shift'
import { ShiftStateError, ValidationError } from '../errors'
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
    return this.repository.getCurrentSession()
  }

  open(input: OpenShiftInput) {
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

    return this.repository.createSession(shift.id, parsed.data.businessDate, parsed.data.openingCash)
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
    return this.repository.closeSession(session.id, expectedCash, parsed.data.countedCash)
  }
}
