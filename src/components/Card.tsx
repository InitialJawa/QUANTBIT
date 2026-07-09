import { createElement, ReactNode } from 'react'

type Variant = 'elevated' | 'default' | 'inset' | 'signal'
type Signal = 'positive' | 'warning' | 'negative'
type Padding = 'none' | 'sm' | 'md' | 'lg'

interface CardProps {
  key?: string | number
  variant?: Variant
  signal?: Signal | null
  padding?: Padding
  className?: string
  children: ReactNode
  as?: 'div' | 'section' | 'article'
  onClick?: () => void
  hover?: boolean
}

const paddingMap: Record<Padding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
}

const variantMap: Record<Variant, string> = {
  elevated: 'card card-elevated',
  default: 'card card-default',
  inset: 'card card-inset',
  signal: 'card card-signal',
}

const signalMap: Record<Signal, string> = {
  positive: 'card-signal-positive',
  warning: 'card-signal-warning',
  negative: 'card-signal-negative',
}

export default function Card({
  variant = 'default',
  signal = null,
  padding = 'md',
  className = '',
  children,
  as: Tag = 'div',
  onClick,
  hover = false,
}: CardProps) {
  const classes = [
    variantMap[variant],
    signal && signal in signalMap ? signalMap[signal] : '',
    paddingMap[padding],
    hover ? 'card-hover' : '',
    onClick ? 'cursor-pointer' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return createElement(Tag, { className: classes, onClick }, children)
}
