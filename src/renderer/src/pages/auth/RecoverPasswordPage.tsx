import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'

export function RecoverPasswordPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'personal' | 'email'>('email')
  const [identifier, setIdentifier] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const sendEmailCodeMutation = useMutation({
    mutationFn: () => window.api.auth.requestPasswordResetEmailCode({ identifier }),
    onSuccess: () => {
      setMessage('Si el usuario tiene un correo registrado, se envio un codigo. Revisa tu bandeja y spam.')
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'No se pudo enviar el codigo.')
    },
  })

  const resetByEmailMutation = useMutation({
    mutationFn: () => window.api.auth.resetPasswordWithEmailCode({ identifier, code: emailCode, newPassword }),
    onSuccess: () => {
      setMessage('Contrasena actualizada correctamente. Ya puedes iniciar sesion.')
      setTimeout(() => navigate('/login'), 1000)
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'No se pudo recuperar la contrasena.')
    },
  })

  const resetByPersonalCodeMutation = useMutation({
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
        <p className="mt-2 text-sm text-slate-400">Restablece tu clave con un codigo por correo o con tus codigos personales.</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            className={`rounded-xl border px-3 py-2 text-sm font-medium ${
              mode === 'email' ? 'border-cyan-200 bg-cyan-50 text-cyan-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            onClick={() => {
              setMode('email')
              setMessage(null)
            }}
            type="button"
          >
            Codigo por correo
          </button>
          <button
            className={`rounded-xl border px-3 py-2 text-sm font-medium ${
              mode === 'personal'
                ? 'border-cyan-200 bg-cyan-50 text-cyan-800'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            onClick={() => {
              setMode('personal')
              setMessage(null)
            }}
            type="button"
          >
            Codigo personal
          </button>
        </div>

        <form
          className="mt-6 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            setMessage(null)
            if (mode === 'email') {
              resetByEmailMutation.mutate()
              return
            }
            resetByPersonalCodeMutation.mutate()
          }}
        >
          <input
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
            placeholder="Usuario o correo"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
          />
          {mode === 'email' ? (
            <div className="grid gap-2">
              <button
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                disabled={sendEmailCodeMutation.isPending}
                onClick={() => {
                  setMessage(null)
                  sendEmailCodeMutation.mutate()
                }}
                type="button"
              >
                {sendEmailCodeMutation.isPending ? 'Enviando...' : 'Enviar codigo al correo'}
              </button>
              <input
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
                placeholder="Codigo (6 digitos)"
                value={emailCode}
                onChange={(event) => setEmailCode(event.target.value)}
              />
            </div>
          ) : (
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
              placeholder="Codigo de recuperacion"
              value={recoveryCode}
              onChange={(event) => setRecoveryCode(event.target.value)}
            />
          )}
          <input
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
            placeholder="Nueva contrasena"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          {message ? <p className="text-sm text-cyan-400">{message}</p> : null}
          <button
            className="rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-950"
            disabled={resetByEmailMutation.isPending || resetByPersonalCodeMutation.isPending}
            type="submit"
          >
            {resetByEmailMutation.isPending || resetByPersonalCodeMutation.isPending ? 'Restableciendo...' : 'Restablecer'}
          </button>
        </form>
        <Link className="mt-4 inline-block text-sm text-cyan-400" to="/login">
          Volver al login
        </Link>
      </div>
    </section>
  )
}
