import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link 
          href="/login" 
          className="inline-flex items-center gap-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors mb-8 font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Вернуться на главную
        </Link>
        
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 sm:p-12 shadow-xl border border-neutral-200 dark:border-neutral-800">
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
