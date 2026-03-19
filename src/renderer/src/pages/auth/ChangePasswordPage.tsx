import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@renderer/store/authStore'

export function ChangePasswordPage() {
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
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      setMessage('Clave actualizada correctamente.')
      navigate(result.user.role === 'employee' ? '/ventas' : '/')
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'No fue posible actualizar la clave.')
    },
  })

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        setMessage(null)
        mutation.mutate()
      }}
    >
      <input
        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
        placeholder="Contrasena actual"
        type="password"
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
      />
      <input
        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
        placeholder="Nueva contrasena"
        type="password"
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
      />
      {message ? <p className={`text-sm ${mutation.isError ? 'text-rose-400' : 'text-cyan-400'}`}>{message}</p> : null}
      <button className="rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-950" disabled={mutation.isPending} type="submit">
        {mutation.isPending ? 'Actualizando...' : 'Actualizar clave'}
      </button>
    </form>
  )
}
