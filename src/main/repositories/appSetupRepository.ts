import type Database from 'better-sqlite3'

type AppSetupRow = {
  id: number
  wizard_required: number
  completed_at: string | null
  completed_by_employee_id: number | null
  version: string | null
}

export class AppSetupRepository {
  constructor(private readonly db: Database.Database) {}

  get() {
    return this.db.prepare('SELECT * FROM app_setup_status WHERE id = 1').get() as AppSetupRow | undefined
  }

  requireWizard(version: string) {
    this.db
      .prepare(
        `UPDATE app_setup_status
         SET wizard_required = 1,
             completed_at = NULL,
             completed_by_employee_id = NULL,
             version = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = 1`,
      )
      .run(version)
  }

  complete(completedByEmployeeId: number | null, version: string) {
    this.db
      .prepare(
        `UPDATE app_setup_status
         SET wizard_required = 0,
             completed_at = CURRENT_TIMESTAMP,
             completed_by_employee_id = ?,
             version = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = 1`,
      )
      .run(completedByEmployeeId, version)
  }
}
