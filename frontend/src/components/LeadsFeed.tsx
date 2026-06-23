'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { SkeletonCard } from '@/components/SkeletonCard'
import { RefreshCw, Search, Loader2, Plus, Edit2, Trash2, XCircle, ChevronLeft, ChevronRight, Image as ImageIcon, Clock, Bell, BellOff } from 'lucide-react'
import { getTranslation, Language } from '@/lib/i18n'
import { LowBalanceModal } from '@/components/LowBalanceModal'
import { DisputeModal } from '@/components/DisputeModal'
import { AuctionModal } from '@/components/AuctionModal'
import { MasterLeadModal } from '@/components/MasterLeadModal'
import { ProposalModal } from '@/components/ProposalModal'
import { ChatModal } from '@/components/ChatModal'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { playSuccessSound, playErrorSound, triggerHaptic } from '@/lib/sounds'
import imageCompression from 'browser-image-compression'
import { api } from '@/lib/api'
import { ConfirmModal } from '@/components/ConfirmModal'

export interface Lead {
  id: string
  title: string
  description: string
  contacts: string
  unlock_price_local?: number
  master_currency?: string
  base_unlock_price_eur?: number
  is_unlocked: boolean
  image_urls?: string[]
  created_at?: string
  country_id?: string
  city_id?: string
  trust_score?: number
  unlock_status?: string
  unlock_count?: number
  max_unlocks?: number
  client_priority?: string
  lowest_bid?: number
  proposal_status?: string
  chat_id?: string
  display_budget?: string
  is_negotiable_budget?: boolean
}

interface LeadsFeedProps {
  onUnlockSuccess: (newBalance: number) => void
  isAdmin?: boolean
  showOnlyUnlocked?: boolean
  userCities?: string[]
}

export function LeadsFeed({ onUnlockSuccess, isAdmin = false, showOnlyUnlocked = false, userCities = [] }: LeadsFeedProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unlockingId, setUnlockingId] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [filterText, setFilterText] = useState('')
  const [showOtherCities, setShowOtherCities] = useState(false)
  const [language, setLanguage] = useState<string>('cs')
  
  // Custom Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    onConfirm: () => void
    type: 'danger' | 'info' | 'warning'
  } | null>(null)
  
  // Modal & Admin State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLowBalanceModalOpen, setIsLowBalanceModalOpen] = useState(false)
  const [lowBalanceRequiredAmount, setLowBalanceRequiredAmount] = useState(0)
  const [lowBalanceCurrency, setLowBalanceCurrency] = useState('CZK')
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contacts: '',
    base_unlock_price_eur: 5,
    image_urls: [] as string[],
    country_id: '',
    city_id: ''
  })
  
  const [countries, setCountries] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/locations/countries`)
      .then(res => res.json())
      .then(data => setCountries(data))
      .catch(err => console.error(err))
      
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/locations/cities`)
      .then(res => res.json())
      .then(data => setCities(data))
      .catch(err => console.error(err))
  }, [])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [currentImageIndexes, setCurrentImageIndexes] = useState<Record<string, number>>({})

  const [selectedDisputeLead, setSelectedDisputeLead] = useState<Lead | null>(null)
  const [selectedAuctionLead, setSelectedAuctionLead] = useState<Lead | null>(null)
  const [selectedProposalLead, setSelectedProposalLead] = useState<Lead | null>(null)
  const [selectedChatLead, setSelectedChatLead] = useState<Lead | null>(null)
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)

  const togglePushNotifications = async () => {
    if (!('Notification' in window)) {
      toast.error('Браузер не поддерживает уведомления')
      return
    }
    if (Notification.permission === 'denied') {
      toast.error('Уведомления заблокированы в настройках браузера')
      return
    }
    if (pushEnabled) {
      setPushEnabled(false)
      toast.success('Уведомления отключены')
    } else {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setPushEnabled(true)
        toast.success('Уведомления о новых лидах включены! 🔔')
      } else {
        toast.error('Доступ к уведомлениям отклонен')
      }
    }
  }

  const getContactActions = (contacts: string) => {
    const actions = []
    const phoneRegex = /(?:\+?([\d-\s]{8,16}))/g
    const phones = contacts.match(phoneRegex)
    if (phones && phones.length > 0) {
      const cleanPhone = phones[0].replace(/[-\s]/g, '')
      actions.push({
        name: 'WhatsApp',
        href: `https://wa.me/${cleanPhone.replace('+', '')}`,
        color: 'bg-emerald-500 hover:bg-emerald-600 text-white',
        icon: '💬'
      })
      actions.push({
        name: 'Позвонить',
        href: `tel:${cleanPhone}`,
        color: 'bg-blue-500 hover:bg-blue-600 text-white',
        icon: '📞'
      })
    }
    const tgRegex = /(?:t\.me\/|@)([a-zA-Z0-9_]{5,32})/i
    const tgMatch = contacts.match(tgRegex)
    if (tgMatch) {
      actions.push({
        name: 'Telegram',
        href: `https://t.me/${tgMatch[1]}`,
        color: 'bg-sky-500 hover:bg-sky-600 text-white',
        icon: '✈️'
      })
    }
    if (contacts.includes('@') && !contacts.includes('t.me')) {
      actions.push({
        name: 'Email',
        href: `mailto:${contacts.trim()}`,
        color: 'bg-rose-500 hover:bg-rose-600 text-white',
        icon: '✉️'
      })
    }
    return actions
  }

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language as Language, key)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('language') || 'cs'
      setLanguage(savedLang)
    }
  }, [])

  useEffect(() => {
    fetchLeads()

    const channel = supabase.channel('realtime_leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
        // Refresh leads when changes happen (debounced slightly to avoid spam)
        toast('Обновление базы лидов...', { icon: '🔄', duration: 2000 })
        fetchLeads(true)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchLeads = async (background = false) => {
    try {
      if (!background) setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setIsLoading(false)
        document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        window.location.href = '/login'
        return
      }

      const endpoint = isAdmin 
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/leads`
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads`

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch leads')
      }

      const data = await response.json()
      setLeads(data)
    } catch (err) {
      console.error(err)
      setError('Не удалось загрузить лиды. Проверьте соединение.')
    } finally {
      if (!background) setIsLoading(false)
    }
  }

  const handleUnlock = async (leadId: string) => {
    try {
      setUnlockingId(leadId)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads/${leadId}/unlock`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to unlock lead')
      }

      setLeads(currentLeads => 
        currentLeads.map(lead => 
          lead.id === leadId 
            ? { ...lead, contacts: data.contacts, is_unlocked: true } 
            : lead
        )
      )

      if (data.new_balance !== undefined) {
        onUnlockSuccess(data.new_balance)
      }

      // Play success sound and haptic
      playSuccessSound()
      triggerHaptic('success')

    } catch (err: any) {
      if (err.message === 'INSUFFICIENT_CREDITS') {
        playErrorSound()
        triggerHaptic('error')
        const lead = leads.find(l => l.id === leadId)
        if (lead) {
          setLowBalanceRequiredAmount(lead.unlock_price_local || 0)
          setLowBalanceCurrency(lead.master_currency || 'CZK')
          setIsLowBalanceModalOpen(true)
        }
      } else {
        toast.error(err.message || 'Error unlocking lead')
      }
    } finally {
      setUnlockingId(null)
    }
  }

  const handleStatusChange = async (leadId: string, status: string) => {
    try {
      setActionLoadingId(leadId)
      const res = await api.updateLeadStatus(leadId, status)
      setLeads(currentLeads => 
        currentLeads.map(lead => 
          lead.id === leadId ? { ...lead, unlock_status: status, trust_score: res.trust_score } : lead
        )
      )
      toast.success('Статус обновлен')
    } catch (err: any) {
      toast.error(err.message || 'Ошибка обновления статуса')
    } finally {
      setActionLoadingId(null)
    }
  }

  const openLeadModal = (lead?: Lead) => {
    if (lead) {
      setEditingLead(lead)
      setFormData({
        title: lead.title,
        description: lead.description,
        contacts: lead.contacts,
        base_unlock_price_eur: lead.base_unlock_price_eur || 5,
        image_urls: lead.image_urls || [],
        country_id: lead.country_id || '',
        city_id: lead.city_id || ''
      })
    } else {
      setEditingLead(null)
      setFormData({ title: '', description: '', contacts: '', base_unlock_price_eur: 5, image_urls: [], country_id: '', city_id: '' })
    }
    setIsModalOpen(true)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    try {
      setUploadingImages(true)
      const files = Array.from(e.target.files)
      const uploadedUrls: string[] = []

      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1024,
          useWebWorker: true,
        }
        
        const compressedFile = await imageCompression(file, options)

        const { data, error } = await supabase.storage
          .from('lead_images')
          .upload(filePath, compressedFile)

        if (error) throw error

        const { data: publicUrlData } = supabase.storage
          .from('lead_images')
          .getPublicUrl(filePath)
          
        uploadedUrls.push(publicUrlData.publicUrl)
      }

      setFormData(prev => ({
        ...prev,
        image_urls: [...prev.image_urls, ...uploadedUrls]
      }))
    } catch (err: any) {
      toast.error(`Image upload failed: ${err.message}. Make sure 'lead_images' bucket exists and is public.`)
    } finally {
      setUploadingImages(false)
    }
  }

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const isEditing = !!editingLead
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/leads${isEditing ? `/${editingLead.id}` : ''}`
      const method = isEditing ? 'PUT' : 'POST'

      const payload = {
        ...formData,
        country_id: formData.country_id || null,
        city_id: formData.city_id || null
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Failed to save lead')
      const savedLead = await res.json()

      if (isEditing) {
        setLeads(leads.map(l => l.id === savedLead.id ? savedLead : l))
      } else {
        setLeads([savedLead, ...leads])
      }
      
      setIsModalOpen(false)
      toast.success(isEditing ? 'Lead updated!' : 'Lead created!')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteLead = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId)
    const leadTitle = lead ? lead.title : 'этот лид'

    setConfirmModal({
      isOpen: true,
      title: 'Удалить лид',
      message: `${t('confirmDeleteLead')} "${leadTitle}"?`,
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          setActionLoadingId(leadId)
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) return

          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/leads/${leadId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            }
          })

          if (!res.ok) throw new Error('Failed to delete lead')

          setLeads(leads.filter(l => l.id !== leadId))
          toast.success('Lead deleted')
        } catch (err: any) {
          toast.error(err.message)
        } finally {
          setActionLoadingId(null)
        }
      }
    })
  }

  const handleNextImage = (leadId: string, totalImages: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentImageIndexes(prev => ({
      ...prev,
      [leadId]: ((prev[leadId] || 0) + 1) % totalImages
    }))
  }

  const handlePrevImage = (leadId: string, totalImages: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentImageIndexes(prev => ({
      ...prev,
      [leadId]: ((prev[leadId] || 0) - 1 + totalImages) % totalImages
    }))
  }

  const removeImage = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      image_urls: prev.image_urls.filter((_, i) => i !== indexToRemove)
    }))
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  let filteredLeads = filterText 
    ? leads.filter(l => l.title.toLowerCase().includes(filterText.toLowerCase()) || 
                       l.description.toLowerCase().includes(filterText.toLowerCase()))
    : leads

  if (!showOtherCities && !showOnlyUnlocked && userCities.length > 0) {
    filteredLeads = filteredLeads.filter(l => l.city_id && userCities.includes(l.city_id))
  }

  if (showOnlyUnlocked) {
    filteredLeads = filteredLeads.filter(l => l.is_unlocked)
  }



  return (
    <div className="space-y-6">
      <LowBalanceModal 
        isOpen={isLowBalanceModalOpen} 
        onClose={() => setIsLowBalanceModalOpen(false)} 
        requiredAmount={lowBalanceRequiredAmount}
        currency={lowBalanceCurrency} 
      />

      {selectedDisputeLead && (
        <DisputeModal
          isOpen={!!selectedDisputeLead}
          onClose={() => setSelectedDisputeLead(null)}
          lead={selectedDisputeLead}
        />
      )}

      <MasterLeadModal
        isOpen={isMasterModalOpen}
        onClose={() => setIsMasterModalOpen(false)}
        onSuccess={fetchLeads}
        language={language}
        cities={cities}
        countries={countries}
      />

      <ProposalModal 
        isOpen={!!selectedProposalLead}
        onClose={() => setSelectedProposalLead(null)}
        lead={selectedProposalLead}
        language={language}
        onSuccess={() => {
          // Add status "pending" visually? Let's just refetch leads so backend state is shown
          fetchLeads()
          setSelectedProposalLead(null)
          playSuccessSound()
          triggerHaptic('success')
        }}
      />

      <ChatModal
        isOpen={!!selectedChatLead}
        onClose={() => setSelectedChatLead(null)}
        chatId={selectedChatLead?.chat_id || null}
        leadTitle={selectedChatLead?.title || ''}
      />

      {selectedAuctionLead && (
        <AuctionModal
          isOpen={!!selectedAuctionLead}
          onClose={() => setSelectedAuctionLead(null)}
          lead={selectedAuctionLead}
        />
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white hover:text-gray-300"
            onClick={() => setLightboxImage(null)}
          >
            <XCircle className="w-8 h-8" />
          </button>
          <img 
            src={lightboxImage} 
            alt="Fullscreen lead" 
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            <input
              type="text"
              placeholder={t('filterLeads')}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full sm:w-64 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-9 pr-4 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {isAdmin ? (
            <button
              onClick={() => openLeadModal()}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              {t('createLead')}
            </button>
          ) : (
            <button
              onClick={() => setIsMasterModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Разместить заявку
            </button>
          )}
          {!showOnlyUnlocked && userCities.length > 0 && (
            <button
              onClick={() => setShowOtherCities(!showOtherCities)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm transition-colors ${
                showOtherCities 
                  ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white' 
                  : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400'
              }`}
            >
              {showOtherCities ? 'Только мои города' : 'Остальные города'}
            </button>
          )}
          <button
            onClick={togglePushNotifications}
            className={`flex items-center gap-2.5 px-4 py-2 border rounded-full text-sm font-semibold transition-all duration-300 shadow-sm hover:scale-[1.02] ${
              pushEnabled 
                ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/30 dark:border-emerald-500/50 text-emerald-600 dark:text-emerald-400' 
                : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-950 dark:hover:text-white'
            }`}
          >
            {pushEnabled ? (
              <>
                <Bell className="w-4 h-4 text-emerald-500 dark:text-emerald-400 animate-pulse" />
                <span>Уведомления: Вкл</span>
              </>
            ) : (
              <>
                <BellOff className="w-4 h-4 text-neutral-400" />
                <span>Уведомления: Выкл</span>
              </>
            )}
          </button>
          <button
            onClick={() => fetchLeads()}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </button>
        </div>
      </div>

      {leads.length === 0 && !error && (
        <div className="text-center p-12 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Search className="w-8 h-8 text-neutral-500 dark:text-neutral-400" />
          </div>
          <p className="text-neutral-700 dark:text-neutral-300 text-lg mb-2">{t('noLeads')}</p>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">{t('noLeadsDescription')}</p>
        </div>
      )}

      {leads.length > 0 && filteredLeads.length === 0 && !error && (
        <div className="text-center p-12 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Search className="w-8 h-8 text-neutral-500 dark:text-neutral-400" />
          </div>
          <p className="text-neutral-700 dark:text-neutral-300 text-lg mb-2">Ничего не найдено</p>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">
            {showOnlyUnlocked ? 'Вы еще не купили ни одного лида.' : 'По вашему запросу нет лидов.'}
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg">
          {error}
          <button onClick={() => fetchLeads()} className="ml-4 text-sm underline">{t('tryAgain')}</button>
        </div>
      )}
      
      <motion.div 
        layout
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <AnimatePresence mode="popLayout">
          {filteredLeads.map((lead, index) => {
            const hasImages = lead.image_urls && lead.image_urls.length > 0
            const currentImageIdx = currentImageIndexes[lead.id] || 0

            return (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                key={lead.id} 
                className="group relative bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col transition-all hover:shadow-2xl hover:border-neutral-300 dark:hover:border-neutral-600"
              >
              {isAdmin && (
                <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => openLeadModal(lead)}
                    className="p-2 bg-white/90 dark:bg-neutral-900/90 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-neutral-600 hover:text-blue-600 rounded-lg shadow-sm backdrop-blur-sm transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => deleteLead(lead.id)}
                    disabled={actionLoadingId === lead.id}
                    className="p-2 bg-white/90 dark:bg-neutral-900/90 hover:bg-red-50 dark:hover:bg-red-900/30 text-neutral-600 hover:text-red-600 rounded-lg shadow-sm backdrop-blur-sm transition-colors disabled:opacity-50"
                  >
                    {actionLoadingId === lead.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              )}

              {/* Image Carousel */}
              {hasImages && lead.image_urls && (
                <div className="relative w-full h-48 bg-neutral-100 dark:bg-neutral-950 group/carousel">
                  <img 
                    src={lead.image_urls[currentImageIdx]} 
                    alt={`Lead ${lead.title} photo`} 
                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setLightboxImage(lead.image_urls![currentImageIdx])}
                  />
                  {lead.image_urls.length > 1 && (
                    <>
                      <button 
                        onClick={(e) => handlePrevImage(lead.id, lead.image_urls!.length, e)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover/carousel:opacity-100 hover:bg-black/70 transition-all"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={(e) => handleNextImage(lead.id, lead.image_urls!.length, e)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover/carousel:opacity-100 hover:bg-black/70 transition-all"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {lead.image_urls.map((_, i) => (
                          <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentImageIdx ? 'bg-white' : 'bg-white/50'}`} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              
              <div className="p-6 flex-1 relative z-10">
                <div className="flex-1 flex justify-between items-start gap-4">
                  <div>
                    {lead.client_priority === 'fast' && (
                      <div className="inline-flex items-center gap-1 mb-2 px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase rounded-md border border-rose-500/20">
                        <span>⚡ Как можно быстрее</span>
                      </div>
                    )}
                    {lead.client_priority === 'cheap' && (
                      <div className="inline-flex items-center gap-1 mb-2 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase rounded-md border border-emerald-500/20">
                        <span>💸 Важна цена</span>
                      </div>
                    )}
                    {lead.client_priority === 'quality' && (
                      <div className="inline-flex items-center gap-1 mb-2 px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase rounded-md border border-amber-500/20">
                        <span>💎 Максимальное качество</span>
                      </div>
                    )}
                    <h3 className="font-bold text-lg text-neutral-900 dark:text-white leading-tight mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      {lead.title}
                    </h3>
                    <div className="flex flex-wrap gap-2 text-xs text-neutral-500 mb-3 font-medium">
                      <span className="bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-md">
                        #ID-{lead.id.substring(0, 6)}
                      </span>
                      {lead.created_at && (
                        <span className="bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-md flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(lead.created_at).toLocaleDateString()}
                        </span>
                      )}
                      {(lead.country_id || lead.city_id) && (
                        <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-md flex items-center gap-1">
                          📍 {countries.find(c => c.id === lead.country_id)?.name_ru || ''} 
                          {lead.city_id && cities.find(c => c.id === lead.city_id) ? `, ${cities.find(c => c.id === lead.city_id)?.name_ru}` : ''}
                        </span>
                      )}
                      {lead.trust_score !== undefined && (
                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md border flex items-center gap-1 ${
                          lead.trust_score >= 80
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : lead.trust_score >= 50
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                        }`}>
                          🛡️ Trust: {lead.trust_score}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">

                    <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-sm whitespace-nowrap border border-neutral-200 dark:border-neutral-700 flex items-center gap-1">
                      {lead.unlock_price_local} {lead.master_currency}
                    </span>
                    {lead.display_budget && (
                      <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 text-xs px-3 py-1.5 rounded-full font-bold shadow-sm whitespace-nowrap border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        💰 {lead.display_budget}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-4 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">{lead.description}</p>
                
                {/* Competition meter status bar */}
                <div className="mt-2 mb-4">
                  <div className="flex justify-between text-xs font-bold text-neutral-500 mb-1">
                    <span>Конкуренция</span>
                    <span>{lead.unlock_count || 0} / {lead.max_unlocks || 3} unlocked</span>
                  </div>
                  <div className="h-2 w-full bg-neutral-200/50 dark:bg-neutral-800/50 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        (lead.unlock_count || 0) >= (lead.max_unlocks || 3)
                          ? 'bg-red-500'
                          : (lead.unlock_count || 0) === 2
                          ? 'bg-amber-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${((lead.unlock_count || 0) / (lead.max_unlocks || 3)) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-950 p-4 rounded-xl border border-neutral-200/50 dark:border-neutral-800/50 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-neutral-300 to-neutral-400 dark:from-neutral-700 dark:to-neutral-600"></div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 ml-2 font-medium">{t('contacts')}:</p>
                  <p className={`font-mono text-sm ml-2 ${lead.is_unlocked || isAdmin ? 'text-green-600 dark:text-green-400 font-bold' : 'text-neutral-400 dark:text-neutral-600 blur-sm select-none'}`}>
                    {lead.is_unlocked || isAdmin ? lead.contacts : 'HIDDEN_CONTACT_DATA'}
                  </p>
                </div>

                {(lead.is_unlocked || isAdmin) && (
                  <div className="flex flex-wrap gap-2 mt-4 justify-start">
                    {getContactActions(lead.contacts).map((act, idx) => (
                      <a
                        key={idx}
                        href={act.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${act.color}`}
                      >
                        <span>{act.icon}</span>
                        <span>{act.name}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-5 border-t border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/50 backdrop-blur-sm">
                {lead.proposal_status === 'accepted' ? (
                  <div className="space-y-3">
                    <div className="w-full py-3 px-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50 rounded-xl text-sm font-bold shadow-inner flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {isAdmin ? "ADMIN VIEW" : "Выигран! Клиент выбрал вас"}
                    </div>
                    {lead.chat_id && (
                      <button
                        onClick={() => setSelectedChatLead(lead)}
                        className="w-full py-3 px-4 bg-violet-100 hover:bg-violet-200 dark:bg-violet-900/30 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        Открыть чат
                      </button>
                    )}
                  </div>
                ) : lead.proposal_status === 'pending' ? (
                  <div className="space-y-3">
                    <div className="w-full py-3 px-4 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 rounded-xl text-sm font-bold shadow-inner flex items-center justify-center gap-2">
                      ⏳ Ожидает решения клиента
                    </div>
                    {lead.chat_id && (
                      <button
                        onClick={() => setSelectedChatLead(lead)}
                        className="w-full py-3 px-4 bg-violet-100 hover:bg-violet-200 dark:bg-violet-900/30 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        Открыть чат
                      </button>
                    )}
                  </div>
                ) : lead.proposal_status === 'rejected' ? (
                  <div className="w-full py-3 px-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-xl text-sm font-bold shadow-inner flex items-center justify-center gap-2">
                    ❌ Клиент выбрал другого мастера
                  </div>
                ) : lead.is_unlocked || isAdmin ? (
                  <div className="space-y-3">
                    <div className="w-full py-3 px-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50 rounded-xl text-sm font-bold shadow-inner flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {isAdmin ? "ADMIN VIEW" : t('unlocked')}
                    </div>

                    {!isAdmin && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <button 
                          onClick={() => setSelectedDisputeLead(lead)}
                          className="w-full py-2 px-3 bg-white dark:bg-neutral-900 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-1"
                        >
                          Оспорить
                        </button>
                        <button 
                          onClick={() => setSelectedAuctionLead(lead)}
                          className="w-full py-2 px-3 bg-white dark:bg-neutral-900 border border-purple-200 dark:border-purple-900/50 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-bold hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-center justify-center gap-1"
                        >
                          В Аукцион
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button 
                    onClick={() => setSelectedProposalLead(lead)}
                    disabled={unlockingId === lead.id || ((lead.unlock_count || 0) >= (lead.max_unlocks || 3) && !lead.is_unlocked)}
                    className="w-full py-3 px-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 group-hover:scale-[1.02]"
                  >
                    {unlockingId === lead.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (lead.unlock_count || 0) >= (lead.max_unlocks || 3) ? (
                      <span>🔒 Лимит разблокировок исчерпан</span>
                    ) : (
                      <>
                        🔓 {t('unlock')} — {lead.unlock_price_local} {lead.master_currency}
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}
        </AnimatePresence>
      </motion.div>

      {/* LEAD MODAL (ADMIN ONLY) */}
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 bg-neutral-900/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center sticky top-0 bg-white dark:bg-neutral-900 z-10">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                {editingLead ? t('editLead') : t('createLead')}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleLeadSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t('title')}
                </label>
                <input
                  required
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-2.5 text-neutral-900 dark:text-white focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent outline-none transition-all"
                  placeholder="e.g. Tattoo sleeve on right arm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Country (Optional)
                  </label>
                  <select
                    value={formData.country_id || ''}
                    onChange={e => {
                      setFormData({...formData, country_id: e.target.value, city_id: ''})
                    }}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-2.5 text-neutral-900 dark:text-white focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent outline-none transition-all"
                  >
                    <option value="">Any</option>
                    {countries.map(c => (
                      <option key={c.id} value={c.id}>{c.name_ru}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    City (Optional)
                  </label>
                  <select
                    value={formData.city_id || ''}
                    onChange={e => setFormData({...formData, city_id: e.target.value})}
                    disabled={!formData.country_id || cities.filter(c => c.country_id === formData.country_id).length === 0}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-2.5 text-neutral-900 dark:text-white focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent outline-none transition-all disabled:opacity-50"
                  >
                    <option value="">Any</option>
                    {cities.filter(c => c.country_id === formData.country_id).map(c => (
                      <option key={c.id} value={c.id}>{c.name_ru}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t('description')}
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-2.5 text-neutral-900 dark:text-white focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent outline-none transition-all"
                  placeholder="Client requirements, location, style..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t('contacts')} <span className="text-neutral-400 text-xs">(Hidden until unlocked)</span>
                </label>
                <input
                  required
                  type="text"
                  value={formData.contacts}
                  onChange={e => setFormData({...formData, contacts: e.target.value})}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-2.5 text-neutral-900 dark:text-white focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent outline-none transition-all font-mono"
                  placeholder="e.g. +420 123 456 789 or @instagram"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t('priceCredits')}
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  value={formData.base_unlock_price_eur}
                  onChange={e => setFormData({...formData, base_unlock_price_eur: parseFloat(e.target.value) || 0})}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-2.5 text-neutral-900 dark:text-white focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Photos
                </label>
                
                {/* Image Previews */}
                {formData.image_urls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {formData.image_urls.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                        <img src={url} className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="relative border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg p-6 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-center cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploadingImages}
                  />
                  {uploadingImages ? (
                    <div className="flex flex-col items-center justify-center text-neutral-500">
                      <Loader2 className="w-8 h-8 animate-spin mb-2" />
                      <span className="text-sm">Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-neutral-500">
                      <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                      <span className="text-sm font-medium">Click or drag images here</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-neutral-900 py-4 border-t border-neutral-200 dark:border-neutral-800 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white font-medium transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || uploadingImages}
                  className="flex items-center gap-2 px-6 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-bold shadow-md hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          type={confirmModal.type}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  )
}
