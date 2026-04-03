import { z } from 'zod'

export const licensePlanTypeSchema = z.enum(['monthly', 'semiannual', 'annual'])
export const licenseActivationModeSchema = z.enum(['key', 'manual'])

const optionalTextSchema = z.string().trim().max(240).optional().nullable()

export const validateLicenseSecretSchema = z.object({
  secret: z.string().trim().min(4).max(120),
})

export const generateLicensePanelCodeSchema = z.object({
  targetEmployeeId: z.number().int().positive(),
})

export const activateLicenseByKeySchema = z.object({
  accessToken: z.string().trim().min(10).max(200),
  licenseKey: z.string().trim().min(8).max(120),
  planType: licensePlanTypeSchema,
  issuedTo: optionalTextSchema,
  notes: optionalTextSchema,
})

export const activateLicenseManualSchema = z.object({
  accessToken: z.string().trim().min(10).max(200),
  planType: licensePlanTypeSchema,
  issuedTo: optionalTextSchema,
  notes: optionalTextSchema,
})

export const renewLicenseSchema = z.object({
  accessToken: z.string().trim().min(10).max(200),
  mode: licenseActivationModeSchema,
  planType: licensePlanTypeSchema,
  licenseKey: z.string().trim().min(8).max(120).optional().nullable(),
  issuedTo: optionalTextSchema,
  notes: optionalTextSchema,
})

export const cancelLicenseSchema = z.object({
  accessToken: z.string().trim().min(10).max(200),
  notes: optionalTextSchema,
})
