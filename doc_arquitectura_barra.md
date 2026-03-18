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

#### 📦 Librerías Recomendadas

| Librería | Uso |
|----------|-----|
| `better-sqlite3` | Acceso a base de datos |
| `Drizzle ORM` | ORM opcional |
| `date-fns` | Manejo de fechas |
| `electron-builder` | Build del instalador |
| `shadcn/ui` | Componentes de UI |

### 📁 Estructura del Proyecto

```
bar-system/
│
├── electron/
│   ├── main.js
│   └── preload.js
│
├── backend/
│   ├── database/
│   │   ├── connection.js
│   │   └── migrations/
│   ├── repositories/
│   ├── services/
│   └── ipc/
│
├── frontend/
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── context/
│
└── database/
    └── database.sqlite
```

### ⚡ Componentes de Electron

| Componente | Función |
|-----------|---------|
| **Main Process** | Crea la ventana, controla la aplicación, maneja IPC |
| **Renderer Process** | Ejecuta React, interfaz de usuario |
| **Preload Script** | Puente entre frontend y backend, seguridad en comunicación |

### 🔌 Comunicación IPC

```js
// Frontend
window.api.createSale(data)

// Backend
ipcMain.handle("create-sale", async (event, data) => {
  return salesService.createSale(data)
})
```

### 🧠 Arquitectura del Backend

```
IPC Handler (Controller)
        ↓
Service (Lógica de negocio)
        ↓
Repository (Acceso a datos)
        ↓
Database (SQLite)
```

---

## 3. 🗃️ Modelo de Datos

### Tablas Principales

| Tabla | Descripción |
|-------|-------------|
| `workspaces` | Espacios de trabajo |
| `employees` | Empleados |
| `products` | Productos del catálogo |
| `ingredients` | Ingredientes base |
| `recipes` | Recetas de productos compuestos |
| `inventory` | Control de stock |
| `sales` | Cabecera de ventas |
| `sale_items` | Líneas de cada venta |
| `vip_clients` | Clientes VIP |
| `shifts` | Turnos de trabajo |

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

### 🖥️ Pantallas del MVP

| Pantalla | Funcionalidades |
|---------|----------------|
| **Dashboard** | Ventas del día, alertas de inventario |
| **Ventas (POS)** | Búsqueda rápida, agregar productos, confirmar venta |
| **Inventario** | Ver stock, registrar entradas, alertas |
| **Productos** | Crear productos, definir recetas |
| **Empleados** | Registro, documentación |
| **Turnos** | Calendario, exportación a Excel |

---

## 4. 📅 Plan de Desarrollo — 5 Semanas

| Semana | Objetivo |
|--------|----------|
| **Semana 1** | Base del proyecto + SQLite + CRUD de productos |
| **Semana 2** | Inventario (entradas / salidas / alertas) |
| **Semana 3** | Facturación (POS) |
| **Semana 4** | Productos compuestos + clientes VIP |
| **Semana 5** | Empleados + turnos + build e instalador |

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
| 1 | Manejo incorrecto de recetas | Alto |
| 2 | Desincronización de inventario | Alto |
| 3 | Bloqueos en operaciones pesadas | Medio |
| 4 | Errores en flujo de ventas | Alto |

### 🧩 Recomendaciones Clave

1. **Diseñar correctamente el inventario desde el inicio** — es la base de toda la operación.
2. **Separar la lógica de negocio del frontend** — facilita el mantenimiento y las pruebas.
3. **Optimizar la pantalla POS** — es la pantalla más crítica del sistema.
4. **Preparar la arquitectura para escalar a cloud** — diseñar pensando en el futuro.

### 🚀 Próximos Pasos Recomendados

- [ ] Diseñar la base de datos completa
- [ ] Definir el flujo de facturación exacto
- [ ] Crear la estructura del proyecto
- [ ] Iniciar el desarrollo del MVP

---

*Documento generado el 18 de marzo de 2026 — v1.0*
