import { z } from 'zod'

export const updateSmtpSettingsSchema = z.object({
  smtpHost: z.string().max(500).nullable(),
  smtpPort: z.union([z.number().int().min(1).max(65535), z.null()]),
  smtpUser: z.string().max(500).nullable(),
  smtpSecure: z.boolean(),
  /** Trim antes de validar; evita que copias con espacios fallen o no se persistan como el usuario espera. */
  reportRecipientEmail: z
    .union([
      z.string().trim().max(500).pipe(z.email({ message: 'Correo de destino invalido.' })),
      z.literal(''),
      z.null(),
    ])
    .optional()
    .transform((v) => (v === undefined || v === '' ? null : v)),
  smtpPassword: z.string().max(500).optional(),
})
