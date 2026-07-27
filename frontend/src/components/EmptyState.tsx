import React from 'react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  variant?: 'card' | 'table' | 'compact'
  colSpan?: number
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = 'card',
  colSpan = 6,
  className = '',
}: EmptyStateProps) {
  const content = (
    <div className={`flex flex-col items-center justify-center text-center p-8 ${className}`}>
      {icon && (
        <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full mb-4 flex items-center justify-center text-neutral-400 dark:text-neutral-500 shadow-inner">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200 mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-bold rounded-xl text-sm shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )

  if (variant === 'table') {
    return (
      <tr>
        <td colSpan={colSpan} className="p-4">
          {content}
        </td>
      </tr>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`flex flex-col items-center justify-center text-center py-6 px-4 ${className}`}>
        {icon && (
          <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full mb-3 flex items-center justify-center text-neutral-400 dark:text-neutral-500">
            {icon}
          </div>
        )}
        <h4 className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
          {title}
        </h4>
        {description && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mt-1">
            {description}
          </p>
        )}
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="mt-3 px-3.5 py-1.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg text-xs transition-colors"
          >
            {actionLabel}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={`w-full bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm ${className}`}>
      {content}
    </div>
  )
}
