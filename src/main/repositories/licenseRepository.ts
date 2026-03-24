import type Database from 'better-sqlite3'

export interface LicenseActivationRecord {
  id: number
  licenseKeyHash: string | null
  activationMode: 'key' | 'manual'
  planType: 'monthly' | 'semiannual' | 'annual'
  activatedAt: string
  expiresAt: string
  status: 'active' | 'expired' | 'suspended'
  issuedTo: string | null
  notes: string | null
  createdByEmployeeId: number | null
  createdAt: string
  updatedAt: string
}

type LicenseActivationRow = {
  id: number
  license_key_hash: string | null
  activation_mode: LicenseActivationRecord['activationMode']
  plan_type: LicenseActivationRecord['planType']
  activated_at: string
  expires_at: string
  status: LicenseActivationRecord['status']
  issued_to: string | null
  notes: string | null
  created_by_employee_id: number | null
  created_at: string
  updated_at: string
}

function mapActivation(row: LicenseActivationRow): LicenseActivationRecord {
  return {
    id: row.id,
    licenseKeyHash: row.license_key_hash,
    activationMode: row.activation_mode,
    planType: row.plan_type,
    activatedAt: row.activated_at,
    expiresAt: row.expires_at,
    status: row.status,
    issuedTo: row.issued_to,
    notes: row.notes,
    createdByEmployeeId: row.created_by_employee_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class LicenseRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: {
    licenseKeyHash: string | null
    activationMode: LicenseActivationRecord['activationMode']
    planType: LicenseActivationRecord['planType']
    activatedAt: string
    expiresAt: string
    status: LicenseActivationRecord['status']
    issuedTo?: string | null
    notes?: string | null
    createdByEmployeeId: number | null
  }) {
    const result = this.db
      .prepare(
        `INSERT INTO license_activations (
          license_key_hash,
          activation_mode,
          plan_type,
          activated_at,
          expires_at,
          status,
          issued_to,
          notes,
          created_by_employee_id
        ) VALUES (
          @licenseKeyHash,
          @activationMode,
          @planType,
          @activatedAt,
          @expiresAt,
          @status,
          @issuedTo,
          @notes,
          @createdByEmployeeId
        )`,
      )
      .run({
        licenseKeyHash: input.licenseKeyHash,
        activationMode: input.activationMode,
        planType: input.planType,
        activatedAt: input.activatedAt,
        expiresAt: input.expiresAt,
        status: input.status,
        issuedTo: input.issuedTo ?? null,
        notes: input.notes ?? null,
        createdByEmployeeId: input.createdByEmployeeId,
      })

    return this.getById(Number(result.lastInsertRowid))!
  }

  getById(id: number) {
    const row = this.db.prepare('SELECT * FROM license_activations WHERE id = ?').get(id) as LicenseActivationRow | undefined
    return row ? mapActivation(row) : null
  }

  getLatest() {
    const row = this.db
      .prepare(
        `SELECT *
         FROM license_activations
         ORDER BY datetime(activated_at) DESC, id DESC
         LIMIT 1`,
      )
      .get() as LicenseActivationRow | undefined

    return row ? mapActivation(row) : null
  }

  updateStatus(id: number, status: LicenseActivationRecord['status'], notes?: string | null) {
    this.db
      .prepare(
        `UPDATE license_activations
         SET status = ?, notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .run(status, notes ?? null, id)
  }
}
