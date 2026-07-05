import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Instagram, Download, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useLanguage } from '@/i18n/LanguageContext'
import { supabase } from '@/lib/supabase'

interface InstagramMedia {
  id: string
  media_type: string
  media_url: string
  thumbnail_url?: string
  permalink: string
}

interface InstagramImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImported: (urls: string[]) => void
  initialCode?: string | null
}

export function InstagramImportModal({ isOpen, onClose, onImported, initialCode }: InstagramImportModalProps) {
  const [url, setUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [isExchanging, setIsExchanging] = useState(false)
  const [mediaList, setMediaList] = useState<InstagramMedia[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const { lang: language } = useLanguage()

  useEffect(() => {
    if (isOpen && initialCode && mediaList.length === 0) {
      exchangeToken(initialCode)
    }
  }, [isOpen, initialCode])

  const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  
  const getAuthHeader = async () => {
    const { data } = await supabase.auth.getSession()
    return `Bearer ${data.session?.access_token}`
  }

  const connectInstagram = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/instagram/auth-url`)
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error('Instagram integration not fully configured yet.')
      }
    } catch (err) {
      toast.error('Failed to get auth URL')
    }
  }

  const exchangeToken = async (code: string) => {
    setIsExchanging(true)
    try {
      const res = await fetch(`${getApiUrl()}/api/instagram/exchange-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': await getAuthHeader()
        },
        body: JSON.stringify({ code })
      })

      if (!res.ok) throw new Error('Failed to exchange token')
      
      const data = await res.json()
      // Filter out videos, we only want IMAGE or CAROUSEL_ALBUM
      const images = data.media.filter((m: any) => m.media_type === 'IMAGE' || m.media_type === 'CAROUSEL_ALBUM')
      setMediaList(images)
    } catch (err) {
      toast.error(language === 'ru' ? 'Ошибка авторизации' : 'Auth error')
      console.error(err)
    } finally {
      setIsExchanging(false)
    }
  }

  const handleImportGrid = async () => {
    if (selectedIds.size === 0) return

    setIsImporting(true)
    try {
      const selectedUrls = mediaList
        .filter(m => selectedIds.has(m.id))
        .map(m => m.media_url) // Note: CAROUSEL_ALBUM might require children endpoint for all photos, we just take the cover here for MVP

      const res = await fetch(`${getApiUrl()}/api/instagram/import-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': await getAuthHeader()
        },
        body: JSON.stringify({ urls: selectedUrls })
      })

      if (!res.ok) throw new Error(await res.text())

      const data = await res.json()
      onImported(data.public_urls)
      onClose()
      toast.success(language === 'ru' ? 'Фото импортированы' : 'Photos imported')
    } catch (err: any) {
      toast.error(language === 'ru' ? 'Ошибка импорта' : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  const handleImportSingle = async () => {
    if (!url.trim()) return

    setIsImporting(true)
    try {
      const res = await fetch(`${getApiUrl()}/api/instagram/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': await getAuthHeader()
        },
        body: JSON.stringify({ url })
      })

      if (!res.ok) throw new Error(await res.text())

      const data = await res.json()
      onImported([data.public_url])
      setUrl('')
      onClose()
      toast.success(language === 'ru' ? 'Фото импортировано' : 'Photo imported')
    } catch (err: any) {
      toast.error(language === 'ru' ? 'Ошибка импорта' : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedIds(newSet)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={(e) => { if(e.target === e.currentTarget) onClose() }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-neutral-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-neutral-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-neutral-100 dark:border-white/5 flex justify-between items-center bg-neutral-50/50 dark:bg-neutral-900/50">
            <h2 className="text-xl font-bold flex items-center gap-2 text-neutral-900 dark:text-white">
              <Instagram className="w-6 h-6 text-pink-500" />
              Импорт из Instagram
            </h2>
            <button onClick={onClose} className="p-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto">
            {isExchanging ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-10 h-10 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
                <p className="text-neutral-500 font-medium">Загружаем ваши публикации...</p>
              </div>
            ) : mediaList.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm font-medium text-neutral-500">Выберите работы для добавления в портфолио:</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {mediaList.map(media => {
                    const isSelected = selectedIds.has(media.id)
                    return (
                      <div 
                        key={media.id} 
                        onClick={() => toggleSelect(media.id)}
                        className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${isSelected ? 'border-pink-500 shadow-lg shadow-pink-500/20' : 'border-transparent'}`}
                      >
                        <img src={media.media_url} alt="Instagram Post" className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-pink-500 rounded-full text-white shadow-sm">
                            <CheckCircle className="w-5 h-5" />
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 bg-pink-500/20" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900/30 text-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Instagram className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Автоматический импорт</h3>
                  <p className="text-neutral-500 text-sm max-w-md mx-auto mb-6">
                    Подключите свой профиль Instagram, чтобы выбирать фотографии прямо из ваших публикаций.
                  </p>
                  <button
                    onClick={connectInstagram}
                    className="px-6 py-3 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white rounded-xl font-bold shadow-lg shadow-pink-500/25 transition-all"
                  >
                    Подключить Instagram
                  </button>
                </div>
              </div>
            )}
          </div>

          {mediaList.length > 0 && (
            <div className="p-6 bg-neutral-50 dark:bg-neutral-900/50 flex justify-between items-center border-t border-neutral-100 dark:border-white/5">
              <span className="text-sm font-medium text-neutral-500">Выбрано: {selectedIds.size}</span>
              <div className="flex gap-3">
                <button 
                  onClick={onClose}
                  className="py-3 px-4 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
                >
                  Отмена
                </button>
                <button 
                  onClick={handleImportGrid}
                  disabled={isImporting || selectedIds.size === 0}
                  className="py-3 px-6 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-pink-500/25 transition-all disabled:opacity-50"
                >
                  {isImporting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Импортировать ({selectedIds.size})</>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
