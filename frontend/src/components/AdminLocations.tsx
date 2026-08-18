import { useTranslations } from "next-intl";
import { useState, useEffect, useMemo, useRef } from 'react'
import { Plus, Trash2, Loader2, Globe, MapPin, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { ConfirmModal } from '@/components/ConfirmModal'
import { SkeletonTable } from '@/components/SkeletonCard'
import { EmptyState } from '@/components/EmptyState'

const ALL_COUNTRY_CODES = ["AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ","BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ","CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM","DO","DZ","EC","EE","EG","EH","ER","ES","ET","FI","FJ","FK","FM","FO","FR","GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY","HK","HM","HN","HR","HT","HU","ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT","JE","JM","JO","JP","KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ","LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ","NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW","SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SY","SZ","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ","UA","UG","UM","US","UY","UZ","VA","VC","VE","VG","VI","VN","VU","WF","WS","YE","YT","ZA","ZM","ZW"]

export function AdminLocations() {
    const t = useTranslations();
  const [countries, setCountries] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  
  const [newCountryCode, setNewCountryCode] = useState('')
  const [newCountryRu, setNewCountryRu] = useState('')
  const [newCountryEn, setNewCountryEn] = useState('')
  const [newCountryCs, setNewCountryCs] = useState('')
  const [newCountryUk, setNewCountryUk] = useState('')
  
  const [selectedCountryForCity, setSelectedCountryForCity] = useState('')
  const [newCityRu, setNewCityRu] = useState('')
  const [newCityEn, setNewCityEn] = useState('')
  const [newCityCs, setNewCityCs] = useState('')
  const [newCityUk, setNewCityUk] = useState('')
  const [translatingCity, setTranslatingCity] = useState<boolean>(false)

  // Country Search State
  const [countrySearch, setCountrySearch] = useState('')
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false)
  
  const countryList = useMemo(() => {
    try {
      const ruNames = new Intl.DisplayNames(['ru'], { type: 'region' })
      const enNames = new Intl.DisplayNames(['en'], { type: 'region' })
      return ALL_COUNTRY_CODES.map(code => {
        let ru = code, en = code
        try { ru = ruNames.of(code) || code } catch(e){}
        try { en = enNames.of(code) || code } catch(e){}
        return { code, ru, en, searchStr: `${code} ${ru} ${en}`.toLowerCase() }
      })
    } catch(e) {
      return ALL_COUNTRY_CODES.map(code => ({ code, ru: code, en: code, searchStr: code.toLowerCase() }))
    }
  }, [])

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return countryList.slice(0, 10)
    return countryList.filter(c => c.searchStr.includes(countrySearch.toLowerCase())).slice(0, 10)
  }, [countrySearch, countryList])

  const selectCountry = (code: string) => {
    setNewCountryCode(code)
    try {
      const ru = new Intl.DisplayNames(['ru'], { type: 'region' }).of(code)
      const en = new Intl.DisplayNames(['en'], { type: 'region' }).of(code)
      const cs = new Intl.DisplayNames(['cs'], { type: 'region' }).of(code)
      const uk = new Intl.DisplayNames(['uk'], { type: 'region' }).of(code)
      if (ru) setNewCountryRu(ru)
      if (en) setNewCountryEn(en)
      if (cs) setNewCountryCs(cs)
      if (uk) setNewCountryUk(uk)
    } catch (err) {}
    setCountrySearch(code)
    setIsCountryDropdownOpen(false)
  }

  const autoTranslateCity = async () => {
    const query = newCityRu || newCityEn || newCityCs || newCityUk
    if (!query.trim()) {
      toast.error(t('key_f7b18c'))
      return
    }

    setTranslatingCity(true)
    try {
      let countryCode = ''
      if (selectedCountryForCity) {
         const c = countries.find(x => x.id === selectedCountryForCity)
         if (c) countryCode = c.code.toLowerCase()
      }

      let url = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(query.trim())}&format=json&namedetails=1&limit=1`
      if (countryCode) {
        url += `&countrycodes=${countryCode}`
      }

      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
      const data = await res.json()
      
      if (data && data.length > 0) {
        const details = data[0].namedetails || {}
        const defaultName = data[0].name || query

        setNewCityRu(details['name:ru'] || details['name'] || defaultName)
        setNewCityEn(details['name:en'] || details['name:es'] || defaultName)
        setNewCityCs(details['name:cs'] || details['name'] || defaultName)
        setNewCityUk(details['name:uk'] || details['name:ru'] || defaultName)
        
        toast.success(t('openstreetmap2'))
      } else {
        toast.error(t('key_1d483d'))
      }
    } catch (err) {
      toast.error(t('key_9400e1'))
    } finally {
      setTranslatingCity(false)
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
          name_en: newCountryEn,
          name_cs: newCountryCs,
          name_uk: newCountryUk
        })
      })
      if (!res.ok) throw new Error('Failed to add country')
      toast.success(t('key_b28019'))
      setNewCountryCode('')
      setCountrySearch('')
      setNewCountryRu('')
      setNewCountryEn('')
      setNewCountryCs('')
      setNewCountryUk('')
      fetchData()
    } catch (err) {
      toast.error(t('key_42b02d'))
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDeleteCountry = (id: string) => {
    const country = countries.find(c => c.id === id)
    const countryName = country ? country.name_ru : t('key_6a06b9')

    setConfirmModal({
      isOpen: true,
      title: t('key_2908a3'),
      message: `Вы уверены, что хотите удалить страну ${countryName}? Это также может удалить связанные города.`,
      confirmText: t('delete'),
      cancelText: t('cancel'),
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
          toast.success(t('key_bc09bf'))
          fetchData()
        } catch (err) {
          toast.error(t('key_2ed68b'))
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
          name_en: newCityEn,
          name_cs: newCityCs,
          name_uk: newCityUk
        })
      })
      if (!res.ok) throw new Error('Failed to add city')
      toast.success(t('key_3b974b'))
      setNewCityRu('')
      setNewCityEn('')
      setNewCityCs('')
      setNewCityUk('')
      fetchData()
    } catch (err) {
      toast.error(t('key_4178d9'))
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDeleteCity = (id: string) => {
    const city = cities.find(c => c.id === id)
    const cityName = city ? city.name_ru : t('key_7fa2ea')

    setConfirmModal({
      isOpen: true,
      title: t('key_dd6357'),
      message: `Вы уверены, что хотите удалить город ${cityName}?`,
      confirmText: t('delete'),
      cancelText: t('cancel'),
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
          toast.success(t('key_830781'))
          fetchData()
        } catch (err) {
          toast.error(t('key_b87688'))
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
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-white/5 p-6 md:p-8 shadow-sm">
        <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary-500" />
          {t('key_f49228')}
                          </h3>
        
        <form onSubmit={handleAddCountry} className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start">
            
            {/* Country Autocomplete */}
            <div className="relative w-full md:w-64 z-20">
              <input 
                required 
                type="text" 
                placeholder={t('key_9c0925')} 
                value={countrySearch} 
                onChange={(e) => {
                  setCountrySearch(e.target.value)
                  setIsCountryDropdownOpen(true)
                  if (!e.target.value) setNewCountryCode('')
                }}
                onFocus={() => setIsCountryDropdownOpen(true)}
                className="w-full px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-medium text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500" 
              />
              {isCountryDropdownOpen && (
                <>
                  <div className="fixed inset-0" onClick={() => setIsCountryDropdownOpen(false)}></div>
                  <div className="absolute top-full left-0 right-0 mt-2 max-h-48 overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-30 py-1">
                    {filteredCountries.map(c => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => selectCountry(c.code)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center justify-between"
                      >
                        <span className="font-bold text-neutral-900 dark:text-white">{c.ru}</span>
                        <span className="text-xs text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded font-mono uppercase">{c.code}</span>
                      </button>
                    ))}
                    {filteredCountries.length === 0 && (
                      <div className="px-4 py-3 text-sm text-neutral-500 text-center">{t('crmBoard.list.nothingFound')}</div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 flex-1 w-full">
              <input required type="text" placeholder="RU" value={newCountryRu} onChange={e => setNewCountryRu(e.target.value)} className="px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-medium text-neutral-900 dark:text-white" />
              <input required type="text" placeholder="EN" value={newCountryEn} onChange={e => setNewCountryEn(e.target.value)} className="px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-medium text-neutral-900 dark:text-white" />
              <input required type="text" placeholder="CS" value={newCountryCs} onChange={e => setNewCountryCs(e.target.value)} className="px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-medium text-neutral-900 dark:text-white" />
              <input required type="text" placeholder="UK" value={newCountryUk} onChange={e => setNewCountryUk(e.target.value)} className="px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-medium text-neutral-900 dark:text-white" />
            </div>
            <button disabled={actionLoadingId === 'new_country' || !newCountryCode} className="w-full md:w-auto bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-primary-500/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
              {actionLoadingId === 'new_country' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {t('key_5eba28')}
                                      </button>
          </div>
        </form>

        <div className="space-y-2">
          {countries.length === 0 ? (
            <EmptyState
              variant="compact"
              icon={<Globe className="w-7 h-7" />}
              title={t('key_1be137')}
              description={t('key_9766a5')}
            />
          ) : countries.map(c => (
            <div key={c.id} className="flex justify-between items-center p-4 bg-neutral-50/50 dark:bg-neutral-800/30 rounded-2xl border border-neutral-200/50 dark:border-white/5 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors">
              <div className="flex items-center gap-4">
                <span className="font-mono bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 px-2 py-1 rounded font-bold text-xs uppercase">{c.code}</span>
                <span className="font-extrabold text-neutral-900 dark:text-white">{c.name_ru}</span>
                <span className="text-neutral-500 text-xs hidden sm:inline">({c.name_en})</span>
              </div>
              <button 
                onClick={() => handleDeleteCountry(c.id)}
                disabled={actionLoadingId === c.id}
                className="w-8 h-8 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoadingId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Cities Section */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-white/5 p-6 md:p-8 shadow-sm">
        <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
          <MapPin className="w-6 h-6 text-primary-500" />
          {t('key_e4775a')}
                          </h3>
        
        <form onSubmit={handleAddCity} className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <select 
              required 
              value={selectedCountryForCity} 
              onChange={e => setSelectedCountryForCity(e.target.value)} 
              className="w-full md:w-64 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-medium text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            >
              <option value="" disabled>{t('leadWizard.selectCountry')}</option>
              {countries.map(c => <option key={c.id} value={c.id}>{c.name_ru}</option>)}
            </select>
            
            <div className="grid grid-cols-2 gap-4 flex-1 w-full">
              <input required type="text" placeholder={t('ru')} value={newCityRu} onChange={e => setNewCityRu(e.target.value)} className="w-full px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-medium text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500" />
              <input required type="text" placeholder={t('en')} value={newCityEn} onChange={e => setNewCityEn(e.target.value)} className="w-full px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-medium text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500" />
              <input required type="text" placeholder={t('cs')} value={newCityCs} onChange={e => setNewCityCs(e.target.value)} className="w-full px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-medium text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500" />
              <input required type="text" placeholder={t('uk')} value={newCityUk} onChange={e => setNewCityUk(e.target.value)} className="w-full px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-medium text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500" />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <button 
                type="button" 
                onClick={autoTranslateCity} 
                disabled={translatingCity || (!newCityRu && !newCityEn && !newCityCs && !newCityUk)} 
                className="w-full sm:w-auto bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white px-4 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2" 
                title={t('openstreetmap')}
              >
                {translatingCity ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 text-primary-500" />}
                <span className="hidden lg:inline">{t('key_49d29b')}</span>
              </button>
              <button 
                disabled={actionLoadingId === 'new_city'} 
                className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-primary-500/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {actionLoadingId === 'new_city' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {t('key_5eba28')}
                                            </button>
            </div>
          </div>
        </form>

        <div className="space-y-2">
          {cities.length === 0 ? (
            <EmptyState
              variant="compact"
              icon={<MapPin className="w-7 h-7" />}
              title={t('key_34144e')}
              description={t('key_8bf621')}
            />
          ) : cities.map(c => {
            const country = countries.find(co => co.id === c.country_id)
            return (
              <div key={c.id} className="flex justify-between items-center p-4 bg-neutral-50/50 dark:bg-neutral-800/30 rounded-2xl border border-neutral-200/50 dark:border-white/5 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors">
                <div className="flex items-center gap-3 sm:gap-4">
                  <span className="font-extrabold text-neutral-900 dark:text-white">{c.name_ru}</span>
                  <span className="text-neutral-500 text-xs hidden sm:inline">({c.name_en})</span>
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-primary-100 text-primary-800 dark:bg-primary-500/20 dark:text-primary-400 px-2.5 py-1 rounded-md border border-primary-200 dark:border-primary-500/30">
                    {country?.name_ru}
                  </span>
                </div>
                <button 
                  onClick={() => handleDeleteCity(c.id)}
                  disabled={actionLoadingId === c.id}
                  className="w-8 h-8 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors disabled:opacity-50"
                >
                  {actionLoadingId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
