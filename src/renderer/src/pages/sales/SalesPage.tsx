import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import type { CategoryTreeNode, Product, SaleFormat } from '@shared/types/product'
import { catalogMediaUrl } from '@shared/lib/catalogMediaUrl'
import { Button } from '@renderer/components/ui/Button'
import { Card } from '@renderer/components/ui/Card'
import { Input } from '@renderer/components/ui/Input'
import { Modal } from '@renderer/components/ui/Modal'
import { requireSalesRemoveTabChargeLine, requireSalesTabChargeDetail } from '@renderer/lib/salesPreload'
import { resolveShiftForDate } from '@renderer/utils/resolveShiftForDate'

type CartLine = {
  key: string
  productId: number
  productName: string
  categoryId: number
  unitPrice: number
  quantity: number
  discount: number
  saleFormatId: number | null
  complementProductId: number | null
  formatLabel?: string | null
  complementLabel?: string | null
}

function findCategoryNode(nodes: CategoryTreeNode[], id: number): CategoryTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node
    }
    const child = findCategoryNode(node.children, id)
    if (child) {
      return child
    }
  }
  return null
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
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [cart, setCart] = useState<CartLine[]>([])
  const [configProduct, setConfigProduct] = useState<Product | null>(null)
  const [pickedFormatId, setPickedFormatId] = useState<number | null>(null)
  const [pickedComplementId, setPickedComplementId] = useState<number | null>(null)
  const [saleMode, setSaleMode] = useState<'cash' | 'tab'>('cash')
  const [selectedTabId, setSelectedTabId] = useState<number | null>(null)
  const [selectedVipCustomerId, setSelectedVipCustomerId] = useState<number | null>(null)
  const [newTabModalOpen, setNewTabModalOpen] = useState(false)
  const [newTabName, setNewTabName] = useState('')
  const [cashPaymentModalOpen, setCashPaymentModalOpen] = useState(false)
  const [cashReceivedInput, setCashReceivedInput] = useState('')
  const [vipChargedTotalInput, setVipChargedTotalInput] = useState('')
  const [settleModalTabId, setSettleModalTabId] = useState<number | null>(null)
  const [settleCashReceived, setSettleCashReceived] = useState('')

  const currentShiftQuery = useQuery({
    queryKey: ['shift', 'current'],
    queryFn: () => window.api.shifts.current(),
  })

  const catalogQuery = useQuery({
    queryKey: ['sales', 'posCatalog'],
    queryFn: () => window.api.sales.posCatalog(),
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
    queryKey: ['sales', 'posProducts', selectedCategoryId],
    queryFn: () => window.api.sales.posProducts(selectedCategoryId!),
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

  const openMutation = useMutation({
    mutationFn: () =>
      window.api.shifts.open({
        shiftCode: resolveShiftForDate(new Date()),
        businessDate: new Date().toISOString().slice(0, 10),
        openingCash: 0,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shift', 'current'] })
    },
  })

  const openTabMutation = useMutation({
    mutationFn: (customerName: string) => window.api.sales.openTab({ customerName }),
    onSuccess: async (data) => {
      setSelectedTabId(data.id)
      setNewTabModalOpen(false)
      setNewTabName('')
      await queryClient.invalidateQueries({ queryKey: ['sales', 'openTabs'] })
    },
  })

  const removeTabChargeLineMutation = useMutation({
    mutationFn: (saleItemId: number) => requireSalesRemoveTabChargeLine()({ saleItemId }),
    onSuccess: async () => {
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

  const saleMutation = useMutation({
    mutationFn: () =>
      window.api.sales.create({
        items: cart.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          discount: line.discount,
          saleFormatId: line.saleFormatId,
          complementProductId: line.complementProductId,
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

  const beginAddProduct = useCallback(
    (product: Product) => {
      const node = findCategoryNode(tree, product.categoryId)
      if (!node) {
        return
      }
      const effectiveIds = [...node.effectiveSaleFormatIds].sort((a, b) => a - b)
      if (effectiveIds.length === 0) {
        setCart((prev) => [
          ...prev,
          {
            key: randomKey(),
            productId: product.id,
            productName: product.name,
            categoryId: product.categoryId,
            unitPrice: product.salePrice,
            quantity: 1,
            discount: 0,
            saleFormatId: null,
            complementProductId: null,
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
        setCart((prev) => [
          ...prev,
          {
            key: randomKey(),
            productId: product.id,
            productName: product.name,
            categoryId: product.categoryId,
            unitPrice: product.salePrice,
            quantity: 1,
            discount: 0,
            saleFormatId: onlyId,
            complementProductId: null,
            formatLabel: fmt?.name ?? null,
          },
        ])
        return
      }
      setConfigProduct(product)
      setPickedFormatId(null)
      setPickedComplementId(null)
    },
    [formatById, tree],
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
    setCart((prev) => [
      ...prev,
      {
        key: randomKey(),
        productId: configProduct.id,
        productName: configProduct.name,
        categoryId: configProduct.categoryId,
        unitPrice: configProduct.salePrice,
        quantity: 1,
        discount: 0,
        saleFormatId,
        complementProductId: fmt?.requiresComplement === 1 ? pickedComplementId : null,
        formatLabel: fmt?.name ?? null,
        complementLabel: complementName ?? null,
      },
    ])
    setConfigProduct(null)
    setPickedFormatId(null)
    setPickedComplementId(null)
  }, [complementQuery.data, configProduct, formatById, pickedComplementId, pickedFormatId, tree])

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

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">Ventas y tickets</h1>
        <p className="text-sm text-slate-400">POS: contado, pagaré, VIP y catálogo por categoría.</p>
      </div>

      {!currentShiftQuery.data ? (
        <Card padding="lg">
          <p className="mb-4 text-slate-400">No hay turno de caja abierto. Abra un turno para registrar ventas.</p>
          <Button onClick={() => openMutation.mutate()} variant="primary">
            Abrir turno actual
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <Card padding="md">
              <p className="text-sm text-slate-400">
                Sesion de caja #{currentShiftQuery.data.id} · Fecha operativa {currentShiftQuery.data.businessDate}
              </p>
            </Card>

            <Card padding="md">
              <h2 className="mb-3 text-lg font-medium text-white">Contado o cuenta (pagaré)</h2>
              <div className="flex flex-wrap gap-2">
                <Button
                  className={saleMode !== 'cash' ? 'opacity-80' : ''}
                  onClick={() => {
                    setSaleMode('cash')
                    setSelectedTabId(null)
                  }}
                  variant={saleMode === 'cash' ? 'primary' : 'secondary'}
                >
                  Contado
                </Button>
                <Button onClick={() => setSaleMode('tab')} variant={saleMode === 'tab' ? 'warning' : 'secondary'}>
                  Cuenta abierta
                </Button>
              </div>
              {saleMode === 'tab' ? (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="block min-w-[200px] flex-1 text-sm text-slate-300">
                      Cuenta activa
                      <select
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                        onChange={(e) => {
                          const v = e.target.value
                          setSelectedTabId(v === '' ? null : Number(v))
                        }}
                        value={selectedTabId ?? ''}
                      >
                        <option value="">Seleccione una cuenta...</option>
                        {openTabsQuery.data?.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.customerName} — {t.balance.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Button onClick={() => setNewTabModalOpen(true)} variant="secondary">
                      Nueva cuenta
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Los cargos van al pagaré (no suman a la caja de este turno hasta liquidar en efectivo).
                  </p>
                </div>
              ) : null}

              <div className="mt-4 border-t border-slate-800 pt-4">
                <h3 className="mb-2 text-sm font-medium text-slate-200">Cliente VIP (opcional)</h3>
                <label className="block text-sm text-slate-300">
                  Cliente
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                    disabled={vipCustomersQuery.isLoading}
                    onChange={(e) => {
                      const v = e.target.value
                      setSelectedVipCustomerId(v === '' ? null : Number(v))
                      setVipChargedTotalInput('')
                    }}
                    value={selectedVipCustomerId ?? ''}
                  >
                    <option value="">{vipCustomersQuery.isLoading ? 'Cargando...' : 'Sin VIP'}</option>
                    {(vipCustomersQuery.data ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.conditionType === 'exempt' ? 'Exonerado' : 'Manual'}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedVip ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Condición: {selectedVip.conditionType === 'exempt' ? 'Exoneración (cobra 0)' : 'Precio diferenciado (definir al cobrar)'} · Total real {totalDue.toFixed(2)}
                  </p>
                ) : null}
              </div>
            </Card>

            <Card padding="md">
              <h2 className="mb-3 text-lg font-medium text-white">Categorias</h2>
              {catalogQuery.isLoading ? (
                <p className="text-slate-400">Cargando catalogo...</p>
              ) : catalogQuery.isError ? (
                <p className="text-rose-400">No se pudo cargar el catalogo.</p>
              ) : (
                <CategoryTreeNav
                  nodes={tree}
                  onSelect={(id) => setSelectedCategoryId(id)}
                  selectedId={selectedCategoryId}
                />
              )}
            </Card>

            <Card padding="md">
              <h2 className="mb-3 text-lg font-medium text-white">Productos</h2>
              {!selectedCategoryId ? (
                <p className="text-slate-400">Seleccione una categoria.</p>
              ) : productsQuery.isLoading ? (
                <p className="text-slate-400">Cargando productos...</p>
              ) : productsQuery.data?.length === 0 ? (
                <p className="text-slate-400">No hay productos en esta categoria.</p>
              ) : (
                <ul className="divide-y divide-slate-800">
                  {productsQuery.data?.map((product) => (
                    <li className="flex flex-wrap items-center justify-between gap-2 py-3" key={product.id}>
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        {catalogMediaUrl(product.imageRelPath) ? (
                          <img
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-lg border border-slate-700 object-cover"
                            src={catalogMediaUrl(product.imageRelPath)!}
                          />
                        ) : null}
                        <div className="min-w-0">
                          <p className="font-medium text-slate-100">{product.name}</p>
                          <p className="text-sm text-slate-500">
                            {product.sku} · {product.salePrice.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <Button className="text-cyan-300" onClick={() => beginAddProduct(product)} variant="secondary">
                        Agregar
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card padding="md">
            <h2 className="mb-3 text-lg font-medium text-white">Carrito</h2>
            {cart.length === 0 ? (
              <p className="text-slate-400">Sin lineas.</p>
            ) : (
              <ul className="mb-4 max-h-[420px] space-y-3 overflow-y-auto">
                {cart.map((line) => (
                  <li className="rounded-xl border border-slate-800 bg-slate-950/50 p-3" key={line.key}>
                    <div className="flex justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-100">{line.productName}</p>
                        <LineMeta line={line} />
                      </div>
                      <button
                        className="text-xs text-rose-400 hover:underline"
                        onClick={() => setCart((c) => c.filter((l) => l.key !== line.key))}
                        type="button"
                      >
                        Quitar
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1 text-xs text-slate-400">
                        Cant.
                        <input
                          className="w-16 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
                          min={0.01}
                          onChange={(e) => {
                            const v = Number(e.target.value)
                            setCart((c) =>
                              c.map((l) => (l.key === line.key ? { ...l, quantity: Number.isFinite(v) ? v : l.quantity } : l)),
                            )
                          }}
                          step={0.01}
                          type="number"
                          value={line.quantity}
                        />
                      </label>
                      <label className="flex items-center gap-1 text-xs text-slate-400">
                        Desc.
                        <input
                          className="w-20 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
                          min={0}
                          onChange={(e) => {
                            const v = Number(e.target.value)
                            setCart((c) =>
                              c.map((l) => (l.key === line.key ? { ...l, discount: Number.isFinite(v) ? v : l.discount } : l)),
                            )
                          }}
                          step={0.01}
                          type="number"
                          value={line.discount}
                        />
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mb-4 flex items-center justify-between border-t border-slate-800 pt-3 text-slate-200">
              <span>Total estimado</span>
              <span className="text-lg font-semibold text-cyan-300">{cartTotal.toFixed(2)}</span>
            </div>
            <Button
              className="w-full py-2.5 font-medium"
              disabled={
                cart.length === 0 ||
                saleMutation.isPending ||
                (saleMode === 'tab' && selectedTabId == null)
              }
              onClick={() => {
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
              }}
              variant="primary"
            >
              {saleMutation.isPending
                ? 'Registrando...'
                : saleMode === 'tab'
                  ? 'Registrar a cuenta'
                  : 'Confirmar venta'}
            </Button>
            {saleMutation.isError ? (
              <p className="mt-2 text-sm text-rose-400">
                {(saleMutation.error as Error)?.message ?? 'No se pudo registrar la venta.'}
              </p>
            ) : null}

            <div className="mt-6 border-t border-slate-800 pt-4">
              <h3 className="mb-2 text-sm font-medium text-slate-200">Liquidar cuenta (efectivo)</h3>
              {openTabsQuery.isLoading ? (
                <p className="text-xs text-slate-500">Cargando cuentas...</p>
              ) : !openTabsQuery.data?.length ? (
                <p className="text-xs text-slate-500">No hay cuentas abiertas.</p>
              ) : (
                <ul className="space-y-2">
                  {openTabsQuery.data.map((t) => (
                    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2" key={t.id}>
                      <div>
                        <p className="text-sm font-medium text-slate-100">{t.customerName}</p>
                        <p className="text-xs text-slate-500">Saldo: {t.balance.toFixed(2)}</p>
                      </div>
                      <button
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                        disabled={
                          t.balance <= 0 ||
                          settleTabMutation.isPending ||
                          removeTabChargeLineMutation.isPending
                        }
                        onClick={() => {
                          setSettleCashReceived('')
                          setSettleModalTabId(t.id)
                        }}
                        type="button"
                      >
                        Cobrar y cerrar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {settleTabMutation.isError ? (
                <p className="mt-2 text-xs text-rose-400">
                  {(settleTabMutation.error as Error)?.message ?? 'No se pudo liquidar.'}
                </p>
              ) : null}
            </div>
          </Card>
        </div>
      )}

      <Modal
        footer={
          <>
            <Button
              onClick={() => {
                setNewTabModalOpen(false)
                setNewTabName('')
              }}
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button
              disabled={!newTabName.trim() || openTabMutation.isPending}
              onClick={() => openTabMutation.mutate(newTabName.trim())}
              variant="primary"
            >
              {openTabMutation.isPending ? 'Abriendo...' : 'Abrir cuenta'}
            </Button>
          </>
        }
        onClose={() => {
          setNewTabModalOpen(false)
          setNewTabName('')
        }}
        open={newTabModalOpen}
        title="Nueva cuenta"
      >
        <p className="text-sm text-slate-400">Nombre del cliente (obligatorio)</p>
        <Input className="mt-4" onChange={(e) => setNewTabName(e.target.value)} placeholder="Ej. Maria Lopez" value={newTabName} />
        {openTabMutation.isError ? (
          <p className="mt-2 text-sm text-rose-400">{(openTabMutation.error as Error)?.message}</p>
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
        <p className="text-sm text-slate-400">
          Revise los cargos a la cuenta, quite lineas si corresponde e indique el efectivo recibido para calcular el cambio.
        </p>

        {tabChargeDetailQuery.isLoading ? (
          <p className="mt-4 text-sm text-slate-500">Cargando detalle...</p>
        ) : tabChargeDetailQuery.isError ? (
          <p className="mt-4 text-sm text-rose-400">
            {(tabChargeDetailQuery.error as Error)?.message ?? 'No se pudo cargar la cuenta.'}
          </p>
        ) : settleDetail ? (
          <>
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">Cargos pendientes</h4>
              {settleDetail.lines.length === 0 ? (
                <p className="text-sm text-slate-500">Sin lineas en esta cuenta.</p>
              ) : (
                <ul className="max-h-52 space-y-2 overflow-y-auto pr-1">
                  {settleDetail.lines.map((line) => (
                    <li
                      className="flex items-start justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm"
                      key={line.saleItemId}
                    >
                      <div>
                        <p className="font-medium text-slate-100">{line.productName}</p>
                        <p className="text-xs text-slate-500">
                          {line.quantity} u. · {line.createdAt}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="tabular-nums text-cyan-300">{line.subtotal.toFixed(2)}</span>
                        <button
                          className="text-xs text-rose-400 hover:underline disabled:opacity-40"
                          disabled={removeTabChargeLineMutation.isPending}
                          onClick={() => removeTabChargeLineMutation.mutate(line.saleItemId)}
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

            <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-slate-200">
              <span>Total a cobrar</span>
              <span className="text-lg font-semibold text-cyan-300">{settleDetail.balance.toFixed(2)}</span>
            </div>

            {settleBalanceCents > 0 ? (
              <label className="mt-4 block text-sm text-slate-300">
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
              <div className="mt-4 flex items-center justify-between text-slate-200">
                <span>Cambio</span>
                <span className="text-lg font-semibold text-cyan-300">{settleChangeAmount.toFixed(2)}</span>
              </div>
            ) : null}
            {settleShortfall != null ? (
              <p className="mt-3 text-sm text-amber-400">Falta {settleShortfall.toFixed(2)} para cubrir el total.</p>
            ) : null}
            {parsedSettleReceived == null && settleCashReceived.trim() !== '' && settleBalanceCents > 0 ? (
              <p className="mt-2 text-xs text-rose-400">Indique un monto valido.</p>
            ) : null}
          </>
        ) : null}

        {settleTabMutation.isError ? (
          <p className="mt-3 text-sm text-rose-400">
            {(settleTabMutation.error as Error)?.message ?? 'No se pudo liquidar.'}
          </p>
        ) : null}
        {removeTabChargeLineMutation.isError ? (
          <p className="mt-2 text-sm text-rose-400">
            {(removeTabChargeLineMutation.error as Error)?.message ?? 'No se pudo quitar la linea.'}
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
        <p className="text-sm text-slate-400">Confirme el monto recibido y el cambio antes de registrar la venta.</p>
        <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-slate-200">
          <span>Total a cobrar</span>
          <span className="text-lg font-semibold text-cyan-300">{amountToCharge.toFixed(2)}</span>
        </div>

        {selectedVip?.conditionType === 'discount_manual' ? (
          <label className="mt-4 block text-sm text-slate-300">
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
              <p className="mt-2 text-xs text-rose-400">Indique un monto válido.</p>
            ) : null}
            {parsedVipChargedTotal != null && parsedVipChargedTotal > totalDue ? (
              <p className="mt-2 text-xs text-rose-400">No puede exceder el total real ({totalDue.toFixed(2)}).</p>
            ) : null}
          </label>
        ) : null}
        <label className="mt-4 block text-sm text-slate-300">
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
          <div className="mt-4 flex items-center justify-between text-slate-200">
            <span>Cambio</span>
            <span className="text-lg font-semibold text-cyan-300">{changeAmount.toFixed(2)}</span>
          </div>
        ) : null}
        {shortfall != null ? (
          <p className="mt-3 text-sm text-amber-400">Falta {shortfall.toFixed(2)} para cubrir el total.</p>
        ) : null}
        {parsedReceived == null && cashReceivedInput.trim() !== '' ? (
          <p className="mt-3 text-sm text-rose-400">Indique un monto valido.</p>
        ) : null}
        {saleMutation.isError ? (
          <p className="mt-2 text-sm text-rose-400">
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
          <p className="text-sm text-slate-400">{configProduct.name}</p>

          {(findCategoryNode(tree, configProduct.categoryId)?.effectiveSaleFormatIds.length ?? 0) > 1 ? (
            <label className="mt-4 block text-sm text-slate-300">
              Formato
              <select
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-slate-100"
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
            <label className="mt-4 block text-sm text-slate-300">
              Complemento
              <select
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-slate-100"
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
    </section>
  )
}

function LineMeta({ line }: { line: CartLine }) {
  const parts: string[] = []
  if (line.formatLabel) {
    parts.push(line.formatLabel)
  }
  if (line.complementLabel) {
    parts.push(`+ ${line.complementLabel}`)
  }
  if (parts.length === 0) {
    return null
  }
  return <p className="text-xs text-slate-500">{parts.join(' · ')}</p>
}

function CategoryTreeNav({
  nodes,
  depth = 0,
  selectedId,
  onSelect,
}: {
  nodes: CategoryTreeNode[]
  depth?: number
  selectedId: number | null
  onSelect: (id: number) => void
}) {
  return (
    <ul className="space-y-1">
      {nodes.map((node) => (
        <li key={node.id}>
          <button
            className={`w-full rounded-lg px-2 py-2 text-left text-sm ${
              selectedId === node.id ? 'bg-slate-800 text-cyan-300' : 'text-slate-200 hover:bg-slate-800/60'
            }`}
            onClick={() => onSelect(node.id)}
            style={{ paddingLeft: `${8 + depth * 12}px` }}
            type="button"
          >
            {node.name}
            {node.productCount > 0 ? <span className="text-slate-500"> ({node.productCount})</span> : null}
          </button>
          {node.children.length > 0 ? (
            <CategoryTreeNav depth={depth + 1} nodes={node.children} onSelect={onSelect} selectedId={selectedId} />
          ) : null}
        </li>
      ))}
    </ul>
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
