# Capturas de pantalla (pendientes)

La seccion "Capturas" de la landing muestra marcadores de posicion hasta que
se agreguen las imagenes reales. Cuando tengas cada captura, guardala en esta
carpeta (`landing/public/capturas/`) con el nombre exacto de archivo.

## Archivos planificados

| Archivo                | Descripcion                                 |
| ---------------------- | ------------------------------------------- |
| `pos-catalogo.png`     | Catalogo de ventas por categoria            |
| `dashboard.png`        | Dashboard: estado de la barra de un vistazo |
| `cierre-turno-pdf.png` | Reporte PDF de cierre de turno              |
| `productos.png`        | Administracion de productos                 |

## Notas

- Se recomienda PNG a 2x (por ejemplo 1600px de ancho) para que se vean
  nitidos en pantallas HiDPI.
- Para reemplazar los marcadores, agrega dentro de cada `<figure>` de
  `src/components/Capturas.astro` una imagen real, por ejemplo:

  ```html
  <img src="/capturas/pos-catalogo.png" alt="Catalogo de ventas por categoria" />
  ```
