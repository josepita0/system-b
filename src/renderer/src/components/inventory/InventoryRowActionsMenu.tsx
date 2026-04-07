import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import type { InventoryBalanceRow } from '@shared/types/inventory'

const MENU_MIN_WIDTH_PX = 200

type Props = {
  row: InventoryBalanceRow
  onRegisterMovement: (row: InventoryBalanceRow) => void
  onConfigureConsumption: (row: InventoryBalanceRow) => void
}

const menuItemClass =
  'block w-full px-3 py-2 text-left text-sm font-normal text-slate-800 hover:bg-slate-50'

export function InventoryRowActionsMenu({ row, onRegisterMovement, onConfigureConsumption }: Props) {
  const navigate = useNavigate()
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
        left: Math.max(8, rect.right - MENU_MIN_WIDTH_PX),
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
    <div className="relative flex justify-end" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
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
              className="fixed z-[100] min-w-[12.5rem] rounded-xl border border-border bg-surface-card py-1 shadow-lg"
              ref={menuRef}
              role="menu"
              style={{ left: position.left, top: position.top }}
            >
              <button
                className={menuItemClass + ' cursor-pointer'}
                onClick={() => handleAction(() => onRegisterMovement(row))}
                role="menuitem"
                type="button"
              >
                Registrar movimiento
              </button>
              <button
                className={menuItemClass + ' cursor-pointer'}
                onClick={() => handleAction(() => onConfigureConsumption(row))}
                role="menuitem"
                type="button"
              >
                Configurar consumo
              </button>
              <button
                className={menuItemClass + ' cursor-pointer'}
                onClick={() => {
                  setOpen(false)
                  navigate('/')
                }}
                role="menuitem"
                type="button"
              >
                Ver en catálogo
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
