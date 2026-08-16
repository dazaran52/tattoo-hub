import { useTranslations } from "next-intl";
import Image from 'next/image'
import { X, Calendar, Palette, User, MessageCircle, Send, Phone, PersonStanding, MapPin, DollarSign, Maximize2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { ImageViewerModal } from './ImageViewerModal'
import { ClientDetailsModal } from './ClientDetailsModal'

interface LeadDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  session: any
  onAccept: () => void
  onReject: (reason?: string) => void
  onEdit?: () => void
  onSessionClick?: (session: any) => void
  onUpdate?: () => void
  chatId?: string | null
  onOpenDispute?: () => void
}

export function LeadDetailsModal({ isOpen, onClose, session, onAccept, onReject, onEdit, onSessionClick, chatId, onUpdate, onOpenDispute }: LeadDetailsModalProps) {
    const t = useTranslations();
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [b2bLoading, setB2bLoading] = useState(false)
  
  const handleSellB2b = async () => {
    try {
      if (!session.lead_id) return
      setB2bLoading(true)
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession) {
        toast.error(t('Auto.text_9f5cb5'))
        return
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/master/${session.lead_id}/sell_b2b`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authSession.access_token}`
        }
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || t('Auto.text_fbb2be'))
      }
      
      toast.success(t('Auto.text_83d1e2'))
      onClose()
      onUpdate?.()
    } catch (error: any) {
      console.error(error)
      toast.error(error.message)
    } finally {
      setB2bLoading(false)
    }
  }
  
  const submitReject = () => {
    if (!rejectReason.trim()) {
      toast.error(t('Auto.text_7b674b'))
      return
    }
    // We pass the reason via a callback or we can handle the API call here.
    // To make it simple, we can pass it to onReject
    onReject(rejectReason)
    setIsRejecting(false)
    setRejectReason('')
  }

  if (!isOpen || !session) return null

  const leadData = session.master_clients?.leads || session.leads || session || {}
  const isClient = session.status === 'client'
  
  // Parse description to extract embedded budget/city if present
  const rawDescription = session.notes || leadData.description || session.description || t('Auto.text_a5fe90')
  const parsedBudgetMatch = rawDescription.match(/Бюджет:\s*([\s\S]*?)(?=(?:Желаемое время|Бюджет|Город):|$)/i)
  const parsedCityMatch = rawDescription.match(/Город:\s*([\s\S]*?)(?=(?:Желаемое время|Бюджет|Город):|$)/i)
  
  const budgetText = leadData.display_budget || (leadData.client_budget ? `${leadData.client_budget} ${leadData.client_currency || ''}` : (leadData.is_negotiable_budget ? t('negotiableBudget') : (parsedBudgetMatch ? parsedBudgetMatch[1] : null)))
  const cityText = leadData.city_name || leadData.cities?.name_ru || session.city_name || (parsedCityMatch ? parsedCityMatch[1] : null)
  const styleText = session.style || leadData.style || (leadData.title && leadData.title !== t('Auto.text_ea68ee') ? leadData.title : t('Auto.text_591cca'))

  const cleanDescription = rawDescription
    .replace(/(?:Желаемое время|Бюджет|Город):[\s\S]*?(?=(?:Желаемое время|Бюджет|Город):|$)/gi, '')
    .trim()

  const clientName = session.master_clients?.name || session.client_name || session.name || t('crmBoard.unknownClient')
  const clientContact = session.master_clients?.phone || session.master_clients?.telegram || session.master_clients?.email || session.contact || session.email || t('Auto.text_92c541')

  let images = session.reference_images?.length ? session.reference_images : (leadData.image_urls || session.image_urls || [])
  if (typeof images === 'string') {
    try { images = JSON.parse(images) } catch (e) { images = [images] }
  }
  if (!Array.isArray(images)) images = []
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-neutral-200 dark:border-white/10 flex flex-col max-h-[90vh]"
        >
          <div className="flex justify-between items-center p-6 border-b border-neutral-100 dark:border-white/5 bg-neutral-50/50 dark:bg-neutral-900/50">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <User className="w-6 h-6 text-primary-500" />
              {t('leadDetails')}
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
                className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center shrink-0 cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all"
                title={t('Auto.text_192360')}
              >
                <User className="w-8 h-8 text-primary-500" />
              </div>
              <div>
                <h3 
                  onClick={() => setIsClientModalOpen(true)}
                  className="text-xl font-bold text-neutral-900 dark:text-white mb-1 cursor-pointer hover:text-primary-600 transition-colors"
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

            {/* City Location */}
            {cityText && (
              <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800/50 w-fit px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">{cityText}</span>
              </div>
            )}

            {/* Images Carousel */}
            {images.length > 0 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-700">
                {images.map((img: string, i: number) => (
                  <div 
                    key={i} 
                    className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden shrink-0 cursor-pointer border border-neutral-200 dark:border-white/10 group"
                    onClick={() => setSelectedImage(img)}
                  >
                    <Image src={img} alt="Reference" fill className="object-cover group-hover:scale-110 transition-transform" />
                  </div>
                ))}
              </div>
            )}

            {/* Preferences / Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Style Badge */}
              <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 px-4 py-3 rounded-2xl flex items-center gap-3 border border-purple-100 dark:border-purple-500/20">
                <Palette className="w-5 h-5 shrink-0" />
                <div className="text-sm">
                  <span className="font-bold block">{t('leadWizard.styleLabel')}</span>
                  {styleText}
                </div>
              </div>

              {/* Budget Badge */}
              {budgetText && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-2xl flex items-center gap-3 border border-emerald-100 dark:border-emerald-500/20">
                  <DollarSign className="w-5 h-5 shrink-0" />
                  <div className="text-sm">
                    <span className="font-bold block">{t('budgetLabel')}</span>
                    {budgetText}
                  </div>
                </div>
              )}


              {/* Date Badge */}
              {(leadData.session_date || (!leadData.id && session.session_date)) && (
                <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 px-4 py-3 rounded-2xl flex items-center gap-3 border border-rose-100 dark:border-rose-500/20">
                  <Calendar className="w-5 h-5 shrink-0" />
                  <div className="text-sm">
                    <span className="font-bold block">{t('Auto.text_8cdd8b')}</span>
                    {new Date(leadData.session_date || session.session_date).toLocaleDateString('ru-RU')}{(leadData.session_time || session.start_time) ? ` ${(leadData.session_time || session.start_time).slice(0, 5)}` : ''}
                  </div>
                </div>
              )}

              {/* Place Badge */}
              {(leadData.body_place || session.body_place) && (
                <div className="bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 px-4 py-3 rounded-2xl flex items-center gap-3 border border-sky-100 dark:border-sky-500/20">
                  <PersonStanding className="w-5 h-5 shrink-0" />
                  <div className="text-sm">
                    <span className="font-bold block">{t('crmBoard.placeLabel')}</span>
                    {leadData.body_place || session.body_place}
                  </div>
                </div>
              )}

              {/* Size Badge */}
              {(leadData.size || session.size) && (
                <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-4 py-3 rounded-2xl flex items-center gap-3 border border-amber-100 dark:border-amber-500/20">
                  <Maximize2 className="w-5 h-5 shrink-0" />
                  <div className="text-sm">
                    <span className="font-bold block">{t('crmBoard.sizeLabel')}</span>
                    {leadData.size || session.size}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-5 border border-neutral-100 dark:border-white/5">
              <p className="text-neutral-600 dark:text-neutral-300 text-sm leading-relaxed whitespace-pre-wrap">
                {cleanDescription || t('Auto.text_a5fe90')}
              </p>
            </div>

          </div>

          <div className="p-6 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-white/5 flex gap-3">
            {session.status === 'new' ? (
              <>
                <button 
                  onClick={() => setIsRejecting(true)}
                  className="flex-1 py-3.5 px-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold transition-colors"
                >
                  {t('Auto.text_8b0d89')}
                                                  </button>
                <button 
                  onClick={() => { onClose(); onAccept(); }}
                  className="flex-1 py-3.5 px-4 bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-500/25 rounded-xl font-bold transition-all hover:scale-[1.02]"
                >
                  {t('Auto.text_267bcd')}
                                                  </button>
              </>
            ) : (
              <>
                {session.status === 'cancelled' && leadData?.id && onOpenDispute && (
                  <button 
                    onClick={() => { onClose(); onOpenDispute(); }}
                    className="flex-1 py-3.5 px-4 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-xl font-bold transition-colors"
                  >
                    {t('Auto.text_474163')}
                                                            </button>
                )}
                <button 
                  onClick={onClose}
                  className="flex-1 py-3.5 px-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold transition-colors"
                >
                  {t('Auto.text_dd9463')}
                                                      </button>
                {onEdit && session.status !== 'cancelled' && (
                  <button 
                    onClick={() => { onClose(); onEdit(); }}
                    className="flex-1 py-3.5 px-4 bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-500/25 rounded-xl font-bold transition-all hover:scale-[1.02]"
                  >
                    {t('edit')}
                                                            </button>
                )}
              </>
            )}
          </div>

          {session.status === 'new' && session.lead_id && (
            <div className="pb-4 px-6 bg-white dark:bg-neutral-900 flex justify-center border-t-0">
              <button 
                onClick={handleSellB2b}
                disabled={b2bLoading}
                className="text-sm text-neutral-400 hover:text-primary-500 underline underline-offset-2 transition-colors flex items-center gap-2"
              >
                {b2bLoading ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : null}
                {t('Auto.text_dd07b6')}
                                            </button>
            </div>
          )}

          {isRejecting && (
            <div className="absolute inset-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">{t('Auto.text_5dd299')}</h3>
              <p className="text-sm text-neutral-500 mb-6 text-center max-w-sm">
                {t('Auto.text_beda01')}
                                            </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('Auto.text_d08a97')}
                className="w-full max-w-md bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 rounded-xl p-4 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[120px] resize-none mb-6"
              />
              <div className="flex gap-3 w-full max-w-md">
                <button
                  onClick={() => {
                    setIsRejecting(false)
                    setRejectReason('')
                  }}
                  className="flex-1 py-3 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
                >
                  {t('cancel')}
                                                  </button>
                <button
                  onClick={() => {
                    if (!rejectReason.trim()) {
                      toast.error(t('Auto.text_7e131f'))
                      return
                    }
                    onReject(rejectReason.trim())
                    setIsRejecting(false)
                    setRejectReason('')
                    onClose()
                  }}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-500/20"
                >
                  {t('Auto.text_b1185f')}
                                                  </button>
              </div>
            </div>
          )}
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
          onUpdate={() => {}}
          onSessionClick={(s) => {
            setIsClientModalOpen(false)
            onClose()
            onSessionClick?.(s)
          }}
          chatId={chatId || session.master_clients?.chat_id}
        />
      )}
    </AnimatePresence>
  )
}
