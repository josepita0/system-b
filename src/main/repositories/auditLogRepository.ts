import type Database from 'better-sqlite3'

export class AuditLogRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: {
    actorEmployeeId: number | null
    action: string
    targetType: string
    targetId: number | null
    details?: Record<string, unknown> | null
  }) {
    this.db
      .prepare(
        `INSERT INTO audit_logs (
          actor_employee_id, action, target_type, target_id, details
        ) VALUES (
          @actorEmployeeId, @action, @targetType, @targetId, @details
        )`,
      )
      .run({
        actorEmployeeId: input.actorEmployeeId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        details: input.details ? JSON.stringify(input.details) : null,
      })
  }
}
