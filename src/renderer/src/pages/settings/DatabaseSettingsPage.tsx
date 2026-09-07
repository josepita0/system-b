import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '@renderer/components/ui/Card'
import { Button } from '@renderer/components/ui/Button'
import { Modal } from '@renderer/components/ui/Modal'
import type { BackupInfo } from '@shared/types/backup'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function DatabaseSettingsPage() {
  const queryClient = useQueryClient()
  const [confirmRestore, setConfirmRestore] = useState<BackupInfo | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<BackupInfo | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const backupsQuery = useQuery({
    queryKey: ['backup', 'list'],
    queryFn: () => window.api.backup.list(),
  })

  const createMutation = useMutation({
    mutationFn: () => window.api.backup.create(),
    onSuccess: async () => {
      setFeedback({ type: 'success', message: 'Backup creado correctamente.' })
      await queryClient.invalidateQueries({ queryKey: ['backup', 'list'] })
    },
    onError: (e) => {
      setFeedback({ type: 'error', message: e instanceof Error ? e.message : 'No se pudo crear el backup.' })
    },
  })

  const restoreMutation = useMutation({
    mutationFn: (backupId: string) => window.api.backup.restore(backupId),
    onSuccess: () => {
      setConfirmRestore(null)
      setFeedback({
        type: 'success',
        message: 'Restauración programada. Reinicie la aplicación para completar el proceso.',
      })
    },
    onError: (e) => {
      setConfirmRestore(null)
      setFeedback({ type: 'error', message: e instanceof Error ? e.message : 'No se pudo programar la restauración.' })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (backupId: string) => window.api.backup.remove(backupId),
    onSuccess: async () => {
      setConfirmDelete(null)
      setFeedback({ type: 'success', message: 'Backup eliminado.' })
      await queryClient.invalidateQueries({ queryKey: ['backup', 'list'] })
    },
    onError: (e) => {
      setConfirmDelete(null)
      setFeedback({ type: 'error', message: e instanceof Error ? e.message : 'No se pudo eliminar el backup.' })
    },
  })

  const exportMutation = useMutation({
    mutationFn: (backupId: string) => window.api.backup.export(backupId),
    onSuccess: (result) => {
      if (result.exported) {
        setFeedback({ type: 'success', message: `Backup exportado correctamente en ${result.path}` })
      }
    },
    onError: (e) => {
      setFeedback({ type: 'error', message: e instanceof Error ? e.message : 'No se pudo exportar el backup.' })
    },
  })

  const importMutation = useMutation({
    mutationFn: () => window.api.backup.import(),
    onSuccess: async (result) => {
      if (result.imported && result.backup) {
        setFeedback({ type: 'success', message: `Backup "${result.backup.filename}" importado correctamente.` })
        await queryClient.invalidateQueries({ queryKey: ['backup', 'list'] })
      }
    },
    onError: (e) => {
      setFeedback({ type: 'error', message: e instanceof Error ? e.message : 'No se pudo importar el backup.' })
    },
  })

  const backups = backupsQuery.data?.backups ?? []
  const totalSize = backupsQuery.data?.totalSizeBytes ?? 0

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Base de datos</h1>
        <p className="text-sm text-slate-500">Gestionar backups de la base de datos del sistema.</p>
      </div>

      {/* Feedback */}
      {feedback ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {/* Crear backup */}
      <Card padding="lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Crear backup</h2>
            <p className="mt-1 text-sm text-slate-500">
              Genera una copia completa de la base de datos actual.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              disabled={importMutation.isPending}
              onClick={() => {
                setFeedback(null)
                importMutation.mutate()
              }}
              variant="secondary"
            >
              {importMutation.isPending ? 'Importando...' : 'Importar backup'}
            </Button>
            <Button
              disabled={createMutation.isPending}
              onClick={() => {
                setFeedback(null)
                createMutation.mutate()
              }}
              variant="primary"
            >
              {createMutation.isPending ? 'Creando...' : 'Crear backup ahora'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Lista de backups */}
      <Card padding="lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Backups existentes</h2>
          {totalSize > 0 ? (
            <span className="text-xs text-slate-500">Total: {formatBytes(totalSize)}</span>
          ) : null}
        </div>

        {backupsQuery.isLoading ? (
          <p className="text-sm text-slate-500">Cargando backups...</p>
        ) : backupsQuery.isError ? (
          <p className="text-sm text-rose-700">
            {(backupsQuery.error as Error)?.message ?? 'No se pudieron cargar los backups.'}
          </p>
        ) : backups.length === 0 ? (
          <p className="text-sm text-slate-500">No hay backups creados aún.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-medium text-slate-500">
                  <th className="pb-2 pr-4">Fecha</th>
                  <th className="pb-2 pr-4">Archivo</th>
                  <th className="pb-2 pr-4 text-right">Tamaño</th>
                  <th className="pb-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup) => (
                  <tr key={backup.id} className="border-b border-border/50 last:border-0">
                    <td className="py-3 pr-4 text-slate-700">{formatDate(backup.createdAt)}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-slate-500">{backup.filename}</td>
                    <td className="py-3 pr-4 text-right text-slate-600">{formatBytes(backup.sizeBytes)}</td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          className="px-3 py-1 text-xs"
                          disabled={exportMutation.isPending}
                          onClick={() => {
                            setFeedback(null)
                            exportMutation.mutate(backup.id)
                          }}
                          variant="secondary"
                        >
                          Exportar
                        </Button>
                        <Button
                          className="px-3 py-1 text-xs"
                          disabled={restoreMutation.isPending}
                          onClick={() => {
                            setFeedback(null)
                            setConfirmRestore(backup)
                          }}
                          variant="secondary"
                        >
                          Restaurar
                        </Button>
                        <Button
                          className="px-3 py-1 text-xs"
                          disabled={removeMutation.isPending}
                          onClick={() => {
                            setFeedback(null)
                            setConfirmDelete(backup)
                          }}
                          variant="danger"
                        >
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal confirmar restaurar */}
      <Modal
        onClose={() => setConfirmRestore(null)}
        open={confirmRestore !== null}
        title="Restaurar backup"
        footer={
          <>
            <Button onClick={() => setConfirmRestore(null)} variant="secondary">
              Cancelar
            </Button>
            <Button
              disabled={restoreMutation.isPending}
              onClick={() => confirmRestore && restoreMutation.mutate(confirmRestore.id)}
              variant="warning"
            >
              {restoreMutation.isPending ? 'Programando...' : 'Programar restauración'}
            </Button>
          </>
        }
      >
        <p className="text-sm">
          ¿Está seguro de que desea restaurar el backup{' '}
          <strong>{confirmRestore?.filename}</strong>?
        </p>
        <p className="mt-2 text-sm text-amber-700">
          La restauración se completará al reiniciar la aplicación. Asegúrese de que no haya
          ventas en curso ni turnos abiertos antes de reiniciar.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Cualquier operación no guardada se perderá.
        </p>
      </Modal>

      {/* Modal confirmar eliminar */}
      <Modal
        onClose={() => setConfirmDelete(null)}
        open={confirmDelete !== null}
        title="Eliminar backup"
        footer={
          <>
            <Button onClick={() => setConfirmDelete(null)} variant="secondary">
              Cancelar
            </Button>
            <Button
              disabled={removeMutation.isPending}
              onClick={() => confirmDelete && removeMutation.mutate(confirmDelete.id)}
              variant="danger"
            >
              {removeMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </>
        }
      >
        <p className="text-sm">
          ¿Está seguro de que desea eliminar el backup{' '}
          <strong>{confirmDelete?.filename}</strong>?
        </p>
        <p className="mt-2 text-sm text-slate-500">Esta acción no se puede deshacer.</p>
      </Modal>
    </section>
  )
}
