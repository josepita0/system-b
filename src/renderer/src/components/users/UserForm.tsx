import { useEffect, useState } from 'react'
import type { User, UserRole } from '@shared/types/user'
import { Button } from '@renderer/components/ui/Button'
import { cn } from '@renderer/lib/cn'

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
  /** Sin titulo ni borde exterior (uso dentro de Modal). */
  embedded?: boolean
  pending?: boolean
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

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'

export function UserForm({
  availableRoles,
  mode,
  embedded = false,
  pending = false,
  onCancel,
  onSubmit,
  submitLabel,
  title,
  user,
}: UserFormProps) {
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
      className={cn('grid gap-3', !embedded && 'rounded-2xl border border-border bg-surface-card p-5 shadow-sm')}
      onSubmit={async (event) => {
        event.preventDefault()
        await onSubmit(form)
      }}
    >
      {!embedded ? (
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === 'create' ? 'Completa los datos para registrar un nuevo usuario.' : 'Actualiza los datos principales del usuario.'}
          </p>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          {mode === 'create' ? 'Completa los datos para registrar un nuevo usuario.' : 'Actualiza los datos principales del usuario.'}
        </p>
      )}

      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Nombre
        <input
          className={fieldClass}
          placeholder="Nombre"
          required
          value={form.firstName}
          onChange={(event) => setForm((state) => ({ ...state, firstName: event.target.value }))}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Apellido
        <input
          className={fieldClass}
          placeholder="Apellido"
          required
          value={form.lastName}
          onChange={(event) => setForm((state) => ({ ...state, lastName: event.target.value }))}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Documento
        <input
          className={fieldClass}
          placeholder="Documento"
          value={form.documentId}
          onChange={(event) => setForm((state) => ({ ...state, documentId: event.target.value }))}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Correo
        <input
          className={fieldClass}
          placeholder="Correo"
          type="email"
          value={form.email}
          onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Usuario
        <input
          className={fieldClass}
          placeholder="Usuario"
          required
          value={form.username}
          onChange={(event) => setForm((state) => ({ ...state, username: event.target.value }))}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Rol
        <select
          className={fieldClass}
          value={form.role}
          onChange={(event) => setForm((state) => ({ ...state, role: event.target.value as UserRole }))}
        >
          {availableRoles.map((role) => (
            <option key={role} value={role}>
              {roleLabels[role]}
            </option>
          ))}
        </select>
      </label>
      {mode === 'edit' ? (
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-slate-50 px-3 py-2.5 text-sm text-slate-800">
          <input
            className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30"
            checked={form.isActive}
            onChange={(event) => setForm((state) => ({ ...state, isActive: event.target.checked }))}
            type="checkbox"
          />
          Usuario activo
        </label>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-2 border-t border-border pt-4">
        <Button disabled={pending} type="submit" variant="primary">
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button onClick={onCancel} type="button" variant="secondary">
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  )
}
