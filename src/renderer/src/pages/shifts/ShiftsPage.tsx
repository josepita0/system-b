import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { resolveShiftForDate } from '@renderer/utils/resolveShiftForDate'

export function ShiftsPage() {
  const queryClient = useQueryClient()
  const currentQuery = useQuery({
    queryKey: ['shift', 'current'],
    queryFn: () => window.api.shifts.current(),
  })

  const openMutation = useMutation({
    mutationFn: () =>
      window.api.shifts.open({
        shiftCode: resolveShiftForDate(new Date()),
        businessDate: new Date().toISOString().slice(0, 10),
        openingCash: 0,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shift', 'current'] })
    },
  })

  const closeMutation = useMutation({
    mutationFn: async () => {
      const session = currentQuery.data
      if (!session) {
        return null
      }
      return window.api.shifts.close({ sessionId: session.id, countedCash: session.openingCash })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shift', 'current'] })
    },
  })

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">Turnos y caja</h1>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-200">
        {currentQuery.data ? (
          <div className="space-y-3">
            <p>Sesion abierta: #{currentQuery.data.id}</p>
            <p>Fecha operativa: {currentQuery.data.businessDate}</p>
            <button className="rounded-lg bg-amber-500 px-4 py-2 text-slate-950" onClick={() => closeMutation.mutate()} type="button">
              Cerrar turno
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p>No hay turno activo.</p>
            <button className="rounded-lg bg-cyan-500 px-4 py-2 text-slate-950" onClick={() => openMutation.mutate()} type="button">
              Abrir turno actual
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
