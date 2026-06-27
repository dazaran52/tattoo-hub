'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Upload, Loader2, Gavel } from 'lucide-react'
import toast from 'react-hot-toast'
import { Lead } from './LeadsFeed'
import imageCompression from 'browser-image-compression'

interface AuctionModalProps {
  isOpen: boolean
  onClose: () => void
  lead: Lead
}

export function AuctionModal({ isOpen, onClose, lead }: AuctionModalProps) {
  const [reason, setReason] = useState('')
  const [clientStyle, setClientStyle] = useState('')
  const [expectedPrice, setExpectedPrice] = useState('')
  const [startPrice, setStartPrice] = useState(10)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [imageUrls, setImageUrls] = useState<string[]>([])

  if (!isOpen) return null

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    try {
      setUploadingImages(true)
      const newUrls: string[] = []
      
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `auctions/${fileName}`

        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1024,
          useWebWorker: true,
        }
        
        const compressedFile = await imageCompression(file, options)

        const { error: uploadError } = await supabase.storage
          .from('lead_images')
          .upload(filePath, compressedFile)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('lead_images')
          .getPublicUrl(filePath)
          
        newUrls.push(publicUrlData.publicUrl)
      }

      setImageUrls([...imageUrls, ...newUrls])
    } catch (err: any) {
      toast.error(`Image upload failed: ${err.message}`)
    } finally {
      setUploadingImages(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      toast.error('Укажите почему вы сливаете лид')
      return
    }

    try {
      setIsSubmitting(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auctions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lead_id: lead.id,
          reason,
          client_style: clientStyle,
          expected_price: expectedPrice,
          start_price: startPrice,
          screenshots: imageUrls
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.detail || 'Failed to create auction')
      }

      toast.success('Лид успешно отправлен на Аукцион!')
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <button onClick={onClose} className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Gavel className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Отправить на Аукцион</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Причина слива лида (Обязательно)</label>
              <textarea 
                required
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={2}
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Клиент хочет реализм, а я бью графику"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Стиль общения клиента</label>
              <input 
                type="text"
                value={clientStyle}
                onChange={e => setClientStyle(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Адекватный, знает что хочет"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">На какую сумму рассчитывал клиент?</label>
              <input 
                type="text"
                value={expectedPrice}
                onChange={e => setExpectedPrice(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Около 5000 CZK"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Стартовая цена на аукционе (Кредиты)</label>
              <input 
                type="number"
                min="5"
                required
                value={startPrice}
                onChange={e => setStartPrice(parseInt(e.target.value))}
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Скриншоты переписки</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {imageUrls.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
                    <img src={url} className="w-full h-full object-cover" alt="screenshot" />
                    <button 
                      type="button" 
                      onClick={() => setImageUrls(imageUrls.filter((_, idx) => idx !== i))}
                      className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              
              <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors">
                {uploadingImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>{uploadingImages ? 'Загрузка...' : 'Добавить скриншот'}</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImages} />
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || uploadingImages}
              className="w-full py-3 mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Начать Аукцион
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
