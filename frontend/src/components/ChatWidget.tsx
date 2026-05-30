'use client'

import { useState } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Popup */}
      <div 
        className={`mb-4 w-72 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl transition-all duration-300 origin-bottom-right ${
          isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-t-2xl">
          <h3 className="font-bold text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Поддержка OUT Tattoo
          </h3>
        </div>
        <div className="p-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            Привет! 👋 Если у вас есть вопросы по работе платформы, пополнению баланса или возникли проблемы — пишите нам в Telegram.
          </p>
          <a
            href="https://t.me/out_tattoo_admin"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm"
          >
            <Send className="w-4 h-4" />
            Написать в Telegram
          </a>
        </div>
      </div>

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform border-4 border-neutral-50 dark:border-neutral-950"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>
    </div>
  )
}
