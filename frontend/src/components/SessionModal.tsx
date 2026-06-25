import { useState, useEffect } from 'react'
import { X, User, Clock, FileText, Upload, Calendar as CalendarIcon, Tag, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { CRMClient } from './CRMBoard'

interface SessionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialDate: string | null
  existingClients: CRMClient[]
}

export function SessionModal({ isOpen, onClose, onSuccess, initialDate, existingClients }: SessionModalProps) {
  const [loading, setLoading] = useState(false)
  const [isNewClient, setIsNewClient] = useState(false)
  
  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '',
    contact_info: '',
    session_date: '',
    start_time: '',
    end_time: '',
    price: '',
    style: '',
    notes: ''
  })
  const [images, setImages] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFormData({
        client_id: '',
        client_name: '',
        contact_info: '',
        session_date: initialDate || '',
        start_time: '',
        end_time: '',
        price: '',
        style: '',
        notes: ''
      })
      setIsNewClient(false)
      setImages([])
    }
  }, [isOpen, initialDate])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('sb-access-token='))?.split('=')[1]
      
      let finalClientId = formData.client_id

      // 1. If new client, create client first
      if (isNewClient) {
        if (!formData.client_name) {
          toast.error('Введите имя клиента')
          setLoading(false)
          return
        }
        
        const clientRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/crm/clients`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: formData.client_name,
            contact_info: formData.contact_info,
            notes: formData.notes
          })
        })
        
        if (!clientRes.ok) throw new Error('Ошибка при создании клиента')
        const newClient = await clientRes.json()
        finalClientId = newClient.id
      } else {
        if (!finalClientId) {
          toast.error('Выберите клиента')
          setLoading(false)
          return
        }
      }

      // 2. Upload images
      setIsUploading(true)
      let imageUrls: string[] = []
      for (const file of images) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `${fileName}`
        
        const { error: uploadError } = await supabase.storage
          .from('lead_images')
          .upload(filePath, file)
          
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('lead_images')
            .getPublicUrl(filePath)
          if (publicUrlData) imageUrls.push(publicUrlData.publicUrl)
        }
      }
      setIsUploading(false)

      // 3. Create Session
      const sessionRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/crm/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: finalClientId,
          session_date: formData.session_date,
          start_time: formData.start_time || null,
          end_time: formData.end_time || null,
          price: formData.price ? parseFloat(formData.price) : null,
          style: formData.style,
          reference_images: imageUrls
        })
      })

      if (!sessionRes.ok) throw new Error('Ошибка при создании сеанса')

      toast.success('Сеанс успешно создан')
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'Произошла ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
        <div className="flex justify-between items-center p-6 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-xl font-bold flex items-center gap-2 text-neutral-900 dark:text-white">
            <CalendarIcon className="w-5 h-5 text-cyan-500" />
            Создать сеанс
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Client Selection */}
          <div className="space-y-4 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Клиент *</label>
              <button
                type="button"
                onClick={() => setIsNewClient(!isNewClient)}
                className="text-xs font-bold flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 transition-colors"
              >
                {isNewClient ? 'Выбрать существующего' : <><Plus className="w-3 h-3"/> Добавить нового</>}
              </button>
            </div>

            {isNewClient ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    required={isNewClient}
                    value={formData.client_name}
                    onChange={(e) => setFormData(p => ({ ...p, client_name: e.target.value }))}
                    placeholder="Имя клиента *"
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all outline-none"
                  />
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.contact_info}
                    onChange={(e) => setFormData(p => ({ ...p, contact_info: e.target.value }))}
                    placeholder="Контакты (Тел/TG)"
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all outline-none"
                  />
                </div>
              </div>
            ) : (
              <select
                required={!isNewClient}
                value={formData.client_id}
                onChange={(e) => setFormData(p => ({ ...p, client_id: e.target.value }))}
                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none"
              >
                <option value="">Выберите клиента...</option>
                {existingClients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.contact_info ? `(${c.contact_info})` : ''}</option>
                ))}
              </select>
            )}
          </div>

          {/* Session Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Дата сеанса *</label>
              <input
                type="date"
                required
                value={formData.session_date}
                onChange={(e) => setFormData(p => ({ ...p, session_date: e.target.value }))}
                className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none font-medium"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Начало</label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(p => ({ ...p, start_time: e.target.value }))}
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Конец</label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData(p => ({ ...p, end_time: e.target.value }))}
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Стиль татуировки</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  value={formData.style}
                  onChange={(e) => setFormData(p => ({ ...p, style: e.target.value }))}
                  placeholder="Напр. Традишнл, Графика"
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Стоимость</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(p => ({ ...p, price: e.target.value }))}
                placeholder="0.00"
                className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Фото-референсы</label>
            <div className="flex flex-wrap gap-3">
              {images.map((file, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800">
                  <img src={URL.createObjectURL(file)} alt="ref" className="w-full h-full object-cover" />
                  <button 
                    type="button" 
                    onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
              <label className="w-16 h-16 rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex flex-col items-center justify-center text-neutral-500 hover:text-cyan-500 hover:border-cyan-500 transition-colors cursor-pointer bg-neutral-50 dark:bg-neutral-800/50">
                <Upload className="w-4 h-4 mb-0.5" />
                <span className="text-[9px] font-medium uppercase tracking-wider">Добавить</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files) {
                      const newFiles = Array.from(e.target.files)
                      setImages(prev => [...prev, ...newFiles])
                    }
                  }} 
                />
              </label>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || isUploading}
              className="w-full flex items-center justify-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold py-3.5 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all shadow-lg disabled:opacity-50"
            >
              {(loading || isUploading) ? (
                <div className="w-5 h-5 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin" />
              ) : (
                'Сохранить сеанс'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
