# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto sigue [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

### Added
- Configuración completa para repositorio público open source
- GitHub Actions CI/CD (typecheck, tests, build)
- Issue templates (bug report, feature request)
- Pull request template
- `CONTRIBUTING.md` con guía de contribución
- `CODE_OF_CONDUCT.md` (Contributor Covenant v2.1)
- `LICENSE` MIT
- `.editorconfig` para consistencia entre editores
- `.nvmrc` para versionado de Node
- `.env.example` con variables de entorno documentadas

### Changed
- README.md reescrito con formato profesional
- SECURITY.md actualizado para repo público
- `doc_arquitectura_barra.md` movido a `docs/arquitectura.md`
- `package.json` actualizado con metadata completa (author, repository, keywords)

## [1.0.0] - 2026-03-28

### Added

#### Landing & Demo
- Landing page con rebrand a "Zentra"
- Demo mode interactivo con datos en memoria
- Pipeline de build aislado para landing (Astro)
- Link de retorno desde demo a landing
- Favicon y product icon personalizados

#### Punto de Venta (POS)
- Flujo completo de ventas POS con carrito
- Catálogo por categorías con tree view
- Soporte para formatos de venta por categoría
- Productos complementarios (combinados)
- Métodos de pago (CASH/CARD)
- Descuento automático de inventario por recetas
- Validación de stock en tiempo real
- Ticket de venta con detalle de items

#### Catálogo de Productos
- Sistema de categorías jerárquicas (padre/hijo)
- Formatos de venta habilitables por categoría
- Herencia configurable de formatos
- Bloqueo estructural para categorías en uso
- CRUD completo con validación Zod
- Galería de imágenes por producto

#### Inventario
- Dashboard de inventario
- Registro de movimientos (entrada/salida/ajuste)
- Histórico de movimientos
- Configuración de consumos
- Balance de inventario en tiempo real
- Alertas de stock mínimo

#### Clientes VIP
- Módulo de clientes frecuentes
- Cuentas corrientes
- Sistema de pagarés
- Historial de compras

#### Turnos y Caja
- Apertura y cierre de turnos
- Control de caja con arqueo
- Histórico de turnos cerrados
- Filtro por estado (abiertos/cerrados)
- Reporte PDF de cierre con detalle de pagos
- Métodos de pago en resumen

#### Autenticación y Usuarios
- Login local con sesiones persistidas
- Sistema de roles RBAC (ADMINISTRADOR, CAJERO, etc)
- Recuperación de credenciales por código
- Cambio obligatorio de contraseña en primer acceso
- CRUD de usuarios con documentación
- Perfil de usuario con edición propia
- Permisos granulares por módulo

#### Reportes y Email
- Generación de reportes PDF
- Cola SMTP con reintentos automáticos
- Configuración SMTP por usuario
- Contraseña SMTP encriptable
- Envío de reportes por email

#### Dashboard
- Vista general del sistema
- Métricas de ventas del día
- Accesos rápidos a módulos principales

#### Licencias
- Módulo de licencia administrativa
- Activación y renovación local
- Control de expiración

#### Base del Sistema
- Estructura Electron + React + SQLite
- Arquitectura por capas (main/preload/renderer/shared)
- Migraciones de base de datos (0001-0020+)
- Sistema de IPC con contextBridge
- Validación de schemas con Zod
- Estado global con Zustand
- Cache y sincronización con TanStack Query
- Setup wizard para primera configuración
- Generación de iconos de app automática

### Fixed
- Escalado de apertura de caja mínimo en modo USD
- Hardening de bootstrap de credenciales
- Instalación de dependencias de landing en deploy
- Exclusión de build artifacts en tsconfig de landing
- Eliminación de texto de email en toasts de cierre de turno
- Guardado de rutas no soportadas en demo

### Security
- Content Security Policy en index.html
- safeStorage para datos sensibles cuando el SO lo soporta
- Separación de contextos con contextIsolation
- Validación de permisos en todos los handlers IPC

## [0.1.0] - 2026-03-18

### Added
- Bootstrap técnico del proyecto
- Configuración de TypeScript, Vite, Electron
- Separación main/preload/shared/renderer
- Conexión SQLite con WAL y foreign keys
- Runner de migraciones SQL
- Primer CRUD funcional de productos
- Base de turnos con apertura/cierre
- Sesiones de caja
- Generación inicial de PDF de cierre
- Cola de correos SMTP
- UI base con páginas de Productos, Turnos y Reportes
- Login local con roles jerárquicos
- Gestión de usuarios y documentación personal
- Tests iniciales con Vitest
- Documentación técnica en docs/

[Unreleased]: https://github.com/josepita0/system-barra/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/josepita0/system-barra/releases/tag/v1.0.0
[0.1.0]: https://github.com/josepita0/system-barra/releases/tag/v0.1.0
