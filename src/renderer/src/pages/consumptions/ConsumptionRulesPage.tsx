import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@renderer/components/ui/Button'
import { Card } from '@renderer/components/ui/Card'
import { TablePagination } from '@renderer/components/ui/TablePagination'
import { cn } from '@renderer/lib/cn'
import { findCategoryNode } from '@renderer/lib/posCategoryTree'
import { tableTheadClass } from '@renderer/lib/tableStyles'
import { DEFAULT_PAGE_SIZE } from '@shared/types/pagination'
import type { Product, SaleFormat } from '@shared/types/product'
import type { SaleFormatConsumptionRule } from '@shared/types/consumptionRule'

const rulesKey = ['consumptions', 'rules'] as const

type DraftCell = { consume: string; price: string }

function parseConsumeInput(raw: string): number | null {
  const t = raw.trim()
  if (t === '') {
    return null
  }
  const n = Number(t.replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0) {
    return Number.NaN
  }
  return n
}

function parsePriceInput(raw: string): number | null {
  const t = raw.trim()
  if (t === '') {
    return null
  }
  const n = Number(t.replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) {
    return Number.NaN
  }
  return n
}

function formatRuleLineLabel(r: SaleFormatConsumptionRule, formatsById: Map<number, SaleFormat>): string {
  if (r.saleFormatId == null) {
    return 'Sin formato'
  }
  return formatsById.get(r.saleFormatId)?.name ?? `#${r.saleFormatId}`
}

export function ConsumptionRulesPage() {
  const queryClient = useQueryClient()
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [legacyRuleId, setLegacyRuleId] = useState<number | null>(null)
  const [draftByFormatId, setDraftByFormatId] = useState<Record<number, DraftCell>>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  /** Filas de la tabla con el detalle de formatos expandido (por defecto colapsado). */
  const [expandedRuleProductIds, setExpandedRuleProductIds] = useState<Set<number>>(() => new Set())
  const [progressivePage, setProgressivePage] = useState(1)
  const [progressivePageSize, setProgressivePageSize] = useState(DEFAULT_PAGE_SIZE)
  const [progressiveSearch, setProgressiveSearch] = useState('')
  const [rulesPage, setRulesPage] = useState(1)
  const [rulesPageSize, setRulesPageSize] = useState(DEFAULT_PAGE_SIZE)

  const progressiveProductsQuery = useQuery({
    queryKey: ['products', 'progressivePaged', progressivePage, progressivePageSize, progressiveSearch],
    queryFn: () =>
      window.api.products.listProgressivePaged({
        page: progressivePage,
        pageSize: progressivePageSize,
        search: progressiveSearch.trim() || undefined,
      }),
  })

  const rulesQuery = useQuery({
    queryKey: rulesKey,
    queryFn: () => window.api.consumptions.list(),
  })

  const distinctRuleProductIds = useMemo(() => {
    const s = new Set<number>()
    for (const r of rulesQuery.data ?? []) {
      s.add(r.productId)
    }
    return [...s].sort((a, b) => a - b)
  }, [rulesQuery.data])

  const ruleProductsQuery = useQuery({
    queryKey: ['products', 'metaByRuleIds', distinctRuleProductIds.join(',')],
    queryFn: async () => {
      const results = await Promise.all(distinctRuleProductIds.map((id) => window.api.products.getById(id)))
      const map = new Map<number, Product>()
      for (const p of results) {
        if (p) {
          map.set(p.id, p)
        }
      }
      return map
    },
    enabled: distinctRuleProductIds.length > 0,
  })

  const categoriesQuery = useQuery({
    queryKey: ['products', 'categoriesTree'],
    queryFn: () => window.api.products.listCategories(),
  })

  const formatsQuery = useQuery({
    queryKey: ['products', 'saleFormats'],
    queryFn: () => window.api.products.listSaleFormats(),
  })

  const productsById = useMemo(() => {
    const map = new Map<number, Product>(ruleProductsQuery.data ?? new Map())
    for (const p of progressiveProductsQuery.data?.items ?? []) {
      map.set(p.id, p)
    }
    return map
  }, [ruleProductsQuery.data, progressiveProductsQuery.data])

  const selectedProductFallbackQuery = useQuery({
    queryKey: ['products', 'fallback', selectedProductId],
    queryFn: () => window.api.products.getById(selectedProductId!),
    enabled: selectedProductId != null && !productsById.get(selectedProductId),
  })

  const progressiveProducts = progressiveProductsQuery.data?.items ?? []
  const totalProgressiveProducts = progressiveProductsQuery.data?.total ?? 0

  const maxProgressivePage = useMemo(
    () => Math.max(1, Math.ceil(totalProgressiveProducts / progressivePageSize)),
    [totalProgressiveProducts, progressivePageSize],
  )

  useEffect(() => {
    if (progressivePage > maxProgressivePage) {
      setProgressivePage(maxProgressivePage)
    }
  }, [progressivePage, maxProgressivePage])

  useEffect(() => {
    setProgressivePage(1)
  }, [progressiveSearch, progressivePageSize])

  useEffect(() => {
    if (legacyRuleId != null || selectedProductId == null) {
      return
    }
    const p = productsById.get(selectedProductId)
    if (p && p.consumptionMode !== 'progressive') {
      setSelectedProductId(null)
      setDraftByFormatId({})
    }
  }, [legacyRuleId, selectedProductId, productsById])

  const formatsById = useMemo(() => {
    const map = new Map<number, SaleFormat>()
    for (const f of formatsQuery.data ?? []) {
      map.set(f.id, f)
    }
    return map
  }, [formatsQuery.data])

  const rules = useMemo(() => (rulesQuery.data ?? []).slice(), [rulesQuery.data])

  /** Una fila por producto; reglas ordenadas por nombre de formato. */
  const groupedRules = useMemo(() => {
    const byProduct = new Map<number, SaleFormatConsumptionRule[]>()
    for (const r of rules) {
      const list = byProduct.get(r.productId) ?? []
      list.push(r)
      byProduct.set(r.productId, list)
    }
    const groups = [...byProduct.entries()].map(([productId, groupRules]) => {
      const sorted = [...groupRules].sort((a, b) => {
        if (a.saleFormatId == null) {
          return 1
        }
        if (b.saleFormatId == null) {
          return -1
        }
        const na = formatsById.get(a.saleFormatId)?.name ?? ''
        const nb = formatsById.get(b.saleFormatId)?.name ?? ''
        return na.localeCompare(nb, 'es')
      })
      return { productId, rules: sorted }
    })
    groups.sort((a, b) => {
      const na = productsById.get(a.productId)?.name ?? `#${a.productId}`
      const nb = productsById.get(b.productId)?.name ?? `#${b.productId}`
      return na.localeCompare(nb, 'es')
    })
    return groups
  }, [rules, productsById, formatsById])

  const pagedGroupedRules = useMemo(() => {
    const start = (rulesPage - 1) * rulesPageSize
    return groupedRules.slice(start, start + rulesPageSize)
  }, [groupedRules, rulesPage, rulesPageSize])

  const maxRulesPage = useMemo(() => Math.max(1, Math.ceil(groupedRules.length / rulesPageSize)), [groupedRules.length, rulesPageSize])

  useEffect(() => {
    if (rulesPage > maxRulesPage) {
      setRulesPage(maxRulesPage)
    }
  }, [rulesPage, maxRulesPage])

  useEffect(() => {
    setRulesPage(1)
  }, [rules.length, rulesPageSize])

  const selectedProduct = useMemo(() => {
    if (selectedProductId == null) {
      return null
    }
    return productsById.get(selectedProductId) ?? selectedProductFallbackQuery.data ?? null
  }, [selectedProductId, productsById, selectedProductFallbackQuery.data])

  const effectiveFormats = useMemo(() => {
    if (!selectedProduct || !categoriesQuery.data?.length) {
      return [] as SaleFormat[]
    }
    const node = findCategoryNode(categoriesQuery.data, selectedProduct.categoryId)
    const ids = new Set(node?.effectiveSaleFormatIds ?? [])
    const list = (formatsQuery.data ?? []).filter((f) => ids.has(f.id) && f.isActive === 1)
    return list.sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [selectedProduct, categoriesQuery.data, formatsQuery.data])

  const rulesForSelectedProduct = useMemo(() => {
    if (selectedProductId == null) {
      return []
    }
    return rules.filter((r) => r.productId === selectedProductId)
  }, [rules, selectedProductId])

  const hydrateDraftFromRules = useCallback(() => {
    if (selectedProductId == null || legacyRuleId != null) {
      return
    }
    const map = new Map<number, SaleFormatConsumptionRule>()
    for (const r of rulesForSelectedProduct) {
      if (r.saleFormatId != null) {
        map.set(r.saleFormatId, r)
      }
    }
    const next: Record<number, DraftCell> = {}
    for (const f of effectiveFormats) {
      const r = map.get(f.id)
      next[f.id] = {
        consume: r ? String(r.consumeQuantity) : '',
        price: r?.basePrice != null ? String(r.basePrice) : '',
      }
    }
    setDraftByFormatId(next)
  }, [selectedProductId, legacyRuleId, rulesForSelectedProduct, effectiveFormats])

  useEffect(() => {
    hydrateDraftFromRules()
  }, [hydrateDraftFromRules])

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: rulesKey })
    await queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  const syncMutation = useMutation({
    mutationFn: (payload: Parameters<typeof window.api.consumptions.syncProductRules>[0]) =>
      window.api.consumptions.syncProductRules(payload),
    onSuccess: async () => {
      setErrorMessage(null)
      await refresh()
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible guardar las reglas.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => window.api.consumptions.remove(id),
    onSuccess: async () => {
      setLegacyRuleId(null)
      setErrorMessage(null)
      await refresh()
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible eliminar la regla.')
    },
  })

  const pickRule = (r: SaleFormatConsumptionRule) => {
    setErrorMessage(null)
    if (r.saleFormatId == null) {
      setLegacyRuleId(r.id)
      setSelectedProductId(r.productId)
      return
    }
    setLegacyRuleId(null)
    setSelectedProductId(r.productId)
  }

  const toggleRuleFormatsExpanded = (productId: number) => {
    setExpandedRuleProductIds((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }

  const pickGroup = (group: { productId: number; rules: SaleFormatConsumptionRule[] }) => {
    setErrorMessage(null)
    const onlyLegacy = group.rules.length > 0 && group.rules.every((r) => r.saleFormatId === null)
    if (onlyLegacy) {
      if (group.rules.length === 1) {
        pickRule(group.rules[0])
      } else {
        setLegacyRuleId(null)
        setSelectedProductId(group.productId)
      }
      return
    }
    setLegacyRuleId(null)
    setSelectedProductId(group.productId)
  }

  const startNewConfiguration = () => {
    setLegacyRuleId(null)
    setSelectedProductId(null)
    setDraftByFormatId({})
    setErrorMessage(null)
  }

  const onProductChange = (productId: number | null) => {
    setLegacyRuleId(null)
    setSelectedProductId(productId)
    setErrorMessage(null)
  }

  const setDraftCell = (formatId: number, field: keyof DraftCell, value: string) => {
    setDraftByFormatId((prev) => ({
      ...prev,
      [formatId]: {
        consume: prev[formatId]?.consume ?? '',
        price: prev[formatId]?.price ?? '',
        [field]: value,
      },
    }))
  }

  const handleSaveBulk = () => {
    if (selectedProductId == null || legacyRuleId != null) {
      return
    }
    const rows: Array<{ saleFormatId: number; consumeQuantity: number | null; basePrice: number | null }> = []
    for (const f of effectiveFormats) {
      const cell = draftByFormatId[f.id] ?? { consume: '', price: '' }
      const consume = parseConsumeInput(cell.consume)
      if (Number.isNaN(consume)) {
        setErrorMessage(`Consumo inválido en «${f.name}». Use un número mayor que cero o deje vacío para quitar la regla.`)
        return
      }
      const priceRaw = parsePriceInput(cell.price)
      if (Number.isNaN(priceRaw)) {
        setErrorMessage(`Precio base inválido en «${f.name}».`)
        return
      }
      rows.push({
        saleFormatId: f.id,
        consumeQuantity: consume,
        basePrice: priceRaw,
      })
    }
    setErrorMessage(null)
    syncMutation.mutate({ productId: selectedProductId, rows })
  }

  const inputClass =
    'w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm tabular-nums text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'

  const legacyRule = legacyRuleId != null ? rules.find((x) => x.id === legacyRuleId) : undefined

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Consumos por formato</h1>
        <p className="text-sm text-slate-500">
          Configure por producto el consumo de inventario (p. ej. ml) y precio base por formato de venta habilitado en la
          categoría.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,520px)_1fr]">
        <Card className="min-h-0 shadow-sm" padding="lg">
          <h2 className="text-lg font-semibold text-slate-900">Reglas</h2>
          <p className="mt-1 text-xs text-slate-500">Seleccione una fila para abrir el producto en el panel derecho.</p>

          {rulesQuery.isLoading ? <div className="mt-4 text-sm text-slate-500">Cargando...</div> : null}
          {rulesQuery.error ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {rulesQuery.error instanceof Error ? rulesQuery.error.message : 'No fue posible cargar reglas.'}
            </div>
          ) : null}

          {!rulesQuery.isLoading && !rulesQuery.error ? (
            <div className="mt-4 w-full min-w-0 overflow-x-auto rounded-xl border-2 border-slate-200 bg-white shadow-inner">
              <table className="min-w-full text-left text-sm text-slate-800">
                <thead className={tableTheadClass}>
                  <tr>
                    <th className="px-3 py-3">Producto</th>
                    <th className="px-3 py-3">Formatos y consumos</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedGroupedRules.map((group, index) => {
                    const p = productsById.get(group.productId)
                    const rowSelected =
                      (legacyRuleId != null && group.rules.some((r) => r.id === legacyRuleId)) ||
                      (legacyRuleId == null && selectedProductId === group.productId)
                    const formatsExpanded = expandedRuleProductIds.has(group.productId)
                    const formatNamesList = group.rules.map((r) => formatRuleLineLabel(r, formatsById))
                    const formatNamesPreview =
                      formatNamesList.length <= 3
                        ? formatNamesList.join(', ')
                        : `${formatNamesList.slice(0, 3).join(', ')}…`
                    return (
                      <tr
                        aria-label={`Abrir producto: ${p?.name ?? `Producto #${group.productId}`}`}
                        className={cn(
                          'cursor-pointer border-t border-slate-200 transition-colors',
                          rowSelected
                            ? 'bg-brand/10 ring-2 ring-inset ring-brand/40 hover:bg-brand/15'
                            : index % 2 === 0
                              ? 'bg-white hover:bg-slate-50'
                              : 'bg-slate-50/80 hover:bg-slate-100/80',
                        )}
                        key={group.productId}
                        onClick={() => pickGroup(group)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            pickGroup(group)
                          }
                        }}
                        tabIndex={0}
                      >
                        <td className="align-top px-3 py-3 font-medium text-slate-900">
                          {p?.name ?? `Producto #${group.productId}`}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="flex gap-2">
                            <button
                              aria-controls={`rule-formats-${group.productId}`}
                              aria-expanded={formatsExpanded}
                              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200/80 hover:text-slate-800"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleRuleFormatsExpanded(group.productId)
                              }}
                              title={formatsExpanded ? 'Ocultar detalle' : 'Ver detalle de formatos'}
                              type="button"
                            >
                              <span
                                aria-hidden
                                className={cn(
                                  'inline-block text-xs transition-transform',
                                  formatsExpanded ? 'rotate-90' : 'rotate-0',
                                )}
                              >
                                ▸
                              </span>
                            </button>
                            <div className="min-w-0 flex-1" id={`rule-formats-${group.productId}`}>
                              {!formatsExpanded ? (
                                <p className="py-1 text-sm leading-snug text-slate-600">
                                  <span className="font-medium text-slate-700">
                                    {group.rules.length}{' '}
                                    {group.rules.length === 1 ? 'formato' : 'formatos'}
                                  </span>
                                  {formatNamesPreview ? (
                                    <>
                                      <span className="text-slate-300"> · </span>
                                      <span className="text-slate-500">{formatNamesPreview}</span>
                                    </>
                                  ) : null}
                                </p>
                              ) : (
                                <ul className="space-y-1.5 py-1">
                                  {group.rules.map((r) => (
                                    <li className="flex flex-wrap items-baseline gap-x-2 text-sm leading-snug" key={r.id}>
                                      <span className="font-medium text-slate-800">
                                        {formatRuleLineLabel(r, formatsById)}
                                      </span>
                                      <span className="text-slate-300" aria-hidden>
                                        ·
                                      </span>
                                      <span className="tabular-nums font-medium text-brand">
                                        {r.consumeQuantity.toFixed(2)} {r.unit}
                                      </span>
                                      <span className="text-slate-300" aria-hidden>
                                        ·
                                      </span>
                                      <span className="tabular-nums text-slate-700">
                                        {r.basePrice != null ? r.basePrice.toFixed(2) : '—'}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {!groupedRules.length ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-slate-500" colSpan={2}>
                        Sin reglas.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
              {groupedRules.length > 0 ? (
                <TablePagination
                  className="rounded-b-xl border-x-2 border-b-2 border-t-0 border-slate-200"
                  page={rulesPage}
                  pageSize={rulesPageSize}
                  total={groupedRules.length}
                  onPageChange={setRulesPage}
                  onPageSizeChange={setRulesPageSize}
                />
              ) : null}
            </div>
          ) : null}
        </Card>

        <Card className="min-h-0 shadow-sm" padding="lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Configuración por producto</h2>
            <Button onClick={startNewConfiguration} type="button" variant="secondary">
              Nueva
            </Button>
          </div>

          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Buscar producto (consumo progresivo)</span>
            <input
              className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
              onChange={(e) => setProgressiveSearch(e.target.value)}
              placeholder="Nombre o SKU"
              type="search"
              value={progressiveSearch}
            />
          </label>

          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Producto</span>
            <select
              className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
              onChange={(e) => {
                const v = e.target.value
                onProductChange(v === '' ? null : Number(v))
              }}
              value={selectedProductId ?? ''}
            >
              <option value="">Seleccione un producto (consumo progresivo)...</option>
              {progressiveProducts.map((prod) => (
                <option key={prod.id} value={prod.id}>
                  {prod.name}
                </option>
              ))}
            </select>
          </label>

          <TablePagination
            className="mt-2 rounded-xl border border-slate-200"
            page={progressivePage}
            pageSize={progressivePageSize}
            total={totalProgressiveProducts}
            onPageChange={setProgressivePage}
            onPageSizeChange={setProgressivePageSize}
          />

          {legacyRuleId != null && legacyRule ? (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-slate-800">
              <p className="font-medium text-slate-900">Regla sin formato (histórica)</p>
              <p className="mt-2 text-slate-700">
                Esta regla no está asociada a un formato de venta concreto. No puede editarse en la grilla por producto.
                Puede eliminarla si ya no aplica.
              </p>
              <p className="mt-2 tabular-nums text-slate-800">
                Consumo: {legacyRule.consumeQuantity.toFixed(2)} {legacyRule.unit}
                {legacyRule.basePrice != null ? ` · Precio base: ${legacyRule.basePrice.toFixed(2)}` : null}
              </p>
              <Button
                className="mt-4"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(legacyRuleId)}
                variant="danger"
              >
                Eliminar regla
              </Button>
            </div>
          ) : null}

          {selectedProductId != null && legacyRuleId == null ? (
            <>
              {!effectiveFormats.length ? (
                <p className="mt-6 text-sm text-slate-600">
                  La categoría de este producto no tiene formatos de venta habilitados. Asigne formatos en el catálogo
                  (categorías) antes de definir consumos.
                </p>
              ) : (
                <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="min-w-full text-left text-sm">
                    <thead className={cn(tableTheadClass, 'text-xs')}>
                      <tr>
                        <th className="px-3 py-2">Formato</th>
                        <th className="px-3 py-2">Consumo por venta</th>
                        <th className="px-3 py-2">Precio base</th>
                        <th className="px-3 py-2">Unidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {effectiveFormats.map((f) => {
                        const cell = draftByFormatId[f.id] ?? { consume: '', price: '' }
                        const consume = parseConsumeInput(cell.consume)
                        const rowReady = !Number.isNaN(consume) && consume != null
                        return (
                          <tr
                            className={cn(
                              'border-t border-slate-100',
                              rowReady ? 'bg-emerald-50/40' : 'bg-white',
                            )}
                            key={f.id}
                          >
                            <td className="px-3 py-2 font-medium text-slate-900">{f.name}</td>
                            <td className="px-3 py-2">
                              <input
                                aria-label={`Consumo por venta (${f.name})`}
                                className={inputClass}
                                inputMode="decimal"
                                onChange={(e) => setDraftCell(f.id, 'consume', e.target.value)}
                                placeholder="—"
                                type="text"
                                value={cell.consume}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                aria-label={`Precio base (${f.name})`}
                                className={inputClass}
                                inputMode="decimal"
                                onChange={(e) => setDraftCell(f.id, 'price', e.target.value)}
                                placeholder="—"
                                type="text"
                                value={cell.price}
                              />
                            </td>
                            <td className="px-3 py-2 text-slate-500">ml</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {effectiveFormats.length > 0 ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button
                    disabled={syncMutation.isPending || deleteMutation.isPending}
                    onClick={handleSaveBulk}
                    variant="primary"
                  >
                    {syncMutation.isPending ? 'Guardando...' : 'Guardar'}
                  </Button>
                  <span className="text-xs text-slate-500">
                    Se guardan todas las filas: vacías eliminan la regla de ese formato; las filas con consumo válido crean o
                    actualizan la regla.
                  </span>
                </div>
              ) : null}
            </>
          ) : null}

          {errorMessage ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{errorMessage}</div>
          ) : null}
        </Card>
      </div>
    </section>
  )
}
