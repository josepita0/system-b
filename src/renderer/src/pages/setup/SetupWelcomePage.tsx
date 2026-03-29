import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BootstrapCredentialsBlock } from '@renderer/components/setup/BootstrapCredentialsBlock'

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

      {setupStatus?.bootstrapDisplay ? (
        <BootstrapCredentialsBlock display={setupStatus.bootstrapDisplay} filePath={setupStatus.bootstrapFilePath} />
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
          <p className="font-medium text-white">Continuar instalacion</p>
          <p className="mt-2">
            El acceso bootstrap ya no esta pendiente. Inicie sesion con la cuenta administrativa actual para terminar la instalacion del sistema.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
        <p className="font-medium text-white">Orden recomendado</p>
        <ol className="mt-2 space-y-2">
          <li>1. Inicie sesion con el usuario y la contrasena temporal indicados arriba.</li>
          <li>2. Cambie la contrasena temporal cuando el sistema se lo solicite.</li>
          <li>3. Finalice la instalacion en el ultimo paso del wizard para desbloquear la operacion normal.</li>
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
