import type { ReactNode } from 'react'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function CatalogProductDrawer({ open, title, onClose, children }: Props) {
  if (!open) {
    return null
  }

  return (
    <>
      <button
        aria-label="Cerrar panel"
        className="fixed inset-0 z-40 cursor-default bg-slate-900/30"
        onClick={onClose}
        type="button"
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-surface-card shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="min-w-0 truncate text-lg font-semibold text-slate-900" id="catalog-product-drawer-title">
            {title}
          </h2>
          <button
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </aside>
    </>
  )
}
