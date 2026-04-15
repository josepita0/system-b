import { z } from 'zod'

export const loginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(8),
})

export const recoverPasswordSchema = z.object({
  identifier: z.string().trim().min(1),
  recoveryCode: z.string().trim().min(6),
  newPassword: z.string().min(10),
})

export const requestPasswordResetEmailCodeSchema = z.object({
  identifier: z.string().trim().min(1),
})

export const resetPasswordWithEmailCodeSchema = z.object({
  identifier: z.string().trim().min(1),
  code: z.string().trim().regex(/^\d{6}$/, 'El codigo debe tener 6 digitos.'),
  newPassword: z.string().min(10),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(10),
})

export const verifyPasswordSchema = z.object({
  password: z.string().min(8, 'La contrasena debe tener al menos 8 caracteres.'),
})
