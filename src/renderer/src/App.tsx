import { Suspense, lazy, useEffect, type ReactNode } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { Button } from './components/ui/Button'
import { getSetupStatusSafe } from './lib/setup'
import { cn } from './lib/cn'
import { useAuthStore } from './store/authStore'
import { usePosStore } from './store/posStore'

const ChangePasswordPage = lazy(() => import('./pages/auth/ChangePasswordPage').then((module) => ({ default: module.ChangePasswordPage })))
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then((module) => ({ default: module.LoginPage })))
const RecoverPasswordPage = lazy(() => import('./pages/auth/RecoverPasswordPage').then((module) => ({ default: module.RecoverPasswordPage })))
const LicenseAdminPage = lazy(() => import('./pages/license/LicenseAdminPage').then((module) => ({ default: module.LicenseAdminPage })))
const ProductsPage = lazy(() => import('./pages/products/ProductsPage').then((module) => ({ default: module.ProductsPage })))
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage').then((module) => ({ default: module.ReportsPage })))
const SalesPage = lazy(() => import('./pages/sales/SalesPage').then((module) => ({ default: module.SalesPage })))
const SetupCompletionPage = lazy(() => import('./pages/setup/SetupCompletionPage').then((module) => ({ default: module.SetupCompletionPage })))
const SetupPasswordStepPage = lazy(() => import('./pages/setup/SetupPasswordStepPage').then((module) => ({ default: module.SetupPasswordStepPage })))
const SetupWelcomePage = lazy(() => import('./pages/setup/SetupWelcomePage').then((module) => ({ default: module.SetupWelcomePage })))
const ShiftsPage = lazy(() => import('./pages/shifts/ShiftsPage').then((module) => ({ default: module.ShiftsPage })))
const UserCreatePage = lazy(() => import('./pages/users/UserCreatePage').then((module) => ({ default: module.UserCreatePage })))
const UserDetailPage = lazy(() => import('./pages/users/UserDetailPage').then((module) => ({ default: module.UserDetailPage })))
const UserDocumentsPage = lazy(() => import('./pages/users/UserDocumentsPage').then((module) => ({ default: module.UserDocumentsPage })))
const UserEditPage = lazy(() => import('./pages/users/UserEditPage').then((module) => ({ default: module.UserEditPage })))
const UserListPage = lazy(() => import('./pages/users/UserListPage').then((module) => ({ default: module.UserListPage })))
const VipCustomersPage = lazy(() => import('./pages/vipCustomers/VipCustomersPage').then((module) => ({ default: module.VipCustomersPage })))
const InventoryPage = lazy(() => import('./pages/inventory/InventoryPage').then((module) => ({ default: module.InventoryPage })))
const ConsumptionRulesPage = lazy(() => import('./pages/consumptions/ConsumptionRulesPage').then((module) => ({ default: module.ConsumptionRulesPage })))

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'block rounded-lg px-4 py-2 text-sm transition-colors',
    isActive ? 'bg-brand font-medium text-brand-fg' : 'bg-surface-card text-slate-200 hover:bg-slate-800/80',
  )

export default function App() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const setActiveSessionId = usePosStore((state) => state.setActiveSessionId)
  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => window.api.auth.me(),
  })
  const setupQuery = useQuery({
    queryKey: ['setup', 'status'],
    queryFn: getSetupStatusSafe,
  })
  const currentShiftQuery = useQuery({
    queryKey: ['shift', 'current'],
    queryFn: () => (user ? window.api.shifts.current() : null),
    enabled: Boolean(user),
  })

  useEffect(() => {
    setUser(meQuery.data?.user ?? null)
  }, [meQuery.data, setUser])

  useEffect(() => {
    setActiveSessionId(currentShiftQuery.data?.id ?? null)
  }, [currentShiftQuery.data?.id, setActiveSessionId])

  useEffect(() => {
    if (!window.api?.license?.onOpenAdminPanel) {
      return undefined
    }

    return window.api.license.onOpenAdminPanel(() => {
      if (user?.role === 'admin') {
        navigate('/admin/licencia')
      }
    })
  }, [navigate, user?.role])

  const logoutMutation = useMutation({
    mutationFn: () => window.api.auth.logout(),
    onSuccess: async () => {
      setUser(null)
      setActiveSessionId(null)
      await queryClient.invalidateQueries()
    },
  })

  if (meQuery.isLoading || setupQuery.isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-surface text-slate-300">Cargando sesion...</div>
  }

  if (setupQuery.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-6">
        <div className="w-full max-w-xl rounded-3xl border border-rose-800 bg-surface-card p-6 text-sm text-rose-300">
          {setupQuery.error instanceof Error ? setupQuery.error.message : 'No fue posible cargar el estado de instalacion.'}
        </div>
      </div>
    )
  }

  const setupStatus = setupQuery.data
  const shouldRunSetupWizard = Boolean(setupStatus?.mustRunWizard || setupStatus?.bootstrapPending)

  if (!user) {
    if (shouldRunSetupWizard) {
      return (
        <SetupShell
          description="Siga esta guia para ubicar el acceso bootstrap y completar el primer arranque del equipo."
          title="Wizard de instalacion"
        >
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route element={<SetupWelcomePage />} path="/instalacion" />
              <Route element={<LoginPage />} path="/login" />
              <Route element={<RecoverPasswordPage />} path="/recuperar" />
              <Route element={<Navigate replace to="/instalacion" />} path="*" />
            </Routes>
          </Suspense>
        </SetupShell>
      )
    }

    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<LoginPage />} path="/login" />
          <Route element={<RecoverPasswordPage />} path="/recuperar" />
          <Route element={<Navigate replace to="/login" />} path="*" />
        </Routes>
      </Suspense>
    )
  }

  if (shouldRunSetupWizard) {
    if (user.mustChangePassword) {
      return (
        <SetupShell
          description="La instalacion continua con el cambio obligatorio de la clave temporal del administrador inicial."
          onLogout={() => logoutMutation.mutate()}
          title="Wizard de instalacion"
        >
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route element={<SetupPasswordStepPage />} path="/instalacion/cambiar-clave" />
              <Route element={<Navigate replace to="/instalacion/cambiar-clave" />} path="*" />
            </Routes>
          </Suspense>
        </SetupShell>
      )
    }

    return (
      <SetupShell
        description="La cuenta administrativa ya esta protegida. Cierre el onboarding para habilitar el uso normal del sistema."
        onLogout={() => logoutMutation.mutate()}
        title="Wizard de instalacion"
      >
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<SetupCompletionPage />} path="/instalacion/finalizar" />
            <Route element={<Navigate replace to="/instalacion/finalizar" />} path="*" />
          </Routes>
        </Suspense>
      </SetupShell>
    )
  }

  if (user.mustChangePassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-6">
        <div className="w-full max-w-lg rounded-3xl border border-border bg-surface-card p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-white">Cambio obligatorio de clave</h1>
              <p className="mt-1 text-sm text-slate-400">Debes actualizar tu contrasena antes de continuar.</p>
            </div>
            <Button className="text-left" onClick={() => logoutMutation.mutate()} variant="secondary">
              Cerrar sesion
            </Button>
          </div>
          <Routes>
            <Route element={<Suspense fallback={<PageLoader />}><ChangePasswordPage /></Suspense>} path="/cambiar-clave" />
            <Route element={<Navigate replace to="/cambiar-clave" />} path="*" />
          </Routes>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-[240px_1fr] gap-6 px-6 py-6">
        <aside className="rounded-3xl border border-border bg-surface-card p-5">
          <h1 className="text-xl font-semibold text-white">Sistema Barra</h1>
          <p className="mt-2 text-sm text-slate-400">{user.firstName} {user.lastName} | {user.role}</p>
          <nav className="mt-6 flex flex-col gap-2">
            <NavLink className={linkClass} to="/ventas">
              Ventas
            </NavLink>
            {user.role !== 'employee' ? (
              <>
                <NavLink className={linkClass} to="/">
                  Productos
                </NavLink>
                <NavLink className={linkClass} to="/turnos">
                  Turnos
                </NavLink>
                <NavLink className={linkClass} to="/reportes">
                  Reportes
                </NavLink>
                <NavLink className={linkClass} to="/inventario">
                  Inventario
                </NavLink>
                <NavLink className={linkClass} to="/consumos">
                  Consumos
                </NavLink>
                <NavLink className={linkClass} to="/clientes-vip">
                  Clientes VIP
                </NavLink>
                <NavLink className={linkClass} to="/usuarios">
                  Usuarios
                </NavLink>
              </>
            ) : null}
            {user.role !== 'admin' ? (
              <NavLink className={linkClass} to="/mi-documentacion">
                Mi documentacion
              </NavLink>
            ) : null}
            <Button className="w-full text-left" onClick={() => logoutMutation.mutate()} variant="secondary">
              Cerrar sesion
            </Button>
          </nav>
        </aside>

        <main className="rounded-3xl border border-border bg-surface p-2">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route element={<Navigate replace to={user.role === 'employee' ? '/ventas' : '/'} />} path="/login" />
              <Route element={<SalesPage />} path="/ventas" />
              <Route
                element={
                  <ProtectedRoute requiredRole="manager">
                    <ProductsPage />
                  </ProtectedRoute>
                }
                path="/"
              />
              <Route
                element={
                  <ProtectedRoute requiredRole="manager">
                    <ShiftsPage />
                  </ProtectedRoute>
                }
                path="/turnos"
              />
              <Route
                element={
                  <ProtectedRoute requiredRole="manager">
                    <ReportsPage />
                  </ProtectedRoute>
                }
                path="/reportes"
              />
              <Route
                element={
                  <ProtectedRoute requiredRole="manager">
                    <InventoryPage />
                  </ProtectedRoute>
                }
                path="/inventario"
              />
              <Route
                element={
                  <ProtectedRoute requiredRole="manager">
                    <ConsumptionRulesPage />
                  </ProtectedRoute>
                }
                path="/consumos"
              />
              <Route
                element={
                  <ProtectedRoute requiredRole="manager">
                    <VipCustomersPage />
                  </ProtectedRoute>
                }
                path="/clientes-vip"
              />
              <Route
                element={
                  <ProtectedRoute requiredRole="manager">
                    <UserListPage />
                  </ProtectedRoute>
                }
                path="/usuarios"
              />
              <Route
                element={
                  <ProtectedRoute requiredRole="manager">
                    <UserCreatePage />
                  </ProtectedRoute>
                }
                path="/usuarios/nuevo"
              />
              <Route
                element={
                  <ProtectedRoute requiredRole="manager">
                    <UserDetailPage />
                  </ProtectedRoute>
                }
                path="/usuarios/:id"
              />
              <Route
                element={
                  <ProtectedRoute requiredRole="manager">
                    <UserEditPage />
                  </ProtectedRoute>
                }
                path="/usuarios/:id/editar"
              />
              <Route
                element={
                  <ProtectedRoute requiredRole="admin">
                    <LicenseAdminPage />
                  </ProtectedRoute>
                }
                path="/admin/licencia"
              />
              <Route
                element={
                  user.role === 'admin' ? (
                    <Navigate replace to="/" />
                  ) : (
                    <ProtectedRoute requiredRole="employee">
                      <UserDocumentsPage />
                    </ProtectedRoute>
                  )
                }
                path="/mi-documentacion"
              />
              <Route element={<Navigate replace to={user.role === 'employee' ? '/ventas' : '/'} />} path="*" />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}

function PageLoader() {
  return <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-400">Cargando modulo...</div>
}

function SetupShell({
  title,
  description,
  onLogout,
  children,
}: {
  title: string
  description: string
  onLogout?: () => void
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-6">
      <div className="w-full max-w-3xl rounded-3xl border border-border bg-surface-card p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-white">{title}</h1>
            <p className="mt-1 text-sm text-slate-400">{description}</p>
          </div>
          {onLogout ? (
            <Button onClick={onLogout} variant="secondary">
              Cerrar sesion
            </Button>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  )
}
