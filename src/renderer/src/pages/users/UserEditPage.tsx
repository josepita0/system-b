import { Navigate, useParams } from 'react-router-dom'

/** La edicion vive en el modal del listado; se puede enlazar con estado `editUserId`. */
export function UserEditPage() {
  const { id } = useParams()
  const n = Number(id)
  const ok = Number.isInteger(n) && n > 0
  return <Navigate replace state={ok ? { editUserId: n } : {}} to="/usuarios" />
}
