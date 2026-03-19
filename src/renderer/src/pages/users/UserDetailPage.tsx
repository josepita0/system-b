import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { formatUserDate, formatUserRole, formatUserStatus } from '@renderer/components/users/userLabels'

export function UserDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const userId = Number(id)
  const isValidUserId = Number.isInteger(userId) && userId > 0

  const userQuery = useQuery({
    queryKey: ['users', userId],
    queryFn: () => window.api.users.getById(userId),
    enabled: isValidUserId,
  })

  if (!isValidUserId) {
    return <InvalidUserState onBack={() => navigate('/usuarios')} />
  }

  if (userQuery.isLoading) {
    return <PageState message="Cargando usuario..." />
  }

  if (userQuery.error) {
    return (
      <PageState
        message={userQuery.error instanceof Error ? userQuery.error.message : 'No fue posible cargar el usuario.'}
        tone="error"
      />
    )
  }

  const user = userQuery.data
  if (!user) {
    return <PageState message="Usuario no encontrado." tone="error" />
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Detalle de usuario</h1>
          <p className="text-sm text-slate-400">Consulta la informacion principal y el estado actual del usuario.</p>
        </div>
        <div className="flex gap-3">
          <button
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200"
            onClick={() => navigate('/usuarios')}
            type="button"
          >
            Volver
          </button>
          <button
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950"
            onClick={() => navigate(`/usuarios/${user.id}/editar`)}
            type="button"
          >
            Editar
          </button>
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-2">
        <DetailItem label="Nombre" value={`${user.firstName} ${user.lastName}`} />
        <DetailItem label="Rol" value={formatUserRole(user.role)} />
        <DetailItem label="Documento" value={user.documentId || 'Sin documento'} />
        <DetailItem label="Estado" value={formatUserStatus(user.isActive)} />
        <DetailItem label="Correo" value={user.email || 'Sin correo'} />
        <DetailItem label="Usuario" value={user.username || 'Sin usuario'} />
        <DetailItem label="Ultimo acceso" value={formatUserDate(user.lastLoginAt)} />
        <DetailItem label="Actualizado" value={formatUserDate(user.updatedAt)} />
      </div>
    </section>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-slate-100">{value}</p>
    </div>
  )
}

function InvalidUserState({ onBack }: { onBack: () => void }) {
  return (
    <div className="rounded-2xl border border-rose-800 bg-slate-900 p-5 text-sm text-rose-300">
      <p>El identificador del usuario no es valido.</p>
      <button className="mt-3 rounded-lg border border-slate-700 px-4 py-2 text-slate-200" onClick={onBack} type="button">
        Volver al listado
      </button>
    </div>
  )
}

function PageState({ message, tone = 'default' }: { message: string; tone?: 'default' | 'error' }) {
  return (
    <div className={`rounded-2xl border bg-slate-900 p-5 text-sm ${tone === 'error' ? 'border-rose-800 text-rose-300' : 'border-slate-800 text-slate-300'}`}>
      {message}
    </div>
  )
}
