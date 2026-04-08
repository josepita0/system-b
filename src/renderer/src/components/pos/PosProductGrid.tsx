import type { Product } from '@shared/types/product'
import { catalogMediaUrl } from '@shared/lib/catalogMediaUrl'
import { cn } from '@renderer/lib/cn'
import { useUiPrefsStore } from '@renderer/store/uiPrefsStore'

type Props = {
  products: Product[] | undefined
  loading: boolean
  selectedCategoryId: number | null
  onAddProduct: (product: Product) => void
}

export function PosProductGrid({ products, loading, selectedCategoryId, onAddProduct }: Props) {
  const posLargeText = useUiPrefsStore((s) => s.posLargeText)
  const highContrast = useUiPrefsStore((s) => s.highContrast)
  if (!selectedCategoryId) {
    return <p className="text-sm text-slate-500">Seleccione una categoria.</p>
  }
  if (loading) {
    return <p className="text-sm text-slate-500">Cargando productos...</p>
  }
  if (!products?.length) {
    return <p className="text-sm text-slate-500">No hay productos en esta categoria.</p>
  }

  return (
    <div className="grid min-h-0 min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,148px),220px))] justify-center gap-3">
      {products.map((product) => {
        const img = catalogMediaUrl(product.imageRelPath)
        return (
          <button
            className={cn(
              'flex h-full min-h-0 w-full max-w-[220px] flex-col overflow-hidden rounded-2xl border border-border bg-white text-left shadow-sm transition-shadow',
              'justify-self-center hover:border-brand/40 hover:shadow-md focus-visible:outline focus-visible:ring-2 focus-visible:ring-brand/30',
              highContrast && 'border-white/20 bg-slate-950 text-white hover:border-white/40',
            )}
            key={product.id}
            onClick={() => {
              onAddProduct(product)
            }}
            type="button"
          >
            <div
              className={cn(
                'flex aspect-[4/3] w-full shrink-0 items-center justify-center',
                highContrast ? 'bg-white/5' : 'bg-slate-100',
              )}
            >
              {img ? (
                <img alt="" className="h-full w-full object-cover" src={img} />
              ) : (
                <span className={cn('text-3xl', highContrast ? 'text-white/30' : 'text-slate-300')}>◇</span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1 p-3">
              <p
                className={cn(
                  'line-clamp-2 font-semibold leading-tight',
                  posLargeText ? 'text-base' : 'text-sm',
                  highContrast ? 'text-white' : 'text-slate-900',
                )}
              >
                {product.name}
              </p>
              <p className={cn('mt-auto font-semibold tabular-nums text-brand', posLargeText ? 'text-lg' : 'text-base')}>
                {product.salePrice.toFixed(2)}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
