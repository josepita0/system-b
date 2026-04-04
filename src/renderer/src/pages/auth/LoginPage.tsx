import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { BootstrapCredentialsBlock } from '@renderer/components/setup/BootstrapCredentialsBlock'
import { getSetupStatusSafe } from '@renderer/lib/setup'
import { useAuthStore } from '@renderer/store/authStore'
import {
  DEFAULT_INITIAL_ADMIN_PASSWORD,
  DEFAULT_INITIAL_ADMIN_RECOVERY_CODES,
} from '@shared/constants/initialAdmin'

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

  const bootstrapDisplay = setupQuery.data?.bootstrapDisplay
  const showBootstrapHelp = Boolean(bootstrapDisplay)
  const setup = setupQuery.data
  const showDefaultCredentialsHint = Boolean(
    setup && !bootstrapDisplay && (setup.mustRunWizard || setup.bootstrapPending),
  )

  useEffect(() => {
    const u = bootstrapDisplay?.username
    if (u) {
      setIdentifier((prev) => (prev === '' ? u : prev))
    }
  }, [bootstrapDisplay])

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
    <section
      className={`mx-auto flex min-h-screen items-center px-6 ${showBootstrapHelp || showDefaultCredentialsHint ? 'max-w-xl' : 'max-w-md'}`}
    >
      <div className="w-full rounded-3xl border border-border bg-surface-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Iniciar sesion</h1>
        <p className="mt-2 text-sm text-slate-400">
          {showBootstrapHelp
            ? 'Use las credenciales mostradas abajo para el primer acceso. Debera cambiar la contrasena temporal al continuar.'
            : showDefaultCredentialsHint
              ? `No se pudieron cargar las credenciales en pantalla. Primer arranque: usuario admin, contrasena ${DEFAULT_INITIAL_ADMIN_PASSWORD}, codigo de recuperacion ${DEFAULT_INITIAL_ADMIN_RECOVERY_CODES[0]}.`
              : 'Acceso seguro al sistema de barra.'}
        </p>

        {bootstrapDisplay ? (
          <div className="mt-4">
            <BootstrapCredentialsBlock
              display={bootstrapDisplay}
              filePath={setupQuery.data?.bootstrapFilePath}
              variant="compact"
            />
          </div>
        ) : null}

        <form
          className="mt-6 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            setErrorMessage(null)
            loginMutation.mutate()
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
