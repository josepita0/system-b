import type Database from 'better-sqlite3'
import {
  activateLicenseByKeySchema,
  activateLicenseManualSchema,
  cancelLicenseSchema,
  renewLicenseSchema,
  validateLicenseSecretSchema,
} from '../../shared/schemas/licenseSchema'
import type {
  ActivateLicenseByKeyInput,
  ActivateLicenseManualInput,
  CancelLicenseInput,
  LicenseAccessSession,
  LicenseFeatureFlags,
  LicensedFeatureKey,
  LicensePlanType,
  LicenseStatus,
  LicenseStatusInfo,
  RenewLicenseInput,
  ValidateLicenseSecretInput,
} from '../../shared/types/license'
import { LicenseAccessError, LicenseRestrictionError, ValidationError } from '../errors'
import { AuditLogRepository } from '../repositories/auditLogRepository'
import { LicenseRepository, type LicenseActivationRecord } from '../repositories/licenseRepository'
import { randomSecret, sha256 } from '../security/password'

const ACCESS_WINDOW_MINUTES = 5
const DAY_IN_MS = 24 * 60 * 60 * 1000
type ResolvedLicenseStatus = Exclude<LicenseStatus, 'missing'>

function normalizeText(value?: string | null) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function normalizeLicenseKey(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '')
}

function normalizeSecret(value: string) {
  return value.trim().toUpperCase()
}

function nowIso() {
  return new Date().toISOString()
}

function plusMinutesIso(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString()
}

function plusMonthsIso(baseIso: string, months: number) {
  const date = new Date(baseIso)
  const next = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  )
  return next.toISOString()
}

function calculateExpiry(activatedAt: string, planType: LicensePlanType) {
  switch (planType) {
    case 'monthly':
      return plusMonthsIso(activatedAt, 1)
    case 'semiannual':
      return plusMonthsIso(activatedAt, 6)
    case 'annual':
      return plusMonthsIso(activatedAt, 12)
    default:
      return plusMonthsIso(activatedAt, 1)
  }
}

function calculateDaysRemaining(expiresAt: string) {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / DAY_IN_MS))
}

function isExpired(expiresAt: string) {
  return new Date(expiresAt).getTime() < Date.now()
}

function buildStatusMessage(status: LicenseStatus, expiresAt: string | null) {
  switch (status) {
    case 'active':
      return expiresAt ? `Licencia activa hasta ${new Date(expiresAt).toLocaleString()}.` : 'Licencia activa.'
    case 'expired':
      return 'La licencia esta vencida. La generacion de PDF, el envio de reportes y el dashboard administrativo quedan bloqueados.'
    case 'suspended':
      return 'La licencia esta suspendida. Las funciones administrativas sujetas a licencia quedan bloqueadas.'
    case 'missing':
    default:
      return 'No hay una licencia registrada. La operacion de ventas sigue disponible, pero reportes y dashboard quedan limitados.'
  }
}

export class LicenseService {
  private readonly licenses: LicenseRepository
  private readonly audit: AuditLogRepository
  private readonly accessSessions = new Map<number, { tokenHash: string; expiresAt: string }>()

  constructor(db: Database.Database) {
    this.licenses = new LicenseRepository(db)
    this.audit = new AuditLogRepository(db)
  }

  getStatus(): LicenseStatusInfo {
    const activation = this.resolveCurrentActivation()
    if (!activation) {
      return {
        id: null,
        status: 'missing',
        activationMode: null,
        planType: null,
        activatedAt: null,
        expiresAt: null,
        issuedTo: null,
        notes: null,
        createdByEmployeeId: null,
        lastUpdatedAt: null,
        daysRemaining: null,
        message: buildStatusMessage('missing', null),
      }
    }

    const status = this.resolveEffectiveStatus(activation)
    return {
      id: activation.id,
      status,
      activationMode: activation.activationMode,
      planType: activation.planType,
      activatedAt: activation.activatedAt,
      expiresAt: activation.expiresAt,
      issuedTo: activation.issuedTo,
      notes: activation.notes,
      createdByEmployeeId: activation.createdByEmployeeId,
      lastUpdatedAt: activation.updatedAt,
      daysRemaining: status === 'active' ? calculateDaysRemaining(activation.expiresAt) : 0,
      message: buildStatusMessage(status, activation.expiresAt),
    }
  }

  getFeatureFlags(): LicenseFeatureFlags {
    const status = this.getStatus()
    const enabled = status.status === 'active'

    return {
      status: status.status,
      dashboardEnabled: enabled,
      reportPdfEnabled: enabled,
      reportEmailEnabled: enabled,
      reason: enabled ? null : status.message,
      expiresAt: status.expiresAt,
    }
  }

  validateSecretAccess(actorEmployeeId: number, input: ValidateLicenseSecretInput): LicenseAccessSession {
    const parsed = validateLicenseSecretSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((issue) => issue.message).join(', '))
    }

    if (normalizeSecret(parsed.data.secret) !== normalizeSecret(this.getPanelSecret())) {
      throw new LicenseAccessError('La clave administrativa para licencias es invalida.')
    }

    const accessToken = randomSecret(24)
    const expiresAt = plusMinutesIso(ACCESS_WINDOW_MINUTES)
    this.accessSessions.set(actorEmployeeId, {
      tokenHash: sha256(accessToken),
      expiresAt,
    })

    this.audit.create({
      actorEmployeeId,
      action: 'license.secret_access_validated',
      targetType: 'license',
      targetId: null,
      details: { expiresAt },
    })

    return { accessToken, expiresAt }
  }

  activateByKey(actorEmployeeId: number, input: ActivateLicenseByKeyInput) {
    const parsed = activateLicenseByKeySchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((issue) => issue.message).join(', '))
    }

    this.assertUnlocked(actorEmployeeId, parsed.data.accessToken)
    const normalizedLicenseKey = normalizeLicenseKey(parsed.data.licenseKey)
    if (!/^[A-Z0-9-]{8,120}$/.test(normalizedLicenseKey)) {
      throw new ValidationError('La licencia debe contener solo letras, numeros o guiones.')
    }

    const activation = this.createActivation(actorEmployeeId, {
      licenseKeyHash: sha256(normalizedLicenseKey),
      activationMode: 'key',
      planType: parsed.data.planType,
      issuedTo: normalizeText(parsed.data.issuedTo),
      notes: normalizeText(parsed.data.notes),
    })

    this.audit.create({
      actorEmployeeId,
      action: 'license.activated_by_key',
      targetType: 'license',
      targetId: activation.id,
      details: {
        planType: activation.planType,
        expiresAt: activation.expiresAt,
        activationMode: activation.activationMode,
      },
    })

    return this.getStatus()
  }

  activateManual(actorEmployeeId: number, input: ActivateLicenseManualInput) {
    const parsed = activateLicenseManualSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((issue) => issue.message).join(', '))
    }

    this.assertUnlocked(actorEmployeeId, parsed.data.accessToken)
    const activation = this.createActivation(actorEmployeeId, {
      licenseKeyHash: null,
      activationMode: 'manual',
      planType: parsed.data.planType,
      issuedTo: normalizeText(parsed.data.issuedTo),
      notes: normalizeText(parsed.data.notes),
    })

    this.audit.create({
      actorEmployeeId,
      action: 'license.activated_manual',
      targetType: 'license',
      targetId: activation.id,
      details: {
        planType: activation.planType,
        expiresAt: activation.expiresAt,
      },
    })

    return this.getStatus()
  }

  renew(actorEmployeeId: number, input: RenewLicenseInput) {
    const parsed = renewLicenseSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((issue) => issue.message).join(', '))
    }

    this.assertUnlocked(actorEmployeeId, parsed.data.accessToken)
    const current = this.resolveCurrentActivation()
    const normalizedLicenseKey =
      parsed.data.mode === 'key' ? normalizeLicenseKey(parsed.data.licenseKey ?? '') : null

    if (parsed.data.mode === 'key' && !/^[A-Z0-9-]{8,120}$/.test(normalizedLicenseKey ?? '')) {
      throw new ValidationError('La licencia debe contener solo letras, numeros o guiones.')
    }

    const activation = this.createActivation(actorEmployeeId, {
      licenseKeyHash: normalizedLicenseKey ? sha256(normalizedLicenseKey) : null,
      activationMode: parsed.data.mode,
      planType: parsed.data.planType,
      issuedTo: normalizeText(parsed.data.issuedTo),
      notes: normalizeText(parsed.data.notes),
    })

    this.audit.create({
      actorEmployeeId,
      action: 'license.renewed',
      targetType: 'license',
      targetId: activation.id,
      details: {
        previousLicenseId: current?.id ?? null,
        planType: activation.planType,
        activationMode: activation.activationMode,
        expiresAt: activation.expiresAt,
      },
    })

    return this.getStatus()
  }

  cancel(actorEmployeeId: number, input: CancelLicenseInput) {
    const parsed = cancelLicenseSchema.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((issue) => issue.message).join(', '))
    }

    this.assertUnlocked(actorEmployeeId, parsed.data.accessToken)
    const current = this.resolveCurrentActivation()
    if (!current) {
      throw new ValidationError('No existe una licencia registrada para cancelar.')
    }

    if (current.status === 'suspended') {
      throw new ValidationError('La licencia actual ya se encuentra cancelada.')
    }

    this.licenses.updateStatus(current.id, 'suspended', normalizeText(parsed.data.notes))
    this.audit.create({
      actorEmployeeId,
      action: 'license.cancelled',
      targetType: 'license',
      targetId: current.id,
      details: {
        previousStatus: current.status,
        notes: normalizeText(parsed.data.notes),
      },
    })

    return this.getStatus()
  }

  assertFeatureEnabled(feature: LicensedFeatureKey, actorEmployeeId: number | null) {
    const flags = this.getFeatureFlags()
    const enabled =
      feature === 'dashboard.view'
        ? flags.dashboardEnabled
        : feature === 'reports.generate_pdf'
          ? flags.reportPdfEnabled
          : flags.reportEmailEnabled

    if (enabled) {
      return
    }

    this.audit.create({
      actorEmployeeId,
      action: 'license.blocked_feature_attempt',
      targetType: 'license',
      targetId: this.getStatus().id,
      details: {
        feature,
        status: flags.status,
        reason: flags.reason,
      },
    })

    throw new LicenseRestrictionError(flags.reason ?? 'La licencia actual no permite ejecutar esta funcion.')
  }

  private createActivation(
    actorEmployeeId: number,
    input: {
      licenseKeyHash: string | null
      activationMode: LicenseActivationRecord['activationMode']
      planType: LicenseActivationRecord['planType']
      issuedTo: string | null
      notes: string | null
    },
  ) {
    const activatedAt = nowIso()
    const expiresAt = calculateExpiry(activatedAt, input.planType)
    return this.licenses.create({
      licenseKeyHash: input.licenseKeyHash,
      activationMode: input.activationMode,
      planType: input.planType,
      activatedAt,
      expiresAt,
      status: 'active',
      issuedTo: input.issuedTo,
      notes: input.notes,
      createdByEmployeeId: actorEmployeeId,
    })
  }

  private resolveCurrentActivation(): LicenseActivationRecord | null {
    const latest = this.licenses.getLatest()
    if (!latest) {
      return null
    }

    const effectiveStatus = this.resolveEffectiveStatus(latest)
    if (effectiveStatus !== latest.status) {
      this.licenses.updateStatus(latest.id, effectiveStatus)
      return { ...latest, status: effectiveStatus, updatedAt: nowIso() }
    }

    return latest
  }

  private resolveEffectiveStatus(activation: LicenseActivationRecord): ResolvedLicenseStatus {
    if (activation.status === 'suspended') {
      return 'suspended'
    }

    if (isExpired(activation.expiresAt)) {
      return 'expired'
    }

    return 'active'
  }

  private assertUnlocked(actorEmployeeId: number, accessToken: string) {
    const session = this.accessSessions.get(actorEmployeeId)
    if (!session) {
      throw new LicenseAccessError('Debe validar la clave administrativa antes de gestionar la licencia.')
    }

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      this.accessSessions.delete(actorEmployeeId)
      throw new LicenseAccessError('La ventana de acceso administrativo expiro. Valide la clave nuevamente.')
    }

    if (session.tokenHash !== sha256(accessToken)) {
      throw new LicenseAccessError('El token de acceso para licencias no es valido.')
    }
  }

  private getPanelSecret() {
    return process.env.SYSTEM_BARRA_LICENSE_PANEL_SECRET?.trim() || 'ACTIVAR-LICENCIA-ADMIN'
  }
}
