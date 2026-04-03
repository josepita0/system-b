import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@renderer/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'warning'

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-brand-fg hover:opacity-90 disabled:opacity-50',
  secondary: 'border border-border bg-surface-card text-slate-200 hover:bg-slate-800/80 disabled:opacity-50',
  ghost: 'bg-transparent text-slate-200 hover:bg-surface-card disabled:opacity-50',
  danger: 'bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50',
  warning: 'bg-amber-500 text-surface hover:opacity-90 disabled:opacity-50',
}

type Props = {
  variant?: ButtonVariant
  className?: string
  children: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>

export function Button({ variant = 'secondary', className, children, type = 'button', ...rest }: Props) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-opacity',
        variantClass[variant],
        className,
      )}
      type={type}
      {...rest}
    >
      {children}
    </button>
  )
}
