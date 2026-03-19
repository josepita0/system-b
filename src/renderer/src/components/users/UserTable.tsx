import type { User } from '@shared/types/user'
import { UserActionsMenu } from './UserActionsMenu'
import { formatUserRole, formatUserStatus } from './userLabels'

interface UserTableProps {
  users: User[]
  onEdit: (userId: number) => void
  onView: (userId: number) => void
}

export function UserTable({ users, onEdit, onView }: UserTableProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-200">
          <thead className="bg-slate-800/70 text-slate-300">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr className="border-t border-slate-800" key={user.id}>
                <td className="px-4 py-3">{user.firstName} {user.lastName}</td>
                <td className="px-4 py-3">{user.documentId || 'Sin documento'}</td>
                <td className="px-4 py-3">{user.email || 'Sin correo'}</td>
                <td className="px-4 py-3">{user.username || 'Sin usuario'}</td>
                <td className="px-4 py-3">{formatUserRole(user.role)}</td>
                <td className="px-4 py-3">{formatUserStatus(user.isActive)}</td>
                <td className="px-4 py-3">
                  <UserActionsMenu onEdit={() => onEdit(user.id)} onView={() => onView(user.id)} />
                </td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-400" colSpan={7}>
                  No hay usuarios registrados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
