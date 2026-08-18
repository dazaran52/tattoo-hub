import { useTranslations } from "next-intl";
import React, { useState } from 'react'
import Image from 'next/image'
import { X, Calendar, Palette, Maximize2, MapPin, DollarSign, Clock, PersonStanding } from 'lucide-react'
import { ImageViewerModal } from './ImageViewerModal'

interface ClientLeadDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  lead: any
  onNavigateToCRM?: () => void
}

export function ClientLeadDetailsModal({ isOpen, onClose, lead, onNavigateToCRM }: ClientLeadDetailsModalProps) {
    const t = useTranslations();
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  if (!isOpen || !lead) return null

  let images = lead.reference_images?.length ? lead.reference_images : lead.image_urls || []
  if (typeof images === 'string') {
    try { images = JSON.parse(images) } catch (e) { images = [images] }
  }
  if (!Array.isArray(images)) images = []

  const cleanDescription = lead.description?.replace(/(?:Желаемое время|Бюджет|Город):[\s\S]*?(?=(?:Желаемое время|Бюджет|Город):|$)/gi, '').trim()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-[2rem] p-6 shadow-2xl border border-white/10 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-black mb-6 text-neutral-900 dark:text-white">{t('leadDetails')}</h2>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center text-primary-600 dark:text-primary-400">
              <Maximize2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-bold uppercase">{t('crmBoard.sizeLabel')}</p>
              <p className="font-semibold text-neutral-900 dark:text-white">{lead.size || t('key_cdded4')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-bold uppercase">{t('leadWizard.styleLabel')}</p>
              <p className="font-semibold text-neutral-900 dark:text-white">{lead.style || t('key_cdded4')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <PersonStanding className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-bold uppercase">{t('crmBoard.placeLabel')}</p>
              <p className="font-semibold text-neutral-900 dark:text-white">{lead.body_place || t('key_7cddff')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-bold uppercase">{t('leadWizard.cityLabel')}</p>
              <p className="font-semibold text-neutral-900 dark:text-white">
                {lead.cities?.name_ru || lead.city_name || t('key_cdded4')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-bold uppercase">{t('budgetLabel')}</p>
              <p className="font-semibold text-neutral-900 dark:text-white">
                {lead.is_negotiable_budget ? t('key_bea4da') : `${lead.client_budget} ${lead.client_currency || 'CZK'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-bold uppercase">{t('crmBoard.list.statusColumn')}</p>
              <p className="font-semibold text-neutral-900 dark:text-white">
                {['new', 'open', 'active'].includes(lead.status) ? t('statusSearching') : lead.status === 'accepted' ? t('statusAccepted') : lead.status}
              </p>
            </div>
          </div>
        </div>

        {images.length > 0 && (
          <div className="mt-6">
            <p className="text-xs text-neutral-500 font-bold uppercase mb-3">{t('key_b46518')}{images.length})</p>
            <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
              {images.map((img: string, i: number) => (
                <div 
                  key={i} 
                  className="w-24 h-24 shrink-0 rounded-xl overflow-hidden relative border border-neutral-200 dark:border-white/10 snap-start cursor-pointer group"
                  onClick={() => setSelectedImage(img)}
                >
                  <Image src={img} alt="Reference" fill className="object-cover group-hover:scale-110 transition-transform" />
                </div>
              ))}
            </div>
          </div>
        )}

        {cleanDescription && (
          <div className="mt-6 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800">
            <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{cleanDescription}</p>
          </div>
        )}

        <div className="mt-8 flex gap-3">
          {onNavigateToCRM && (
            <button
              onClick={onNavigateToCRM}
              className="flex-1 py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-colors"
            >
              {t('key_55db8e')}
                                      </button>
          )}
        </div>
      </div>

      <ImageViewerModal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        imageUrl={selectedImage || ''}
      />
    </div>
  )
}
