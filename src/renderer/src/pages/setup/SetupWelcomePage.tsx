import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

export function SetupWelcomePage() {
  const setupQuery = useQuery({
    queryKey: ['setup', 'status'],
    queryFn: () => window.api.setup.getStatus(),
  })

  const setupStatus = setupQuery.data

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-white">Instalacion inicial</h2>
        <p className="mt-2 text-sm text-slate-400">
          Este equipo todavia no completa el onboarding operativo. Antes de continuar, valide el acceso inicial y proteja la cuenta administrativa.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
        {setupStatus?.bootstrapFilePath ? (
          <>
            <p className="font-medium text-white">Ruta del acceso inicial</p>
            <p className="mt-2 break-all text-cyan-300">{setupStatus.bootstrapFilePath}</p>
            <p className="mt-3">
              Abra ese archivo local para obtener el usuario `admin`, la clave temporal y los codigos de recuperacion. Esa informacion deja de ser valida cuando se cambie la clave inicial.
            </p>
          </>
        ) : (
          <>
            <p className="font-medium text-white">Continuar instalacion</p>
            <p className="mt-2">
              El acceso bootstrap ya no esta pendiente. Inicie sesion con la cuenta administrativa actual para terminar la instalacion del sistema.
            </p>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
        <p className="font-medium text-white">Orden recomendado</p>
        <ol className="mt-2 space-y-2">
          <li>1. Ubique el archivo `initial-admin-access.json`.</li>
          <li>2. Inicie sesion con el usuario `admin`.</li>
          <li>3. Cambie la clave temporal desde el siguiente paso del wizard.</li>
          <li>4. Finalice la instalacion para desbloquear la operacion normal.</li>
        </ol>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950" to="/login">
          Ir al login
        </Link>
        <Link className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200" to="/recuperar">
          Recuperar contrasena
        </Link>
      </div>
    </section>
  )
}
