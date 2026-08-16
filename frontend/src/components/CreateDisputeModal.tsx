import { useTranslations } from "next-intl";
import { useState, useRef } from 'react'
import { X, Upload, Trash2, ShieldAlert } from 'lucide-react'
import Image from 'next/image'
import imageCompression from 'browser-image-compression'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface CreateDisputeModalProps {
  isOpen: boolean
  onClose: () => void
  leadId: string
  onSuccess: () => void
}

export function CreateDisputeModal({ isOpen, onClose, leadId, onSuccess }: CreateDisputeModalProps) {
    const t = useTranslations();
  const [reason, setReason] = useState('')
  const [images, setImages] = useState<{ file: File; preview: string }[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    
    try {
      const newImages = Array.from(e.target.files)
      if (images.length + newImages.length > 5) {
        toast.error(t('Auto.text_3cca3b'))
        return
      }

      const compressedImages = await Promise.all(
        newImages.map(async (file) => {
          const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true
          }
          const compressed = await imageCompression(file, options)
          return {
            file: compressed,
            preview: URL.createObjectURL(compressed)
          }
        })
      )
      
      setImages(prev => [...prev, ...compressedImages])
    } catch (error) {
      toast.error(t('Auto.text_cd1471'))
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev]
      URL.revokeObjectURL(newImages[index].preview)
      newImages.splice(index, 1)
      return newImages
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      toast.error(t('Auto.text_d8ef4d'))
      return
    }

    setIsSubmitting(true)
    try {
      // 1. Upload images
      const uploadedUrls: string[] = []
      for (const img of images) {
        const ext = img.file.name.split('.').pop()
        const filename = `${Math.random().toString(36).substring(2)}_${Date.now()}.${ext}`
        const filePath = `${leadId}/${filename}`
        
        const { error: uploadError } = await supabase.storage
          .from('dispute_media')
          .upload(filePath, img.file)
          
        if (uploadError) throw uploadError

        const { data } = supabase.storage
          .from('dispute_media')
          .getPublicUrl(filePath)
          
        uploadedUrls.push(data.publicUrl)
      }

      // 2. Submit dispute
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(`${apiUrl}/api/disputes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          lead_id: leadId,
          reason: reason,
          screenshots: uploadedUrls
        })
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Failed to create dispute')
      }

      toast.success(t('Auto.text_33697f'))
      onSuccess()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('Auto.text_1c820c'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center shrink-0 sticky top-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{t('Auto.text_474163')}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-2xl p-4 text-sm text-yellow-800 dark:text-yellow-200 leading-relaxed">
            {t('Auto.text_980ea1')}
                                </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-900 dark:text-white">
              {t('Auto.text_203d84')}
                                      </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl p-4 text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-500 min-h-[120px] resize-none"
              placeholder={t('Auto.text_f66c9c')}
              required
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center justify-between">
              <span>{t('Auto.text_dfed3a')}</span>
              <span className="text-neutral-500 text-xs font-normal">{images.length}/5</span>
            </label>
            
            <div className="grid grid-cols-3 gap-3">
              {images.map((img, index) => (
                <div key={index} className="relative aspect-square rounded-xl overflow-hidden group bg-neutral-100 dark:bg-neutral-800">
                  <Image src={img.preview} alt="Preview" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
              
              {images.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 hover:border-red-500 dark:hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex flex-col items-center justify-center gap-2 text-neutral-500 hover:text-red-600 dark:hover:text-red-400"
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-xs font-medium">{t('Auto.text_5eba28')}</span>
                </button>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              multiple
              accept="image/*"
              className="hidden"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !reason.trim()}
            className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              t('Auto.text_474163')
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
