import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@renderer/store/authStore'

export function SetupPasswordStepPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setUser = useAuthStore((state) => state.setUser)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => window.api.auth.changePassword({ currentPassword, newPassword }),
    onSuccess: async (result) => {
      setUser(result.user)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] }),
        queryClient.invalidateQueries({ queryKey: ['setup', 'status'] }),
      ])
      setMessage('Clave actualizada correctamente. Ya puede finalizar la instalacion.')
      navigate('/instalacion/finalizar')
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'No fue posible actualizar la clave inicial.')
    },
  })

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Cambiar clave inicial</h2>
        <p className="mt-2 text-sm text-slate-400">
          Este paso es obligatorio. La clave temporal solo debe usarse una vez y luego quedar invalidada.
        </p>
      </div>

      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          setMessage(null)
          mutation.mutate()
        }}
      >
        <input
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
          placeholder="Contrasena actual"
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
        <input
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
          placeholder="Nueva contrasena"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
        {message ? <p className={`text-sm ${mutation.isError ? 'text-rose-600' : 'text-brand'}`}>{message}</p> : null}
        <button className="rounded-xl bg-brand px-4 py-2 font-medium text-brand-fg" disabled={mutation.isPending} type="submit">
          {mutation.isPending ? 'Actualizando...' : 'Actualizar clave y continuar'}
        </button>
      </form>
    </section>
  )
}
