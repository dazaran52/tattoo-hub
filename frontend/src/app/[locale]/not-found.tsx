import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-4 transition-colors duration-200">
      <div className="text-center space-y-6">
        <h1 className="text-8xl font-black text-neutral-200 dark:text-neutral-800 tracking-tighter">
          404
        </h1>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Страница не найдена
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
            Похоже, вы забрели не туда. Возможно, страница была удалена или вы опечатались в адресе.
          </p>
        </div>
        
        <div className="pt-8">
          <Link 
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-semibold rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Вернуться домой
          </Link>
        </div>
      </div>
    </div>
  )
}
