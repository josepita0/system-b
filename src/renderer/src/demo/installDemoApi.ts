import { createDemoApi } from './api'

let resetDemoState: () => void = () => undefined
export function resetDemo() { resetDemoState() }
export function installDemoApi() {
  const demo = createDemoApi()
  resetDemoState = demo.reset
  window.api = demo as unknown as Window['api']
  return demo
}
