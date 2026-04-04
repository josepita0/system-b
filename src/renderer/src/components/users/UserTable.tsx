import type { User } from '@shared/types/user'
import { tableTheadClass } from '@renderer/lib/tableStyles'
import { UserActionsMenu } from './UserActionsMenu'
import { UserRoleBadge } from './UserRoleBadge'
import { formatUserStatus } from './userLabels'

interface UserTableProps {
  users: User[]
  onEdit: (userId: number) => void
  onView: (userId: number) => void
  /** Solo administrador, solo en la fila del propio usuario administrador. */
  currentUserId?: number | null
  currentUserRole?: User['role'] | null
  onGenerateLicensePanelCode?: (userId: number) => void
}

export function UserTable({ users, onEdit, onView, currentUserId, currentUserRole, onGenerateLicensePanelCode }: UserTableProps) {
  return (
    <div className="w-full min-w-0 overflow-x-auto rounded-xl border-2 border-slate-200 bg-white shadow-inner">
      <table className="min-w-full text-left text-sm text-slate-800">
        <thead className={tableTheadClass}>
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
          {users.map((user, index) => (
            <tr
              className={`border-t border-slate-200 ${
                index % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/80 hover:bg-slate-100/80'
              }`}
              key={user.id}
            >
              <td className="px-4 py-3 font-medium text-slate-900">
                {user.firstName} {user.lastName}
              </td>
              <td className="px-4 py-3 text-slate-700">{user.documentId || 'Sin documento'}</td>
              <td className="px-4 py-3 text-slate-700">{user.email || 'Sin correo'}</td>
              <td className="px-4 py-3 tabular-nums text-slate-800">{user.username || 'Sin usuario'}</td>
              <td className="px-4 py-3">
                <UserRoleBadge role={user.role} />
              </td>
              <td className="px-4 py-3">
                <span
                  className={
                    user.isActive
                      ? 'inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800'
                      : 'inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600'
                  }
                >
                  {formatUserStatus(user.isActive)}
                </span>
              </td>
              <td className="px-4 py-3">
                <UserActionsMenu
                  onEdit={() => onEdit(user.id)}
                  onGenerateLicensePanelCode={
                    onGenerateLicensePanelCode &&
                    currentUserRole === 'admin' &&
                    currentUserId === user.id &&
                    user.role === 'admin'
                      ? () => onGenerateLicensePanelCode(user.id)
                      : undefined
                  }
                  onView={() => onView(user.id)}
                />
              </td>
            </tr>
          ))}
          {users.length === 0 ? (
            <tr>
              <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>
                No hay usuarios registrados.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
