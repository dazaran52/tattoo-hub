import { X, Calendar, Palette, User, MessageCircle, Send, Phone, Scale3d, PersonStanding } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { ImageViewerModal } from './ImageViewerModal'
import { ClientDetailsModal } from './ClientDetailsModal'

interface LeadDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  session: any
  onAccept: () => void
  onReject: () => void
  chatId?: string | null
}

export function LeadDetailsModal({ isOpen, onClose, session, onAccept, onReject, chatId }: LeadDetailsModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)

  if (!isOpen || !session) return null

  const leadData = session.master_clients?.leads || {}
  const clientName = session.master_clients?.name || 'Неизвестный клиент'
  const clientContact = session.master_clients?.phone || session.master_clients?.telegram || session.master_clients?.email || 'Скрыто'

  const images = session.reference_images?.length ? session.reference_images : leadData.image_urls || []

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-neutral-200 dark:border-white/10 flex flex-col max-h-[90vh]"
        >
          <div className="flex justify-between items-center p-6 border-b border-neutral-100 dark:border-white/5 bg-neutral-50/50 dark:bg-neutral-900/50">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <User className="w-6 h-6 text-violet-500" />
              Детали заявки
            </h2>
            <button onClick={onClose} className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-full transition-colors bg-neutral-100 dark:bg-neutral-800">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Client Info */}
            <div className="flex items-center gap-4">
              <div 
                onClick={() => setIsClientModalOpen(true)}
                className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center shrink-0 cursor-pointer hover:ring-2 hover:ring-violet-500 transition-all"
                title="Посмотреть профиль клиента"
              >
                <User className="w-8 h-8 text-violet-500" />
              </div>
              <div>
                <h3 
                  onClick={() => setIsClientModalOpen(true)}
                  className="text-xl font-bold text-neutral-900 dark:text-white mb-1 cursor-pointer hover:text-violet-600 transition-colors"
                >
                  {clientName}
                </h3>
                <div className="text-neutral-500 text-sm flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  {clientContact}
                  {session.master_clients?.telegram && (
                    <a href={`https://t.me/${session.master_clients.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="ml-2 text-sky-500 hover:text-sky-600 bg-sky-50 dark:bg-sky-500/10 p-1.5 rounded-lg transition-colors">
                      <Send className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-5 border border-neutral-100 dark:border-white/5">
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
                <Palette className="w-4 h-4 text-violet-500" />
                Стиль и описание
              </h4>
              <div className="mb-3">
                <span className="inline-block bg-white dark:bg-neutral-800 px-3 py-1 rounded-lg text-sm font-medium border border-neutral-200 dark:border-white/10 shadow-sm">
                  {session.style || leadData.title || 'Стиль не указан'}
                </span>
              </div>
              <p className="text-neutral-600 dark:text-neutral-300 text-sm leading-relaxed whitespace-pre-wrap">
                {(session.notes || leadData.description || 'Клиент не оставил подробного описания.').replace(/Желаемое время:.*\n?/g, '')}
              </p>
            </div>

            {/* Photos */}
            {images.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white mb-3">Прикрепленные фото ({images.length})</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {images.map((img: string, idx: number) => (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedImage(img)}
                      className="aspect-square rounded-xl overflow-hidden cursor-pointer border border-neutral-200 dark:border-white/10 hover:ring-2 hover:ring-violet-500 transition-all"
                    >
                      <img src={img} alt="reference" className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preferences */}
            <div className="flex gap-4 flex-wrap">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-2xl flex-1 min-w-[120px] flex items-center gap-3 border border-emerald-100 dark:border-emerald-500/20">
                <Calendar className="w-5 h-5 shrink-0" />
                <div className="text-sm">
                  <span className="font-bold block">Желаемая дата</span>
                  {new Date(session.session_date).toLocaleDateString('ru-RU')}{session.start_time ? ` ${session.start_time.slice(0, 5)}` : ''}
                </div>
              </div>
              {leadData.body_place && (
                <div className="bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 px-4 py-3 rounded-2xl flex-1 min-w-[120px] flex items-center gap-3 border border-sky-100 dark:border-sky-500/20">
                  <PersonStanding className="w-5 h-5 shrink-0" />
                  <div className="text-sm">
                    <span className="font-bold block">Место</span>
                    {leadData.body_place}
                  </div>
                </div>
              )}
              {leadData.size && (
                <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-4 py-3 rounded-2xl flex-1 min-w-[120px] flex items-center gap-3 border border-amber-100 dark:border-amber-500/20">
                  <Scale3d className="w-5 h-5 shrink-0" />
                  <div className="text-sm">
                    <span className="font-bold block">Размер</span>
                    {leadData.size}
                  </div>
                </div>
              )}
            </div>

          </div>

          <div className="p-6 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-white/5 flex gap-3">
            <button 
              onClick={() => { onClose(); onReject(); }}
              className="flex-1 py-3.5 px-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold transition-colors"
            >
              Отклонить
            </button>
            <button 
              onClick={() => { onClose(); onAccept(); }}
              className="flex-1 py-3.5 px-4 bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/25 rounded-xl font-bold transition-all hover:scale-[1.02]"
            >
              Принять заявку
            </button>
          </div>
        </motion.div>
      </div>

      <ImageViewerModal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        imageUrl={selectedImage || ''}
        showActions={true}
      />

      {isClientModalOpen && session.master_clients && (
        <ClientDetailsModal
          isOpen={isClientModalOpen}
          onClose={() => setIsClientModalOpen(false)}
          client={session.master_clients as any}
          onSessionClick={() => {}}
          chatId={chatId || session.master_clients?.chat_id}
        />
      )}
    </AnimatePresence>
  )
}
