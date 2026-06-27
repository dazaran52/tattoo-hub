'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Upload, Loader2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Lead } from './LeadsFeed'
import imageCompression from 'browser-image-compression'

interface DisputeModalProps {
  isOpen: boolean
  onClose: () => void
  lead: Lead
}

export function DisputeModal({ isOpen, onClose, lead }: DisputeModalProps) {
  const [reason, setReason] = useState('')
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
        const filePath = `disputes/${fileName}`

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
      toast.error('Укажите причину спора')
      return
    }
    if (imageUrls.length === 0) {
      toast.error('Прикрепите как минимум 1 скриншот переписки')
      return
    }

    try {
      setIsSubmitting(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/disputes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lead_id: lead.id,
          reason,
          screenshots: imageUrls
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.detail || 'Failed to create dispute')
      }

      toast.success('Жалоба успешно отправлена на рассмотрение')
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
        <div className="p-6">
          <button onClick={onClose} className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Оспорить лид</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Причина возврата</label>
              <textarea 
                required
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                placeholder="Клиент не отвечает, оказался в другой стране и т.д."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Скриншоты переписки (ОБЯЗАТЕЛЬНО)</label>
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
              className="w-full py-3 mt-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Отправить жалобу
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
