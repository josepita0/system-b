import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@renderer/store/authStore'

export function SetupCompletionPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const setupQuery = useQuery({
    queryKey: ['setup', 'status'],
    queryFn: () => window.api.setup.getStatus(),
  })

  const completionMutation = useMutation({
    mutationFn: () => window.api.setup.complete(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['setup', 'status'] }),
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] }),
      ])
      navigate('/')
    },
  })

  const setupStatus = setupQuery.data

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-white">Finalizar instalacion</h2>
        <p className="mt-2 text-sm text-slate-400">
          La cuenta administrativa ya esta protegida. Cierre este wizard para habilitar el uso normal del sistema.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
        <p className="font-medium text-white">Checklist minimo</p>
        <ul className="mt-2 space-y-2">
          <li>{setupStatus?.bootstrapPending ? 'Pendiente: el acceso bootstrap sigue activo.' : 'OK: el acceso bootstrap ya no esta expuesto.'}</li>
          <li>OK: la sesion administrativa ya esta autenticada.</li>
          <li>Recomendado: configure la licencia administrativa despues del cierre inicial.</li>
        </ul>
      </div>

      {user?.role !== 'admin' ? (
        <p className="text-sm text-amber-300">Solo un administrador puede cerrar la instalacion inicial. Inicie sesion con la cuenta administrativa para continuar.</p>
      ) : null}

      {completionMutation.error ? (
        <p className="text-sm text-rose-400">
          {completionMutation.error instanceof Error
            ? completionMutation.error.message
            : 'No fue posible cerrar el wizard de instalacion.'}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950"
          disabled={completionMutation.isPending || setupStatus?.bootstrapPending || user?.role !== 'admin'}
          onClick={() => completionMutation.mutate()}
          type="button"
        >
          {completionMutation.isPending ? 'Cerrando instalacion...' : 'Finalizar instalacion'}
        </button>
      </div>
    </section>
  )
}
