import { HTMLAttributes } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-white/10 text-white/70',
  success: 'bg-secondary/20 text-secondary',
  warning: 'bg-yellow-500/20 text-yellow-400',
  danger: 'bg-accent/20 text-accent',
  info: 'bg-blue-500/20 text-blue-400',
  purple: 'bg-primary/20 text-primary',
}

export function Badge({ variant = 'default', className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
