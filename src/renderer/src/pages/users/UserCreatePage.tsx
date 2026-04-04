import { Navigate } from 'react-router-dom'

/** La creacion de usuarios vive en el modal del listado (`/usuarios`). */
export function UserCreatePage() {
  return <Navigate replace to="/usuarios" />
}
