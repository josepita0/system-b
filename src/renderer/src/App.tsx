import { useEffect } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { ChangePasswordPage } from './pages/auth/ChangePasswordPage'
import { LoginPage } from './pages/auth/LoginPage'
import { RecoverPasswordPage } from './pages/auth/RecoverPasswordPage'
import { LicenseAdminPage } from './pages/license/LicenseAdminPage'
import { ProductsPage } from './pages/products/ProductsPage'
import { ReportsPage } from './pages/reports/ReportsPage'
import { SalesPage } from './pages/sales/SalesPage'
import { ShiftsPage } from './pages/shifts/ShiftsPage'
import { UserCreatePage } from './pages/users/UserCreatePage'
import { UserDetailPage } from './pages/users/UserDetailPage'
import { UserDocumentsPage } from './pages/users/UserDocumentsPage'
import { UserEditPage } from './pages/users/UserEditPage'
import { UserListPage } from './pages/users/UserListPage'
import { useAuthStore } from './store/authStore'
import { usePosStore } from './store/posStore'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-4 py-2 text-sm ${isActive ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-200'}`

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

  if (meQuery.isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">Cargando sesion...</div>
  }

  if (!user) {
    return (
      <Routes>
        <Route element={<LoginPage />} path="/login" />
        <Route element={<RecoverPasswordPage />} path="/recuperar" />
        <Route element={<Navigate replace to="/login" />} path="*" />
      </Routes>
    )
  }

  if (user.mustChangePassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
        <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-white">Cambio obligatorio de clave</h1>
              <p className="mt-1 text-sm text-slate-400">Debes actualizar tu contrasena antes de continuar.</p>
            </div>
            <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200" onClick={() => logoutMutation.mutate()} type="button">
              Cerrar sesion
            </button>
          </div>
          <Routes>
            <Route element={<ChangePasswordPage />} path="/cambiar-clave" />
            <Route element={<Navigate replace to="/cambiar-clave" />} path="*" />
          </Routes>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-[240px_1fr] gap-6 px-6 py-6">
        <aside className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <h1 className="text-xl font-semibold">Sistema Barra</h1>
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
            <button className="rounded-lg bg-slate-800 px-4 py-2 text-left text-sm text-slate-200" onClick={() => logoutMutation.mutate()} type="button">
              Cerrar sesion
            </button>
          </nav>
        </aside>

        <main className="rounded-3xl border border-slate-800 bg-slate-950 p-2">
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
        </main>
      </div>
    </div>
  )
}
