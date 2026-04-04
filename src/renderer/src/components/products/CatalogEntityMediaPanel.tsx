import { useState } from 'react'
import { catalogMediaUrl } from '@shared/lib/catalogMediaUrl'

type EntityKind = 'category' | 'product'

interface CatalogEntityMediaPanelProps {
  kind: EntityKind
  entityId: number | null
  imageRelPath: string | null
  pdfRelPath: string | null
  pdfOriginalName: string | null
  onChanged: () => Promise<void>
}

export function CatalogEntityMediaPanel({
  kind,
  entityId,
  imageRelPath,
  pdfRelPath,
  pdfOriginalName,
  onChanged,
}: CatalogEntityMediaPanelProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const imageSrc = catalogMediaUrl(imageRelPath)
  const label = kind === 'category' ? 'categoria' : 'producto'

  const run = async (action: () => Promise<unknown>) => {
    setError(null)
    setBusy(true)
    try {
      await action()
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operacion fallida.')
    } finally {
      setBusy(false)
    }
  }

  if (entityId == null) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-500">
        Guarde la {label} para poder adjuntar una imagen o un PDF.
      </div>
    )
  }

  return (
    <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <p className="text-sm font-medium text-slate-200">Archivos de {label}</p>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <div className="flex flex-wrap items-start gap-4">
        <div className="grid gap-2">
          <span className="text-xs text-slate-400">Imagen (PNG / JPEG)</span>
          {imageSrc ? (
            <img alt="" className="h-20 w-20 rounded-lg border border-slate-700 object-cover" src={imageSrc} />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-slate-700 text-xs text-slate-500">
              Sin imagen
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md border border-border bg-slate-100 px-2 py-1 text-xs text-slate-800 disabled:opacity-50"
              disabled={busy}
              onClick={() =>
                run(() =>
                  kind === 'category'
                    ? window.api.products.setCategoryImage(entityId)
                    : window.api.products.setProductImage(entityId),
                )
              }
              type="button"
            >
              Elegir imagen
            </button>
            {imageRelPath ? (
              <button
                className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 disabled:opacity-50"
                disabled={busy}
                onClick={() =>
                  run(() =>
                    kind === 'category'
                      ? window.api.products.clearCategoryImage(entityId)
                      : window.api.products.clearProductImage(entityId),
                  )
                }
                type="button"
              >
                Quitar
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2">
          <span className="text-xs text-slate-400">PDF</span>
          <p className="max-w-[220px] truncate text-xs text-slate-300">{pdfOriginalName ?? 'Sin PDF'}</p>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md border border-border bg-slate-100 px-2 py-1 text-xs text-slate-800 disabled:opacity-50"
              disabled={busy}
              onClick={() =>
                run(() =>
                  kind === 'category'
                    ? window.api.products.setCategoryPdf(entityId)
                    : window.api.products.setProductPdf(entityId),
                )
              }
              type="button"
            >
              Elegir PDF
            </button>
            {pdfRelPath ? (
              <>
                <button
                  className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 disabled:opacity-50"
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      kind === 'category'
                        ? window.api.products.clearCategoryPdf(entityId)
                        : window.api.products.clearProductPdf(entityId),
                    )
                  }
                  type="button"
                >
                  Quitar
                </button>
                <button
                  className="rounded-md bg-cyan-900/60 px-2 py-1 text-xs text-cyan-200 disabled:opacity-50"
                  disabled={busy}
                  onClick={() => run(() => window.api.products.openCatalogPdf(pdfRelPath!))}
                  type="button"
                >
                  Abrir
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
