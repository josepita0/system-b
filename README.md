# System Barra

> Sistema local de gestión de barra para salones de juegos. Offline-first, rápido y confiable.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Electron](https://img.shields.io/badge/Electron-41-47848f?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Node](https://img.shields.io/badge/Node-22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Changelog](https://img.shields.io/badge/Changelog-Keep%20a%20Changelog-orange)](CHANGELOG.md)

## Sobre el proyecto

System Barra es una aplicación de escritorio diseñada para la gestión integral de la barra en salones de juegos. Opera completamente offline, con sincronización local y generación de reportes.

### Características principales

- **Punto de Venta (POS)** — Interfaz rápida para registro de ventas con catálogo por categorías
- **Gestión de Inventario** — Control de stock en tiempo real con alertas de mínimo
- **Productos Compuestos** — Soporte para recetas y productos con múltiples formatos de venta
- **Control de Turnos** — Apertura/cierre de caja con arqueo y conciliación
- **Reportes PDF** — Generación local de reportes administrativos
- **Autenticación Local** — Sistema de roles, sesiones y recuperación de credenciales
- **Gestión de Usuarios** — CRUD completo con documentación y permisos RBAC

### Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Desktop | Electron 41 |
| Frontend | React 19 + Vite 8 + Tailwind CSS v4 |
| Backend | Node.js 22 (Main Process) |
| Base de datos | SQLite (better-sqlite3) |
| Estado | Zustand + TanStack Query |
| Validación | Zod |
| Testing | Vitest + Playwright |

### Arquitectura

```
┌─────────────────────────────────────────┐
│         Renderer (React + Vite)         │
│    UI Components • Pages • Store        │
└─────────────────┬───────────────────────┘
                  │ IPC (contextBridge)
┌─────────────────▼───────────────────────┐
│         Main Process (Node.js)          │
│   IPC Handlers • Services • Repos       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         SQLite (better-sqlite3)         │
│      Local Database • Migrations        │
└─────────────────────────────────────────┘
```

## Requisitos

- **Node.js** 22.x (ver `.nvmrc`)
- **Windows** 10/11 (plataforma objetivo)
- **npm** 10+

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/josepita0/system-barra.git
cd system-barra

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev
```

El comando `dev` ejecuta:
- Rebuild de `better-sqlite3` para Electron
- Vite dev server para el renderer
- Compilación en watch del main process
- Apertura automática de la ventana Electron

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el entorno de desarrollo completo |
| `npm run build` | Genera ejecutable portable en `dist/` |
| `npm run build:installer` | Genera instalador NSIS |
| `npm run test` | Ejecuta la suite de tests con Vitest |
| `npm run typecheck` | Verifica tipos TypeScript |
| `npm run test:watch` | Tests en modo watch |

## Estructura del proyecto

```
system-barra/
├── src/
│   ├── main/           # Main process (Node.js)
│   │   ├── database/   # SQLite, migraciones, repositorios
│   │   ├── ipc/        # Handlers IPC
│   │   ├── services/   # Lógica de negocio
│   │   ├── security/   # Autenticación, sesiones
│   │   └── windows/    # Gestión de ventanas
│   ├── preload/        # Scripts de preload (contextBridge)
│   ├── renderer/       # Frontend React
│   │   ├── src/
│   │   │   ├── components/  # Componentes UI
│   │   │   ├── pages/       # Páginas de la app
│   │   │   └── store/       # Estado global (Zustand)
│   └── shared/         # Tipos y schemas compartidos
├── tests/              # Tests unitarios e integración
├── docs/               # Documentación técnica
└── landing/            # Landing page (Astro)
```

## Documentación

La documentación técnica completa está en [`docs/`](docs/README.md):

- [Decisiones técnicas](docs/decisions/)
- [Setup y configuración](docs/setup/)
- [Implementación y avances](docs/implementation/)

## Contribuir

Las contribuciones son bienvenidas. Por favor, lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de enviar un PR.

## Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

## Roadmap

- [ ] Hardening de seguridad (ver [SECURITY.md](.github/SECURITY.md))
- [ ] Sistema de backup automático
- [ ] Exportación de datos a formatos estándar
- [ ] Modo multi-sucursal
- [ ] Integración con APIs de facturación electrónica

---

<p align="center">
  Hecho con ❤️ para la gestión eficiente de barras
</p>
