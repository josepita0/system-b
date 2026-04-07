import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@renderer/components/ui/Modal'
import { Button } from '@renderer/components/ui/Button'
import { Input } from '@renderer/components/ui/Input'
import { Field } from '@renderer/components/ui/Field'
import { resolveShiftForDate } from '@renderer/utils/resolveShiftForDate'

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100
}

export function OpenShiftModal(props: { open: boolean; onClose: () => void }) {
  const { open, onClose } = props
  const queryClient = useQueryClient()
  const [openingCashInput, setOpeningCashInput] = useState('')
  const [openingCashNote, setOpeningCashNote] = useState('')
  const [noteGateOpened, setNoteGateOpened] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const cashSettingsQuery = useQuery({
    queryKey: ['settings', 'cash'],
    queryFn: () => window.api.settings.getCashSettings(),
    enabled: open,
  })

  const minOpeningCash = cashSettingsQuery.data?.minOpeningCash ?? 0

  const parsedOpeningCash = useMemo(() => {
    const t = openingCashInput.trim()
    if (t === '') {
      return null
    }
    const n = Number(t.replace(',', '.'))
    if (!Number.isFinite(n) || n < 0) {
      return null
    }
    return roundMoney2(n)
  }, [openingCashInput])

  const needsNote = parsedOpeningCash != null && parsedOpeningCash < minOpeningCash

  const canConfirm =
    parsedOpeningCash != null &&
    !cashSettingsQuery.isLoading &&
    !cashSettingsQuery.isError

  const openMutation = useMutation({
    mutationFn: async () => {
      if (parsedOpeningCash == null) {
        throw new Error('Indique un monto válido.')
      }
      const note = openingCashNote.trim()
      return window.api.shifts.open({
        shiftCode: resolveShiftForDate(new Date()),
        businessDate: new Date().toISOString().slice(0, 10),
        openingCash: parsedOpeningCash,
        openingCashNote: needsNote ? (note ? note : null) : null,
      })
    },
    onSuccess: async () => {
      setLocalError(null)
      setOpeningCashInput('')
      setOpeningCashNote('')
      setNoteGateOpened(false)
      onClose()
      await queryClient.invalidateQueries({ queryKey: ['shift'] })
      await queryClient.invalidateQueries({ queryKey: ['shift', 'current'] })
    },
    onError: (e) => {
      setLocalError(e instanceof Error ? e.message : 'No se pudo abrir el turno.')
    },
  })

  const resetAndClose = () => {
    setLocalError(null)
    setOpeningCashInput('')
    setOpeningCashNote('')
    setNoteGateOpened(false)
    onClose()
  }

  const shouldShowNote = noteGateOpened && needsNote

  return (
    <Modal
      footer={
        <>
          <Button disabled={openMutation.isPending} onClick={resetAndClose} variant="secondary">
            Cancelar
          </Button>
          <Button
            disabled={!canConfirm || openMutation.isPending}
            onClick={() => {
              setLocalError(null)
              if (parsedOpeningCash == null) {
                setLocalError('Indique un monto válido.')
                return
              }
              if (parsedOpeningCash < minOpeningCash) {
                if (!noteGateOpened) {
                  setNoteGateOpened(true)
                }
                if (!openingCashNote.trim()) {
                  setLocalError('Indique el motivo: el monto de apertura es menor al mínimo.')
                  return
                }
              }
              openMutation.mutate()
            }}
            variant="primary"
          >
            {openMutation.isPending ? 'Abriendo...' : 'Confirmar apertura'}
          </Button>
        </>
      }
      maxWidthClass="max-w-lg"
      onClose={resetAndClose}
      open={open}
      title="Apertura de caja"
    >
      <p className="text-sm text-slate-600">Indique el monto con el que abre la caja para este turno.</p>

      {cashSettingsQuery.isLoading ? <p className="mt-3 text-sm text-slate-500">Cargando configuración...</p> : null}
      {cashSettingsQuery.isError ? (
        <p className="mt-3 text-sm text-rose-700">
          {(cashSettingsQuery.error as Error)?.message ?? 'No se pudo cargar la configuración de caja.'}
        </p>
      ) : null}

      <div className="mt-4 space-y-4">
        <Field hint={`Mínimo configurado: ${minOpeningCash.toFixed(2)}`} label="Monto de apertura">
          <Input
            autoFocus
            min={0}
            onChange={(e) => setOpeningCashInput(e.target.value)}
            placeholder="0.00"
            step={0.01}
            type="number"
            value={openingCashInput}
          />
        </Field>

        {parsedOpeningCash == null && openingCashInput.trim() !== '' ? (
          <p className="text-xs text-rose-700">Indique un monto válido.</p>
        ) : null}

        {shouldShowNote ? (
          <div>
            <Field
              hint="Obligatorio si el monto es menor al mínimo."
              label="Motivo (monto menor al mínimo)"
            >
              <textarea
                className="mt-1 min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                onChange={(e) => setOpeningCashNote(e.target.value)}
                placeholder="Explique brevemente el motivo..."
                value={openingCashNote}
              />
            </Field>
            {!openingCashNote.trim() ? <p className="mt-2 text-xs text-rose-700">Indique el motivo.</p> : null}
          </div>
        ) : null}

        {localError ? <p className="text-sm text-rose-700">{localError}</p> : null}
      </div>
    </Modal>
  )
}

