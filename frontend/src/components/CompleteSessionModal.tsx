import { useTranslations } from "next-intl";
import Image from 'next/image'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, Loader2, Image as ImageIcon } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

interface CompleteSessionModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
  onSuccess: () => void
}

export function CompleteSessionModal({ isOpen, onClose, sessionId, onSuccess }: CompleteSessionModalProps) {
    const t = useTranslations();
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [description, setDescription] = useState('')
  const [publishToPortfolio, setPublishToPortfolio] = useState(true)
  const [sendReviewRequest, setSendReviewRequest] = useState(true)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files)
      if (images.length + filesArray.length > 5) {
        toast.error(t('Auto.text_3764e8'))
        return
      }
      // Check sizes
      const oversized = filesArray.find(f => f.size > 50 * 1024 * 1024)
      if (oversized) {
        toast.error(`Файл ${oversized.name} превышает 50 МБ`)
        return
      }
      setImages(prev => [...prev, ...filesArray])
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      // 1. Upload media
      const portfolioMedia: { url: string, type: string }[] = []
      const imageUrls: string[] = []
      for (const file of images) {
        const fileExt = file.name.split('.').pop()
        const isVideo = file.type.startsWith('video/')
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${session?.user.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('portfolio')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('portfolio')
          .getPublicUrl(filePath)

        if (publicUrlData) {
          portfolioMedia.push({
            url: publicUrlData.publicUrl,
            type: isVideo ? 'video' : 'image'
          })
          if (!isVideo) {
             imageUrls.push(publicUrlData.publicUrl)
          }
        }
      }

      // 2. Call backend
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/crm/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          result_image_urls: imageUrls,
          portfolio_media: portfolioMedia,
          description: description,
          publish_to_portfolio: publishToPortfolio,
          send_review_request: sendReviewRequest,
          end_time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        })
      })

      if (!res.ok) throw new Error('Failed to complete session')

      toast.success(t('Auto.text_27a90e'))
      onSuccess()
      onClose()
    } catch (e) {
      console.error(e)
      toast.error(t('Auto.text_a1fd7c'))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-neutral-200 dark:border-neutral-800"
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{t('Auto.text_61e71f')}</h2>
              <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-neutral-500 mb-6">
              {t('Auto.text_6b4638')}
                                      </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                  {t('Auto.text_9734c2')}
                                                  </label>
                {images.length < 5 && (
                  <div className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl p-4 text-center hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="portfolio-upload"
                    />
                    <label htmlFor="portfolio-upload" className="cursor-pointer flex flex-col items-center gap-2 text-neutral-500">
                      <Upload className="w-8 h-8" />
                      <span className="text-sm font-semibold">{t('Auto.text_84df5d')}</span>
                    </label>
                  </div>
                )}
                
                {images.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {images.map((file, i) => {
                      const isVid = file.type.startsWith('video/')
                      const url = URL.createObjectURL(file)
                      return (
                        <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                          {isVid ? (
                            <video src={url} className="w-full h-full object-cover" />
                          ) : (
                            <Image src={url || ''} alt="" className="w-full h-full object-cover"  width={800} height={800} />
                          )}
                          <button 
                            onClick={() => removeImage(i)}
                            className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {publishToPortfolio && (
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                    {t('Auto.text_1c6332')}
                                                        </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder={t('Auto.text_808acd')}
                    className="w-full h-24 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none text-sm"
                  />
                </div>
              )}

              <label className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={publishToPortfolio}
                  onChange={e => setPublishToPortfolio(e.target.checked)}
                  className="w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium">{t('Auto.text_87a3ad')}</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={sendReviewRequest}
                  onChange={e => setSendReviewRequest(e.target.checked)}
                  className="w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium">{t('Auto.text_6cee16')}</span>
              </label>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                {t('Auto.text_103592')}
                                            </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
