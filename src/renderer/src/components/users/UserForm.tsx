import { useEffect, useState } from 'react'
import type { User, UserRole } from '@shared/types/user'

export interface UserFormValues {
  firstName: string
  lastName: string
  documentId: string
  email: string
  username: string
  role: UserRole
  isActive: boolean
}

interface UserFormProps {
  availableRoles: UserRole[]
  mode: 'create' | 'edit'
  onCancel?: () => void
  onSubmit: (payload: UserFormValues) => Promise<void>
  submitLabel: string
  title: string
  user?: User | null
}

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  manager: 'Encargada',
  employee: 'Empleado',
}

const initialState: UserFormValues = {
  firstName: '',
  lastName: '',
  documentId: '',
  email: '',
  username: '',
  role: 'employee',
  isActive: true,
}

export function UserForm({ availableRoles, mode, onCancel, onSubmit, submitLabel, title, user }: UserFormProps) {
  const [form, setForm] = useState<UserFormValues>(initialState)

  useEffect(() => {
    if (!user) {
      setForm(initialState)
      return
    }

    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      documentId: user.documentId ?? '',
      email: user.email ?? '',
      username: user.username ?? '',
      role: user.role,
      isActive: Boolean(user.isActive),
    })
  }, [user])

  return (
    <form
      className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5"
      onSubmit={async (event) => {
        event.preventDefault()
        await onSubmit(form)
      }}
    >
      <div>
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        <p className="mt-1 text-sm text-slate-400">
          {mode === 'create' ? 'Completa los datos para registrar un nuevo usuario.' : 'Actualiza los datos principales del usuario.'}
        </p>
      </div>
      <input
        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        placeholder="Nombre"
        required
        value={form.firstName}
        onChange={(event) => setForm((state) => ({ ...state, firstName: event.target.value }))}
      />
      <input
        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        placeholder="Apellido"
        required
        value={form.lastName}
        onChange={(event) => setForm((state) => ({ ...state, lastName: event.target.value }))}
      />
      <input
        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        placeholder="Documento"
        value={form.documentId}
        onChange={(event) => setForm((state) => ({ ...state, documentId: event.target.value }))}
      />
      <input
        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        placeholder="Correo"
        type="email"
        value={form.email}
        onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))}
      />
      <input
        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        placeholder="Usuario"
        required
        value={form.username}
        onChange={(event) => setForm((state) => ({ ...state, username: event.target.value }))}
      />
      <select
        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        value={form.role}
        onChange={(event) => setForm((state) => ({ ...state, role: event.target.value as UserRole }))}
      >
        {availableRoles.map((role) => (
          <option key={role} value={role}>
            {roleLabels[role]}
          </option>
        ))}
      </select>
      {mode === 'edit' ? (
        <label className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
          <input
            checked={form.isActive}
            onChange={(event) => setForm((state) => ({ ...state, isActive: event.target.checked }))}
            type="checkbox"
          />
          Usuario activo
        </label>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950" type="submit">
          {submitLabel}
        </button>
        {onCancel ? (
          <button
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200"
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  )
}
