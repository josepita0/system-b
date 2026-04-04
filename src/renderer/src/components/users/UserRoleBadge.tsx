import type { User } from '@shared/types/user'
import { formatUserRole } from './userLabels'

/** Badge con el rol traducido (azul de botones primarios). */
export function UserRoleBadge({ role }: { role: User['role'] }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-brand-fg">
      {formatUserRole(role)}
    </span>
  )
}
