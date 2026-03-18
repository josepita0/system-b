import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usePosStore } from '@renderer/store/posStore'

export function ReportsPage() {
  const queryClient = useQueryClient()
  const activeSessionId = usePosStore((state) => state.activeSessionId)

  const pendingQuery = useQuery({
    queryKey: ['reports', 'pending-emails'],
    queryFn: () => window.api.reports.pendingEmails(),
  })

  const retryMutation = useMutation({
    mutationFn: () => window.api.reports.retryPendingEmails(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reports', 'pending-emails'] })
    },
  })

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!activeSessionId) {
        return null
      }

      return window.api.reports.generateShiftClose(activeSessionId)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reports', 'pending-emails'] })
    },
  })

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">Reportes de cierre</h1>
      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-lg bg-cyan-500 px-4 py-2 text-slate-950 disabled:opacity-50"
          disabled={!activeSessionId}
          onClick={() => generateMutation.mutate()}
          type="button"
        >
          Generar cierre del turno activo
        </button>
        <button className="rounded-lg bg-slate-700 px-4 py-2 text-white" onClick={() => retryMutation.mutate()} type="button">
          Reintentar correos pendientes
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-3 text-lg font-semibold text-white">Cola SMTP</h2>
        <ul className="space-y-2 text-sm text-slate-300">
          {(pendingQuery.data ?? []).map((job) => (
            <li className="rounded-lg border border-slate-800 px-3 py-2" key={job.id}>
              {job.recipientEmail} | sesion {job.sessionId} | {job.status} | intentos {job.attempts}
            </li>
          ))}
          {(pendingQuery.data ?? []).length === 0 ? <li className="text-slate-500">No hay correos pendientes.</li> : null}
        </ul>
      </div>
    </section>
  )
}
