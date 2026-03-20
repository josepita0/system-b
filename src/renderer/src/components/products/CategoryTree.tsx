import type { CategoryTreeNode } from '@shared/types/product'

interface CategoryTreeProps {
  categories: CategoryTreeNode[]
  selectedCategoryId: number | null
  onSelect: (category: CategoryTreeNode) => void
}

interface CategoryTreeItemProps {
  category: CategoryTreeNode
  depth: number
  selectedCategoryId: number | null
  onSelect: (category: CategoryTreeNode) => void
}

function CategoryTreeItem({ category, depth, selectedCategoryId, onSelect }: CategoryTreeItemProps) {
  const isSelected = category.id === selectedCategoryId
  const effectiveSaleFormatIds = category.effectiveSaleFormatIds ?? []

  return (
    <li className="space-y-2">
      <button
        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left ${
          isSelected
            ? 'border-cyan-500 bg-cyan-500/10 text-cyan-100'
            : 'border-slate-800 bg-slate-950 text-slate-200 hover:border-slate-700'
        }`}
        onClick={() => onSelect(category)}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        type="button"
      >
        <span>
          <span className="block text-sm font-medium">{category.name}</span>
          <span className="block text-xs text-slate-400">
            {category.productCount} producto(s) | {effectiveSaleFormatIds.length} formato(s)
          </span>
          <span className="mt-1 block text-xs text-slate-500">
            {category.supportsChildren ? 'Puede ser padre' : 'Solo operativa'}
            {category.inheritsSaleFormats && category.inheritedFromCategoryName
              ? ` | hereda formatos desde ${category.inheritedFromCategoryName}`
              : ''}
          </span>
        </span>
        <span className="text-xs text-slate-500">{category.slug}</span>
      </button>
      {category.children.length ? (
        <ul className="space-y-2">
          {category.children.map((child) => (
            <CategoryTreeItem
              category={child}
              depth={depth + 1}
              key={child.id}
              onSelect={onSelect}
              selectedCategoryId={selectedCategoryId}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function CategoryTree({ categories, selectedCategoryId, onSelect }: CategoryTreeProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-white">Categorias</h2>
        <p className="mt-1 text-sm text-slate-400">Selecciona una categoria para ver sus productos y formatos.</p>
      </div>
      <ul className="space-y-2">
        {categories.map((category) => (
          <CategoryTreeItem
            category={category}
            depth={0}
            key={category.id}
            onSelect={onSelect}
            selectedCategoryId={selectedCategoryId}
          />
        ))}
        {categories.length === 0 ? <li className="text-sm text-slate-500">No hay categorias activas.</li> : null}
      </ul>
    </div>
  )
}
