import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

export const DEMO_MARKERS = ['Reiniciar demo', 'installDemoApi', 'DemoFallback']
export function findDemoMarkers(source) {
  return DEMO_MARKERS.filter((marker) => source.includes(marker))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const assetsDir = join(process.cwd(), 'dist', 'renderer', 'assets')
  if (!existsSync(assetsDir)) {
    console.error(`Production assets not found: ${assetsDir}`)
    process.exit(1)
  }
  const files = readdirSync(assetsDir).filter((file) => file.endsWith('.js'))
  const matches = files.flatMap((file) => findDemoMarkers(readFileSync(join(assetsDir, file), 'utf8')).map((marker) => `${file}: ${marker}`))
  if (matches.length) {
    console.error(`Demo markers found in production bundle:\n${matches.join('\n')}`)
    process.exit(1)
  }
  console.log(`Production bundle clean: ${files.length} JavaScript assets checked.`)
}
