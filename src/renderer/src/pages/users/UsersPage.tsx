import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UserRole } from '@shared/types/user'

const initialForm = {
  firstName: '',
  lastName: '',
  documentId: '',
  email: '',
  username: '',
  role: 'employee' as UserRole,
}

export function UsersPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(initialForm)
  const [generatedCredentials, setGeneratedCredentials] = useState<null | {
    temporaryPassword: string
    recoveryCodes: string[]
  }>(null)

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => window.api.users.list(),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      window.api.users.create({
        firstName: form.firstName,
        lastName: form.lastName,
        documentId: form.documentId || null,
        email: form.email || null,
        username: form.username,
        role: form.role,
      }),
    onSuccess: async (result) => {
      setGeneratedCredentials({
        temporaryPassword: result.temporaryPassword,
        recoveryCodes: result.recoveryCodes,
      })
      setForm(initialForm)
      await queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  return (
    <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form
        className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5"
        onSubmit={(event) => {
          event.preventDefault()
          createMutation.mutate()
        }}
      >
        <h1 className="text-xl font-semibold text-white">Usuarios</h1>
        <input className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" placeholder="Nombre" value={form.firstName} onChange={(event) => setForm((state) => ({ ...state, firstName: event.target.value }))} />
        <input className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" placeholder="Apellido" value={form.lastName} onChange={(event) => setForm((state) => ({ ...state, lastName: event.target.value }))} />
        <input className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" placeholder="Documento" value={form.documentId} onChange={(event) => setForm((state) => ({ ...state, documentId: event.target.value }))} />
        <input className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" placeholder="Correo" value={form.email} onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))} />
        <input className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" placeholder="Usuario" value={form.username} onChange={(event) => setForm((state) => ({ ...state, username: event.target.value }))} />
        <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" value={form.role} onChange={(event) => setForm((state) => ({ ...state, role: event.target.value as UserRole }))}>
          <option value="employee">Empleado</option>
          <option value="manager">Encargada</option>
          <option value="admin">Administrador</option>
        </select>
        <button className="rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-950" type="submit">
          Crear usuario
        </button>
        {generatedCredentials ? (
          <div className="rounded-xl border border-cyan-700/50 bg-slate-950 p-3 text-sm text-slate-200">
            <p>Contrasena temporal: {generatedCredentials.temporaryPassword}</p>
            <p className="mt-2">Codigos de recuperacion:</p>
            <ul className="mt-2 space-y-1">
              {generatedCredentials.recoveryCodes.map((code) => (
                <li key={code}>{code}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </form>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Usuarios registrados</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          {(usersQuery.data ?? []).map((user) => (
            <li className="rounded-lg border border-slate-800 px-3 py-2" key={user.id}>
              {user.firstName} {user.lastName} | {user.role} | {user.username}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
