import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LicensePlanType } from '@shared/types/license'

function toPlanLabel(value: LicensePlanType | null) {
  switch (value) {
    case 'monthly':
      return 'Mensual'
    case 'semiannual':
      return 'Semestral'
    case 'annual':
      return 'Anual'
    default:
      return 'Sin definir'
  }
}

function toStatusLabel(value: string) {
  switch (value) {
    case 'active':
      return 'Activa'
    case 'expired':
      return 'Vencida'
    case 'suspended':
      return 'Suspendida'
    case 'missing':
    default:
      return 'No activada'
  }
}

const inputClassName = 'rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white'
const panelClassName = 'rounded-2xl border border-slate-800 bg-slate-900 p-5'
const tabClassName = (selected: boolean) =>
  `rounded-lg px-4 py-2 text-sm ${selected ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-200'}`

export function LicenseAdminPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'key' | 'manual'>('key')
  const [panelSecret, setPanelSecret] = useState('')
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [accessExpiresAt, setAccessExpiresAt] = useState<string | null>(null)
  const [accessError, setAccessError] = useState<string | null>(null)
  const [resultMessage, setResultMessage] = useState<string | null>(null)
  const [resultTone, setResultTone] = useState<'success' | 'error'>('success')

  const [keyLicense, setKeyLicense] = useState('')
  const [keyPlanType, setKeyPlanType] = useState<LicensePlanType>('monthly')
  const [keyIssuedTo, setKeyIssuedTo] = useState('')
  const [keyNotes, setKeyNotes] = useState('')

  const [manualPlanType, setManualPlanType] = useState<LicensePlanType>('monthly')
  const [manualIssuedTo, setManualIssuedTo] = useState('')
  const [manualNotes, setManualNotes] = useState('')
  const [cancelNotes, setCancelNotes] = useState('')

  const statusQuery = useQuery({
    queryKey: ['license', 'status'],
    queryFn: () => window.api.license.getStatus(),
  })

  const status = statusQuery.data
  const isRenewal = status?.status === 'active'
  const accessUnlocked = useMemo(() => {
    if (!accessToken || !accessExpiresAt) {
      return false
    }

    return new Date(accessExpiresAt).getTime() > Date.now()
  }, [accessExpiresAt, accessToken])

  const unlockMutation = useMutation({
    mutationFn: () => window.api.license.validateSecretAccess({ secret: panelSecret }),
    onSuccess: (result) => {
      setAccessError(null)
      setResultTone('success')
      setResultMessage('Acceso administrativo validado.')
      setAccessToken(result.accessToken)
      setAccessExpiresAt(result.expiresAt)
    },
    onError: (error) => {
      setAccessToken(null)
      setAccessExpiresAt(null)
      setAccessError(error instanceof Error ? error.message : 'No fue posible validar la clave administrativa.')
    },
  })

  const refreshLicenseData = async (message: string) => {
    setResultTone('success')
    setResultMessage(message)
    await queryClient.invalidateQueries({ queryKey: ['license', 'status'] })
    await queryClient.invalidateQueries({ queryKey: ['license', 'feature-flags'] })
  }

  const activateByKeyMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) {
        throw new Error('Debe validar la clave administrativa primero.')
      }

      if (isRenewal) {
        return window.api.license.renew({
          accessToken,
          mode: 'key',
          planType: keyPlanType,
          licenseKey: keyLicense,
          issuedTo: keyIssuedTo || null,
          notes: keyNotes || null,
        })
      }

      return window.api.license.activateByKey({
        accessToken,
        licenseKey: keyLicense,
        planType: keyPlanType,
        issuedTo: keyIssuedTo || null,
        notes: keyNotes || null,
      })
    },
    onSuccess: async (result) => {
      await refreshLicenseData(result.message)
      setKeyLicense('')
      setKeyNotes('')
    },
    onError: (error) => {
      setResultTone('error')
      setResultMessage(error instanceof Error ? error.message : 'No fue posible guardar la licencia por clave.')
    },
  })

  const activateManualMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) {
        throw new Error('Debe validar la clave administrativa primero.')
      }

      if (isRenewal) {
        return window.api.license.renew({
          accessToken,
          mode: 'manual',
          planType: manualPlanType,
          issuedTo: manualIssuedTo || null,
          notes: manualNotes || null,
        })
      }

      return window.api.license.activateManual({
        accessToken,
        planType: manualPlanType,
        issuedTo: manualIssuedTo || null,
        notes: manualNotes || null,
      })
    },
    onSuccess: async (result) => {
      await refreshLicenseData(result.message)
      setManualNotes('')
    },
    onError: (error) => {
      setResultTone('error')
      setResultMessage(error instanceof Error ? error.message : 'No fue posible registrar la activacion manual.')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) {
        throw new Error('Debe validar la clave administrativa primero.')
      }

      return window.api.license.cancel({
        accessToken,
        notes: cancelNotes || null,
      })
    },
    onSuccess: async (result) => {
      await refreshLicenseData(result.message)
      setCancelNotes('')
    },
    onError: (error) => {
      setResultTone('error')
      setResultMessage(error instanceof Error ? error.message : 'No fue posible cancelar la licencia.')
    },
  })

  if (statusQuery.isLoading) {
    return <div className={panelClassName}>Cargando estado de licencia...</div>
  }

  if (statusQuery.error || !status) {
    return (
      <div className="rounded-2xl border border-rose-800 bg-slate-900 p-5 text-sm text-rose-300">
        {statusQuery.error instanceof Error ? statusQuery.error.message : 'No fue posible cargar la licencia.'}
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Licencia administrativa</h1>
          <p className="mt-1 text-sm text-slate-400">Panel oculto para activar o renovar la licencia local del producto.</p>
        </div>
      </div>

      <div className={panelClassName}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatusItem label="Estado" value={toStatusLabel(status.status)} />
          <StatusItem label="Plan" value={toPlanLabel(status.planType)} />
          <StatusItem label="Modo" value={status.activationMode === 'key' ? 'Por clave' : status.activationMode === 'manual' ? 'Manual' : 'Sin definir'} />
          <StatusItem label="Emitida para" value={status.issuedTo || 'Sin registro'} />
          <StatusItem label="Activada" value={status.activatedAt ? new Date(status.activatedAt).toLocaleString() : 'Sin registro'} />
          <StatusItem label="Vence" value={status.expiresAt ? new Date(status.expiresAt).toLocaleString() : 'Sin registro'} />
          <StatusItem label="Dias restantes" value={status.daysRemaining === null ? 'Sin registro' : String(status.daysRemaining)} />
        </div>
        <p className="mt-4 text-sm text-slate-300">{status.message}</p>
        {status.notes ? <p className="mt-2 text-sm text-slate-400">Notas: {status.notes}</p> : null}
        {resultMessage ? <p className={`mt-3 text-sm ${resultTone === 'success' ? 'text-cyan-300' : 'text-rose-400'}`}>{resultMessage}</p> : null}
      </div>

      <div className={panelClassName}>
        <h2 className="text-lg font-semibold text-white">Clave administrativa</h2>
        <p className="mt-1 text-sm text-slate-400">Antes de activar o renovar, valida la clave especial de este panel.</p>
        <form
          className="mt-4 flex flex-wrap gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            setAccessError(null)
            setResultMessage(null)
            unlockMutation.mutate()
          }}
        >
          <input
            className={`${inputClassName} min-w-[280px] flex-1`}
            placeholder="Clave administrativa"
            type="password"
            value={panelSecret}
            onChange={(event) => setPanelSecret(event.target.value)}
          />
          <button
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
            disabled={unlockMutation.isPending}
            type="submit"
          >
            {unlockMutation.isPending ? 'Validando...' : 'Desbloquear panel'}
          </button>
        </form>
        {accessUnlocked && accessExpiresAt ? (
          <p className="mt-3 text-sm text-emerald-300">Panel desbloqueado hasta {new Date(accessExpiresAt).toLocaleTimeString()}.</p>
        ) : null}
        {accessError ? <p className="mt-3 text-sm text-rose-400">{accessError}</p> : null}
      </div>

      <div className={panelClassName}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{isRenewal ? 'Renovacion de licencia' : 'Activacion de licencia'}</h2>
            <p className="mt-1 text-sm text-slate-400">Selecciona primero el tipo de operacion para mostrar solo el formulario necesario.</p>
          </div>
          <div className="flex gap-2">
            <button className={tabClassName(activeTab === 'key')} onClick={() => setActiveTab('key')} type="button">
              Por clave
            </button>
            <button className={tabClassName(activeTab === 'manual')} onClick={() => setActiveTab('manual')} type="button">
              Manual
            </button>
          </div>
        </div>

        {activeTab === 'key' ? (
          <form
            className="mt-4 space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              setResultMessage(null)
              activateByKeyMutation.mutate()
            }}
          >
            <div>
              <h3 className="text-base font-semibold text-white">{isRenewal ? 'Renovar por clave' : 'Activar por clave'}</h3>
              <p className="mt-1 text-sm text-slate-400">Registra la clave comercial y la vigencia contratada.</p>
            </div>
            <input
              className={`${inputClassName} w-full`}
              placeholder="Clave o serial"
              value={keyLicense}
              onChange={(event) => setKeyLicense(event.target.value)}
            />
            <select className={`${inputClassName} w-full`} value={keyPlanType} onChange={(event) => setKeyPlanType(event.target.value as LicensePlanType)}>
              <option value="monthly">Mensual</option>
              <option value="semiannual">Semestral</option>
              <option value="annual">Anual</option>
            </select>
            <input
              className={`${inputClassName} w-full`}
              placeholder="Emitida para"
              value={keyIssuedTo}
              onChange={(event) => setKeyIssuedTo(event.target.value)}
            />
            <textarea
              className={`${inputClassName} min-h-24 w-full`}
              placeholder="Notas"
              value={keyNotes}
              onChange={(event) => setKeyNotes(event.target.value)}
            />
            <button
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
              disabled={!accessUnlocked || activateByKeyMutation.isPending}
              type="submit"
            >
              {activateByKeyMutation.isPending ? 'Guardando...' : isRenewal ? 'Renovar licencia' : 'Activar licencia'}
            </button>
          </form>
        ) : (
          <form
            className="mt-4 space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              setResultMessage(null)
              activateManualMutation.mutate()
            }}
          >
            <div>
              <h3 className="text-base font-semibold text-white">{isRenewal ? 'Renovacion manual' : 'Activacion manual'}</h3>
              <p className="mt-1 text-sm text-slate-400">Usa esta via solo para soporte o ajustes controlados por administracion.</p>
            </div>
            <select className={`${inputClassName} w-full`} value={manualPlanType} onChange={(event) => setManualPlanType(event.target.value as LicensePlanType)}>
              <option value="monthly">Mensual</option>
              <option value="semiannual">Semestral</option>
              <option value="annual">Anual</option>
            </select>
            <input
              className={`${inputClassName} w-full`}
              placeholder="Emitida para"
              value={manualIssuedTo}
              onChange={(event) => setManualIssuedTo(event.target.value)}
            />
            <textarea
              className={`${inputClassName} min-h-24 w-full`}
              placeholder="Motivo o notas de soporte"
              value={manualNotes}
              onChange={(event) => setManualNotes(event.target.value)}
            />
            <button
              className="rounded-lg border border-amber-500 px-4 py-2 text-sm text-amber-200 disabled:opacity-50"
              disabled={!accessUnlocked || activateManualMutation.isPending}
              type="submit"
            >
              {activateManualMutation.isPending ? 'Guardando...' : isRenewal ? 'Renovar manualmente' : 'Activar manualmente'}
            </button>
          </form>
        )}
      </div>

      {status.id && status.status !== 'suspended' ? (
        <form
          className={`${panelClassName} space-y-4`}
          onSubmit={(event) => {
            event.preventDefault()
            setResultMessage(null)
            cancelMutation.mutate()
          }}
        >
          <div>
            <h2 className="text-lg font-semibold text-white">Cancelar licencia</h2>
            <p className="mt-1 text-sm text-slate-400">Marca la licencia actual como cancelada y bloquea las funciones administrativas sujetas a licencia.</p>
          </div>
          <textarea
            className={`${inputClassName} min-h-24 w-full`}
            placeholder="Motivo de cancelacion"
            value={cancelNotes}
            onChange={(event) => setCancelNotes(event.target.value)}
          />
          <button
            className="rounded-lg border border-rose-500 px-4 py-2 text-sm text-rose-200 disabled:opacity-50"
            disabled={!accessUnlocked || cancelMutation.isPending}
            type="submit"
          >
            {cancelMutation.isPending ? 'Cancelando...' : 'Cancelar licencia'}
          </button>
        </form>
      ) : null}

      {status.status === 'suspended' ? (
        <div className="rounded-2xl border border-amber-700 bg-slate-900 p-5 text-sm text-amber-200">
          La licencia actual ya fue cancelada. Puedes renovarla desde cualquiera de las pestañas superiores cuando el panel este desbloqueado.
        </div>
      ) : null}
    </section>
  )
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-slate-100">{value}</p>
    </div>
  )
}
