import { z } from 'zod'

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use solo minusculas, numeros y guiones.')

const codeSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, 'Use solo minusculas, numeros y guiones bajos.')

export const productSchema = z.object({
  sku: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(120),
  type: z.enum(['simple', 'compound']),
  categoryId: z.number().int().positive(),
  salePrice: z.number().nonnegative(),
  minStock: z.number().int().nonnegative(),
})

export const productUpdateSchema = productSchema.extend({
  id: z.number().int().positive(),
})

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: slugSchema,
  parentId: z.number().int().positive().nullable().optional(),
  supportsChildren: z.boolean(),
  inheritsSaleFormats: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
}).superRefine((value, context) => {
  if (value.inheritsSaleFormats && !value.parentId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Solo puede heredar formatos si la categoria tiene una categoria padre.',
      path: ['inheritsSaleFormats'],
    })
  }
})

export const categoryUpdateSchema = categorySchema.extend({
  id: z.number().int().positive(),
})

export const saleFormatSchema = z
  .object({
    code: codeSchema,
    name: z.string().trim().min(1).max(120),
    sortOrder: z.number().int().min(0).max(9999),
    requiresComplement: z.boolean(),
    complementCategoryRootId: z.number().int().positive().nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.requiresComplement && !value.complementCategoryRootId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe indicar una categoria raiz de complemento.',
        path: ['complementCategoryRootId'],
      })
    }

    if (!value.requiresComplement && value.complementCategoryRootId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Solo puede seleccionar una categoria de complemento si el formato la requiere.',
        path: ['complementCategoryRootId'],
      })
    }
  })

export const saleFormatUpdateSchema = saleFormatSchema.extend({
  id: z.number().int().positive(),
})

export const categorySaleFormatUpdateSchema = z.object({
  categoryId: z.number().int().positive(),
  saleFormatIds: z.array(z.number().int().positive()).max(50),
})
