# Guía de Contribución

Gracias por tu interés en contribuir a System Barra. Este documento explica cómo puedes participar en el desarrollo del proyecto.

## Código de Conducta

Este proyecto sigue el [Contributor Covenant](CODE_OF_CONDUCT.md). Al participar, se espera que mantengas este código.

## ¿Cómo puedo contribuir?

### Reportando Bugs

Antes de crear un issue:

1. **Busca en issues existentes** para evitar duplicados
2. Usa la plantilla de **Bug Report** al crear un nuevo issue
3. Incluye:
   - Descripción clara del problema
   - Pasos para reproducir
   - Comportamiento esperado vs actual
   - Versión del sistema y SO
   - Screenshots si aplica

### Sugiriendo Features

1. Abre un issue con la plantilla **Feature Request**
2. Describe el caso de uso y el beneficio esperado
3. Si es posible, incluye mockups o ejemplos

### Enviando Pull Requests

#### Proceso de desarrollo

1. **Fork** el repositorio
2. **Crea una rama** para tu cambio:
   ```bash
   git checkout -b feature/nombre-descriptivo
   # o
   git checkout -b fix/descripcion-del-bug
   ```
3. **Haz tus cambios** siguiendo las convenciones del proyecto
4. **Ejecuta los tests**:
   ```bash
   npm run typecheck
   npm test
   ```
5. **Commitea** con mensajes convencionales:
   ```
   feat: agregar validación de stock en ventas
   fix: corregir cálculo de total con descuentos
   docs: actualizar guía de instalación
   ```
6. **Push** a tu fork y abre un Pull Request

#### Convenciones de código

- **TypeScript** estricto — sin `any` innecesarios
- **ESLint** + **Prettier** — el código debe pasar el linter
- **Componentes funcionales** con hooks en React
- **Nombres descriptivos** — variables y funciones autoexplicativas
- **Comentarios** solo cuando el "por qué" no es obvio del código

#### Estructura de commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` nueva funcionalidad
- `fix:` corrección de bug
- `docs:` cambios en documentación
- `style:` formato, punto y coma, etc (sin cambio de lógica)
- `refactor:` reestructuración sin cambiar funcionalidad
- `test:` agregar o corregir tests
- `chore:` tareas de mantenimiento

#### Antes de enviar el PR

- [ ] El código pasa `npm run typecheck`
- [ ] Los tests pasan con `npm test`
- [ ] Agregaste tests para nueva funcionalidad
- [ ] Actualizaste la documentación si aplica
- [ ] El PR es autocontenido y revisable

### Revisando Pull Requests

Los maintainers revisarán los PRs considerando:

- Que pase los checks de CI
- Que siga las convenciones del proyecto
- Que tenga tests cuando corresponda
- Que la documentación esté actualizada

## Desarrollo local

### Setup inicial

```bash
# Clonar y entrar al directorio
git clone https://github.com/josepita0/system-barra.git
cd system-barra

# Instalar dependencias
npm install

# Verificar que todo funciona
npm run typecheck
npm test

# Iniciar en desarrollo
npm run dev
```

### Estructura importante

- `src/main/` — Lógica de backend (Node.js en main process de Electron)
- `src/renderer/` — Frontend React
- `src/shared/` — Tipos y schemas compartidos entre main y renderer
- `tests/` — Tests unitarios y de integración
- `docs/` — Documentación técnica

### Testing

```bash
# Tests unitarios
npm test

# Tests en modo watch
npm run test:watch

# Verificar tipos
npm run typecheck
```

## ¿Necesitas ayuda?

- Abre un [Discussion](https://github.com/josepita0/system-barra/discussions) para preguntas generales
- Revisa la [documentación](docs/README.md) técnica
- Busca issues con label `good first issue` para empezar

## Reconocimientos

Todas las contribuciones son valoradas y reconocidas. Los contribuidores aparecerán en la lista del proyecto.

---

¡Gracias por ayudar a mejorar System Barra!
