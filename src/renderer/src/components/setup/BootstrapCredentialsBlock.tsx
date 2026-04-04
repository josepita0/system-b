import { useState } from 'react'
import type { BootstrapDisplay } from '@shared/types/setup'

type Props = {
  display: BootstrapDisplay
  /** Copia de respaldo en disco; se muestra como detalle secundario. */
  filePath?: string | null
  variant?: 'wizard' | 'compact'
}

async function copyText(label: string, text: string, onDone: () => void) {
  try {
    await navigator.clipboard.writeText(text)
    onDone()
  } catch {
    window.alert(`No se pudo copiar ${label}. Seleccione y copie manualmente.`)
  }
}

export function BootstrapCredentialsBlock({ display, filePath, variant = 'wizard' }: Props) {
  const [copied, setCopied] = useState<string | null>(null)

  const bumpCopied = (key: string) => {
    setCopied(key)
    window.setTimeout(() => setCopied(null), 2000)
  }

  const boxClass =
    variant === 'wizard'
      ? 'rounded-2xl border border-cyan-900/60 bg-slate-950/80 p-4 text-sm text-slate-200'
      : 'rounded-2xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-200'

  return (
    <div className={boxClass}>
      <p className="font-semibold text-slate-900">Acceso inicial del administrador</p>
      <p className="mt-1 text-slate-400">
        Use estos datos solo en este equipo. La clave deja de mostrarse aqui cuando la cambie por primera vez.
      </p>

      <dl className="mt-4 space-y-3">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Usuario</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-2">
            <code className="rounded bg-slate-900 px-2 py-1 font-mono text-cyan-300">{display.username}</code>
            <button
              className="text-xs text-cyan-400 underline-offset-2 hover:underline"
              type="button"
              onClick={() => copyText('usuario', display.username, () => bumpCopied('user'))}
            >
              {copied === 'user' ? 'Copiado' : 'Copiar'}
            </button>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Contrasena temporal</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-2">
            <code className="rounded bg-slate-900 px-2 py-1 font-mono text-cyan-300">{display.temporaryPassword}</code>
            <button
              className="text-xs text-cyan-400 underline-offset-2 hover:underline"
              type="button"
              onClick={() => copyText('contrasena', display.temporaryPassword, () => bumpCopied('pw'))}
            >
              {copied === 'pw' ? 'Copiado' : 'Copiar'}
            </button>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Codigos de recuperacion</dt>
          <dd className="mt-2 grid gap-2">
            {display.recoveryCodes.map((code, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <code className="rounded bg-slate-900 px-2 py-1 font-mono text-slate-300">{code}</code>
                <button
                  className="text-xs text-cyan-400 underline-offset-2 hover:underline"
                  type="button"
                  onClick={() => copyText('codigo', code, () => bumpCopied(`rc-${index}`))}
                >
                  {copied === `rc-${index}` ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            ))}
          </dd>
        </div>
      </dl>

      {filePath ? (
        <p className="mt-4 border-t border-slate-800 pt-4 text-xs text-slate-500">
          Copia de respaldo en disco: <span className="break-all font-mono text-slate-400">{filePath}</span>
        </p>
      ) : null}
    </div>
  )
}
