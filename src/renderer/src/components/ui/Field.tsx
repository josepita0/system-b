import type { ReactNode } from 'react'
import { cn } from '@renderer/lib/cn'

type Props = {
  label: string
  children: ReactNode
  hint?: string
  className?: string
}

export function Field({ label, children, hint, className }: Props) {
  return (
    <label className={cn('block text-sm text-slate-700', className)}>
      <span className="mb-1 block font-medium text-slate-800">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-slate-600">{hint}</span> : null}
    </label>
  )
}
