import type { Product } from '@shared/types/product'
import { catalogMediaUrl } from '@shared/lib/catalogMediaUrl'
import { tableTheadClass } from '@renderer/lib/tableStyles'
import { Button } from '@renderer/components/ui/Button'

interface ProductTableProps {
  products: Product[]
  onEdit: (product: Product) => void
  onDelete: (id: number) => void
  selectedProductId?: number | null
}

export function ProductTable({ products, onEdit, onDelete, selectedProductId }: ProductTableProps) {
  return (
    <div className="w-full min-w-0 overflow-x-auto bg-white">
      <table className="min-w-full text-left text-sm text-slate-800">
        <thead className={tableTheadClass}>
          <tr>
            <th className="w-16 px-4 py-3">Img</th>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Categoria</th>
            <th className="px-4 py-3">Precio</th>
            <th className="px-4 py-3">Minimo</th>
            <th className="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => (
            <tr
              className={`border-t border-slate-200 ${
                selectedProductId === product.id
                  ? 'bg-brand-muted/50 ring-1 ring-inset ring-brand/25'
                  : index % 2 === 0
                    ? 'bg-white hover:bg-slate-50'
                    : 'bg-slate-50/70 hover:bg-slate-100/80'
              }`}
              key={product.id}
            >
              <td className="px-4 py-3">
                {catalogMediaUrl(product.primaryImageRelPath ?? product.imageRelPath) ? (
                  <img
                    alt=""
                    className="h-10 w-10 rounded-md border border-border object-cover"
                    src={catalogMediaUrl(product.primaryImageRelPath ?? product.imageRelPath)!}
                  />
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="px-4 py-3 font-medium text-slate-900">{product.name}</td>
              <td className="px-4 py-3 text-slate-600">{product.categoryName}</td>
              <td className="px-4 py-3 tabular-nums">{product.salePrice.toFixed(2)}</td>
              <td className="px-4 py-3 tabular-nums">{product.minStock}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Button className="px-3 py-1.5 text-xs" onClick={() => onEdit(product)} type="button" variant="secondary">
                    Editar
                  </Button>
                  <Button className="px-3 py-1.5 text-xs" onClick={() => onDelete(product.id)} type="button" variant="danger">
                    Desactivar
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {products.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                No hay productos en esta categoria.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
