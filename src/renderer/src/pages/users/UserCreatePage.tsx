import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { UserForm, type UserFormValues } from '@renderer/components/users/UserForm'

function toOptionalValue(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function UserCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: (payload: UserFormValues) =>
      window.api.users.create({
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        documentId: toOptionalValue(payload.documentId),
        email: toOptionalValue(payload.email),
        username: payload.username.trim(),
        role: payload.role,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      navigate('/usuarios')
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible crear el usuario.')
    },
  })

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      {errorMessage ? (
        <div className="rounded-2xl border border-rose-800 bg-slate-900 p-4 text-sm text-rose-300">{errorMessage}</div>
      ) : null}
      <UserForm
        mode="create"
        onCancel={() => navigate('/usuarios')}
        onSubmit={async (payload) => {
          setErrorMessage(null)
          await createMutation.mutateAsync(payload)
        }}
        submitLabel={createMutation.isPending ? 'Guardando...' : 'Crear usuario'}
        title="Nuevo usuario"
      />
    </section>
  )
}
