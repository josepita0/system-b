import type { CategoryTreeNode } from '@shared/types/product'
import { cn } from '@renderer/lib/cn'
import { findCategoryNode, findRootAncestor } from '@renderer/lib/posCategoryTree'

type Props = {
  tree: CategoryTreeNode[]
  selectedCategoryId: number | null
  onSelectCategory: (id: number) => void
  loading: boolean
  error: boolean
}

export function PosCategoryTabs({ tree, selectedCategoryId, onSelectCategory, loading, error }: Props) {
  const selectedNode = selectedCategoryId != null ? findCategoryNode(tree, selectedCategoryId) : null
  const activeRoot = selectedCategoryId != null ? findRootAncestor(tree, selectedCategoryId) : null

  if (loading) {
    return <p className="text-sm text-slate-500">Cargando catalogo...</p>
  }
  if (error) {
    return <p className="text-sm text-rose-600">No se pudo cargar el catalogo.</p>
  }
  if (!tree.length) {
    return <p className="text-sm text-slate-500">Sin categorias en el catalogo.</p>
  }

  return (
    <div className="space-y-3">
      <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {tree.map((root) => {
          const isActive = activeRoot?.id === root.id
          return (
            <button
              className={cn(
                'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-brand bg-brand-muted text-brand shadow-sm'
                  : 'border-border bg-white text-slate-600 hover:bg-slate-50',
              )}
              key={root.id}
              onClick={() => {
                onSelectCategory(root.id)
              }}
              type="button"
            >
              {root.name}
            </button>
          )
        })}
      </div>

      {selectedNode && selectedNode.children.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedNode.children.map((child) => {
            const isSel = selectedCategoryId === child.id
            return (
              <button
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm transition-colors',
                  isSel
                    ? 'border-brand bg-brand-muted font-medium text-brand'
                    : 'border-border bg-white text-slate-700 hover:border-slate-300',
                )}
                key={child.id}
                onClick={() => {
                  onSelectCategory(child.id)
                }}
                type="button"
              >
                {child.name}
                {child.productCount > 0 ? (
                  <span className="text-slate-400"> ({child.productCount})</span>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
