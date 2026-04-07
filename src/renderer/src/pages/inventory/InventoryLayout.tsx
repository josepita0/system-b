import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@renderer/lib/cn'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-brand text-brand-fg shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  )

export function InventoryLayout() {
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Inventario</h1>
        <p className="text-sm text-slate-500">Saldo de productos simples, movimientos y configuración de consumo progresivo.</p>
      </div>

      <nav aria-label="Secciones de inventario" className="flex flex-wrap gap-2 border-b border-border pb-3">
        <NavLink className={tabClass} end to="/inventario">
          Resumen
        </NavLink>
        <NavLink className={tabClass} to="/inventario/historial">
          Historial de movimientos
        </NavLink>
      </nav>

      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
    </section>
  )
}
