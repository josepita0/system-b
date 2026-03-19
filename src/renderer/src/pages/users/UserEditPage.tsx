import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { UserForm, type UserFormValues } from '@renderer/components/users/UserForm'

function toOptionalValue(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function UserEditPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const userId = Number(id)
  const isValidUserId = Number.isInteger(userId) && userId > 0

  const userQuery = useQuery({
    queryKey: ['users', userId],
    queryFn: () => window.api.users.getById(userId),
    enabled: isValidUserId,
  })

  const updateMutation = useMutation({
    mutationFn: (payload: UserFormValues) =>
      window.api.users.update({
        id: userId,
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        documentId: toOptionalValue(payload.documentId),
        email: toOptionalValue(payload.email),
        username: payload.username.trim(),
        role: payload.role,
        isActive: payload.isActive,
      }),
    onSuccess: async (user) => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      await queryClient.invalidateQueries({ queryKey: ['users', userId] })
      navigate(`/usuarios/${user.id}`)
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible actualizar el usuario.')
    },
  })

  if (!isValidUserId) {
    return (
      <div className="rounded-2xl border border-rose-800 bg-slate-900 p-5 text-sm text-rose-300">
        El identificador del usuario no es valido.
      </div>
    )
  }

  if (userQuery.isLoading) {
    return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">Cargando usuario...</div>
  }

  if (userQuery.error) {
    return (
      <div className="rounded-2xl border border-rose-800 bg-slate-900 p-5 text-sm text-rose-300">
        {userQuery.error instanceof Error ? userQuery.error.message : 'No fue posible cargar el usuario.'}
      </div>
    )
  }

  if (!userQuery.data) {
    return <div className="rounded-2xl border border-rose-800 bg-slate-900 p-5 text-sm text-rose-300">Usuario no encontrado.</div>
  }

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      {errorMessage ? (
        <div className="rounded-2xl border border-rose-800 bg-slate-900 p-4 text-sm text-rose-300">{errorMessage}</div>
      ) : null}
      <UserForm
        mode="edit"
        onCancel={() => navigate('/usuarios')}
        onSubmit={async (payload) => {
          setErrorMessage(null)
          await updateMutation.mutateAsync(payload)
        }}
        submitLabel={updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
        title="Editar usuario"
        user={userQuery.data}
      />
    </section>
  )
}
