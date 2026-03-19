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

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(10),
})
