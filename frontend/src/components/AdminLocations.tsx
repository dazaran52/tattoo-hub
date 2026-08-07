import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2, Globe, MapPin, Wand2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { ConfirmModal } from '@/components/ConfirmModal'
import { SkeletonTable } from '@/components/SkeletonCard'
import { EmptyState } from '@/components/EmptyState'

export function AdminLocations() {
  const [countries, setCountries] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  
  const [newCountryCode, setNewCountryCode] = useState('')
  const [newCountryRu, setNewCountryRu] = useState('')
  const [newCountryEn, setNewCountryEn] = useState('')
  
  const [selectedCountryForCity, setSelectedCountryForCity] = useState('')
  const [newCityRu, setNewCityRu] = useState('')
  const [newCityEn, setNewCityEn] = useState('')
  const [translatingCity, setTranslatingCity] = useState<'ru'|'en'|null>(null)

  const handleCountryCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.toUpperCase()
    setNewCountryCode(code)
    
    if (code.length === 2) {
      try {
        const ru = new Intl.DisplayNames(['ru'], { type: 'region' }).of(code)
        const en = new Intl.DisplayNames(['en'], { type: 'region' }).of(code)
        if (ru && ru !== code) setNewCountryRu(ru)
        if (en && en !== code) setNewCountryEn(en)
      } catch (err) {
        // Ignore invalid region codes
      }
    }
  }

  const autoTranslateCity = async (sourceLang: 'ru'|'en') => {
    const sourceText = sourceLang === 'ru' ? newCityRu : newCityEn
    if (!sourceText) {
      toast.error('Сначала введите название для перевода')
      return
    }
    
    setTranslatingCity(sourceLang)
    try {
      const targetLang = sourceLang === 'ru' ? 'en' : 'ru'
      const res = await fetch(`https://${sourceLang}.wikipedia.org/w/api.php?action=query&prop=langlinks&titles=${encodeURIComponent(sourceText)}&lllang=${targetLang}&format=json&origin=*`)
      const data = await res.json()
      
      const pages = data.query?.pages
      if (pages) {
        const pageId = Object.keys(pages)[0]
        if (pageId !== '-1' && pages[pageId].langlinks && pages[pageId].langlinks.length > 0) {
          const translated = pages[pageId].langlinks[0]['*']
          if (targetLang === 'ru') setNewCityRu(translated)
          else setNewCityEn(translated)
          toast.success('Город успешно переведён!')
          return
        }
      }
      toast.error('Не удалось найти перевод на Википедии')
    } catch (err) {
      toast.error('Ошибка при переводе')
    } finally {
      setTranslatingCity(null)
    }
  }
  
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    onConfirm: () => void
    type: 'danger' | 'info' | 'warning'
  } | null>(null)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [countriesRes, citiesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/locations/countries`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/locations/cities`)
      ])
      
      setCountries(await countriesRes.json())
      setCities(await citiesRes.json())
    } catch (e) {
      toast.error('Failed to load locations')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAddCountry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCountryCode || !newCountryRu || !newCountryEn) return
    setActionLoadingId('new_country')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/locations/countries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: newCountryCode,
          name_ru: newCountryRu,
          name_en: newCountryEn
        })
      })
      if (!res.ok) throw new Error('Failed to add country')
      toast.success('Country added')
      setNewCountryCode('')
      setNewCountryRu('')
      setNewCountryEn('')
      fetchData()
    } catch (err) {
      toast.error('Error adding country')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDeleteCountry = (id: string) => {
    const country = countries.find(c => c.id === id)
    const countryName = country ? country.name_ru : 'эту страну'

    setConfirmModal({
      isOpen: true,
      title: 'Удалить страну',
      message: `Вы уверены, что хотите удалить страну ${countryName}? Это также может удалить связанные города.`,
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(null)
        setActionLoadingId(id)
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/locations/countries/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${session?.access_token}`
            }
          })
          if (!res.ok) throw new Error('Failed to delete country')
          toast.success('Country deleted')
          fetchData()
        } catch (err) {
          toast.error('Error deleting country')
        } finally {
          setActionLoadingId(null)
        }
      }
    })
  }

  const handleAddCity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCountryForCity || !newCityRu || !newCityEn) return
    setActionLoadingId('new_city')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/locations/cities`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          country_id: selectedCountryForCity,
          name_ru: newCityRu,
          name_en: newCityEn
        })
      })
      if (!res.ok) throw new Error('Failed to add city')
      toast.success('City added')
      setNewCityRu('')
      setNewCityEn('')
      fetchData()
    } catch (err) {
      toast.error('Error adding city')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDeleteCity = (id: string) => {
    const city = cities.find(c => c.id === id)
    const cityName = city ? city.name_ru : 'этот город'

    setConfirmModal({
      isOpen: true,
      title: 'Удалить город',
      message: `Вы уверены, что хотите удалить город ${cityName}?`,
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(null)
        setActionLoadingId(id)
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/locations/cities/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${session?.access_token}`
            }
          })
          if (!res.ok) throw new Error('Failed to delete city')
          toast.success('City deleted')
          fetchData()
        } catch (err) {
          toast.error('Error deleting city')
        } finally {
          setActionLoadingId(null)
        }
      }
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <SkeletonTable rows={4} />
        <SkeletonTable rows={4} />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Countries Section */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary-500" />
          Countries
        </h3>
        
        <form onSubmit={handleAddCountry} className="flex gap-4 mb-6">
          <input required type="text" maxLength={2} placeholder="Code (e.g. CZ)" value={newCountryCode} onChange={handleCountryCodeChange} className="px-4 py-2 w-32 rounded-xl border dark:bg-neutral-950 dark:border-neutral-800 uppercase" />
          <input required type="text" placeholder="Name RU (Auto)" value={newCountryRu} onChange={e => setNewCountryRu(e.target.value)} className="flex-1 px-4 py-2 rounded-xl border dark:bg-neutral-950 dark:border-neutral-800" />
          <input required type="text" placeholder="Name EN (Auto)" value={newCountryEn} onChange={e => setNewCountryEn(e.target.value)} className="flex-1 px-4 py-2 rounded-xl border dark:bg-neutral-950 dark:border-neutral-800" />
          <button disabled={actionLoadingId === 'new_country'} className="bg-primary-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
            {actionLoadingId === 'new_country' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </form>

        <div className="space-y-2">
          {countries.length === 0 ? (
            <EmptyState
              variant="compact"
              icon={<Globe className="w-7 h-7" />}
              title="Нет стран"
              description="Добавьте первую страну через форму выше."
            />
          ) : countries.map(c => (
            <div key={c.id} className="flex justify-between items-center p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-4">
                <span className="font-mono bg-neutral-200 dark:bg-neutral-700 px-2 py-1 rounded text-sm">{c.code}</span>
                <span className="font-semibold">{c.name_ru}</span>
                <span className="text-neutral-500 text-sm">({c.name_en})</span>
              </div>
              <button 
                onClick={() => handleDeleteCountry(c.id)}
                disabled={actionLoadingId === c.id}
                className="text-red-500 hover:text-red-600 disabled:opacity-50"
              >
                {actionLoadingId === c.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Cities Section */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <MapPin className="w-6 h-6 text-primary-500" />
          Cities
        </h3>
        
        <form onSubmit={handleAddCity} className="flex gap-4 mb-6">
          <select required value={selectedCountryForCity} onChange={e => setSelectedCountryForCity(e.target.value)} className="px-4 py-2 rounded-xl border dark:bg-neutral-950 dark:border-neutral-800">
            <option value="" disabled>Select Country</option>
            {countries.map(c => <option key={c.id} value={c.id}>{c.name_ru}</option>)}
          </select>
          <div className="relative flex-1">
            <input required type="text" placeholder="Name RU" value={newCityRu} onChange={e => setNewCityRu(e.target.value)} className="w-full px-4 py-2 pr-10 rounded-xl border dark:bg-neutral-950 dark:border-neutral-800" />
            <button type="button" onClick={() => autoTranslateCity('ru')} disabled={translatingCity === 'ru' || !newCityRu} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-primary-500 disabled:opacity-50" title="Авто-перевод на Английский">
              {translatingCity === 'ru' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
            </button>
          </div>
          <div className="relative flex-1">
            <input required type="text" placeholder="Name EN" value={newCityEn} onChange={e => setNewCityEn(e.target.value)} className="w-full px-4 py-2 pr-10 rounded-xl border dark:bg-neutral-950 dark:border-neutral-800" />
            <button type="button" onClick={() => autoTranslateCity('en')} disabled={translatingCity === 'en' || !newCityEn} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-primary-500 disabled:opacity-50" title="Авто-перевод на Русский">
              {translatingCity === 'en' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
            </button>
          </div>
          <button disabled={actionLoadingId === 'new_city'} className="bg-primary-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
            {actionLoadingId === 'new_city' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </form>

        <div className="space-y-2">
          {cities.length === 0 ? (
            <EmptyState
              variant="compact"
              icon={<MapPin className="w-7 h-7" />}
              title="Нет городов"
              description="Добавьте первый город через форму выше."
            />
          ) : cities.map(c => {
            const country = countries.find(co => co.id === c.country_id)
            return (
              <div key={c.id} className="flex justify-between items-center p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-4">
                  <span className="font-semibold">{c.name_ru}</span>
                  <span className="text-neutral-500 text-sm">({c.name_en})</span>
                  <span className="text-xs bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300 px-2 py-1 rounded-md">{country?.name_ru}</span>
                </div>
                <button 
                  onClick={() => handleDeleteCity(c.id)}
                  disabled={actionLoadingId === c.id}
                  className="text-red-500 hover:text-red-600 disabled:opacity-50"
                >
                  {actionLoadingId === c.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                </button>
              </div>
            )
          })}
        </div>
      </div>

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
