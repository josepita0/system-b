import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { UserTable } from '@renderer/components/users/UserTable'

export function UserListPage() {
  const navigate = useNavigate()
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => window.api.users.list(),
  })

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Usuarios</h1>
          <p className="text-sm text-slate-400">Gestiona el alta, consulta y edicion desde un flujo navegable por pantalla.</p>
        </div>
        <button
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950"
          onClick={() => navigate('/usuarios/nuevo')}
          type="button"
        >
          Crear usuario
        </button>
      </div>

      {usersQuery.isLoading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">Cargando usuarios...</div>
      ) : null}

      {usersQuery.error ? (
        <div className="rounded-2xl border border-rose-800 bg-slate-900 p-5 text-sm text-rose-300">
          {usersQuery.error instanceof Error ? usersQuery.error.message : 'No fue posible cargar los usuarios.'}
        </div>
      ) : null}

      {!usersQuery.isLoading && !usersQuery.error ? (
        <UserTable
          users={usersQuery.data ?? []}
          onEdit={(userId) => navigate(`/usuarios/${userId}/editar`)}
          onView={(userId) => navigate(`/usuarios/${userId}`)}
        />
      ) : null}
    </section>
  )
}
