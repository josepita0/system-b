import type { ReactNode } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, matchPath, useLocation } from 'react-router-dom'
import { UserRoleBadge } from '@renderer/components/users/UserRoleBadge'
import { cn } from '@renderer/lib/cn'
import type { UserRole } from '@shared/types/user'

const SIDEBAR_EXPANDED_KEY = 'system-barra-sidebar-expanded'

export type NavIconName = 'home' | 'grid' | 'clock' | 'chart' | 'box' | 'flask' | 'star' | 'users' | 'file' | 'cart' | 'cog'

/** Ítem de navegación simple (un destino). */
export type NavLinkItem = {
  to: string
  label: string
  icon: NavIconName
  /** Evita que `/` active en rutas hijas. */
  end?: boolean
}

/** Grupo con submenú (p. ej. Ajustes). */
export type NavGroupItem = {
  type: 'group'
  id: string
  label: string
  icon: NavIconName
  children: NavLinkItem[]
}

export type NavEntry = NavLinkItem | NavGroupItem

/** @deprecated Usar `NavLinkItem`; se mantiene por compatibilidad con tipos existentes. */
export type NavItem = NavLinkItem

function Icon({ name }: { name: NavIconName }) {
  const common = 'h-5 w-5 stroke-current'
  switch (name) {
    case 'cart':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218a1.5 1.5 0 001.464-1.175l1.293-5.854A1.5 1.5 0 0017.128 6H6.872a1.5 1.5 0 00-1.464 1.175L4.115 13.05A1.5 1.5 0 005.58 14.25M9 11.25V9m0 0V6.75m0 2.25H7.5m1.5 0h1.5"
          />
        </svg>
      )
    case 'grid':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM3.75 15.75a2.25 2.25 0 012.25-2.25h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z"
          />
        </svg>
      )
    case 'clock':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'chart':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
          />
        </svg>
      )
    case 'box':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
          />
        </svg>
      )
    case 'flask':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
          />
        </svg>
      )
    case 'star':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
      )
    case 'users':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
          />
        </svg>
      )
    case 'file':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
      )
    case 'cog':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    case 'home':
    default:
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
          />
        </svg>
      )
  }
}

function isNavGroup(entry: NavEntry): entry is NavGroupItem {
  return 'type' in entry && entry.type === 'group'
}

function navSubLinkClass({ isActive, expanded }: { isActive: boolean; expanded: boolean }) {
  return cn(
    'flex shrink-0 items-center rounded-xl transition-colors',
    expanded ? 'h-10 w-full min-w-0 gap-3 px-3 pl-4' : 'h-10 w-10 justify-center',
    isActive ? 'bg-brand-muted text-brand' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
  )
}

function NavGroup({ group, sidebarExpanded }: { group: NavGroupItem; sidebarExpanded: boolean }) {
  const location = useLocation()
  const isChildActive = group.children.some((c) =>
    matchPath({ path: c.to, end: c.end ?? false }, location.pathname),
  )
  const [open, setOpen] = useState(isChildActive)
  const [flyoutOpen, setFlyoutOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const flyoutRef = useRef<HTMLDivElement>(null)
  const [flyoutPos, setFlyoutPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (isChildActive) setOpen(true)
  }, [isChildActive])

  useLayoutEffect(() => {
    if (!flyoutOpen || !triggerRef.current) return
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      setFlyoutPos({ top: rect.top, left: rect.right + 8 })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [flyoutOpen])

  useEffect(() => {
    if (!flyoutOpen) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !flyoutRef.current?.contains(t)) {
        setFlyoutOpen(false)
      }
    }
    window.addEventListener('mousedown', onDoc)
    return () => window.removeEventListener('mousedown', onDoc)
  }, [flyoutOpen])

  useEffect(() => {
    if (sidebarExpanded) setFlyoutOpen(false)
  }, [sidebarExpanded])

  const parentActive = !sidebarExpanded && isChildActive

  if (!sidebarExpanded) {
    return (
      <div className="relative flex w-full justify-center">
        <button
          aria-expanded={flyoutOpen}
          aria-haspopup="menu"
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors',
            parentActive ? 'bg-brand-muted text-brand' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
          )}
          onClick={() => setFlyoutOpen((v) => !v)}
          ref={triggerRef}
          title={group.label}
          type="button"
        >
          <Icon name={group.icon} />
        </button>
        {flyoutOpen
          ? createPortal(
              <div
                className="fixed z-[100] min-w-[12rem] rounded-xl border border-border bg-surface-card py-1 shadow-lg"
                ref={flyoutRef}
                role="menu"
                style={{ left: flyoutPos.left, top: flyoutPos.top }}
              >
                <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {group.label}
                </div>
                {group.children.map((child) => (
                  <NavLink
                    className={({ isActive }) =>
                      cn(
                        'block px-3 py-2 text-sm',
                        isActive ? 'bg-brand-muted font-medium text-brand' : 'text-slate-800 hover:bg-slate-50',
                      )
                    }
                    end={child.end}
                    key={child.to}
                    onClick={() => setFlyoutOpen(false)}
                    to={child.to}
                  >
                    {child.label}
                  </NavLink>
                ))}
              </div>,
              document.body,
            )
          : null}
      </div>
    )
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-0.5">
      <button
        aria-expanded={open}
        className={cn(
          'flex h-11 w-full min-w-0 items-center gap-3 rounded-xl px-3 text-left transition-colors',
          isChildActive ? 'bg-slate-100/90 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
        )}
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <span className="flex shrink-0">
          <Icon name={group.icon} />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{group.label}</span>
        <svg
          className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-90')}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {open ? (
        <div className="ml-2 flex flex-col gap-0.5 border-l border-slate-200 pl-2">
          {group.children.map((child) => (
            <NavLink
              className={({ isActive }) => navSubLinkClass({ isActive, expanded: true })}
              end={child.end}
              key={child.to + child.label}
              title={child.label}
              to={child.to}
            >
              <span className="flex shrink-0">
                <Icon name={child.icon} />
              </span>
              <span className="min-w-0 truncate text-sm font-medium">{child.label}</span>
            </NavLink>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function navLinkClass({ isActive, expanded }: { isActive: boolean; expanded: boolean }) {
  return cn(
    'flex shrink-0 items-center rounded-xl transition-colors',
    expanded ? 'h-11 w-full min-w-0 gap-3 px-3' : 'h-11 w-11 justify-center',
    isActive ? 'bg-brand-muted text-brand' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
  )
}

type AppShellProps = {
  children: ReactNode
  /** Nombre para mostrar (sin rol en crudo). */
  userDisplayName: string
  userRole: UserRole
  navItems: NavEntry[]
  onLogout: () => void
}

export function AppShell({ children, userDisplayName, userRole, navItems, onLogout }: AppShellProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_EXPANDED_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_EXPANDED_KEY, sidebarExpanded ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [sidebarExpanded])

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-surface text-slate-800">
      <aside
        className={cn(
          'flex h-full shrink-0 flex-col border-r border-border bg-surface-card py-3 transition-[width] duration-200 ease-out',
          sidebarExpanded ? 'w-56' : 'w-[80px]',
        )}
      >
        <div
          className={cn(
            'flex shrink-0 items-center pb-2',
            sidebarExpanded ? 'flex-row justify-between gap-2 px-2' : 'flex-col gap-2 px-1',
          )}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-muted"
            title="Sistema Barra"
          >
            <img
              alt=""
              className="h-10 w-10 object-contain p-0.5"
              decoding="async"
              src={`${import.meta.env.BASE_URL}app-logo.svg`}
            />
          </div>
          <button
            aria-expanded={sidebarExpanded}
            aria-label={sidebarExpanded ? 'Contraer menú lateral' : 'Expandir menú lateral'}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900',
              sidebarExpanded ? '' : 'mx-auto',
            )}
            onClick={() => setSidebarExpanded((v) => !v)}
            title={sidebarExpanded ? 'Contraer' : 'Expandir'}
            type="button"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              {sidebarExpanded ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              )}
            </svg>
          </button>
        </div>
        <nav
          className={cn(
            'flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden py-1',
            sidebarExpanded ? 'items-stretch px-2' : 'items-center px-1',
          )}
        >
          {navItems.map((item) =>
            isNavGroup(item) ? (
              <NavGroup group={item} key={item.id} sidebarExpanded={sidebarExpanded} />
            ) : (
              <NavLink
                className={({ isActive }) => navLinkClass({ isActive, expanded: sidebarExpanded })}
                end={item.end}
                key={item.to + item.label}
                title={item.label}
                to={item.to}
              >
                <span className="flex shrink-0">
                  <Icon name={item.icon} />
                </span>
                {sidebarExpanded ? <span className="min-w-0 truncate text-sm font-medium">{item.label}</span> : null}
              </NavLink>
            ),
          )}
        </nav>
        <div className="shrink-0 border-t border-border px-1 pt-2">
          <button
            className={cn(
              'flex w-full rounded-xl py-2 text-slate-600 hover:bg-rose-50 hover:text-rose-700',
              sidebarExpanded ? 'flex-row items-center justify-start gap-2 px-3' : 'flex-col items-center gap-0.5',
            )}
            onClick={onLogout}
            type="button"
          >
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 9l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <span
              className={cn(
                'font-medium leading-tight',
                sidebarExpanded ? 'text-sm' : 'max-w-[4.5rem] text-center text-[10px]',
              )}
            >
              Cerrar sesión
            </span>
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 flex shrink-0 items-center justify-end gap-4 border-b border-border bg-surface-card px-4 py-3 ">
          {/* <div className="min-w-0 flex-1">
            <div className="relative max-w-xl">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </span>
              <Input
                aria-label="Buscar"
                className="pl-9"
                disabled
                placeholder="Buscar"
                title="Busqueda global (proximamente)"
              />
            </div>
          </div> */}
          <div className="hidden min-w-0 shrink-0 items-center gap-2 sm:flex">
            <div className="flex min-w-0 max-w-[min(100%,20rem)] flex-wrap items-center gap-2 text-sm">
              <span className="truncate font-medium text-slate-900" title={userDisplayName}>
                {userDisplayName}
              </span>
              <span className="text-slate-400" aria-hidden>
                ·
              </span>
              <UserRoleBadge role={userRole} />
            </div>
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-muted text-sm font-semibold text-brand"
              title={`${userDisplayName} — ${userRole}`}
            >
              {userDisplayName.trim().charAt(0).toUpperCase() || '?'}
            </div>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden p-4 ">{children}</main>
      </div>
    </div>
  )
}
