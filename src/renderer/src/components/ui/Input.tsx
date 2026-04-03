import type { InputHTMLAttributes } from 'react'
import { cn } from '@renderer/lib/cn'

type Props = {
  className?: string
} & InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...rest }: Props) {
  return (
    <input
      className={cn(
        'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand',
        className,
      )}
      {...rest}
    />
  )
}
