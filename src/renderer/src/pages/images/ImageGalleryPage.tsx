import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { catalogMediaUrl } from '@shared/lib/catalogMediaUrl'
import type { GalleryImage, GalleryImageListResult } from '@shared/types/imageGallery'
import type { Product } from '@shared/types/product'
import { Button } from '@renderer/components/ui/Button'
import { Modal } from '@renderer/components/ui/Modal'

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      className="h-10 w-full rounded-xl border border-border bg-surface-card px-3 text-sm text-slate-900 placeholder:text-slate-400"
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      value={value}
    />
  )
}

export function ImageGalleryPage() {
  const queryClient = useQueryClient()
  const location = useLocation()
  const galleryApi = window.api?.imageGallery
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [preview, setPreview] = useState<GalleryImage | null>(null)
  const [editTarget, setEditTarget] = useState<GalleryImage | null>(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const initialLinkProductId = (location.state as { linkProductId?: number } | null)?.linkProductId ?? null

  useEffect(() => {
    if (initialLinkProductId != null) {
      setLinkOpen(true)
    }
    // location.state is intentionally not included to avoid reopening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLinkProductId])

  if (!galleryApi) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">La Galería no está disponible en esta sesión.</p>
        <p className="mt-1 text-amber-800">
          Cierra y vuelve a abrir la aplicación para recargar el <span className="font-medium">preload</span>. Si estás
          en modo desarrollo, reinicia el proceso de Electron.
        </p>
      </div>
    )
  }

  const listQuery = useQuery<GalleryImageListResult>({
    queryKey: ['imageGallery', 'list', { q, category, page }],
    queryFn: () =>
      galleryApi.list({
        q: q.trim() || undefined,
        category: category.trim() ? category.trim() : undefined,
        page,
        pageSize: 48,
      }),
    placeholderData: keepPreviousData,
  })

  const items = listQuery.data?.items ?? []
  const total = listQuery.data?.total ?? 0
  const pageSize = listQuery.data?.pageSize ?? 48
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['imageGallery'] })
  }

  const importFilesMutation = useMutation({
    mutationFn: async () => {
      const paths = await galleryApi.pickFiles()
      if (paths.length === 0) return []
      return galleryApi.importFiles(paths)
    },
    onSuccess: async () => {
      await refresh()
    },
  })

  const importFolderMutation = useMutation({
    mutationFn: async () => {
      const folder = await galleryApi.pickFolder()
      if (!folder) return []
      return galleryApi.importFolder(folder)
    },
    onSuccess: async () => {
      await refresh()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (selectedIds.length === 0) return { deleted: 0 }
      return galleryApi.deleteBatch(selectedIds)
    },
    onSuccess: async () => {
      setSelectedIds([])
      await refresh()
    },
  })

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Galería de imágenes</h1>
          <p className="mt-1 text-sm text-slate-600">Importa, gestiona y vincula imágenes para productos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => importFilesMutation.mutate()} variant="secondary">
            Cargar archivo(s)
          </Button>
          <Button onClick={() => importFolderMutation.mutate()} variant="secondary">
            Cargar carpeta
          </Button>
          <Button
            disabled={selectedIds.length === 0}
            onClick={() => setLinkOpen(true)}
            variant="primary"
          >
            Vincular a producto
          </Button>
          <Button
            disabled={selectedIds.length === 0 || deleteMutation.isPending}
            onClick={() => {
              if (window.confirm(`Eliminar ${selectedIds.length} imagen(es)? Esta acción no se puede deshacer.`)) {
                deleteMutation.mutate()
              }
            }}
            variant="danger"
          >
            Eliminar seleccionadas
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <TextInput
          onChange={(v) => {
            setQ(v)
            setPage(1)
          }}
          placeholder="Buscar por nombre u original..."
          value={q}
        />
        <TextInput
          onChange={(v) => {
            setCategory(v)
            setPage(1)
          }}
          placeholder="Categoría (opcional)"
          value={category}
        />
        <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-card px-3 py-2 text-sm text-slate-600">
          <span>
            {total} imagen(es) · página {page} / {pageCount}
          </span>
          <div className="flex gap-2">
            <Button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} variant="ghost">
              Anterior
            </Button>
            <Button
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              variant="ghost"
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>

      {listQuery.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {listQuery.error instanceof Error ? listQuery.error.message : 'No se pudo cargar la galería.'}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {items.map((img) => {
          const src = catalogMediaUrl(img.storedRelPath)
          const selected = selectedSet.has(img.id)
          return (
            <div
              className={`group rounded-2xl border p-2 ${
                selected ? 'border-brand bg-brand-muted/30' : 'border-border bg-surface-card hover:bg-slate-50'
              }`}
              key={img.id}
            >
              <button
                className="block w-full"
                onClick={() => toggleSelected(img.id)}
                title="Seleccionar"
                type="button"
              >
                {src ? (
                  <img alt="" className="h-24 w-full rounded-xl border border-border object-cover" src={src} />
                ) : (
                  <div className="flex h-24 w-full items-center justify-center rounded-xl border border-dashed border-border text-xs text-slate-500">
                    Sin preview
                  </div>
                )}
              </button>
              <div className="mt-2 grid gap-1">
                <p className="truncate text-xs font-medium text-slate-900" title={img.name ?? img.originalName}>
                  {img.name ?? img.originalName}
                </p>
                <p className="truncate text-[11px] text-slate-500" title={img.category ?? ''}>
                  {img.category ?? 'Sin categoría'}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <button
                    className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-200"
                    onClick={() => setPreview(img)}
                    type="button"
                  >
                    Ver
                  </button>
                  <button
                    className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-200"
                    onClick={() => setEditTarget(img)}
                    type="button"
                  >
                    Editar
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <PreviewModal image={preview} onClose={() => setPreview(null)} />
      <EditMetadataModal
        image={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={async () => {
          setEditTarget(null)
          await refresh()
        }}
      />
      <LinkToProductModal
        open={linkOpen}
        initialProductId={initialLinkProductId}
        selectedImageIds={selectedIds}
        onClose={() => setLinkOpen(false)}
        onLinked={async () => {
          setLinkOpen(false)
          setSelectedIds([])
          await refresh()
        }}
      />
    </div>
  )
}

function PreviewModal({ image, onClose }: { image: GalleryImage | null; onClose: () => void }) {
  const src = catalogMediaUrl(image?.storedRelPath ?? null)
  return (
    <Modal
      maxWidthClass="max-w-4xl"
      onClose={onClose}
      open={Boolean(image)}
      title={image?.name ?? image?.originalName ?? 'Imagen'}
    >
      {src ? <img alt="" className="max-h-[70vh] w-full rounded-xl border border-border object-contain" src={src} /> : null}
    </Modal>
  )
}

function EditMetadataModal({
  image,
  onClose,
  onSaved,
}: {
  image: GalleryImage | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')

  const activeId = image?.id ?? null

  useEffect(() => {
    if (!image) {
      setName('')
      setDescription('')
      setCategory('')
      return
    }
    setName(image.name ?? '')
    setDescription(image.description ?? '')
    setCategory(image.category ?? '')
  }, [image])

  const mutation = useMutation({
    mutationFn: async () => {
      if (!activeId) return
      await window.api.imageGallery.updateMetadata(activeId, {
        name: name.trim() || null,
        description: description.trim() || null,
        category: category.trim() || null,
      })
    },
    onSuccess: async () => {
      await onSaved()
    },
  })

  const open = Boolean(image)

  return (
    <Modal
      footer={
        <>
          <Button
            onClick={() => {
              onClose()
              setName('')
              setDescription('')
              setCategory('')
            }}
            variant="secondary"
          >
            Cancelar
          </Button>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()} variant="primary">
            Guardar
          </Button>
        </>
      }
      onClose={() => {
        onClose()
        setName('')
        setDescription('')
        setCategory('')
      }}
      open={open}
      title="Editar metadatos"
    >
      <div className="grid gap-3">
        <div className="grid gap-1">
          <span className="text-xs font-medium text-slate-600">Nombre</span>
          <TextInput onChange={setName} value={name} />
        </div>
        <div className="grid gap-1">
          <span className="text-xs font-medium text-slate-600">Categoría</span>
          <TextInput onChange={setCategory} value={category} />
        </div>
        <div className="grid gap-1">
          <span className="text-xs font-medium text-slate-600">Descripción</span>
          <textarea
            className="min-h-[100px] w-full rounded-xl border border-border bg-surface-card px-3 py-2 text-sm text-slate-900"
            onChange={(e) => setDescription(e.target.value)}
            value={description}
          />
        </div>
      </div>
    </Modal>
  )
}

function LinkToProductModal({
  open,
  initialProductId,
  selectedImageIds,
  onClose,
  onLinked,
}: {
  open: boolean
  initialProductId: number | null
  selectedImageIds: number[]
  onClose: () => void
  onLinked: () => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [pickedProduct, setPickedProduct] = useState<Product | null>(null)
  const [setAsPrimary, setSetAsPrimary] = useState(true)

  useEffect(() => {
    if (!open) return
    if (initialProductId == null) return
    void (async () => {
      const p = await window.api.products.getById(initialProductId)
      if (p) setPickedProduct(p)
    })()
  }, [initialProductId, open])

  const productsQuery = useQuery({
    queryKey: ['products', 'pick', { search }],
    queryFn: async () => {
      const res = await window.api.products.listPaged({ page: 1, pageSize: 20, search: search.trim() || undefined })
      return res.items as Product[]
    },
    enabled: open,
  })

  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!pickedProduct) return
      await window.api.imageGallery.linkToProduct({
        productId: pickedProduct.id,
        imageIds: selectedImageIds,
        setPrimaryImageId: setAsPrimary ? selectedImageIds[0] ?? null : null,
      })
    },
    onSuccess: async () => {
      await onLinked()
      setSearch('')
      setPickedProduct(null)
    },
  })

  return (
    <Modal
      footer={
        <>
          <Button
            onClick={() => {
              onClose()
              setSearch('')
              setPickedProduct(null)
            }}
            variant="secondary"
          >
            Cerrar
          </Button>
          <Button
            disabled={!pickedProduct || selectedImageIds.length === 0 || linkMutation.isPending}
            onClick={() => linkMutation.mutate()}
            variant="primary"
          >
            Vincular
          </Button>
        </>
      }
      onClose={() => {
        onClose()
        setSearch('')
        setPickedProduct(null)
      }}
      open={open}
      title="Vincular a producto"
    >
      <div className="grid gap-3">
        <p className="text-sm text-slate-600">Seleccionadas: {selectedImageIds.length}</p>
        <TextInput onChange={setSearch} placeholder="Buscar producto por nombre o SKU..." value={search} />
        <div className="max-h-[260px] overflow-y-auto rounded-xl border border-border bg-white">
          {productsQuery.isLoading ? (
            <div className="p-3 text-sm text-slate-500">Cargando productos...</div>
          ) : productsQuery.error ? (
            <div className="p-3 text-sm text-rose-700">
              {productsQuery.error instanceof Error ? productsQuery.error.message : 'No se pudo cargar.'}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {(productsQuery.data ?? []).map((p) => {
                const active = pickedProduct?.id === p.id
                return (
                  <button
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${
                      active ? 'bg-brand-muted text-brand' : 'hover:bg-slate-50'
                    }`}
                    key={p.id}
                    onClick={() => setPickedProduct(p)}
                    type="button"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">{p.name}</span>
                      <span className="ml-2 text-xs text-slate-500">{p.sku}</span>
                    </span>
                    {active ? <span className="text-xs font-semibold">Seleccionado</span> : null}
                  </button>
                )
              })}
              {(productsQuery.data ?? []).length === 0 ? (
                <div className="p-3 text-sm text-slate-500">Sin resultados.</div>
              ) : null}
            </div>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input checked={setAsPrimary} onChange={(e) => setSetAsPrimary(e.target.checked)} type="checkbox" />
          Marcar la primera imagen como principal
        </label>
      </div>
    </Modal>
  )
}

