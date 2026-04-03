import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@renderer/components/ui/Button'
import { Card } from '@renderer/components/ui/Card'

export function ReportsPage() {
  const queryClient = useQueryClient()

  const licenseFlagsQuery = useQuery({
    queryKey: ['license', 'feature-flags'],
    queryFn: () => window.api.license.getFeatureFlags(),
  })

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

  const reportEmailEnabled = licenseFlagsQuery.data?.reportEmailEnabled ?? false
  const licenseReason = licenseFlagsQuery.data?.reason

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">Reportes de cierre</h1>
        <p className="text-sm text-slate-400">
          El PDF de cierre se genera al confirmar el cierre de turno en Turnos y caja (con su contraseña). El correo con el adjunto se intenta enviar al
          momento; si falla o falta SMTP, queda en la cola de abajo para reintentar. La configuración del servidor y del destinatario está en el panel de
          licencia administrativa (atajo de teclado).
        </p>
      </div>

      {licenseReason ? (
        <Card className="border-amber-800 text-sm text-amber-200" padding="md">
          {licenseReason}
        </Card>
      ) : null}

      <Card padding="lg">
        <h2 className="mb-4 text-lg font-semibold text-white">Acciones</h2>
        <div className="flex flex-wrap gap-3">
          <Button disabled={!reportEmailEnabled || retryMutation.isPending} onClick={() => retryMutation.mutate()} variant="secondary">
            {retryMutation.isPending ? 'Reintentando...' : 'Reintentar correos pendientes'}
          </Button>
        </div>
        {retryMutation.isError ? (
          <p className="mt-3 text-sm text-rose-400">
            {(retryMutation.error as Error)?.message ?? 'Error al reintentar correos.'}
          </p>
        ) : null}
      </Card>

      <Card padding="lg">
        <h2 className="mb-3 text-lg font-semibold text-white">Cola SMTP</h2>
        <ul className="space-y-2 text-sm text-slate-300">
          {(pendingQuery.data ?? []).map((job) => (
            <li className="rounded-lg border border-border px-3 py-2" key={job.id}>
              {job.recipientEmail} | sesión {job.sessionId} | {job.status} | intentos {job.attempts}
            </li>
          ))}
          {(pendingQuery.data ?? []).length === 0 ? <li className="text-slate-500">No hay correos pendientes.</li> : null}
        </ul>
      </Card>
    </section>
  )
}
