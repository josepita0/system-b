import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { queryClient } from './lib/queryClient'
import './styles.css'

/**
 * En desarrollo el renderer vive en http://127.0.0.1:5173/ y BrowserRouter funciona.
 * En la app empaquetada la URL es file://.../index.html; el pathname es la ruta del archivo,
 * no "/login", así que ninguna <Route> coincide y la UI queda en blanco. HashRouter evita eso.
 */
const Router = import.meta.env.PROD ? HashRouter : BrowserRouter

async function bootstrap() {
  if (import.meta.env.VITE_DEMO === 'true' && !window.api) {
    const { installDemoApi } = await import('./demo/installDemoApi')
    installDemoApi()
  }
  const { default: App } = await import('./App')
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode><QueryClientProvider client={queryClient}><Router><App /></Router></QueryClientProvider></React.StrictMode>,
  )
}
void bootstrap().catch((error: unknown) => {
  console.error('Renderer bootstrap failed', error)
})
