export interface SmtpSettingsPublic {
  smtpHost: string | null
  smtpPort: number | null
  smtpUser: string | null
  smtpSecure: boolean
  /** Correo donde se envían los PDFs de cierre de turno (cola SMTP). */
  reportRecipientEmail: string | null
  /** Indica si hay valor persistido; nunca se devuelve la contraseña. */
  passwordConfigured: boolean
  /** True si `SYSTEM_BARRA_SMTP_PASSWORD` está definida (anula valor en base al enviar). */
  passwordFromEnv: boolean
}

export interface UpdateSmtpSettingsInput {
  smtpHost: string | null
  smtpPort: number | null
  smtpUser: string | null
  smtpSecure: boolean
  reportRecipientEmail: string | null
  /** Vacío = no cambiar contraseña guardada. */
  smtpPassword?: string
}

export interface SmtpTestResult {
  ok: boolean
  message: string
}

export interface CashSettingsPublic {
  /** Monto mínimo recomendado/permitido para apertura de caja. */
  minOpeningCash: number
}

export interface UpdateCashSettingsInput {
  minOpeningCash: number
}
