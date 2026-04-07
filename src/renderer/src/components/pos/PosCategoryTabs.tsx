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

function normalizeCategoryName(name: string) {
  return name
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const key = normalizeCategoryName(name)

  // Intentionally simple inline SVGs to avoid extra icon deps.
  if (key.includes('refresco') || key.includes('bebida') || key.includes('soda')) {
    return (
      <svg aria-hidden className={cn('h-5 w-5', className)} fill="none" viewBox="0 0 24 24">
        <path
          d="M10 2h4m-3 4h2m-5 4h8l-1 12a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2L8 10Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    )
  }

  if (key.includes('cerveza') || key.includes('beer')) {
    return (
      <svg aria-hidden className={cn('h-5 w-5', className)} fill="none" viewBox="0 0 24 24">
        <path
          d="M7 7h9v6a5 5 0 0 1-5 5H9a2 2 0 0 1-2-2V7Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M16 9h2a2 2 0 0 1 0 4h-2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M8 5c.6-.7 1.6-1 2.5-.8.5.1 1 .4 1.5.8.5-.6 1.3-.9 2.1-.9.9 0 1.7.4 2.2 1.1"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    )
  }

  if (key.includes('cafe') || key.includes('coffee')) {
    return (
      <svg aria-hidden className={cn('h-5 w-5', className)} fill="none" viewBox="0 0 24 24">
        <path
          d="M6 9h10v4a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V9Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M16 10h1.5a2 2 0 0 1 0 4H16"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M8 20h8"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    )
  }

  if (key.includes('licor') || key.includes('ron') || key.includes('whisky') || key.includes('vodka')) {
    return (
      <svg aria-hidden className={cn('h-5 w-5', className)} fill="none" viewBox="0 0 24 24">
        <path
          d="M8 3h8l-1 5a4 4 0 0 1-3.9 3H12a4 4 0 0 1-3.9-3L8 3Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M12 11v6m-3 4h6"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    )
  }

  return (
    <svg aria-hidden className={cn('h-5 w-5', className)} fill="none" viewBox="0 0 24 24">
      <path
        d="M5 7h6v6H5V7Zm8 0h6v6h-6V7ZM5 15h6v6H5v-6Zm8 0h6v6h-6v-6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
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
                'inline-flex shrink-0 items-center gap-2.5 rounded-full border px-6 py-3 text-lg font-medium transition-colors',
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
              <CategoryIcon className="h-6 w-6" name={root.name} />
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
                  'inline-flex items-center gap-2.5 rounded-full border px-5 py-2.5 text-base transition-colors',
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
                <CategoryIcon className="h-5 w-5" name={activeRoot?.name ?? selectedNode.name} />
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
