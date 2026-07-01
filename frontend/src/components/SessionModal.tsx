import { useState, useEffect } from 'react'
import { X, User, Clock, FileText, Upload, Calendar as CalendarIcon, Tag, Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { CRMClient } from './ClientsDatabase'
import { CRMSession } from './CRMBoard'
import { PhoneInput } from './PhoneInput'

interface SessionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialDate?: string | null
  initialClientId?: string | null
  existingClients: CRMClient[]
  editSession?: CRMSession | null
}

export function SessionModal({ isOpen, onClose, onSuccess, initialDate, initialClientId, existingClients, editSession }: SessionModalProps) {
  const [loading, setLoading] = useState(false)
  const [isNewClient, setIsNewClient] = useState(false)
  const [clientSearchText, setClientSearchText] = useState('')
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false)
  
  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '',
    phone: '',
    telegram: '',
    instagram: '',
    email: '',
    session_date: '',
    start_time: '',
    end_time: '',
    price: '',
    style: '',
    notes: ''
  })
  const [images, setImages] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (editSession) {
        setFormData({
          client_id: editSession.master_clients?.id || '',
          client_name: editSession.master_clients?.name || '',
          phone: '',
          telegram: '',
          instagram: '',
          email: '',
          session_date: editSession.session_date || '',
          start_time: editSession.start_time || '',
          end_time: editSession.end_time || '',
          price: editSession.price ? editSession.price.toString() : '',
          style: editSession.style || '',
          notes: ''
        })
        setIsNewClient(false)
        setImages([])
        // Assuming reference_images exist on editSession, though we might need to add it to CRMSession interface if needed
        setExistingImages((editSession as any).reference_images || [])
      } else {
        setFormData({
          client_id: initialClientId || '',
          client_name: '',
          phone: '',
          telegram: '',
          instagram: '',
          email: '',
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
    }
  }, [isOpen, initialDate, initialClientId, editSession])

  if (!isOpen) return null

  const handleDelete = async () => {
    if (!editSession) return
    if (!window.confirm('Вы уверены, что хотите удалить этот сеанс?')) return
    
    setLoading(true)
    try {
      const { error } = await supabase.from('master_sessions')
        .update({ is_deleted: true })
        .eq('id', editSession.id)
        
      if (error) throw error
      
      toast.success('Сеанс удален')
      onSuccess()
      onClose()
    } catch (e: any) {
      toast.error(e.message || 'Ошибка удаления')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSession = async () => {
    if (!editSession) return
    if (!window.confirm('Вы уверены, что хотите отменить этот сеанс?')) return
    
    setLoading(true)
    try {
      const { error } = await supabase.from('master_sessions')
        .update({ status: 'cancelled' })
        .eq('id', editSession.id)
        
      if (error) throw error
      
      toast.success('Сеанс отменен')
      onSuccess()
      onClose()
    } catch (e: any) {
      toast.error(e.message || 'Ошибка отмены сеанса')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      let finalClientId = formData.client_id

      if (!editSession) {
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
              contact_info: formData.phone || formData.telegram || formData.instagram || '',
              phone: formData.phone,
              telegram: formData.telegram,
              instagram: formData.instagram,
              email: formData.email,
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
      }

      // 2. Upload images
      setIsUploading(true)
      let imageUrls: string[] = [...existingImages]
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

      // 3. Create or Edit Session
      const url = editSession 
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/crm/sessions/${editSession.id}`
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/crm/sessions`
      
      const method = editSession ? 'PUT' : 'POST'
      const allImages = [...existingImages, ...imageUrls]
      
      const bodyPayload = editSession ? {
        session_date: formData.session_date,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        price: formData.price ? parseFloat(formData.price) : null,
        style: formData.style,
        reference_images: allImages
      } : {
        client_id: finalClientId,
        session_date: formData.session_date,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        price: formData.price ? parseFloat(formData.price) : null,
        style: formData.style,
        reference_images: allImages
      }

      if (editSession) {
        const { error } = await supabase.from('master_sessions').update(bodyPayload).eq('id', editSession.id)
        if (error) throw error
      } else {
        // New session
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')
        
        const session_data = {
            master_id: user.id,
            client_id: bodyPayload.client_id,
            session_date: bodyPayload.session_date,
            start_time: bodyPayload.start_time,
            end_time: bodyPayload.end_time,
            price: bodyPayload.price,
            style: bodyPayload.style,
            reference_images: bodyPayload.reference_images,
            status: "new"
        }
        const { error } = await supabase.from('master_sessions').insert(session_data)
        if (error) throw error
      }

      toast.success(editSession ? 'Сеанс обновлен' : 'Сеанс успешно создан')
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'Произошла ошибка')
    } finally {
      setLoading(false)
    }
  }

  const isClientLocked = (!!initialClientId && existingClients.length === 1 && existingClients[0].id === initialClientId) || !!editSession

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
        <div className="flex justify-between items-center p-6 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-xl font-bold flex items-center gap-2 text-neutral-900 dark:text-white">
            <CalendarIcon className="w-5 h-5 text-cyan-500" />
            {editSession ? 'Редактировать сеанс' : 'Создать сеанс'}
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
              {!isClientLocked && (
                <button
                  type="button"
                  onClick={() => setIsNewClient(!isNewClient)}
                  className="text-xs font-bold flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 transition-colors"
                >
                  {isNewClient ? 'Выбрать существующего' : <><Plus className="w-3 h-3"/> Добавить нового</>}
                </button>
              )}
            </div>

            {isNewClient ? (
              <div className="space-y-4">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <PhoneInput
                      value={formData.phone}
                      onChange={(val) => setFormData(p => ({ ...p, phone: val }))}
                      placeholder="Телефон"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                      placeholder="Email"
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.telegram}
                      onChange={(e) => setFormData(p => ({ ...p, telegram: e.target.value }))}
                      placeholder="Telegram"
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all outline-none"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.instagram}
                      onChange={(e) => setFormData(p => ({ ...p, instagram: e.target.value }))}
                      placeholder="Instagram"
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative">
                {isClientLocked ? (
                  <input 
                    type="text" 
                    value={existingClients.find(c => c.id === formData.client_id)?.name || editSession?.master_clients?.name || ''} 
                    disabled 
                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-sm outline-none opacity-70"
                  />
                ) : (
                  <>
                    <input
                      type="text"
                      required={!isNewClient && !formData.client_id}
                      value={formData.client_id ? existingClients.find(c => c.id === formData.client_id)?.name : clientSearchText}
                      onChange={(e) => {
                        setFormData(p => ({ ...p, client_id: '' }))
                        setClientSearchText(e.target.value)
                        setIsClientDropdownOpen(true)
                      }}
                      onFocus={() => setIsClientDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setIsClientDropdownOpen(false), 200)}
                      placeholder="Поиск по имени или телефону..."
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none"
                    />
                    {isClientDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                        {existingClients.filter(c => {
                          const search = clientSearchText.toLowerCase()
                          return c.name.toLowerCase().includes(search) || 
                                 (c.phone || '').toLowerCase().includes(search) || 
                                 (c.contact_info || '').toLowerCase().includes(search)
                        }).map(c => (
                          <div 
                            key={c.id}
                            className="px-4 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer text-sm"
                            onClick={() => {
                              setFormData(p => ({ ...p, client_id: c.id }))
                              setClientSearchText('')
                              setIsClientDropdownOpen(false)
                            }}
                          >
                            <div className="font-medium text-neutral-900 dark:text-white">{c.name}</div>
                            <div className="text-xs text-neutral-500">{c.phone || c.contact_info || 'Нет контактов'}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
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
              <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Стоимость (Kč)</label>
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
              {existingImages.map((url, idx) => (
                <div key={`ext-${idx}`} className="relative w-16 h-16 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800">
                  <img src={url} alt="ref" className="w-full h-full object-cover" />
                  <button 
                    type="button" 
                    onClick={() => setExistingImages(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
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

          <div className="pt-2 flex gap-3">
            {editSession && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading || isUploading}
                className="flex items-center justify-center p-3.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50"
                title="Удалить сеанс"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            {editSession && editSession.status !== 'cancelled' && (
              <button
                type="button"
                onClick={handleCancelSession}
                disabled={loading || isUploading}
                className="flex items-center justify-center px-4 py-3.5 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold rounded-xl hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors disabled:opacity-50 text-sm shrink-0"
                title="Отменить сеанс"
              >
                Отменить
              </button>
            )}
            <button
              type="submit"
              disabled={loading || isUploading}
              className="flex-1 flex items-center justify-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold py-3.5 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all shadow-lg disabled:opacity-50"
            >
              {(loading || isUploading) ? (
                <div className="w-5 h-5 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin" />
              ) : (
                editSession ? 'Сохранить изменения' : 'Сохранить сеанс'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
