'use client'

import { useEffect } from 'react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App Error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-neutral-900 dark:bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-8 text-center">
        <div className="w-16 h-16 bg-red-900/50 rounded-full mx-auto mb-4 flex items-center justify-center">
          <span className="text-2xl">⚠️</span>
        </div>
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Něco se pokazilo
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
          {error.message || 'Došlo k neočekávané chybě. Zkuste to prosím znovu.'}
        </p>
        <button
          onClick={reset}
          className="w-full px-4 py-2 bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-950 rounded-lg font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
        >
          Zkusit znovu
        </button>
      </div>
    </div>
  )
}
