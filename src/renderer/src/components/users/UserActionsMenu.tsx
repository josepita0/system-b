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
        left: rect.right - 144,
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
        className="rounded-md bg-slate-700 px-3 py-1 text-sm text-white"
        ref={buttonRef}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        Acciones
      </button>
      {open
        ? createPortal(
            <div
              className="fixed z-50 min-w-36 rounded-lg border border-slate-700 bg-slate-950 p-1 shadow-lg"
              ref={menuRef}
              style={{ left: position.left, top: position.top }}
            >
              <button
                className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                onClick={() => handleAction(onView)}
                type="button"
              >
                Ver
              </button>
              <button
                className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                onClick={() => handleAction(onEdit)}
                type="button"
              >
                Editar
              </button>
              {onGenerateLicensePanelCode ? (
                <button
                  className="block w-full rounded-md px-3 py-2 text-left text-sm text-amber-100 hover:bg-slate-800"
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
