export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-3/4"></div>
        <div className="h-8 w-8 bg-neutral-100 dark:bg-neutral-800 rounded-full"></div>
      </div>
      <div className="space-y-3">
        <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-full"></div>
        <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-5/6"></div>
        <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-4/6"></div>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <div className="h-8 bg-neutral-100 dark:bg-neutral-800 rounded w-24"></div>
        <div className="h-8 bg-neutral-100 dark:bg-neutral-800 rounded w-20"></div>
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm animate-pulse">
      <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between gap-4">
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/4"></div>
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/4"></div>
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/4"></div>
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/6"></div>
      </div>
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-1/3">
              <div className="h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800 shrink-0"></div>
              <div className="space-y-2 w-full">
                <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-3/4"></div>
                <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-1/2"></div>
              </div>
            </div>
            <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-1/5"></div>
            <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-1/6"></div>
            <div className="h-8 bg-neutral-100 dark:bg-neutral-800 rounded-lg w-20"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="w-full space-y-3 animate-pulse">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3 flex-1">
            <div className="h-12 w-12 rounded-full bg-neutral-100 dark:bg-neutral-800 shrink-0"></div>
            <div className="space-y-2 flex-1 max-w-md">
              <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-2/3"></div>
              <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-full"></div>
            </div>
          </div>
          <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-16"></div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonKanban({ columns = 3 }: { columns?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full animate-pulse">
      {[...Array(columns)].map((_, i) => (
        <div key={i} className="bg-neutral-100/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex flex-col gap-4 min-h-[400px]">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
            <div className="h-5 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2"></div>
            <div className="h-6 w-6 rounded-full bg-neutral-200 dark:bg-neutral-700"></div>
          </div>
          <div className="space-y-3 flex-1">
            {[...Array(2)].map((_, j) => (
              <div key={j} className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 space-y-3 shadow-sm">
                <div className="h-4 bg-neutral-100 dark:bg-neutral-700 rounded w-3/4"></div>
                <div className="h-3 bg-neutral-100 dark:bg-neutral-700 rounded w-1/2"></div>
                <div className="flex justify-between items-center pt-2">
                  <div className="h-6 bg-neutral-100 dark:bg-neutral-700 rounded w-16"></div>
                  <div className="h-6 w-6 rounded-full bg-neutral-100 dark:bg-neutral-700"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonChart() {
  const heights = ['h-24', 'h-36', 'h-16', 'h-44', 'h-52', 'h-32', 'h-40', 'h-48', 'h-28', 'h-56', 'h-36', 'h-48']
  return (
    <div className="w-full bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm animate-pulse">
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-2">
          <div className="h-5 bg-neutral-200 dark:bg-neutral-700 rounded w-48"></div>
          <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-32"></div>
        </div>
        <div className="h-8 bg-neutral-100 dark:bg-neutral-800 rounded-lg w-28"></div>
      </div>
      <div className="h-64 w-full flex items-end justify-between gap-2 pt-8 pb-2">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="flex-1 bg-neutral-100 dark:bg-neutral-800 rounded-t-lg flex items-end justify-center">
            <div className={`w-full ${heights[i % heights.length]} bg-primary-500/20 dark:bg-primary-500/10 rounded-t-lg`}></div>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center pt-4 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-400">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-8"></div>
        ))}
      </div>
    </div>
  )
}
