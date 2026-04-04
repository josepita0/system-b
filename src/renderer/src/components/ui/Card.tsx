import type { ReactNode } from 'react'
import { cn } from '@renderer/lib/cn'

type Props = {
  children: ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
}

const pad: Record<NonNullable<Props['padding']>, string> = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
}

export function Card({ children, className, padding = 'md' }: Props) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-surface-card text-slate-800 shadow-sm',
        pad[padding],
        className,
      )}
    >
      {children}
    </div>
  )
}
