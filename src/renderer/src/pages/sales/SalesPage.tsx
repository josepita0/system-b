import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CategoryTreeNode, Product, SaleFormat } from '@shared/types/product'
import type { SaleFormatConsumptionRule } from '@shared/types/consumptionRule'
import { Button } from '@renderer/components/ui/Button'
import { Card } from '@renderer/components/ui/Card'
import { Input } from '@renderer/components/ui/Input'
import { Modal } from '@renderer/components/ui/Modal'
import { PosAccountsSection } from '@renderer/components/pos/PosAccountsSection'
import { PosCategoryTabs } from '@renderer/components/pos/PosCategoryTabs'
import { PosProductGrid } from '@renderer/components/pos/PosProductGrid'
import { PosTicketPanel } from '@renderer/components/pos/PosTicketPanel'
import { PosToolbar } from '@renderer/components/pos/PosToolbar'
import { selectFieldClass } from '@renderer/components/pos/posFieldClasses'
import { cn } from '@renderer/lib/cn'
import { effectiveComplementUnitPrice } from '@shared/lib/productPricing'
import { findCategoryNode } from '@renderer/lib/posCategoryTree'
import { requireSalesRemoveTabChargeLine, requireSalesTabChargeDetail } from '@renderer/lib/salesPreload'
import { resolveShiftForDate } from '@renderer/utils/resolveShiftForDate'
import { OpenShiftModal } from '@renderer/components/shifts/OpenShiftModal'
import { useUiPrefsStore } from '@renderer/store/uiPrefsStore'

type CartLine = {
  key: string
  productId: number
  productName: string
  categoryId: number
  unitPrice: number
  /** Precio de catalogo al crear la linea (referencia para cambios de precio). */
  catalogUnitPrice: number
  quantity: number
  discount: number
  saleFormatId: number | null
  complementProductId: number | null
  formatLabel?: string | null
  complementLabel?: string | null
  /** Motivo si el precio difiere del catalogo (obligatorio sin VIP). */
  priceChangeNote: string | null
}

function randomKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100
}

function moneyToCents(n: number): number {
  return Math.round(roundMoney2(n) * 100)
}

export function SalesPage() {
  const queryClient = useQueryClient()
  const posLargeText = useUiPrefsStore((s) => s.posLargeText)
  const highContrast = useUiPrefsStore((s) => s.highContrast)
  const togglePosLargeText = useUiPrefsStore((s) => s.togglePosLargeText)
  const toggleHighContrast = useUiPrefsStore((s) => s.toggleHighContrast)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [configProduct, setConfigProduct] = useState<Product | null>(null)
  const [pickedFormatId, setPickedFormatId] = useState<number | null>(null)
  const [pickedComplementId, setPickedComplementId] = useState<number | null>(null)
  const [saleMode, setSaleMode] = useState<'cash' | 'tab'>('cash')
  const [selectedTabId, setSelectedTabId] = useState<number | null>(null)
  const [selectedVipCustomerId, setSelectedVipCustomerId] = useState<number | null>(null)
  const [newTabModalOpen, setNewTabModalOpen] = useState(false)
  const [newTabName, setNewTabName] = useState('')
  const [newTabVipCustomerId, setNewTabVipCustomerId] = useState<number | ''>('')
  const [cashPaymentModalOpen, setCashPaymentModalOpen] = useState(false)
  const [cashReceivedInput, setCashReceivedInput] = useState('')
  const [vipChargedTotalInput, setVipChargedTotalInput] = useState('')
  const [settleModalTabId, setSettleModalTabId] = useState<number | null>(null)
  const [settleCashReceived, setSettleCashReceived] = useState('')
  const [cancelEmptyTabModalOpen, setCancelEmptyTabModalOpen] = useState(false)
  const [cancelEmptyTabReason, setCancelEmptyTabReason] = useState('')
  const [priceEditLineKey, setPriceEditLineKey] = useState<string | null>(null)
  const [priceEditUnit, setPriceEditUnit] = useState('')
  const [priceEditNote, setPriceEditNote] = useState('')
  const [priceEditError, setPriceEditError] = useState<string | null>(null)
  const [cartPriceBlockError, setCartPriceBlockError] = useState<string | null>(null)
  const [internalConsumptionModalOpen, setInternalConsumptionModalOpen] = useState(false)
  const [internalConsumptionReason, setInternalConsumptionReason] = useState('')
  const [internalConsumptionProductId, setInternalConsumptionProductId] = useState<number | null>(null)
  const [internalConsumptionQty, setInternalConsumptionQty] = useState('1')
  const [complementEditLineKey, setComplementEditLineKey] = useState<string | null>(null)
  const [complementEditPickedId, setComplementEditPickedId] = useState<number | null>(null)
  const [openShiftModalOpen, setOpenShiftModalOpen] = useState(false)
  const [removeLineModalOpen, setRemoveLineModalOpen] = useState(false)
  const [removeLineSaleItemId, setRemoveLineSaleItemId] = useState<number | null>(null)
  const [removeLineReason, setRemoveLineReason] = useState('')

  const currentShiftQuery = useQuery({
    queryKey: ['shift', 'current'],
    queryFn: () => window.api.shifts.current(),
  })

  const catalogQuery = useQuery({
    queryKey: ['sales', 'posCatalog'],
    queryFn: () => window.api.sales.posCatalog(),
    enabled: Boolean(currentShiftQuery.data),
  })

  const consumptionRulesQuery = useQuery({
    queryKey: ['consumptions', 'list'],
    queryFn: () => window.api.consumptions.list(),
    enabled: Boolean(currentShiftQuery.data),
  })

  const openTabsQuery = useQuery({
    queryKey: ['sales', 'openTabs'],
    queryFn: () => window.api.sales.listOpenTabs(),
    enabled: Boolean(currentShiftQuery.data),
  })

  const tabChargeDetailQuery = useQuery({
    queryKey: ['sales', 'tabChargeDetail', settleModalTabId],
    queryFn: () => requireSalesTabChargeDetail()(settleModalTabId!),
    enabled: typeof settleModalTabId === 'number',
  })

  const vipCustomersQuery = useQuery({
    queryKey: ['vipCustomers', 'active'],
    queryFn: () => window.api.vipCustomers.listActive(),
    enabled: Boolean(currentShiftQuery.data),
  })

  const productsQuery = useQuery({
    queryKey: ['sales', 'posProducts', selectedCategoryId, productSearch],
    queryFn: () =>
      window.api.sales.posProducts({
        categoryId: selectedCategoryId!,
        search: productSearch.trim() || undefined,
      }),
    enabled: typeof selectedCategoryId === 'number',
  })

  const internalConsumptionProductsQuery = useQuery({
    queryKey: ['sales', 'posInternalConsumptionProducts', selectedCategoryId, productSearch],
    queryFn: () =>
      window.api.sales.posInternalConsumptionProducts({
        categoryId: selectedCategoryId!,
        search: productSearch.trim() || undefined,
      }),
    enabled: typeof selectedCategoryId === 'number',
  })

  const formatById = useMemo(() => {
    const map = new Map<number, SaleFormat>()
    for (const f of catalogQuery.data?.saleFormats ?? []) {
      map.set(f.id, f)
    }
    return map
  }, [catalogQuery.data?.saleFormats])

  const complementQuery = useQuery({
    queryKey: ['sales', 'complementProducts', pickedFormatId],
    queryFn: async () => {
      const format = pickedFormatId ? formatById.get(pickedFormatId) : undefined
      const rootId = format?.complementCategoryRootId
      if (rootId == null) {
        return []
      }
      return window.api.sales.posComplementProducts(rootId)
    },
    enabled:
      Boolean(configProduct) &&
      typeof pickedFormatId === 'number' &&
      (formatById.get(pickedFormatId!)?.requiresComplement ?? 0) === 1,
  })

  const complementEditLine = useMemo(
    () => (complementEditLineKey != null ? cart.find((l) => l.key === complementEditLineKey) ?? null : null),
    [cart, complementEditLineKey],
  )

  const complementEditQuery = useQuery({
    queryKey: ['sales', 'complementProducts', 'edit', complementEditLine?.saleFormatId, complementEditLine?.key],
    queryFn: async () => {
      if (!complementEditLine?.saleFormatId) {
        return []
      }
      const fmt = formatById.get(complementEditLine.saleFormatId)
      const rootId = fmt?.complementCategoryRootId
      if (rootId == null) {
        return []
      }
      return window.api.sales.posComplementProducts(rootId)
    },
    enabled: Boolean(complementEditLine?.saleFormatId),
  })

  const basePriceByProductAndFormat = useMemo(() => {
    const byProduct = new Map<number, Map<number | null, number>>()
    const rules: SaleFormatConsumptionRule[] = consumptionRulesQuery.data ?? []
    for (const r of rules) {
      if (r.basePrice == null) {
        continue
      }
      let byFormat = byProduct.get(r.productId)
      if (!byFormat) {
        byFormat = new Map<number | null, number>()
        byProduct.set(r.productId, byFormat)
      }
      byFormat.set(r.saleFormatId ?? null, r.basePrice)
    }
    return byProduct
  }, [consumptionRulesQuery.data])

  const resolveDefaultUnitPrice = useCallback(
    (product: Product, saleFormatId: number | null, complement: Product | null): number => {
      const complementAdd = complement ? effectiveComplementUnitPrice(complement) : 0
      if (saleFormatId == null) {
        return product.salePrice + complementAdd
      }
      const byFormat = basePriceByProductAndFormat.get(product.id)
      const priceFromRule = byFormat?.get(saleFormatId) ?? byFormat?.get(null) ?? null
      const base = priceFromRule != null ? priceFromRule : product.salePrice
      return base + complementAdd
    },
    [basePriceByProductAndFormat],
  )

  // Apertura de turno ahora se gestiona con modal (`OpenShiftModal`).

  const openTabMutation = useMutation({
    mutationFn: (payload: { customerName: string; vipCustomerId?: number }) => window.api.sales.openTab(payload),
    onSuccess: async (data) => {
      setSelectedTabId(data.id)
      setNewTabModalOpen(false)
      setNewTabName('')
      setNewTabVipCustomerId('')
      await queryClient.invalidateQueries({ queryKey: ['sales', 'openTabs'] })
    },
  })

  const removeTabChargeLineMutation = useMutation({
    mutationFn: (payload: { saleItemId: number; reason: string }) => requireSalesRemoveTabChargeLine()(payload),
    onSuccess: async () => {
      setRemoveLineModalOpen(false)
      setRemoveLineSaleItemId(null)
      setRemoveLineReason('')
      await queryClient.invalidateQueries({ queryKey: ['sales', 'tabChargeDetail'] })
      await queryClient.invalidateQueries({ queryKey: ['sales', 'openTabs'] })
      await queryClient.invalidateQueries({ queryKey: ['shift', 'current'] })
    },
  })

  const settleTabMutation = useMutation({
    mutationFn: (tabId: number) => window.api.sales.settleTab({ tabId }),
    onSuccess: async (_, tabId) => {
      setSettleModalTabId(null)
      setSettleCashReceived('')
      if (selectedTabId === tabId) {
        setSelectedTabId(null)
      }
      await queryClient.invalidateQueries({ queryKey: ['shift', 'current'] })
      await queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
  })

  const cancelEmptyTabMutation = useMutation({
    mutationFn: (payload: { tabId: number; reason: string }) => window.api.sales.cancelEmptyTab(payload),
    onSuccess: async () => {
      setCancelEmptyTabModalOpen(false)
      setCancelEmptyTabReason('')
      setSettleModalTabId(null)
      await queryClient.invalidateQueries({ queryKey: ['sales'] })
      await queryClient.invalidateQueries({ queryKey: ['shift', 'current'] })
    },
  })

  const saleMutation = useMutation({
    mutationFn: () =>
      window.api.sales.create({
        items: cart.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          discount: line.discount,
          saleFormatId: line.saleFormatId,
          complementProductId: line.complementProductId,
          chargedUnitPrice: line.unitPrice,
          priceChangeNote: line.priceChangeNote?.trim() ? line.priceChangeNote.trim() : undefined,
        })),
        tabId: saleMode === 'tab' && selectedTabId != null ? selectedTabId : undefined,
        vipCustomerId: selectedVipCustomerId ?? undefined,
        chargedTotal:
          selectedVipCustomerId != null && vipChargedTotalInput.trim() !== ''
            ? Number(vipChargedTotalInput.replace(',', '.'))
            : undefined,
      }),
    onSuccess: async () => {
      setCart([])
      setCashPaymentModalOpen(false)
      setCashReceivedInput('')
      setVipChargedTotalInput('')
      setSelectedVipCustomerId(null)
      await queryClient.invalidateQueries({ queryKey: ['shift', 'current'] })
      await queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
  })

  const tree = catalogQuery.data?.categoryTree ?? []

  useEffect(() => {
    if (!tree.length) {
      return
    }
    setSelectedCategoryId((prev) => {
      if (prev != null && findCategoryNode(tree, prev)) {
        return prev
      }
      return tree[0]!.id
    })
  }, [tree])

  const beginAddProduct = useCallback(
    (product: Product) => {
      const node = findCategoryNode(tree, product.categoryId)
      if (!node) {
        return
      }
      const effectiveIds = [...node.effectiveSaleFormatIds].sort((a, b) => a - b)
      if (product.type === 'compound') {
        setConfigProduct(product)
        setPickedFormatId(effectiveIds.length === 1 ? effectiveIds[0] : null)
        setPickedComplementId(null)
        return
      }
      if (effectiveIds.length === 0) {
        const unitPrice = resolveDefaultUnitPrice(product, null, null)
        setCart((prev) => [
          ...prev,
          {
            key: randomKey(),
            productId: product.id,
            productName: product.name,
            categoryId: product.categoryId,
            unitPrice,
            catalogUnitPrice: unitPrice,
            quantity: 1,
            discount: 0,
            saleFormatId: null,
            complementProductId: null,
            priceChangeNote: null,
          },
        ])
        return
      }
      if (effectiveIds.length === 1) {
        const onlyId = effectiveIds[0]
        const fmt = formatById.get(onlyId)
        if (fmt?.requiresComplement === 1) {
          setConfigProduct(product)
          setPickedFormatId(onlyId)
          setPickedComplementId(null)
          return
        }
        const unitPrice = resolveDefaultUnitPrice(product, onlyId, null)
        setCart((prev) => [
          ...prev,
          {
            key: randomKey(),
            productId: product.id,
            productName: product.name,
            categoryId: product.categoryId,
            unitPrice,
            catalogUnitPrice: unitPrice,
            quantity: 1,
            discount: 0,
            saleFormatId: onlyId,
            complementProductId: null,
            formatLabel: fmt?.name ?? null,
            priceChangeNote: null,
          },
        ])
        return
      }
      setConfigProduct(product)
      setPickedFormatId(null)
      setPickedComplementId(null)
    },
    [formatById, resolveDefaultUnitPrice, tree],
  )

  const confirmConfiguredLine = useCallback(() => {
    if (!configProduct) {
      return
    }
    const node = findCategoryNode(tree, configProduct.categoryId)
    if (!node) {
      return
    }
    const effectiveIds = node.effectiveSaleFormatIds
    let saleFormatId: number | null = pickedFormatId
    if (effectiveIds.length === 1) {
      saleFormatId = effectiveIds[0]
    }
    if (effectiveIds.length > 1 && saleFormatId == null) {
      return
    }
    const fmt = saleFormatId != null ? formatById.get(saleFormatId) : undefined
    if (fmt?.requiresComplement === 1 && pickedComplementId == null) {
      return
    }
    const complementName =
      fmt?.requiresComplement === 1 && pickedComplementId
        ? complementQuery.data?.find((p) => p.id === pickedComplementId)?.name
        : undefined
    const pickedComplement =
      fmt?.requiresComplement === 1 && pickedComplementId != null
        ? complementQuery.data?.find((p) => p.id === pickedComplementId) ?? null
        : null
    const unitPrice = resolveDefaultUnitPrice(configProduct, saleFormatId, pickedComplement)
    setCart((prev) => [
      ...prev,
      {
        key: randomKey(),
        productId: configProduct.id,
        productName: configProduct.name,
        categoryId: configProduct.categoryId,
        unitPrice,
        catalogUnitPrice: unitPrice,
        quantity: 1,
        discount: 0,
        saleFormatId,
        complementProductId: fmt?.requiresComplement === 1 ? pickedComplementId : null,
        formatLabel: fmt?.name ?? null,
        complementLabel: complementName ?? null,
        priceChangeNote: null,
      },
    ])
    setConfigProduct(null)
    setPickedFormatId(null)
    setPickedComplementId(null)
  }, [
    complementQuery.data,
    configProduct,
    formatById,
    pickedComplementId,
    pickedFormatId,
    resolveDefaultUnitPrice,
    tree,
  ])

  const cartTotal = useMemo(
    () => cart.reduce((sum, line) => sum + (line.quantity * line.unitPrice - line.discount), 0),
    [cart],
  )

  const totalDue = useMemo(() => roundMoney2(cartTotal), [cartTotal])

  const selectedVip = useMemo(
    () => (vipCustomersQuery.data ?? []).find((c) => c.id === selectedVipCustomerId) ?? null,
    [selectedVipCustomerId, vipCustomersQuery.data],
  )

  const parsedVipChargedTotal = useMemo(() => {
    const t = vipChargedTotalInput.trim()
    if (t === '') {
      return null
    }
    const n = Number(t.replace(',', '.'))
    if (!Number.isFinite(n) || n < 0) {
      return null
    }
    return roundMoney2(n)
  }, [vipChargedTotalInput])

  const amountToCharge = useMemo(() => {
    if (!selectedVip) {
      return totalDue
    }
    if (selectedVip.conditionType === 'exempt') {
      return 0
    }
    if (selectedVip.conditionType === 'discount_manual') {
      return parsedVipChargedTotal ?? totalDue
    }
    return totalDue
  }, [parsedVipChargedTotal, selectedVip, totalDue])

  const parsedReceived = useMemo(() => {
    const t = cashReceivedInput.trim()
    if (t === '') {
      return null
    }
    const n = Number(t.replace(',', '.'))
    if (!Number.isFinite(n) || n < 0) {
      return null
    }
    return roundMoney2(n)
  }, [cashReceivedInput])

  const totalDueCents = moneyToCents(amountToCharge)
  const cashPaymentSufficient =
    parsedReceived != null && moneyToCents(parsedReceived) >= totalDueCents && totalDueCents >= 0

  const changeAmount =
    cashPaymentSufficient && parsedReceived != null ? roundMoney2(parsedReceived - amountToCharge) : null

  const shortfall =
    parsedReceived != null && totalDueCents > 0 && !cashPaymentSufficient
      ? roundMoney2(amountToCharge - parsedReceived)
      : null

  const parsedSettleReceived = useMemo(() => {
    const t = settleCashReceived.trim()
    if (t === '') {
      return null
    }
    const n = Number(t.replace(',', '.'))
    if (!Number.isFinite(n) || n < 0) {
      return null
    }
    return roundMoney2(n)
  }, [settleCashReceived])

  const settleDetail = tabChargeDetailQuery.data
  const settleBalanceCents = moneyToCents(settleDetail?.balance ?? 0)
  const settlePaymentSufficient =
    settleBalanceCents === 0 ||
    (parsedSettleReceived != null && moneyToCents(parsedSettleReceived) >= settleBalanceCents)

  const settleChangeAmount =
    settlePaymentSufficient && parsedSettleReceived != null && settleBalanceCents > 0
      ? roundMoney2(parsedSettleReceived - (settleDetail?.balance ?? 0))
      : null

  const settleShortfall =
    parsedSettleReceived != null && settleBalanceCents > 0 && !settlePaymentSufficient
      ? roundMoney2((settleDetail?.balance ?? 0) - parsedSettleReceived)
      : null

  const closeCashPaymentModal = useCallback(() => {
    setCashPaymentModalOpen(false)
    setCashReceivedInput('')
    setVipChargedTotalInput('')
  }, [])

  const closeSettleModal = useCallback(() => {
    setSettleModalTabId(null)
    setSettleCashReceived('')
  }, [])

  const closeConfigurator = useCallback(() => {
    setConfigProduct(null)
    setPickedFormatId(null)
    setPickedComplementId(null)
  }, [])

  const closeInternalConsumptionModal = useCallback(() => {
    setInternalConsumptionModalOpen(false)
    setInternalConsumptionReason('')
    setInternalConsumptionProductId(null)
    setInternalConsumptionQty('1')
  }, [])

  const vipNote =
    selectedVip != null
      ? `Condición: ${
          selectedVip.conditionType === 'exempt' ? 'Exoneración (cobra 0)' : 'Precio diferenciado (definir al cobrar)'
        } · Total real ${totalDue.toFixed(2)}`
      : null

  const ticketLines = useMemo(
    () =>
      cart.map((line) => ({
        key: line.key,
        productName: line.productName,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        catalogUnitPrice: line.catalogUnitPrice,
        discount: line.discount,
        formatLabel: line.formatLabel,
        complementLabel: line.complementLabel,
        priceChangeNote: line.priceChangeNote,
        canEditPrice: true,
      })),
    [cart],
  )

  const internalConsumptionMutation = useMutation({
    mutationFn: async () => {
      const reason = internalConsumptionReason.trim()
      const productId = internalConsumptionProductId
      const qty = Number(internalConsumptionQty.replace(',', '.'))
      if (!reason) {
        throw new Error('Indique un motivo.')
      }
      if (productId == null) {
        throw new Error('Seleccione un producto.')
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error('Indique una cantidad válida.')
      }
      return window.api.internalConsumptions.create({
        reason,
        attachToCurrentCashSession: true,
        items: [{ productId, quantity: qty }],
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries()
      closeInternalConsumptionModal()
    },
  })

  const cartPriceNotesValid = useMemo(() => {
    if (selectedVipCustomerId != null) {
      return true
    }
    for (const line of cart) {
      if (Math.abs(line.unitPrice - line.catalogUnitPrice) > 0.001 && !line.priceChangeNote?.trim()) {
        return false
      }
    }
    return true
  }, [cart, selectedVipCustomerId])

  useEffect(() => {
    if (cartPriceNotesValid) {
      setCartPriceBlockError(null)
    }
  }, [cartPriceNotesValid])

  const priceEditLine = useMemo(
    () => (priceEditLineKey != null ? cart.find((l) => l.key === priceEditLineKey) : undefined),
    [cart, priceEditLineKey],
  )

  const handleConfirmSale = () => {
    if (!cartPriceNotesValid) {
      setCartPriceBlockError('Indique el motivo del cambio de precio en cada linea con precio distinto al catalogo (cliente sin VIP).')
      return
    }
    setCartPriceBlockError(null)
    if (saleMode === 'tab') {
      saleMutation.mutate()
    } else {
      if (selectedVip?.conditionType === 'exempt') {
        saleMutation.mutate()
        return
      }
      if (selectedVip?.conditionType === 'discount_manual') {
        setVipChargedTotalInput(totalDue.toFixed(2))
      }
      setCashPaymentModalOpen(true)
    }
  }

  return (
    <section className={cn('flex min-h-0 flex-col gap-4', currentShiftQuery.data && 'flex-1')}>
      {!currentShiftQuery.data ? (
        <>
          <div className="shrink-0">
            <h1 className="text-2xl font-semibold text-slate-900">Ventas</h1>
            {/* <p className="text-sm text-slate-500">POS: contado, pagaré y VIP.</p> */}
          </div>
          <Card padding="lg">
            <p className="mb-4 text-slate-600">No hay turno de caja abierto. Abra un turno para registrar ventas.</p>
            <Button onClick={() => setOpenShiftModalOpen(true)} variant="primary">
              Abrir turno actual
            </Button>
          </Card>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:items-stretch">
          <div
            className={cn(
              'flex min-h-0 min-w-0 flex-1 flex-col gap-4 lg:min-h-0 lg:pr-1',
              /* Cuenta abierta: un solo scroll para toolbar + categorías + productos (sin caja fija en Productos). */
              saleMode === 'tab' && 'overflow-y-auto',
            )}
          >
            <div className="sticky top-0 z-20 flex shrink-0 flex-col gap-3 border-b border-border bg-surface py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold text-slate-900">Ventas</h1>
                {/* <p className="text-sm text-slate-500">POS: contado, pagaré y VIP.</p> */}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                <Button
                  onClick={() => {
                    const first = internalConsumptionProductsQuery.data?.[0]?.id ?? null
                    setInternalConsumptionProductId(first)
                    setInternalConsumptionModalOpen(true)
                  }}
                  type="button"
                  variant="secondary"
                >
                  Consumo interno
                </Button>
                <Button
                  onClick={togglePosLargeText}
                  type="button"
                  variant={posLargeText ? 'primary' : 'secondary'}
                >
                  Texto grande
                </Button>
                {/* <Button
                  onClick={toggleHighContrast}
                  type="button"
                  variant={highContrast ? 'warning' : 'secondary'}
                >
                  Alto contraste
                </Button> */}
                <Button
                  onClick={() => {
                    setSaleMode('cash')
                    setSelectedTabId(null)
                  }}
                  variant={saleMode === 'cash' ? 'primary' : 'secondary'}
                >
                  Contado
                </Button>
                <Button
                  onClick={() => {
                    setSaleMode('tab')
                  }}
                  variant={saleMode === 'tab' ? 'warning' : 'secondary'}
                >
                  Cuenta abierta
                </Button>
              </div>
            </div>

            <PosToolbar
              onNewTab={() => {
                setNewTabModalOpen(true)
              }}
              onSelectTab={(id) => {
                setSelectedTabId(id)
              }}
              openTabs={openTabsQuery.data ?? []}
              saleMode={saleMode}
              selectedTabId={selectedTabId}
            />

            <Card className="shrink-0" padding="md">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Categorías</h2>
              <PosCategoryTabs
                error={catalogQuery.isError}
                loading={catalogQuery.isLoading}
                onSelectCategory={setSelectedCategoryId}
                selectedCategoryId={selectedCategoryId}
                tree={tree}
              />
            </Card>

            <div
              className={cn(
                'flex flex-col rounded-2xl border border-border bg-surface-card shadow-sm',
                saleMode === 'cash' && 'min-h-0 flex-1 overflow-hidden',
              )}
            >
              <div className="shrink-0 border-b border-slate-100 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Productos</h2>
                  <Input
                    className="h-9 w-full sm:w-[280px]"
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Buscar producto..."
                    type="search"
                    value={productSearch}
                  />
                </div>
              </div>
              <div
                className={cn(
                  'overflow-x-hidden px-4 pb-4 pt-3',
                  saleMode === 'cash' ? 'min-h-0 flex-1 overflow-y-auto' : '',
                )}
              >
                <PosProductGrid
                  loading={productsQuery.isLoading}
                  onAddProduct={beginAddProduct}
                  products={productsQuery.data}
                  selectedCategoryId={selectedCategoryId}
                />
              </div>
            </div>
          </div>

          <div className="flex w-full min-h-0 shrink-0 flex-col gap-4 lg:w-[380px] lg:min-w-[380px] lg:self-stretch">
            <div className="flex min-h-[260px] flex-1 flex-col lg:min-h-0 gap-2">
            <PosAccountsSection
              loading={openTabsQuery.isLoading}
              onSettleClick={(t) => {
                setSettleCashReceived('')
                setSettleModalTabId(t.id)
              }}
              openTabs={openTabsQuery.data ?? []}
              removeLineError={
                removeTabChargeLineMutation.isError
                  ? ((removeTabChargeLineMutation.error as Error)?.message ?? 'No se pudo quitar la linea.')
                  : null
              }
              removeLinePending={removeTabChargeLineMutation.isPending}
              settleError={
                settleTabMutation.isError
                  ? ((settleTabMutation.error as Error)?.message ?? 'No se pudo liquidar.')
                  : null
              }
              settlePending={settleTabMutation.isPending}
            />
              <PosTicketPanel
                cartTotal={cartTotal}
                hasVipSelected={selectedVipCustomerId != null}
                lines={ticketLines}
                onConfirmClick={handleConfirmSale}
                onSelectVip={(id) => {
                  setSelectedVipCustomerId(id)
                  setVipChargedTotalInput('')
                }}
                selectedVipCustomerId={selectedVipCustomerId}
                vipCustomers={vipCustomersQuery.data ?? []}
                vipLoading={vipCustomersQuery.isLoading}
                vipNote={vipNote}
                onDiscountChange={(key, discount) => {
                  setCart((c) => c.map((l) => (l.key === key ? { ...l, discount } : l)))
                }}
                onEditPriceClick={(key) => {
                  const line = cart.find((l) => l.key === key)
                  if (!line) {
                    return
                  }
                  setPriceEditLineKey(key)
                  setPriceEditUnit(line.unitPrice.toFixed(2))
                  setPriceEditNote(line.priceChangeNote ?? '')
                  setPriceEditError(null)
                }}
                onEditComplementClick={(key) => {
                  const line = cart.find((l) => l.key === key)
                  if (!line || line.saleFormatId == null) {
                    return
                  }
                  const fmt = formatById.get(line.saleFormatId)
                  if (fmt?.requiresComplement !== 1) {
                    return
                  }
                  setComplementEditLineKey(key)
                  setComplementEditPickedId(line.complementProductId ?? null)
                }}
                onQuantityChange={(key, quantity) => {
                  setCart((c) => c.map((l) => (l.key === key ? { ...l, quantity } : l)))
                }}
                onRemoveLine={(key) => {
                  setCart((c) => c.filter((l) => l.key !== key))
                }}
                saleError={
                  cartPriceBlockError ??
                  (saleMutation.isError ? ((saleMutation.error as Error)?.message ?? 'No se pudo registrar la venta.') : null)
                }
                saleMode={saleMode}
                salePending={saleMutation.isPending}
                selectedTabId={selectedTabId}
              />
            </div>

           
          </div>
        </div>
      )}

      <OpenShiftModal onClose={() => setOpenShiftModalOpen(false)} open={openShiftModalOpen} />

      <Modal
        footer={
          <>
            <Button
              onClick={() => {
                setNewTabModalOpen(false)
                setNewTabName('')
                setNewTabVipCustomerId('')
              }}
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button
              disabled={
                openTabMutation.isPending || (!newTabName.trim() && newTabVipCustomerId === '')
              }
              onClick={() => {
                const payload: { customerName: string; vipCustomerId?: number } = {
                  customerName: newTabName.trim(),
                }
                if (newTabVipCustomerId !== '') {
                  const id = Number(newTabVipCustomerId)
                  if (Number.isInteger(id) && id > 0) {
                    payload.vipCustomerId = id
                  }
                }
                openTabMutation.mutate(payload)
              }}
              variant="primary"
            >
              {openTabMutation.isPending ? 'Abriendo...' : 'Abrir cuenta'}
            </Button>
          </>
        }
        onClose={() => {
          setNewTabModalOpen(false)
          setNewTabName('')
          setNewTabVipCustomerId('')
        }}
        open={newTabModalOpen}
        title="Nueva cuenta"
      >
        <p className="text-sm text-slate-600">
          Nombre del cliente
          {newTabVipCustomerId === '' ? ' (obligatorio si no elige VIP)' : ' (opcional si elige VIP; se usará el nombre del VIP)'}
        </p>
        <Input
          className="mt-4"
          onChange={(e) => setNewTabName(e.target.value)}
          placeholder={newTabVipCustomerId === '' ? 'Ej. Maria Lopez' : 'Opcional: alias o nota en cuenta'}
          value={newTabName}
        />
        <p className="mt-4 text-sm text-slate-600">Cliente VIP (opcional; no disponible para cuentas con exoneración total)</p>
        <select
          className={cn(selectFieldClass, 'mt-2 w-full')}
          onChange={(e) => {
            const v = e.target.value
            setNewTabVipCustomerId(v === '' ? '' : Number(v))
          }}
          value={newTabVipCustomerId === '' ? '' : String(newTabVipCustomerId)}
        >
          <option value="">Sin VIP</option>
          {(vipCustomersQuery.data ?? [])
            .filter((c) => c.conditionType !== 'exempt')
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
        {openTabMutation.isError ? (
          <p className="mt-2 text-sm text-rose-600">{(openTabMutation.error as Error)?.message}</p>
        ) : null}
      </Modal>

      <Modal
        footer={
          <>
            <Button onClick={closeSettleModal} variant="secondary">
              Cancelar
            </Button>
            <Button
              disabled={
                settleTabMutation.isPending ||
                removeTabChargeLineMutation.isPending ||
                tabChargeDetailQuery.isLoading ||
                !settlePaymentSufficient
              }
              onClick={() => settleModalTabId != null && settleTabMutation.mutate(settleModalTabId)}
              variant="primary"
            >
              {settleTabMutation.isPending
                ? 'Procesando...'
                : settleBalanceCents === 0
                  ? 'Cerrar cuenta'
                  : 'Confirmar cobro'}
            </Button>
          </>
        }
        maxWidthClass="max-w-lg"
        onClose={closeSettleModal}
        open={settleModalTabId != null}
        title={
          settleDetail?.customerName
            ? `Liquidar cuenta — ${settleDetail.customerName}`
            : 'Liquidar cuenta (efectivo)'
        }
      >
        <p className="text-sm text-slate-600">
          Revise los cargos a la cuenta, quite lineas si corresponde e indique el efectivo recibido para calcular el cambio.
        </p>

        {tabChargeDetailQuery.isLoading ? (
          <p className="mt-4 text-sm text-slate-500">Cargando detalle...</p>
        ) : tabChargeDetailQuery.isError ? (
          <p className="mt-4 text-sm text-rose-600">
            {(tabChargeDetailQuery.error as Error)?.message ?? 'No se pudo cargar la cuenta.'}
          </p>
        ) : settleDetail ? (
          <>
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">Cargos pendientes</h4>
              {settleDetail.lines.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500">Sin lineas en esta cuenta.</p>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => {
                        setCancelEmptyTabReason('')
                        setCancelEmptyTabModalOpen(true)
                      }}
                      variant="danger"
                    >
                      Cancelar cuenta (vacía)
                    </Button>
                  </div>
                </div>
              ) : (
                <ul className="max-h-52 space-y-2 overflow-y-auto pr-1">
                  {settleDetail.lines.map((line) => (
                    <li
                      className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                      key={line.saleItemId}
                    >
                      <div>
                        <p className="font-medium text-slate-900">{line.productName}</p>
                        <p className="text-xs text-slate-500">
                          {line.quantity} u. · {line.createdAt}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="tabular-nums text-brand">{line.subtotal.toFixed(2)}</span>
                        <button
                          className="text-xs text-rose-600 hover:underline disabled:opacity-40"
                          disabled={removeTabChargeLineMutation.isPending}
                          onClick={() => {
                            setRemoveLineSaleItemId(line.saleItemId)
                            setRemoveLineReason('')
                            setRemoveLineModalOpen(true)
                          }}
                          type="button"
                        >
                          Quitar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-slate-50 px-3 py-2 text-slate-800">
              <span>Total a cobrar</span>
              <span className={cn(posLargeText ? 'text-3xl' : 'text-2xl', 'font-semibold tabular-nums text-brand')}>
                {settleDetail.balance.toFixed(2)}
              </span>
            </div>

            {settleBalanceCents > 0 ? (
              <label className="mt-4 block text-sm text-slate-700">
                Monto recibido
                <Input
                  autoFocus
                  className="mt-1"
                  min={0}
                  onChange={(e) => setSettleCashReceived(e.target.value)}
                  step={0.01}
                  type="number"
                  value={settleCashReceived}
                />
              </label>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Saldo 0: se cerrara la cuenta sin cobro en efectivo.</p>
            )}

            {settleChangeAmount != null ? (
              <div className="mt-4 flex items-center justify-between text-slate-800">
                <span>Cambio</span>
                <span className={cn(posLargeText ? 'text-3xl' : 'text-2xl', 'font-semibold tabular-nums text-brand')}>
                  {settleChangeAmount.toFixed(2)}
                </span>
              </div>
            ) : null}
            {settleShortfall != null ? (
              <p className="mt-3 text-sm text-amber-700">Falta {settleShortfall.toFixed(2)} para cubrir el total.</p>
            ) : null}
            {parsedSettleReceived == null && settleCashReceived.trim() !== '' && settleBalanceCents > 0 ? (
              <p className="mt-2 text-xs text-rose-600">Indique un monto valido.</p>
            ) : null}
          </>
        ) : null}

        {settleTabMutation.isError ? (
          <p className="mt-3 text-sm text-rose-600">
            {(settleTabMutation.error as Error)?.message ?? 'No se pudo liquidar.'}
          </p>
        ) : null}
        {removeTabChargeLineMutation.isError ? (
          <p className="mt-2 text-sm text-rose-600">
            {(removeTabChargeLineMutation.error as Error)?.message ?? 'No se pudo quitar la linea.'}
          </p>
        ) : null}
      </Modal>

      <Modal
        footer={
          <>
            <Button
              onClick={() => {
                setCancelEmptyTabModalOpen(false)
                setCancelEmptyTabReason('')
              }}
              variant="secondary"
            >
              Volver
            </Button>
            <Button
              disabled={
                cancelEmptyTabMutation.isPending ||
                settleModalTabId == null ||
                cancelEmptyTabReason.trim().length === 0 ||
                tabChargeDetailQuery.isLoading
              }
              onClick={() => {
                if (settleModalTabId == null) return
                cancelEmptyTabMutation.mutate({ tabId: settleModalTabId, reason: cancelEmptyTabReason.trim() })
              }}
              variant="danger"
            >
              {cancelEmptyTabMutation.isPending ? 'Cancelando...' : 'Confirmar cancelación'}
            </Button>
          </>
        }
        maxWidthClass="max-w-md"
        onClose={() => {
          setCancelEmptyTabModalOpen(false)
          setCancelEmptyTabReason('')
        }}
        open={cancelEmptyTabModalOpen}
        title="Confirmar cancelación de cuenta"
      >
        <p className="text-sm text-slate-600">
          Solo se permite cancelar una cuenta si no tiene artículos. Esta acción quedará registrada y aparecerá en el cierre de turno.
        </p>
        <label className="mt-4 block text-sm text-slate-700">
          Motivo (obligatorio)
          <textarea
            className="mt-1 min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            onChange={(e) => setCancelEmptyTabReason(e.target.value)}
            placeholder="Ej. cuenta abierta por error, cliente se fue sin consumir..."
            value={cancelEmptyTabReason}
          />
        </label>
        {cancelEmptyTabMutation.isError ? (
          <p className="mt-2 text-sm text-rose-600">
            {(cancelEmptyTabMutation.error as Error)?.message ?? 'No se pudo cancelar la cuenta.'}
          </p>
        ) : null}
      </Modal>

      <Modal
        footer={
          <>
            <Button
              onClick={() => {
                setRemoveLineModalOpen(false)
                setRemoveLineSaleItemId(null)
                setRemoveLineReason('')
              }}
              variant="secondary"
            >
              Volver
            </Button>
            <Button
              disabled={
                removeTabChargeLineMutation.isPending ||
                removeLineSaleItemId == null ||
                removeLineReason.trim().length === 0
              }
              onClick={() => {
                if (removeLineSaleItemId == null) return
                removeTabChargeLineMutation.mutate({ saleItemId: removeLineSaleItemId, reason: removeLineReason.trim() })
              }}
              variant="danger"
            >
              {removeTabChargeLineMutation.isPending ? 'Quitando...' : 'Confirmar quitar línea'}
            </Button>
          </>
        }
        maxWidthClass="max-w-md"
        onClose={() => {
          setRemoveLineModalOpen(false)
          setRemoveLineSaleItemId(null)
          setRemoveLineReason('')
        }}
        open={removeLineModalOpen}
        title="Confirmar quitar línea"
      >
        <p className="text-sm text-slate-600">
          Esta acción revierte inventario/consumo progresivo y queda registrada. Indique el motivo antes de continuar.
        </p>
        <label className="mt-4 block text-sm text-slate-700">
          Motivo (obligatorio)
          <textarea
            className="mt-1 min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            onChange={(e) => setRemoveLineReason(e.target.value)}
            placeholder="Ej. producto mal cargado, cambio de pedido..."
            value={removeLineReason}
          />
        </label>
        {removeTabChargeLineMutation.isError ? (
          <p className="mt-2 text-sm text-rose-600">
            {(removeTabChargeLineMutation.error as Error)?.message ?? 'No se pudo quitar la línea.'}
          </p>
        ) : null}
      </Modal>

      <Modal
        footer={
          <>
            <Button onClick={closeCashPaymentModal} variant="secondary">
              Cancelar
            </Button>
            <Button
              disabled={
                !cashPaymentSufficient ||
                saleMutation.isPending ||
                (selectedVip?.conditionType === 'discount_manual' &&
                  (parsedVipChargedTotal == null || parsedVipChargedTotal > totalDue))
              }
              onClick={() => saleMutation.mutate()}
              variant="primary"
            >
              {saleMutation.isPending ? 'Registrando...' : 'Confirmar venta'}
            </Button>
          </>
        }
        onClose={closeCashPaymentModal}
        open={cashPaymentModalOpen}
        title="Cobro en efectivo"
      >
        <p className="text-sm text-slate-600">Confirme el monto recibido y el cambio antes de registrar la venta.</p>
        <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-slate-50 px-3 py-2 text-slate-800">
          <span>Total a cobrar</span>
          <span className={cn(posLargeText ? 'text-4xl' : 'text-3xl', 'font-semibold tabular-nums text-brand')}>
            {amountToCharge.toFixed(2)}
          </span>
        </div>

        {selectedVip?.conditionType === 'discount_manual' ? (
          <label className="mt-4 block text-sm text-slate-700">
            Monto a cobrar (VIP)
            <Input
              className="mt-1"
              min={0}
              onChange={(e) => setVipChargedTotalInput(e.target.value)}
              step={0.01}
              type="number"
              value={vipChargedTotalInput}
            />
            {parsedVipChargedTotal == null && vipChargedTotalInput.trim() !== '' ? (
              <p className="mt-2 text-xs text-rose-600">Indique un monto válido.</p>
            ) : null}
            {parsedVipChargedTotal != null && parsedVipChargedTotal > totalDue ? (
              <p className="mt-2 text-xs text-rose-600">No puede exceder el total real ({totalDue.toFixed(2)}).</p>
            ) : null}
          </label>
        ) : null}
        <label className="mt-4 block text-sm text-slate-700">
          Monto recibido
          <Input
            autoFocus
            className="mt-1"
            min={0}
            onChange={(e) => setCashReceivedInput(e.target.value)}
            step={0.01}
            type="number"
            value={cashReceivedInput}
          />
        </label>
        {cashPaymentSufficient && changeAmount != null ? (
          <div className="mt-4 flex items-center justify-between text-slate-800">
            <span>Cambio</span>
            <span className={cn(posLargeText ? 'text-4xl' : 'text-3xl', 'font-semibold tabular-nums text-brand')}>
              {changeAmount.toFixed(2)}
            </span>
          </div>
        ) : null}
        {shortfall != null ? (
          <p className="mt-3 text-sm text-amber-700">Falta {shortfall.toFixed(2)} para cubrir el total.</p>
        ) : null}
        {parsedReceived == null && cashReceivedInput.trim() !== '' ? (
          <p className="mt-3 text-sm text-rose-600">Indique un monto valido.</p>
        ) : null}
        {saleMutation.isError ? (
          <p className="mt-2 text-sm text-rose-600">
            {(saleMutation.error as Error)?.message ?? 'No se pudo registrar la venta.'}
          </p>
        ) : null}
      </Modal>

      {configProduct ? (
        <Modal
          footer={
            <>
              <Button onClick={closeConfigurator} variant="secondary">
                Cancelar
              </Button>
              <Button
                disabled={!canConfirmConfigurator(tree, configProduct, pickedFormatId, pickedComplementId, formatById)}
                onClick={confirmConfiguredLine}
                variant="primary"
              >
                Agregar al carrito
              </Button>
            </>
          }
          onClose={closeConfigurator}
          open
          title="Configurar linea"
        >
          <p className="text-sm text-slate-600">{configProduct.name}</p>

          {(findCategoryNode(tree, configProduct.categoryId)?.effectiveSaleFormatIds.length ?? 0) > 1 ? (
            <label className="mt-4 block text-sm text-slate-700">
              Formato
              <select
                className={`${selectFieldClass} mt-1`}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  setPickedFormatId(Number.isFinite(v) ? v : null)
                  setPickedComplementId(null)
                }}
                value={pickedFormatId ?? ''}
              >
                <option value="">Seleccione...</option>
                {(findCategoryNode(tree, configProduct.categoryId)?.effectiveSaleFormatIds ?? []).map((id) => (
                  <option key={id} value={id}>
                    {formatById.get(id)?.name ?? id}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {pickedFormatId && formatById.get(pickedFormatId)?.requiresComplement === 1 ? (
            <label className="mt-4 block text-sm text-slate-700">
              Complemento
              <select
                className={`${selectFieldClass} mt-1`}
                disabled={complementQuery.isLoading}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  setPickedComplementId(Number.isFinite(v) ? v : null)
                }}
                value={pickedComplementId ?? ''}
              >
                <option value="">{complementQuery.isLoading ? 'Cargando...' : 'Seleccione...'}</option>
                {complementQuery.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </Modal>
      ) : null}

      <Modal
        footer={
          <>
            <Button onClick={closeInternalConsumptionModal} variant="secondary">
              Cancelar
            </Button>
            <Button
              disabled={internalConsumptionMutation.isPending}
              onClick={() => internalConsumptionMutation.mutate()}
              variant="primary"
            >
              {internalConsumptionMutation.isPending ? 'Registrando...' : 'Registrar consumo'}
            </Button>
          </>
        }
        onClose={closeInternalConsumptionModal}
        open={internalConsumptionModalOpen}
        title="Registrar consumo interno"
      >
        <p className="text-sm text-slate-600">
          Registra un descuento manual de stock (no afecta caja) y queda visible en historial de inventario.
        </p>

        <label className="mt-4 block text-sm text-slate-700">
          Motivo (obligatorio)
          <textarea
            className="mt-1 min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            onChange={(e) => setInternalConsumptionReason(e.target.value)}
            placeholder="Ej. apertura de paquete, merma, consumo personal..."
            value={internalConsumptionReason}
          />
        </label>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm text-slate-700">
            Producto
            <select
              className={`${selectFieldClass} mt-1`}
              onChange={(e) => {
                const v = Number(e.target.value)
                setInternalConsumptionProductId(Number.isFinite(v) ? v : null)
              }}
              value={internalConsumptionProductId ?? ''}
            >
              <option value="">Seleccione...</option>
              {(internalConsumptionProductsQuery.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-slate-700">
            Cantidad
            <Input
              className="mt-1"
              min={0}
              onChange={(e) => setInternalConsumptionQty(e.target.value)}
              step={0.001}
              type="number"
              value={internalConsumptionQty}
            />
          </label>
        </div>

        {internalConsumptionMutation.isError ? (
          <p className="mt-2 text-sm text-rose-600">
            {(internalConsumptionMutation.error as Error)?.message ?? 'No se pudo registrar el consumo interno.'}
          </p>
        ) : null}
      </Modal>

      <Modal
        footer={
          <>
            <Button
              onClick={() => {
                setComplementEditLineKey(null)
                setComplementEditPickedId(null)
              }}
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button
              disabled={
                complementEditLineKey == null ||
                complementEditPickedId == null ||
                complementEditQuery.isLoading ||
                complementEditQuery.isError
              }
              onClick={() => {
                if (!complementEditLine || complementEditPickedId == null) {
                  return
                }
                const fmt = complementEditLine.saleFormatId != null ? formatById.get(complementEditLine.saleFormatId) : null
                if (!fmt || fmt.requiresComplement !== 1) {
                  return
                }
                const product = productsQuery.data?.find((p) => p.id === complementEditLine.productId) ?? null
                const picked = complementEditQuery.data?.find((p) => p.id === complementEditPickedId) ?? null
                if (!product || !picked) {
                  return
                }
                const nextCatalog = resolveDefaultUnitPrice(product, complementEditLine.saleFormatId, picked)
                setCart((c) =>
                  c.map((l) => {
                    if (l.key !== complementEditLine.key) {
                      return l
                    }
                    const next: CartLine = {
                      ...l,
                      complementProductId: picked.id,
                      complementLabel: picked.name,
                      catalogUnitPrice: nextCatalog,
                    }
                    if (Math.abs(l.unitPrice - l.catalogUnitPrice) <= 0.001) {
                      next.unitPrice = nextCatalog
                      next.priceChangeNote = null
                    }
                    return next
                  }),
                )
                setComplementEditLineKey(null)
                setComplementEditPickedId(null)
              }}
              variant="primary"
            >
              Guardar
            </Button>
          </>
        }
        maxWidthClass="max-w-md"
        onClose={() => {
          setComplementEditLineKey(null)
          setComplementEditPickedId(null)
        }}
        open={complementEditLineKey != null}
        title="Cambiar complemento"
      >
        {complementEditLine ? (
          <>
            <p className="text-sm font-medium text-slate-900">{complementEditLine.productName}</p>
            <p className="mt-1 text-xs text-slate-500">
              Formato: {complementEditLine.formatLabel ?? '—'}
            </p>

            <label className="mt-4 block text-sm text-slate-700">
              Complemento
              <select
                className={`${selectFieldClass} mt-1`}
                disabled={complementEditQuery.isLoading}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  setComplementEditPickedId(Number.isFinite(v) ? v : null)
                }}
                value={complementEditPickedId ?? ''}
              >
                <option value="">{complementEditQuery.isLoading ? 'Cargando...' : 'Seleccione...'}</option>
                {complementEditQuery.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            {complementEditQuery.isError ? (
              <p className="mt-2 text-sm text-rose-600">{(complementEditQuery.error as Error)?.message ?? 'No se pudo cargar.'}</p>
            ) : null}
          </>
        ) : null}
      </Modal>

      <Modal
        footer={
          <>
            <Button
              onClick={() => {
                setPriceEditLineKey(null)
                setPriceEditUnit('')
                setPriceEditNote('')
                setPriceEditError(null)
              }}
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (priceEditLineKey == null) {
                  return
                }
                const line = cart.find((l) => l.key === priceEditLineKey)
                if (!line) {
                  return
                }
                const u = Number(priceEditUnit.replace(',', '.'))
                if (!Number.isFinite(u) || u < 0) {
                  setPriceEditError('Indique un precio valido.')
                  return
                }
                const rounded = roundMoney2(u)
                const diff = Math.abs(rounded - line.catalogUnitPrice) > 0.001
                const note = priceEditNote.trim()
                if (diff && selectedVipCustomerId == null && !note) {
                  setPriceEditError('Indique el motivo del cambio de precio.')
                  return
                }
                setPriceEditError(null)
                setCart((c) =>
                  c.map((l) =>
                    l.key === priceEditLineKey
                      ? { ...l, unitPrice: rounded, priceChangeNote: diff ? note || null : null }
                      : l,
                  ),
                )
                setPriceEditLineKey(null)
                setPriceEditUnit('')
                setPriceEditNote('')
              }}
              variant="primary"
            >
              Guardar
            </Button>
          </>
        }
        maxWidthClass="max-w-md"
        onClose={() => {
          setPriceEditLineKey(null)
          setPriceEditUnit('')
          setPriceEditNote('')
          setPriceEditError(null)
        }}
        open={priceEditLineKey != null}
        title="Cambiar precio"
      >
        {priceEditLine ? (
          <>
            <p className="text-sm font-medium text-slate-900">{priceEditLine.productName}</p>
            <p className="mt-1 text-xs text-slate-500">Precio de catalogo: {priceEditLine.catalogUnitPrice.toFixed(2)}</p>
            <label className="mt-4 block text-sm text-slate-700">
              Precio unitario (venta)
              <Input
                className="mt-1"
                min={0}
                onChange={(e) => setPriceEditUnit(e.target.value)}
                step={0.01}
                type="number"
                value={priceEditUnit}
              />
            </label>
            <label className="mt-4 block text-sm text-slate-700">
              {selectedVipCustomerId != null
                ? 'Motivo del cambio (opcional)'
                : 'Motivo del cambio (obligatorio si el precio difiere del catalogo)'}
              <textarea
                className="mt-1 min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                onChange={(e) => setPriceEditNote(e.target.value)}
                placeholder={
                  selectedVipCustomerId != null ? 'Ej. promocion acordada' : 'Ej. descuento por rotura de empaque'
                }
                value={priceEditNote}
              />
            </label>
            {priceEditError ? <p className="mt-2 text-sm text-rose-600">{priceEditError}</p> : null}
          </>
        ) : null}
      </Modal>
    </section>
  )
}

function canConfirmConfigurator(
  tree: CategoryTreeNode[],
  product: Product,
  pickedFormatId: number | null,
  pickedComplementId: number | null,
  formatById: Map<number, SaleFormat>,
) {
  const node = findCategoryNode(tree, product.categoryId)
  if (!node) {
    return false
  }
  const ids = node.effectiveSaleFormatIds
  if (ids.length <= 1) {
    const fmt = ids.length === 1 ? formatById.get(ids[0]) : undefined
    if (fmt?.requiresComplement === 1) {
      return pickedComplementId != null
    }
    return true
  }
  if (pickedFormatId == null) {
    return false
  }
  const fmt = formatById.get(pickedFormatId)
  if (fmt?.requiresComplement === 1) {
    return pickedComplementId != null
  }
  return true
}
