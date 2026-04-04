import type { ReactNode } from 'react'

type Props = {
  open: boolean
  title: string
  children: ReactNode
  /** Cierre por overlay o tecla (opcional); el panel usa stopPropagation. */
  onClose: () => void
  footer?: ReactNode
  /** max-w-* tailwind class */
  maxWidthClass?: string
}

export function Modal({ open, title, children, onClose, footer, maxWidthClass = 'max-w-md' }: Props) {
  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }}
      role="presentation"
    >
      <div
        className={`max-h-[90vh] w-full ${maxWidthClass} cursor-auto overflow-y-auto rounded-2xl border border-border bg-surface-card p-5 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <h3 className="text-lg font-semibold text-slate-900" id="modal-title">
          {title}
        </h3>
        <div className="mt-3 text-slate-700">{children}</div>
        {footer ? <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  )
}
