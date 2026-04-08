import { z } from 'zod'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../types/pagination'

export const pageParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})

export type PageParamsInput = z.input<typeof pageParamsSchema>
export type PageParamsParsed = z.infer<typeof pageParamsSchema>

const optionalTrimmedSearch = z
  .string()
  .max(200)
  .optional()
  .transform((s) => {
    const t = s?.trim()
    return t ? t : undefined
  })

export const productListPagedInputSchema = pageParamsSchema.extend({
  categoryId: z.number().int().positive().optional(),
  search: optionalTrimmedSearch,
})

export const progressiveProductsPagedInputSchema = pageParamsSchema.extend({
  search: optionalTrimmedSearch,
})

export type ProductListPagedInput = z.infer<typeof productListPagedInputSchema>

export const searchPagedInputSchema = pageParamsSchema.extend({
  search: optionalTrimmedSearch,
})

export type SearchPagedInput = z.infer<typeof searchPagedInputSchema>

export function parsePageParams(raw: unknown): PageParamsParsed {
  return pageParamsSchema.parse(raw ?? {})
}

export function offsetForPage(page: number, pageSize: number) {
  return (page - 1) * pageSize
}
