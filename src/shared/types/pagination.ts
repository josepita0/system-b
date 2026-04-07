/** Parámetros de paginación (página 1-based). */
export interface PageParams {
  page: number
  pageSize: number
}

/** Respuesta paginada genérica. */
export interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export const DEFAULT_PAGE_SIZE = 25
export const MAX_PAGE_SIZE = 100
