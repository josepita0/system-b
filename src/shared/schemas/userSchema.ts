import { z } from 'zod'

export const userRoleSchema = z.enum(['admin', 'manager', 'employee'])

export const createUserSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  documentId: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  username: z.string().trim().min(3).max(40),
  role: userRoleSchema,
})

export const updateUserSchema = createUserSchema.extend({
  id: z.number().int().positive(),
  isActive: z.boolean(),
})
