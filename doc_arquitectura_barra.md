# 📄 Documento de Arquitectura y Desarrollo
## Sistema Local de Gestión de Barra
### Electron + React + SQLite

---

| Campo | Detalle |
|-------|---------|
| **Versión** | 1.0 |
| **Estado** | Documento técnico inicial |
| **Tipo** | Arquitectura + Plan de desarrollo |
| **Fecha** | 18 de marzo de 2026 |
| **Autor** | Equipo de desarrollo |

---

## 1. 🧭 Visión General del Sistema

El sistema consiste en una **aplicación de escritorio (desktop)** orientada a la gestión de la barra de un salón de juegos, diseñada para operar **sin conexión a internet (offline-first)**.

El sistema permitirá:

- Gestión de inventario
- Facturación (tickets)
- Control de caja
- Manejo de productos compuestos (recetas)
- Gestión de empleados
- Gestión de turnos

### 🎯 Objetivos

**Objetivo principal**

Digitalizar la operación de la barra para:
- Reducir errores manuales
- Controlar el inventario en tiempo real
- Registrar ventas correctamente

**Objetivos secundarios**
- Mejorar la trazabilidad del negocio
- Reducir pérdidas de stock
- Facilitar reportes administrativos
- Permitir evolución futura a sistema cloud

---

## 2. 🏗️ Arquitectura Técnica

### Arquitectura General

El sistema se basa en una **arquitectura por capas**:

```
Electron (Desktop App)
   ├── React (Frontend UI)
   ├── Node.js (Backend interno)
   └── SQLite (Base de datos local)
```

### 🔄 Flujo de Funcionamiento

```
Usuario
   ↓
Interfaz (React)
   ↓
IPC (Electron)
   ↓
Backend (Node.js)
   ↓
Servicios
   ↓
Repositorio
   ↓
SQLite
```

### 🧩 Tecnologías Seleccionadas

#### 🖥️ Electron
Framework para aplicaciones de escritorio basado en Chromium y Node.js.
- Acceso al sistema operativo
- Generación de ejecutables (`.exe`)
- Impresión de tickets
- Manejo de archivos

#### ⚛️ React + Vite + Tailwind
- **React**: Construcción de interfaz de usuario y componentes reutilizables
- **Vite**: Entorno de desarrollo rápido
- **Tailwind**: Estilos rápidos y consistentes

#### ⚙️ Node.js (Backend interno)
- Lógica de negocio
- Validaciones
- Procesamiento de ventas
- Gestión de inventario

#### 🗄️ SQLite
Base de datos local embebida. Ventajas:
- No requiere servidor
- Alto rendimiento
- Archivo único
- Ideal para sistemas POS

#### 📦 Librerías en uso

| Librería | Uso |
|----------|-----|
| `better-sqlite3` | Acceso a base de datos |
| `date-fns` | Manejo de fechas |
| `electron-builder` | Build del instalador |
| `pdf-lib` | Generacion de reportes PDF |
| `@tanstack/react-query` | Cache y sincronizacion de datos |
| `zod` | Validacion de contratos y formularios |

### 📁 Estructura del Proyecto

```text
system-barra/
│
├── src/
│   ├── main/
│   │   ├── database/
│   │   ├── ipc/
│   │   ├── repositories/
│   │   ├── security/
│   │   ├── services/
│   │   ├── windows/
│   │   └── workers/
│   ├── preload/
│   │   └── index.ts
│   ├── renderer/
│   │   └── src/
│   │       ├── components/
│   │       ├── lib/
│   │       ├── pages/
│   │       ├── store/
│   │       └── main.tsx
│   └── shared/
│       ├── ipc/
│       ├── schemas/
│       └── types/
│
├── tests/
│   └── main/
├── docs/
├── dist/
└── dist-electron/
```

### ⚡ Componentes de Electron

| Componente | Función |
|-----------|---------|
| **Main Process** | Crea la ventana, controla la aplicación, maneja IPC |
| **Renderer Process** | Ejecuta React, interfaz de usuario |
| **Preload Script** | Puente entre frontend y backend, seguridad en comunicación |

### 🔌 Comunicación IPC

```js
// Renderer
window.api.products.create(data)

// Main
ipcMain.handle('products:create', (_event, payload) => {
  return executeIpc(() => service.create(payload))
})
```

### 🧠 Arquitectura del Backend

```text
IPC Handler
        ↓
Auth / Authorization Guard
        ↓
Service
        ↓
Repository
        ↓
SQLite
```

---

## 3. 🗃️ Modelo de Datos

### Tablas Principales actuales

| Tabla | Descripción |
|-------|-------------|
| `employees` | Empleados |
| `auth_sessions` | Sesiones persistidas |
| `recovery_codes` | Recuperacion de credenciales |
| `license_activations` | Activaciones y renovaciones |
| `products` | Productos del catálogo |
| `categories` | Categorias y subcategorias del catalogo |
| `sale_formats` | Formatos habilitados por categoria |
| `inventory_movements` | Movimientos de inventario |
| `sales` | Cabecera de ventas |
| `sale_items` | Líneas de cada venta |
| `cash_sessions` | Sesiones de caja |
| `report_jobs` | Cola local de reportes por correo |
| `user_documents` | Documentacion del personal |

### Estructuras de Ejemplo

**Tabla: `products`**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER | Clave primaria |
| `name` | TEXT | Nombre del producto |
| `price` | REAL | Precio de venta |
| `type` | TEXT | Tipo de producto |
| `min_stock` | INTEGER | Stock mínimo de alerta |

**Tabla: `sales`**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER | Clave primaria |
| `date` | DATETIME | Fecha y hora de la venta |
| `employee_id` | INTEGER | Referencia al empleado |
| `total` | REAL | Total de la venta |
| `type` | TEXT | Tipo de venta |

**Tabla: `sale_items`**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER | Clave primaria |
| `sale_id` | INTEGER | Referencia a la venta |
| `product_id` | INTEGER | Referencia al producto |
| `quantity` | INTEGER | Cantidad vendida |
| `price` | REAL | Precio unitario aplicado |

### 🧾 Flujo de Venta (POS)

```
1. Usuario selecciona productos
2. Se genera ticket
3. Se envía al backend
4. Se valida stock
5. Se registra venta
6. Se descuenta inventario
7. Se confirma operación
```

### 🖥️ Pantallas actuales del producto

| Pantalla | Funcionalidades |
|---------|----------------|
| **Login / Recuperacion** | Inicio de sesion, cambio obligatorio de clave y recuperacion por codigo |
| **Ventas (POS)** | Operacion diaria y apertura de turno |
| **Productos** | Catalogo por categorias, subcategorias y formatos |
| **Turnos** | Apertura, cierre y control de caja |
| **Reportes** | Generacion de PDF y reintento de envios |
| **Usuarios** | CRUD, credenciales y documentacion |
| **Licencia administrativa** | Activacion, renovacion y cancelacion local |

---

## 4. 📅 Estado de Desarrollo Actual

- Base Electron + React + SQLite operativa.
- Autenticacion local con roles, recuperacion y sesiones persistidas.
- Modulo administrativo de usuarios.
- Modulo de turnos, caja y reportes PDF.
- Catalogo jerarquico por categorias con formatos heredados.
- Bitacora tecnica viva en `docs/`.

### 🏗️ Build e Instalación

```bash
npm run build
```

Genera un `Setup.exe` instalable en PC local.

---

## 5. ⚠️ Riesgos y Recomendaciones

### Riesgos Técnicos Identificados

| # | Riesgo | Impacto |
|---|--------|---------|
| 1 | Exposicion local de sesiones o secretos operativos | Alto |
| 2 | Bloqueos del main process por consultas o reportes pesados | Alto |
| 3 | Omisiones de autorizacion entre canales IPC | Alto |
| 4 | Desalineacion entre documentacion y codigo real | Medio |

### 🧩 Recomendaciones Clave

1. **Mantener la seguridad en el runtime Electron** para evitar exponer sesiones, IPC o secretos locales.
2. **Concentrar la autorizacion en un patron unico** para que cada canal IPC sea facil de auditar.
3. **Sacar consultas y reportes pesados del hilo principal** para proteger la fluidez de la app.
4. **Usar `docs/` como fuente principal de verdad** y evitar documentos raices desactualizados.

### 🚀 Próximos Pasos Recomendados

- [ ] Cerrar backlog de hardening de Electron, IPC y secretos locales
- [ ] Medir tiempos de IPC y consultas criticas del catalogo
- [ ] Consolidar contratos de errores y autorizacion
- [ ] Preparar una fase posterior para ventas e inventario avanzado

---

*Documento generado el 18 de marzo de 2026 — v1.0*
