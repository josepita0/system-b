import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const documentTypes = [
  'DNI-NIE',
  'Certificado de manipulacion de alimentos',
  'Numero de seguridad social',
  'Permiso de trabajo',
] as const

export function UserDocumentsPage() {
  const queryClient = useQueryClient()
  const documentsQuery = useQuery({
    queryKey: ['documents', 'mine'],
    queryFn: () => window.api.documents.myDocuments(),
  })

  const uploadMutation = useMutation({
    mutationFn: (documentType: string) => window.api.documents.uploadForCurrentUser(documentType),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['documents', 'mine'] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (documentId: number) => window.api.documents.remove(documentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['documents', 'mine'] })
    },
  })

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">Mi documentacion</h1>
      <div className="flex flex-wrap gap-3">
        {documentTypes.map((documentType) => (
          <button
            className="rounded-lg bg-cyan-500 px-4 py-2 text-slate-950"
            key={documentType}
            onClick={() => uploadMutation.mutate(documentType)}
            type="button"
          >
            Cargar {documentType}
          </button>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <ul className="space-y-2 text-sm text-slate-200">
          {(documentsQuery.data ?? []).map((document) => (
            <li className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2" key={document.id}>
              <span>
                {document.documentType} | {document.originalName}
              </span>
              <button className="rounded-md bg-rose-700 px-3 py-1 text-white" onClick={() => removeMutation.mutate(document.id)} type="button">
                Eliminar
              </button>
            </li>
          ))}
          {(documentsQuery.data ?? []).length === 0 ? <li className="text-slate-500">No hay documentos cargados.</li> : null}
        </ul>
      </div>
    </section>
  )
}
