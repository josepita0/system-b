import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@renderer/components/ui/Button'
import { Card } from '@renderer/components/ui/Card'
import { cn } from '@renderer/lib/cn'
import type { LicensePlanType } from '@shared/types/license'
import { SmtpSettingsPanel } from './SmtpSettingsPanel'

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

const inputClassName =
  'w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/30'

export function LicenseAdminPage() {
  const queryClient = useQueryClient()
  const [sectionTab, setSectionTab] = useState<'license' | 'smtp'>('license')
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
    return (
      <section className="flex min-h-0 flex-1 flex-col gap-6">
        <Card className="shadow-sm" padding="lg">
          <p className="text-sm text-slate-600">Cargando estado de licencia...</p>
        </Card>
      </section>
    )
  }

  if (statusQuery.error || !status) {
    return (
      <section className="flex min-h-0 flex-1 flex-col gap-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          {statusQuery.error instanceof Error ? statusQuery.error.message : 'No fue posible cargar la licencia.'}
        </div>
      </section>
    )
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Licencia administrativa</h1>
          <p className="mt-1 text-sm text-slate-500">Panel oculto para activar o renovar la licencia local del producto.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="px-4 py-2"
            onClick={() => setSectionTab('license')}
            type="button"
            variant={sectionTab === 'license' ? 'primary' : 'secondary'}
          >
            Licencia
          </Button>
          <Button
            className="px-4 py-2"
            onClick={() => setSectionTab('smtp')}
            type="button"
            variant={sectionTab === 'smtp' ? 'primary' : 'secondary'}
          >
            Correo (SMTP)
          </Button>
        </div>
      </div>

      <div className={sectionTab === 'smtp' ? 'flex min-w-0 flex-col gap-6' : 'hidden'}>
        <SmtpSettingsPanel />
      </div>

      <div className={cn('min-w-0 flex-col gap-6', sectionTab === 'license' ? 'flex' : 'hidden')}>
      <Card className="overflow-hidden border-2 border-slate-200/90 text-slate-900 shadow-md" padding="lg">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatusItem label="Estado" value={toStatusLabel(status.status)} />
          <StatusItem label="Plan" value={toPlanLabel(status.planType)} />
          <StatusItem label="Modo" value={status.activationMode === 'key' ? 'Por clave' : status.activationMode === 'manual' ? 'Manual' : 'Sin definir'} />
          <StatusItem label="Emitida para" value={status.issuedTo || 'Sin registro'} />
          <StatusItem label="Activada" value={status.activatedAt ? new Date(status.activatedAt).toLocaleString() : 'Sin registro'} />
          <StatusItem label="Vence" value={status.expiresAt ? new Date(status.expiresAt).toLocaleString() : 'Sin registro'} />
          <StatusItem label="Dias restantes" value={status.daysRemaining === null ? 'Sin registro' : String(status.daysRemaining)} />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">{status.message}</p>
        {status.notes ? <p className="mt-2 text-sm text-slate-500">Notas: {status.notes}</p> : null}
        {resultMessage ? (
          <p className={cn('mt-3 text-sm', resultTone === 'success' ? 'text-emerald-700' : 'text-rose-700')}>{resultMessage}</p>
        ) : null}
      </Card>

      <Card className="shadow-sm" padding="lg">
        <h2 className="text-lg font-semibold text-slate-900">Clave administrativa</h2>
        <p className="mt-1 text-sm text-slate-500">
          Antes de activar o renovar, ingresa el codigo temporal generado en Usuarios (Acciones en tu propia fila como administrador) o la
          clave fija definida en el entorno del sistema si aplica.
        </p>
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
          <Button disabled={unlockMutation.isPending} type="submit" variant="primary">
            {unlockMutation.isPending ? 'Validando...' : 'Desbloquear panel'}
          </Button>
        </form>
        {accessUnlocked && accessExpiresAt ? (
          <p className="mt-3 text-sm font-medium text-emerald-800">Panel desbloqueado hasta {new Date(accessExpiresAt).toLocaleTimeString()}.</p>
        ) : null}
        {accessError ? <p className="mt-3 text-sm text-rose-700">{accessError}</p> : null}
      </Card>

      <Card className="shadow-sm" padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{isRenewal ? 'Renovacion de licencia' : 'Activacion de licencia'}</h2>
            <p className="mt-1 text-sm text-slate-500">Selecciona primero el tipo de operacion para mostrar solo el formulario necesario.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setActiveTab('key')} type="button" variant={activeTab === 'key' ? 'primary' : 'secondary'}>
              Por clave
            </Button>
            <Button onClick={() => setActiveTab('manual')} type="button" variant={activeTab === 'manual' ? 'primary' : 'secondary'}>
              Manual
            </Button>
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
              <h3 className="text-base font-semibold text-slate-900">{isRenewal ? 'Renovar por clave' : 'Activar por clave'}</h3>
              <p className="mt-1 text-sm text-slate-500">Registra la clave comercial y la vigencia contratada.</p>
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
            <Button disabled={!accessUnlocked || activateByKeyMutation.isPending} type="submit" variant="primary">
              {activateByKeyMutation.isPending ? 'Guardando...' : isRenewal ? 'Renovar licencia' : 'Activar licencia'}
            </Button>
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
              <h3 className="text-base font-semibold text-slate-900">{isRenewal ? 'Renovacion manual' : 'Activacion manual'}</h3>
              <p className="mt-1 text-sm text-slate-500">Usa esta via solo para soporte o ajustes controlados por administracion.</p>
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
            <Button disabled={!accessUnlocked || activateManualMutation.isPending} type="submit" variant="warning">
              {activateManualMutation.isPending ? 'Guardando...' : isRenewal ? 'Renovar manualmente' : 'Activar manualmente'}
            </Button>
          </form>
        )}
      </Card>

      {status.id && status.status !== 'suspended' ? (
        <Card className="shadow-sm" padding="lg">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              setResultMessage(null)
              cancelMutation.mutate()
            }}
          >
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Cancelar licencia</h2>
              <p className="mt-1 text-sm text-slate-500">Marca la licencia actual como cancelada y bloquea las funciones administrativas sujetas a licencia.</p>
            </div>
            <textarea
              className={`${inputClassName} min-h-24`}
              placeholder="Motivo de cancelacion"
              value={cancelNotes}
              onChange={(event) => setCancelNotes(event.target.value)}
            />
            <Button disabled={!accessUnlocked || cancelMutation.isPending} type="submit" variant="danger">
              {cancelMutation.isPending ? 'Cancelando...' : 'Cancelar licencia'}
            </Button>
          </form>
        </Card>
      ) : null}

      {status.status === 'suspended' ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
          La licencia actual ya fue cancelada. Puedes renovarla desde cualquiera de las pestañas superiores cuando el panel este desbloqueado.
        </div>
      ) : null}
      </div>
    </section>
  )
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-[4.25rem] rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold leading-snug text-slate-900">{value}</p>
    </div>
  )
}
