import { Link } from 'react-router-dom'

export function DemoFallback() {
  return <section aria-labelledby="demo-fallback-title" className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 rounded-3xl border border-border bg-surface-card p-8 text-center shadow-sm">
    <h1 className="text-2xl font-semibold text-slate-900" id="demo-fallback-title">Disponible en la versión completa</h1>
    <p className="text-sm leading-6 text-slate-600">Esta sección se habilita en la instalación completa de System Barra. Explora el POS para conocer el flujo de ventas.</p>
    <Link className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover" to="/ventas">Volver al POS</Link>
    <a className="text-sm text-brand hover:underline" href="mailto:demo@systembarra.app">¿Querés más información? Contactanos.</a>
  </section>
}
