import { Suspense, lazy, useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AppShell, type NavItem } from './components/layout/AppShell'
import { Button } from './components/ui/Button'
import { getSetupStatusSafe } from './lib/setup'
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
const UserDetailPage = lazy(() => import('./pages/users/UserDetailPage').then((module) => ({ default: module.UserDetailPage })))
const UserDocumentsPage = lazy(() => import('./pages/users/UserDocumentsPage').then((module) => ({ default: module.UserDocumentsPage })))
const UserListPage = lazy(() => import('./pages/users/UserListPage').then((module) => ({ default: module.UserListPage })))
const VipCustomersPage = lazy(() => import('./pages/vipCustomers/VipCustomersPage').then((module) => ({ default: module.VipCustomersPage })))
const InventoryPage = lazy(() => import('./pages/inventory/InventoryPage').then((module) => ({ default: module.InventoryPage })))
const ConsumptionRulesPage = lazy(() => import('./pages/consumptions/ConsumptionRulesPage').then((module) => ({ default: module.ConsumptionRulesPage })))

/** Rutas antiguas /usuarios/:id/editar redirigen al listado abriendo el modal de edicion. */
function UserEditRouteRedirect() {
  const { id } = useParams()
  const n = Number(id)
  const idOk = Number.isInteger(n) && n > 0
  return <Navigate replace state={idOk ? { editUserId: n } : {}} to="/usuarios" />
}

function buildAppNavItems(role: string): NavItem[] {
  const items: NavItem[] = [{ to: '/ventas', label: 'Ventas', icon: 'cart' }]
  if (role === 'employee') {
    items.push({ to: '/turnos', label: 'Turnos', icon: 'clock' })
  }
  if (role !== 'employee') {
    items.push(
      { to: '/', label: 'Productos', icon: 'grid', end: true },
      { to: '/turnos', label: 'Turnos', icon: 'clock' },
      { to: '/reportes', label: 'Reportes', icon: 'chart' },
      { to: '/inventario', label: 'Inventario', icon: 'box' },
      { to: '/consumos', label: 'Consumos', icon: 'flask' },
      { to: '/clientes-vip', label: 'Clientes VIP', icon: 'star' },
      { to: '/usuarios', label: 'Usuarios', icon: 'users' },
    )
  }
  if (role === 'manager') {
    items.push({ to: '/mi-documentacion', label: 'Mi documentacion', icon: 'file' })
  }
  return items
}

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

  const handleLogout = () => {
    const session = currentShiftQuery.data
    if (session && session.status === 'open') {
      window.alert(
        'No puede cerrar sesión mientras haya un turno de caja abierto. Cierre el turno en Turnos (confirme con su contraseña) para que otra persona pueda iniciar sesión.',
      )
      return
    }
    logoutMutation.mutate()
  }

  if (meQuery.isLoading || setupQuery.isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-surface text-slate-600">Cargando sesion...</div>
  }

  if (setupQuery.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-6">
        <div className="w-full max-w-xl rounded-3xl border border-rose-200 bg-surface-card p-6 text-sm text-rose-700">
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
          onLogout={handleLogout}
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
        onLogout={handleLogout}
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
              <h1 className="text-xl font-semibold text-slate-900">Cambio obligatorio de clave</h1>
              <p className="mt-1 text-sm text-slate-600">Debes actualizar tu contrasena antes de continuar.</p>
            </div>
            <Button className="text-left" onClick={handleLogout} variant="secondary">
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

  const userDisplayName = `${user.firstName} ${user.lastName}`.trim()

  return (
    <AppShell
      navItems={buildAppNavItems(user.role)}
      onLogout={handleLogout}
      userDisplayName={userDisplayName}
      userRole={user.role}
    >
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
                  <ProtectedRoute requiredRole="employee">
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
                    <Navigate replace to="/usuarios" />
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
                    <UserEditRouteRedirect />
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
                    <ProtectedRoute requiredRole="manager">
                      <UserDocumentsPage />
                    </ProtectedRoute>
                  )
                }
                path="/mi-documentacion"
              />
              <Route element={<Navigate replace to={user.role === 'employee' ? '/ventas' : '/'} />} path="*" />
        </Routes>
      </Suspense>
    </AppShell>
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
            <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
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
