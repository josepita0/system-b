/**
 * Emite `public/icon.png` (512×512) a partir de `build/icon.svg`.
 * Origen único del arte: el SVG en `build/`; el PNG alimenta Vite (favicon) y
 * `sync-app-icon` (copia a `build/` e ICO para electron-builder).
 */
const fs = require('node:fs')
const path = require('node:path')

const sharp = require('sharp')

const root = path.resolve(__dirname, '..')
const svgFile = path.join(root, 'build', 'icon.svg')
const outFile = path.join(root, 'public', 'icon.png')

/** Hex portable: librsvg (sharp) no aplica CSS Color 4 tipo `color(xyz-d65 …)` y el fill cae al negro del `<g>`. */
const SVG_FILL_FALLBACK = '#2563eb'

function normalizeSvgForSharp(svgText) {
  return svgText.replace(/color\(xyz-d65[^)]*\)/gi, SVG_FILL_FALLBACK)
}

async function main() {
  if (!fs.existsSync(svgFile)) {
    console.error('generate-app-icon: falta', svgFile)
    process.exit(1)
  }

  let svgText = fs.readFileSync(svgFile, 'utf8')
  svgText = normalizeSvgForSharp(svgText)

  // density: rasterizado SVG más nítido antes del resize a 512×512
  const buf = await sharp(Buffer.from(svgText, 'utf8'), { density: 300 })
    .resize(512, 512)
    .png()
    .toBuffer()

  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, buf)
  console.log(`generate-app-icon: ${svgFile} → ${outFile} (${buf.length} bytes)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
