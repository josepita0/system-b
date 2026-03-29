/**
 * Copia recursos del proceso principal que tsc no emite (p. ej. migraciones .sql)
 * para que existan junto a migrate.js en dist-electron y dentro del app.asar en produccion.
 */
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const srcDir = path.join(root, 'src', 'main', 'database', 'migrations')
const destDir = path.join(root, 'dist-electron', 'src', 'main', 'database', 'migrations')

if (!fs.existsSync(srcDir)) {
  console.error('copy-main-assets: no existe', srcDir)
  process.exit(1)
}

fs.mkdirSync(destDir, { recursive: true })
let n = 0
for (const name of fs.readdirSync(srcDir)) {
  if (!name.endsWith('.sql')) {
    continue
  }
  fs.copyFileSync(path.join(srcDir, name), path.join(destDir, name))
  n += 1
}
console.log(`copy-main-assets: ${n} migraciones -> ${destDir}`)
