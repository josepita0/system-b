import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@renderer/components/ui/Button'
import { cn } from '@renderer/lib/cn'
import { resetDemo } from './installDemoApi'

export function DemoChip() {
  const queryClient = useQueryClient()
  const [resetting, setResetting] = useState(false)
  return <div className="flex items-center gap-2 rounded-full border border-brand/30 bg-brand-muted px-3 py-1 text-xs font-semibold text-brand">
    <span>Demo interactiva</span>
    <Button className={cn('h-7 rounded-full px-2 text-xs', resetting && 'opacity-60')} disabled={resetting} onClick={() => {
      setResetting(true); resetDemo(); queryClient.clear(); setTimeout(() => setResetting(false), 100)
    }} type="button" variant="secondary">{resetting ? 'Restaurando...' : 'Reiniciar demo'}</Button>
  </div>
}
