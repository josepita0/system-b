import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { UserRoleBadge } from '@renderer/components/users/UserRoleBadge'
import { formatUserDate, formatUserStatus } from '@renderer/components/users/userLabels'
import { Button } from '@renderer/components/ui/Button'
import { Card } from '@renderer/components/ui/Card'
import { useAuthStore } from '@renderer/store/authStore'

export function UserDetailPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const actor = useAuthStore((state) => state.user)
  const { id } = useParams()
  const userId = Number(id)
  const isValidUserId = Number.isInteger(userId) && userId > 0
  const [credentialError, setCredentialError] = useState<string | null>(null)
  const [issuedAccess, setIssuedAccess] = useState<{ temporaryPassword: string; recoveryCodes: string[] } | null>(null)

  const userQuery = useQuery({
    queryKey: ['users', userId],
    queryFn: () => window.api.users.getById(userId),
    enabled: isValidUserId,
  })
  const issueCredentialsMutation = useMutation({
    mutationFn: () => window.api.users.issueCredentials(userId),
    onSuccess: async (result) => {
      setCredentialError(null)
      setIssuedAccess({
        temporaryPassword: result.temporaryPassword,
        recoveryCodes: result.recoveryCodes,
      })
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      await queryClient.invalidateQueries({ queryKey: ['users', userId] })
    },
    onError: (error) => {
      setCredentialError(error instanceof Error ? error.message : 'No fue posible emitir el acceso inicial.')
    },
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
    <section className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-slate-900">Detalle de usuario</h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Consulte la informacion principal, el estado actual y el flujo de acceso del usuario.
          </p>
        </div>
        <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto sm:justify-end">
          <Button className="min-h-[42px] min-w-[7rem]" onClick={() => navigate('/usuarios')} type="button" variant="secondary">
            Volver
          </Button>
          <Button className="min-h-[42px] min-w-[7rem]" onClick={() => navigate('/usuarios', { state: { editUserId: user.id } })} type="button" variant="primary">
            Editar
          </Button>
          {actor?.role === 'admin' ? (
            <Button
              className="min-h-[42px] min-w-[10rem]"
              disabled={issueCredentialsMutation.isPending}
              onClick={() => {
                setIssuedAccess(null)
                setCredentialError(null)
                issueCredentialsMutation.mutate()
              }}
              type="button"
              variant="warning"
            >
              {issueCredentialsMutation.isPending ? 'Emitiendo acceso...' : 'Emitir acceso'}
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="shadow-sm" padding="lg">
        <div className="grid gap-4 md:grid-cols-2">
          <DetailItem label="Nombre" value={`${user.firstName} ${user.lastName}`} />
          <DetailItem label="Rol" value={<UserRoleBadge role={user.role} />} />
          <DetailItem label="Documento" value={user.documentId || 'Sin documento'} />
          <DetailItem label="Estado" value={formatUserStatus(user.isActive)} />
          <DetailItem label="Correo" value={user.email || 'Sin correo'} />
          <DetailItem label="Usuario" value={user.username || 'Sin usuario'} />
          <DetailItem label="Ultimo acceso" value={formatUserDate(user.lastLoginAt)} />
          <DetailItem label="Actualizado" value={formatUserDate(user.updatedAt)} />
          <div className="md:col-span-2">
            <DetailItem label="Credenciales" value={user.mustChangePassword ? 'Pendiente de definir o renovar' : 'Configuradas'} />
          </div>
        </div>
      </Card>

      {actor?.role === 'admin' ? (
        <Card className="shadow-sm" padding="lg">
          <h2 className="text-lg font-semibold text-slate-900">Acceso inicial y recuperacion</h2>
          <p className="mt-1 text-sm text-slate-500">
            Solo administrador puede emitir o reemitir credenciales temporales y codigos de recuperacion.
          </p>
          {credentialError ? (
            <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{credentialError}</p>
          ) : null}
          {issuedAccess ? (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-slate-800 shadow-inner">
              <p className="font-medium text-amber-950">
                Comparte estos datos de forma segura. No volveran a mostrarse automaticamente.
              </p>
              <p className="mt-3">
                <span className="font-medium text-slate-700">Contrasena temporal:</span>{' '}
                <span className="font-mono text-base font-semibold text-slate-900">{issuedAccess.temporaryPassword}</span>
              </p>
              <div className="mt-4 border-t border-amber-200/80 pt-4">
                <p className="font-semibold text-slate-800">Codigos de recuperacion</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 font-mono text-sm text-slate-900">
                  {issuedAccess.recoveryCodes.map((code) => (
                    <li key={code}>{code}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}
    </section>
  )
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-slate-50/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-2 text-sm font-medium leading-snug text-slate-900">{value}</div>
    </div>
  )
}

function InvalidUserState({ onBack }: { onBack: () => void }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
      <p>El identificador del usuario no es valido.</p>
      <Button className="mt-4" onClick={onBack} type="button" variant="secondary">
        Volver al listado
      </Button>
    </div>
  )
}

function PageState({ message, tone = 'default' }: { message: string; tone?: 'default' | 'error' }) {
  return (
    <div
      className={`rounded-2xl border p-5 text-sm ${
        tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-border bg-surface-card text-slate-600 shadow-sm'
      }`}
    >
      {message}
    </div>
  )
}
