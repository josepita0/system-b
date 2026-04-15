import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@renderer/store/authStore'
import { Card } from '@renderer/components/ui/Card'
import { Button } from '@renderer/components/ui/Button'

export function MyProfilePage() {
  const user = useAuthStore((s) => s.user)
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const identifier = useMemo(() => {
    if (!user) return ''
    return user.email ?? user.username ?? ''
  }, [user])

  const sendCodeMutation = useMutation({
    mutationFn: () => window.api.auth.requestPasswordResetEmailCode({ identifier }),
    onSuccess: () => setMessage('Si tienes correo registrado, se envio un codigo. Revisa tu bandeja y spam.'),
    onError: (e) => setMessage(e instanceof Error ? e.message : 'No se pudo enviar el codigo.'),
  })

  const applyMutation = useMutation({
    mutationFn: () => window.api.auth.resetPasswordWithEmailCode({ identifier, code, newPassword }),
    onSuccess: () => setMessage('Contrasena actualizada. Si tu sesion se cerro, inicia sesion nuevamente.'),
    onError: (e) => setMessage(e instanceof Error ? e.message : 'No fue posible actualizar la contrasena.'),
  })

  if (!user) {
    return (
      <div className="rounded-2xl border border-border bg-surface-card p-5 text-sm text-slate-600 shadow-sm">
        Cargando perfil...
      </div>
    )
  }

  const canUseEmailFlow = Boolean(user.email)

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Mi perfil</h1>
        <p className="mt-1 text-sm text-slate-500">Gestiona tu acceso al sistema.</p>
      </div>

      <Card className="shadow-sm" padding="lg">
        <h2 className="text-lg font-semibold text-slate-900">Seguridad</h2>
        <p className="mt-1 text-sm text-slate-500">
          Cambia tu contrasena usando un codigo enviado a tu correo. No solicita contrasena actual.
        </p>

        {!canUseEmailFlow ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            Este usuario no tiene correo registrado. Pide a un administrador/encargado registrar tu correo o emitir credenciales.
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            <Button
              disabled={sendCodeMutation.isPending || !identifier}
              onClick={() => {
                setMessage(null)
                sendCodeMutation.mutate()
              }}
              type="button"
              variant="secondary"
            >
              {sendCodeMutation.isPending ? 'Enviando...' : 'Enviar codigo a mi correo'}
            </Button>

            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
              placeholder="Codigo (6 digitos)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
              placeholder="Nueva contrasena"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Button
              disabled={applyMutation.isPending || !identifier}
              onClick={() => {
                setMessage(null)
                applyMutation.mutate()
              }}
              type="button"
              variant="primary"
            >
              {applyMutation.isPending ? 'Actualizando...' : 'Cambiar contrasena'}
            </Button>
          </div>
        )}

        {message ? <p className="mt-3 text-sm text-cyan-400">{message}</p> : null}
      </Card>
    </section>
  )
}

