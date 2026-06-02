import { WifiOff } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Offline | OUT Tattoo',
}

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-24 h-24 bg-neutral-200 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-6">
        <WifiOff className="w-12 h-12 text-neutral-400 dark:text-neutral-500" />
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white mb-3">
        Вы находитесь оффлайн
      </h1>
      <p className="text-neutral-500 dark:text-neutral-400 max-w-md mb-8">
        Пожалуйста, проверьте ваше интернет-соединение. Некоторые функции приложения недоступны без сети.
      </p>
      <Link 
        href="/"
        className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 rounded-xl font-medium transition-colors"
      >
        Попробовать снова
      </Link>
    </div>
  )
}
