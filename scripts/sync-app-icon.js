/**
 * Copia `public/icon.png` → `build/icon.png` y genera `build/icon.ico` para NSIS.
 * El PNG proviene de `npm run generate:app-icon`, que rasteriza `build/icon.svg`.
 * Debe ejecutarse después de `vite build` y antes de `electron-builder`.
 */
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const src = path.join(root, 'public', 'icon.png')
const buildDir = path.join(root, 'build')
const destPng = path.join(buildDir, 'icon.png')
const destIco = path.join(buildDir, 'icon.ico')

async function main() {
  const { default: pngToIco } = await import('png-to-ico')
  if (!fs.existsSync(src)) {
    console.error('sync-app-icon: falta', src, '(ejecute npm run generate:app-icon)')
    process.exit(1)
  }
  fs.mkdirSync(buildDir, { recursive: true })
  fs.copyFileSync(src, destPng)
  // Un solo argumento (ruta o buffer): png-to-ico genera 256+48+32+16 y un ICO válido para NSIS.
  // Pasar [buffer] usa otra ruta y con PNG 512×512 deja el .ico incoherente → "invalid icon file size" en makensis.
  const icoBuf = await pngToIco(src)
  fs.writeFileSync(destIco, icoBuf)
  console.log(`sync-app-icon: ${destPng}, ${destIco}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
