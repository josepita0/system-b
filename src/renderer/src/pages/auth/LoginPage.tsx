import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { getSetupStatusSafe } from '@renderer/lib/setup'
import { useAuthStore } from '@renderer/store/authStore'

export function LoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setUser = useAuthStore((state) => state.setUser)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const setupQuery = useQuery({
    queryKey: ['setup', 'status'],
    queryFn: getSetupStatusSafe,
  })

  const loginMutation = useMutation({
    mutationFn: () => window.api.auth.login({ identifier, password }),
    onSuccess: async (result) => {
      setUser(result.user)
      await queryClient.invalidateQueries()
      const setupStatus = await queryClient.fetchQuery({
        queryKey: ['setup', 'status'],
        queryFn: getSetupStatusSafe,
      })

      navigate(
        result.user.mustChangePassword
          ? setupStatus.mustRunWizard
            ? '/instalacion/cambiar-clave'
            : '/cambiar-clave'
          : result.user.role === 'employee'
            ? '/ventas'
            : '/',
      )
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible iniciar sesion.')
    },
  })

  return (
    <section className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <div className="w-full rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <h1 className="text-2xl font-semibold text-white">Iniciar sesion</h1>
        <p className="mt-2 text-sm text-slate-400">Acceso seguro al sistema de barra. El acceso inicial se entrega solo por el canal operativo definido para la instalacion.</p>

        <form
          className="mt-6 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            setErrorMessage(null)
            loginMutation.mutate()
          }}
        >
          <input
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            placeholder="Usuario o correo"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
          />
          <input
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            placeholder="Contrasena"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {errorMessage ? <p className="text-sm text-rose-400">{errorMessage}</p> : null}
          <button className="rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-950" type="submit">
            Entrar
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link className="text-cyan-400" to="/recuperar">
            Recuperar contrasena
          </Link>
          {setupQuery.data?.mustRunWizard ? (
            <Link className="text-slate-400" to="/instalacion">
              Ver wizard
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  )
}
