import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { resolveShiftForDate } from '@renderer/utils/resolveShiftForDate'

export function SalesPage() {
  const queryClient = useQueryClient()
  const currentShiftQuery = useQuery({
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

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">Ventas y tickets</h1>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-200">
        <p className="mb-4 text-slate-400">
          Esta pantalla queda preparada para el flujo POS. Por ahora concentra el acceso principal del Empleado.
        </p>
        {currentShiftQuery.data ? (
          <p>Turno activo: sesion #{currentShiftQuery.data.id}</p>
        ) : (
          <div className="space-y-3">
            <p>No hay turno abierto.</p>
            <button className="rounded-lg bg-cyan-500 px-4 py-2 text-slate-950" onClick={() => openMutation.mutate()} type="button">
              Abrir turno actual
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
