import path from 'node:path'
import { getDataDirectory } from '../database/connection'

/** Dentro de la carpeta de datos (mismo árbol que el SQLite) para incluirse en backups de `data`. */
export function getCatalogMediaDirectory() {
  return path.join(getDataDirectory(), 'catalog-media')
}
