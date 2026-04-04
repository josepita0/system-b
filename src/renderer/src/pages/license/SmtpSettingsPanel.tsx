import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Button } from '@renderer/components/ui/Button'
import { Card } from '@renderer/components/ui/Card'
import { Field } from '@renderer/components/ui/Field'
import { Input } from '@renderer/components/ui/Input'

export function SmtpSettingsPanel() {
  const queryClient = useQueryClient()
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('')
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpSecure, setSmtpSecure] = useState(false)
  const [smtpPassword, setSmtpPassword] = useState('')
  const [reportRecipientEmail, setReportRecipientEmail] = useState('')

  const smtpQuery = useQuery({
    queryKey: ['settings', 'smtp'],
    queryFn: () => window.api.settings.getSmtpSettings(),
  })

  useEffect(() => {
    const d = smtpQuery.data
    if (!d) {
      return
    }
    setSmtpHost(d.smtpHost ?? '')
    setSmtpPort(d.smtpPort != null ? String(d.smtpPort) : '')
    setSmtpUser(d.smtpUser ?? '')
    setSmtpSecure(d.smtpSecure)
    setSmtpPassword('')
    setReportRecipientEmail(d.reportRecipientEmail ?? '')
  }, [smtpQuery.data])

  const saveSmtpMutation = useMutation({
    mutationFn: () =>
      window.api.settings.updateSmtpSettings({
        smtpHost: smtpHost.trim() || null,
        smtpPort: smtpPort.trim() === '' ? null : Number(smtpPort),
        smtpUser: smtpUser.trim() || null,
        smtpSecure,
        reportRecipientEmail: reportRecipientEmail.trim() || null,
        smtpPassword: smtpPassword.trim() || undefined,
      }),
    onSuccess: async () => {
      setSmtpPassword('')
      await queryClient.invalidateQueries({ queryKey: ['settings', 'smtp'] })
      await queryClient.refetchQueries({ queryKey: ['settings', 'smtp'] })
    },
  })

  const testSmtpMutation = useMutation({
    mutationFn: () => window.api.settings.testSmtp(),
  })

  const smtpConfigured = smtpQuery.data?.passwordConfigured || smtpQuery.data?.passwordFromEnv
  const smtpSaveError = saveSmtpMutation.error instanceof Error ? saveSmtpMutation.error.message : null
  const smtpTestResult = testSmtpMutation.data

  if (smtpQuery.isError) {
    return (
      <Card className="border-rose-200 bg-rose-50 text-sm text-rose-800" padding="lg">
        {smtpQuery.error instanceof Error ? smtpQuery.error.message : 'No se pudo cargar la configuración SMTP. Debe iniciar sesión como administrador.'}
      </Card>
    )
  }

  return (
    <Card padding="lg">
      <h2 className="mb-2 text-lg font-semibold text-slate-900">Correo y SMTP</h2>
      <p className="mb-4 text-sm text-slate-500">
        Servidor de salida para los PDFs de cierre de turno. Indique el correo al que deben enviarse los reportes.
      </p>
      <p className="mb-4 text-sm text-slate-500">
        La contraseña no se muestra. Deje el campo vacío para conservar la almacenada. Prioridad: variable de entorno{' '}
        <code className="rounded border border-border bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">SYSTEM_BARRA_SMTP_PASSWORD</code>{' '}
        si existe.
      </p>

      {smtpQuery.data?.passwordFromEnv ? (
        <p className="mb-4 rounded-lg border border-brand/25 bg-brand-muted px-3 py-2 text-sm text-slate-800">
          Activa <strong className="font-semibold">SYSTEM_BARRA_SMTP_PASSWORD</strong>: el envío usará esa clave (no la de la base).
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          className="sm:col-span-2"
          hint="Recibe los adjuntos de cierre de turno (cola en Reportes)."
          label="Correo destino — reportes de cierre"
        >
          <Input
            autoComplete="email"
            onChange={(e) => setReportRecipientEmail(e.target.value)}
            placeholder="contador@ejemplo.com"
            type="email"
            value={reportRecipientEmail}
          />
        </Field>
        <Field label="Servidor SMTP">
          <Input autoComplete="off" onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.ejemplo.com" value={smtpHost} />
        </Field>
        <Field hint="587 con STARTTLS habitualmente; 465 para SSL." label="Puerto">
          <Input
            autoComplete="off"
            onChange={(e) => setSmtpPort(e.target.value)}
            placeholder="587"
            type="number"
            value={smtpPort}
          />
        </Field>
        <Field className="sm:col-span-2" label="Usuario / correo">
          <Input autoComplete="off" onChange={(e) => setSmtpUser(e.target.value)} type="text" value={smtpUser} />
        </Field>
        <Field
          className="sm:col-span-2"
          hint={smtpConfigured ? 'Hay contraseña guardada o por env.' : 'Sin contraseña en base todavía.'}
          label="Contraseña (solo si desea cambiarla)"
        >
          <Input
            autoComplete="new-password"
            onChange={(e) => setSmtpPassword(e.target.value)}
            placeholder="••••••••"
            type="password"
            value={smtpPassword}
          />
        </Field>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 sm:col-span-2">
          <input
            checked={smtpSecure}
            className="size-4 rounded border-slate-300 accent-brand"
            onChange={(e) => setSmtpSecure(e.target.checked)}
            type="checkbox"
          />
          Conexión segura (SSL/TLS directo, p. ej. puerto 465)
        </label>
      </div>

      {smtpSaveError ? <p className="mt-3 text-sm text-rose-700">{smtpSaveError}</p> : null}
      {saveSmtpMutation.isSuccess ? <p className="mt-3 text-sm font-medium text-emerald-800">Configuración guardada.</p> : null}

      {smtpTestResult ? (
        <p className={`mt-3 text-sm ${smtpTestResult.ok ? 'text-emerald-800' : 'text-rose-700'}`}>{smtpTestResult.message}</p>
      ) : null}
      {testSmtpMutation.isError ? (
        <p className="mt-2 text-sm text-rose-700">
          {(testSmtpMutation.error as Error)?.message ?? 'Error al probar SMTP.'}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <Button disabled={saveSmtpMutation.isPending || smtpQuery.isLoading} onClick={() => saveSmtpMutation.mutate()} variant="primary">
          {saveSmtpMutation.isPending ? 'Guardando...' : 'Guardar SMTP'}
        </Button>
        <Button disabled={testSmtpMutation.isPending} onClick={() => testSmtpMutation.mutate()} variant="secondary">
          {testSmtpMutation.isPending ? 'Probando...' : 'Probar conexión SMTP'}
        </Button>
      </div>
    </Card>
  )
}
