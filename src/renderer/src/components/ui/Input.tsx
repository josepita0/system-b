import type { InputHTMLAttributes } from 'react'
import { cn } from '@renderer/lib/cn'

type Props = {
  className?: string
} & InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...rest }: Props) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20',
        className,
      )}
      {...rest}
    />
  )
}
