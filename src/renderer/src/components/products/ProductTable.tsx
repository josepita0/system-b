import type { Product } from '@shared/types/product'

interface ProductTableProps {
  products: Product[]
  onEdit: (product: Product) => void
  onDelete: (id: number) => void
  selectedProductId?: number | null
}

export function ProductTable({ products, onEdit, onDelete, selectedProductId }: ProductTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <table className="min-w-full text-left text-sm text-slate-200">
        <thead className="bg-slate-800/70 text-slate-300">
          <tr>
            <th className="px-4 py-3">SKU</th>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Categoria</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Precio</th>
            <th className="px-4 py-3">Minimo</th>
            <th className="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr className={`border-t border-slate-800 ${selectedProductId === product.id ? 'bg-slate-800/40' : ''}`} key={product.id}>
              <td className="px-4 py-3">{product.sku}</td>
              <td className="px-4 py-3">{product.name}</td>
              <td className="px-4 py-3">{product.categoryName}</td>
              <td className="px-4 py-3 capitalize">{product.type}</td>
              <td className="px-4 py-3">{product.salePrice.toFixed(2)}</td>
              <td className="px-4 py-3">{product.minStock}</td>
              <td className="flex gap-2 px-4 py-3">
                <button className="rounded-md bg-slate-700 px-3 py-1" onClick={() => onEdit(product)} type="button">
                  Editar
                </button>
                <button className="rounded-md bg-rose-700 px-3 py-1" onClick={() => onDelete(product.id)} type="button">
                  Desactivar
                </button>
              </td>
            </tr>
          ))}
          {products.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-slate-400" colSpan={7}>
                No hay productos registrados.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
