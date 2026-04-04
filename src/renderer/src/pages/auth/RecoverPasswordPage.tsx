import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'

export function RecoverPasswordPage() {
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => window.api.auth.recoverPassword({ identifier, recoveryCode, newPassword }),
    onSuccess: () => {
      setMessage('Contrasena actualizada correctamente. Ya puedes iniciar sesion.')
      setTimeout(() => navigate('/login'), 1000)
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'No se pudo recuperar la contrasena.')
    },
  })

  return (
    <section className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <div className="w-full rounded-3xl border border-border bg-surface-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Recuperar contrasena</h1>
        <p className="mt-2 text-sm text-slate-400">Usa uno de tus codigos personales para restablecerla.</p>
        <form
          className="mt-6 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            setMessage(null)
            mutation.mutate()
          }}
        >
          <input
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
            placeholder="Usuario o correo"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
          />
          <input
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
            placeholder="Codigo de recuperacion"
            value={recoveryCode}
            onChange={(event) => setRecoveryCode(event.target.value)}
          />
          <input
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
            placeholder="Nueva contrasena"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          {message ? <p className="text-sm text-cyan-400">{message}</p> : null}
          <button className="rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-950" type="submit">
            Restablecer
          </button>
        </form>
        <Link className="mt-4 inline-block text-sm text-cyan-400" to="/login">
          Volver al login
        </Link>
      </div>
    </section>
  )
}
