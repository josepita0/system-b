export class AppError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super('NOT_FOUND', message, 404)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409)
  }
}

export class StockError extends AppError {
  constructor(message: string) {
    super('STOCK_ERROR', message, 409)
  }
}

export class ShiftStateError extends AppError {
  constructor(message: string) {
    super('SHIFT_STATE_ERROR', message, 409)
  }
}

export class ReportGenerationError extends AppError {
  constructor(message: string) {
    super('REPORT_GENERATION_ERROR', message, 500)
  }
}

export class EmailDeliveryError extends AppError {
  constructor(message: string) {
    super('EMAIL_DELIVERY_ERROR', message, 500)
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string) {
    super('AUTHENTICATION_ERROR', message, 401)
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string) {
    super('AUTHORIZATION_ERROR', message, 403)
  }
}

export class LockedAccountError extends AppError {
  constructor(message: string) {
    super('LOCKED_ACCOUNT', message, 423)
  }
}

export class RecoveryCodeError extends AppError {
  constructor(message: string) {
    super('RECOVERY_CODE_ERROR', message, 400)
  }
}

export class LicenseAccessError extends AppError {
  constructor(message: string) {
    super('LICENSE_ACCESS_ERROR', message, 403)
  }
}

export class LicenseRestrictionError extends AppError {
  constructor(message: string) {
    super('LICENSE_RESTRICTION', message, 403)
  }
}

export function toSerializedIpcError(error: unknown) {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      status: error.status,
    }
  }

  return {
    code: 'INTERNAL_ERROR',
    message: 'Ocurrio un error interno. Revise los logs locales para mas detalles.',
    status: 500,
  }
}
