import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@renderer/store/authStore'

export function LoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setUser = useAuthStore((state) => state.setUser)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loginMutation = useMutation({
    mutationFn: () => window.api.auth.login({ identifier, password }),
    onSuccess: async (result) => {
      setUser(result.user)
      await queryClient.invalidateQueries()
      navigate(result.user.role === 'employee' ? '/ventas' : '/')
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible iniciar sesion.')
    },
  })

  return (
    <section className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <div className="w-full rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <h1 className="text-2xl font-semibold text-white">Iniciar sesion</h1>
        <p className="mt-2 text-sm text-slate-400">Acceso seguro al sistema de barra.</p>

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
          <BootstrapInfo />
        </div>
      </div>
    </section>
  )
}

function BootstrapInfo() {
  const [show, setShow] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const bootstrapInfoQuery = useQuery({
    queryKey: ['auth', 'bootstrap-info'],
    queryFn: async () => {
      if (!window.api?.auth?.bootstrapInfo) {
        return null
      }

      return window.api.auth.bootstrapInfo()
    },
    staleTime: Infinity,
  })

  const info = bootstrapInfoQuery.data

  if (!info) {
    return null
  }

  return (
    <div className="text-right">
      <button
        className="text-slate-500"
        onClick={async () => {
          try {
            setLoadError(null)
            setShow((value) => !value)
          } catch (error) {
            setLoadError(error instanceof Error ? error.message : 'No se pudo cargar el acceso inicial.')
          }
        }}
        type="button"
      >
        {show ? 'Ocultar acceso inicial' : 'Ver acceso inicial'}
      </button>
      {show ? (
        <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-left text-xs text-slate-300">
          <p>Usuario: {info.username}</p>
          <p>Contrasena temporal: {info.temporaryPassword}</p>
        </div>
      ) : null}
      {loadError ? <p className="mt-2 text-xs text-rose-400">{loadError}</p> : null}
    </div>
  )
}
