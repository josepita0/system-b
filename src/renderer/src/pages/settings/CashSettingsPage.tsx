import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '@renderer/components/ui/Card'
import { Field } from '@renderer/components/ui/Field'
import { Input } from '@renderer/components/ui/Input'
import { Button } from '@renderer/components/ui/Button'

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100
}

export function CashSettingsPage() {
  const queryClient = useQueryClient()
  const cashQuery = useQuery({
    queryKey: ['settings', 'cash'],
    queryFn: () => window.api.settings.getCashSettings(),
  })

  const [minInput, setMinInput] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!cashQuery.data) return
    setMinInput(String(cashQuery.data.minOpeningCash.toFixed(2)))
  }, [cashQuery.data])

  const parsedMin = useMemo(() => {
    const t = minInput.trim()
    if (t === '') return null
    const n = Number(t.replace(',', '.'))
    if (!Number.isFinite(n) || n < 0) return null
    return roundMoney2(n)
  }, [minInput])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (parsedMin == null) {
        throw new Error('Indique un monto válido.')
      }
      await window.api.settings.updateCashSettings({ minOpeningCash: parsedMin })
    },
    onSuccess: async () => {
      setLocalError(null)
      await queryClient.invalidateQueries({ queryKey: ['settings', 'cash'] })
      await queryClient.refetchQueries({ queryKey: ['settings', 'cash'] })
    },
    onError: (e) => {
      setLocalError(e instanceof Error ? e.message : 'No se pudo guardar la configuración.')
    },
  })

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Caja</h1>
        <p className="text-sm text-slate-500">Reglas de apertura de turno para la caja.</p>
      </div>

      <Card padding="lg">
        {cashQuery.isLoading ? <p className="text-sm text-slate-500">Cargando configuración...</p> : null}
        {cashQuery.isError ? (
          <p className="text-sm text-rose-700">
            {(cashQuery.error as Error)?.message ?? 'No se pudo cargar la configuración de caja.'}
          </p>
        ) : null}

        <div className="mt-2 max-w-xl space-y-4">
          <Field label="Mínimo de apertura de caja" hint="Si el monto de apertura es menor, se exigirá un motivo.">
            <Input
              min={0}
              onChange={(e) => setMinInput(e.target.value)}
              placeholder="0.00"
              step={0.01}
              type="number"
              value={minInput}
            />
          </Field>

          {parsedMin == null && minInput.trim() !== '' ? (
            <p className="text-xs text-rose-700">Indique un monto válido.</p>
          ) : null}

          {localError ? <p className="text-sm text-rose-700">{localError}</p> : null}
          {saveMutation.isSuccess ? <p className="text-sm font-medium text-emerald-800">Configuración guardada.</p> : null}

          <div className="flex justify-end">
            <Button disabled={saveMutation.isPending || parsedMin == null || cashQuery.isLoading} onClick={() => saveMutation.mutate()} variant="primary">
              {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Card>
    </section>
  )
}

