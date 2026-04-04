import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface UserActionsMenuProps {
  onEdit: () => void
  onView: () => void
  /** Generar codigo temporal para desbloquear el panel de licencias (solo admin, fila propia). */
  onGenerateLicensePanelCode?: () => void
}

export function UserActionsMenu({ onEdit, onView, onGenerateLicensePanelCode }: UserActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      return
    }

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) {
        return
      }

      setPosition({
        top: rect.bottom + 8,
        left: rect.right - 160,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const clickedTrigger = containerRef.current?.contains(target)
      const clickedMenu = menuRef.current?.contains(target)

      if (!clickedTrigger && !clickedMenu) {
        setOpen(false)
      }
    }

    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleAction = (action: () => void) => {
    setOpen(false)
    action()
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50"
        ref={buttonRef}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        Acciones
      </button>
      {open
        ? createPortal(
            <div
              className="fixed z-50 min-w-[10rem] rounded-xl border border-border bg-surface-card py-1 shadow-lg"
              ref={menuRef}
              style={{ left: position.left, top: position.top }}
            >
              <button
                className="block w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                onClick={() => handleAction(onView)}
                type="button"
              >
                Ver
              </button>
              <button
                className="block w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                onClick={() => handleAction(onEdit)}
                type="button"
              >
                Editar
              </button>
              {onGenerateLicensePanelCode ? (
                <button
                  className="block w-full px-3 py-2 text-left text-sm text-amber-800 hover:bg-amber-50"
                  onClick={() => handleAction(onGenerateLicensePanelCode)}
                  type="button"
                >
                  Codigo panel licencias
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
