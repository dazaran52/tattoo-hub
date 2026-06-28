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
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [publishToPortfolio, setPublishToPortfolio] = useState(true)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(prev => [...prev, ...Array.from(e.target.files!)])
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

      // 1. Upload images
      const imageUrls: string[] = []
      for (const file of images) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${session?.user.id}/${fileName}`

        const { error: uploadError, data } = await supabase.storage
          .from('portfolio')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('portfolio')
          .getPublicUrl(filePath)

        if (publicUrlData) {
          imageUrls.push(publicUrlData.publicUrl)
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
          publish_to_portfolio: publishToPortfolio
        })
      })

      if (!res.ok) throw new Error('Failed to complete session')

      toast.success('Сеанс завершен!')
      onSuccess()
      onClose()
    } catch (e) {
      console.error(e)
      toast.error('Ошибка при завершении сеанса')
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
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
              <h2 className="text-xl font-bold">Завершение сеанса</h2>
              <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-neutral-500 mb-6">
              Загрузите фотографии результата (зажившая работа или сразу после сеанса).
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                  Фотографии результата
                </label>
                <div className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl p-4 text-center hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="portfolio-upload"
                  />
                  <label htmlFor="portfolio-upload" className="cursor-pointer flex flex-col items-center gap-2 text-neutral-500">
                    <Upload className="w-8 h-8" />
                    <span className="text-sm font-semibold">Нажмите для выбора файлов</span>
                  </label>
                </div>
                
                {images.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {images.map((img, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                        <img src={URL.createObjectURL(img)} alt="" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={publishToPortfolio}
                  onChange={e => setPublishToPortfolio(e.target.checked)}
                  className="w-5 h-5 rounded border-neutral-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-sm font-medium">Опубликовать фото в моем публичном портфолио</span>
              </label>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                Завершить сеанс
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
