'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { api, Profile } from '@/lib/api'
import { useLanguage } from '@/i18n/LanguageContext'
import { 
  User, Image as ImageIcon, Check, X, Camera, MapPin, 
  Globe, Instagram, Link as LinkIcon, Share2, ArrowLeft, Trash2, Upload
} from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function ProfilePage() {
  const router = useRouter()
  const { t, lang: language } = useLanguage()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Form State
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedCity, setSelectedCity] = useState('')

  const [countries, setCountries] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const portfolioInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchProfile()
    fetchCountries()
  }, [])

  useEffect(() => {
    if (selectedCountry) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/locations/countries/${selectedCountry}/cities`)
        .then(res => res.json())
        .then(data => {
            setCities(data)
            if (!data.find((c: any) => c.id === selectedCity)) {
                setSelectedCity(data.length > 0 ? data[0].id : '')
            }
        })
        .catch(err => console.error(err))
    } else {
      setCities([])
      setSelectedCity('')
    }
  }, [selectedCountry])

  const fetchCountries = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/locations/countries`)
      const data = await res.json()
      setCountries(data)
    } catch (err) {
      console.error('Failed to load countries', err)
    }
  }

  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      let profileData = await api.getProfile();
      setProfile(profileData)
      
      // Init form
      setDisplayName(profileData.display_name || '')
      setUsername(profileData.username || '')
      setBio(profileData.bio || '')
      setPhone(profileData.phone || '')
      setPortfolioUrl(profileData.portfolio_url || '')
      setSelectedCountry(profileData.country_ids?.[0] || '2a71599c-91f2-4461-b77b-86a150db3aab')
      setSelectedCity(profileData.city_ids?.[0] || '')

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      
      let finalPortfolioUrl = portfolioUrl;
      if (finalPortfolioUrl && !finalPortfolioUrl.startsWith('http://') && !finalPortfolioUrl.startsWith('https://')) {
        finalPortfolioUrl = `https://${finalPortfolioUrl}`;
      }

      const updated = await api.updateProfile({
        username,
        display_name: displayName,
        phone,
        bio,
        portfolio_url: finalPortfolioUrl,
        country_ids: selectedCountry ? [selectedCountry] : [],
        city_ids: selectedCity ? [selectedCity] : []
      })
      
      setProfile(updated)
      setIsEditing(false)
      toast.success(language === 'ru' ? 'Профиль сохранен' : 'Profile saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
      toast.error(language === 'ru' ? 'Ошибка сохранения' : 'Save failed')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return
      const file = e.target.files[0]
      setIsUploading(true)
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile?.id}-${Math.random()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      
      const updated = await api.updateProfile({ avatar_url: data.publicUrl })
      setProfile(updated)
      toast.success(language === 'ru' ? 'Аватар обновлен' : 'Avatar updated')
    } catch (error: any) {
      toast.error(language === 'ru' ? 'Ошибка загрузки аватара' : 'Upload error')
      console.error(error)
    } finally {
      setIsUploading(false)
    }
  }

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return
      setIsUploading(true)
      
      const newUrls: string[] = []
      
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `${profile?.id}-${Math.random()}-${i}.${fileExt}`
        const filePath = `portfolio/${fileName}`

        const { error: uploadError } = await supabase.storage.from('portfolio').upload(filePath, file)
        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('portfolio').getPublicUrl(filePath)
        newUrls.push(data.publicUrl)
      }
      
      const currentUrls = profile?.portfolio_image_urls || []
      const updatedUrls = [...currentUrls, ...newUrls]
      
      const updated = await api.updateProfile({ portfolio_image_urls: updatedUrls })
      setProfile(updated)
      toast.success(language === 'ru' ? 'Портфолио обновлено' : 'Portfolio updated')
    } catch (error: any) {
      toast.error(language === 'ru' ? 'Ошибка загрузки фото' : 'Upload error')
      console.error(error)
    } finally {
      setIsUploading(false)
    }
  }

  const removePortfolioImage = async (urlToRemove: string) => {
    if (!profile?.portfolio_image_urls) return
    try {
      setIsUploading(true)
      const updatedUrls = profile.portfolio_image_urls.filter(url => url !== urlToRemove)
      const updated = await api.updateProfile({ portfolio_image_urls: updatedUrls })
      setProfile(updated)
      toast.success(language === 'ru' ? 'Фото удалено' : 'Photo removed')
    } catch (error: any) {
      toast.error(language === 'ru' ? 'Ошибка' : 'Error')
    } finally {
      setIsUploading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    window.location.href = '/login'
  }

  const copyPublicLink = () => {
    if (!profile?.username) {
      toast.error(language === 'ru' ? 'Сначала установите username' : 'Set username first')
      return
    }
    const url = `${window.location.origin}/book/${profile.username}`
    navigator.clipboard.writeText(url)
    toast.success(language === 'ru' ? 'Ссылка скопирована' : 'Link copied')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-[#050505] transition-colors duration-200">
        <div className="h-16 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900" />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="h-40 w-full bg-neutral-200 dark:bg-neutral-800 rounded-3xl animate-pulse mb-8" />
          <div className="h-64 w-full bg-neutral-200 dark:bg-neutral-800 rounded-3xl animate-pulse" />
        </main>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#050505] text-neutral-900 dark:text-white transition-colors duration-300 relative overflow-hidden pb-20">
      <Header profile={profile} onLogout={handleLogout} />
      
      {/* Cool Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-[500px] overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[80%] bg-violet-500/20 dark:bg-violet-600/20 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen opacity-70 animate-blob"></div>
        <div className="absolute top-[10%] right-[-10%] w-[40%] h-[60%] bg-cyan-400/20 dark:bg-cyan-500/20 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-screen opacity-70 animate-blob animation-delay-2000"></div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              {t('back')}
            </button>
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">Моя страница</h1>
          </div>
          <button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={isSaving}
            className={`px-6 py-2.5 rounded-full font-bold transition-all shadow-lg ${
              isEditing 
                ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-500/25 scale-105'
                : 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 hover:border-violet-500/50 hover:shadow-violet-500/10'
            }`}
          >
            {isSaving ? '...' : isEditing ? (language === 'ru' ? 'Сохранить' : 'Save') : (language === 'ru' ? 'Редактировать' : 'Edit')}
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-2xl mb-6 backdrop-blur-md font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Avatar & Public Link */}
          <div className="space-y-6">
            <div className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/5 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative inline-block mb-6">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-neutral-800 shadow-xl mx-auto">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-100 to-cyan-100 dark:from-violet-900/30 dark:to-cyan-900/30 flex items-center justify-center text-violet-500">
                      <User className="w-12 h-12" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute bottom-0 right-0 w-10 h-10 bg-violet-600 hover:bg-violet-700 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 disabled:opacity-50"
                >
                  <Camera className="w-5 h-5" />
                </button>
                <input
                  type="file"
                  ref={avatarInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <h2 className="text-2xl font-black text-neutral-900 dark:text-white mb-1">
                {profile.display_name || 'Твое имя'}
              </h2>
              <p className="text-violet-600 dark:text-violet-400 font-bold mb-4">
                @{profile.username || 'username'}
              </p>
              
              {profile.country_ids && profile.country_ids.length > 0 && (
                <div className="flex items-center justify-center gap-1.5 text-neutral-500 text-sm font-medium">
                  <MapPin className="w-4 h-4" />
                  <span>Ваш город</span>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-3xl p-6 shadow-xl shadow-violet-500/20 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Публичная ссылка
              </h3>
              <p className="text-violet-100 text-sm mb-4">
                Это твоя страница-визитка для клиентов. Отправь им ссылку для записи.
              </p>
              
              <div className="bg-black/20 rounded-xl p-3 flex items-center justify-between backdrop-blur-sm border border-white/10">
                <span className="text-sm truncate font-medium opacity-90">
                  tattoo-hub.xyz/book/{profile.username || '...'}
                </span>
                <button 
                  onClick={copyPublicLink}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors ml-2 shrink-0"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Settings & Portfolio */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/5 rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-violet-500" />
                Основная информация
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">{t('displayName')}</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    disabled={!isEditing}
                    className="w-full bg-white dark:bg-black/50 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all disabled:opacity-70 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">{t('username')}</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                      disabled={!isEditing}
                      className="w-full bg-white dark:bg-black/50 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-9 pr-4 py-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all disabled:opacity-70 font-medium"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">{t('bio')}</label>
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    disabled={!isEditing}
                    rows={3}
                    placeholder="Пара слов о вас и вашем стиле работы..."
                    className="w-full bg-white dark:bg-black/50 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all disabled:opacity-70 font-medium resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                    <div className="flex items-center gap-1.5"><Instagram className="w-4 h-4"/> Instagram URL</div>
                  </label>
                  <input
                    type="text"
                    value={portfolioUrl}
                    onChange={e => setPortfolioUrl(e.target.value)}
                    disabled={!isEditing}
                    placeholder="instagram.com/your_nick"
                    className="w-full bg-white dark:bg-black/50 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all disabled:opacity-70 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Номер телефона</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    disabled={!isEditing}
                    placeholder="+420..."
                    className="w-full bg-white dark:bg-black/50 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all disabled:opacity-70 font-medium"
                  />
                </div>

                {/* Locations */}
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">{t('country')}</label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    disabled={!isEditing}
                    className="w-full bg-white dark:bg-black/50 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all disabled:opacity-70 font-medium cursor-pointer"
                  >
                    <option value="">{t('selectCountry')}</option>
                    {countries.map(country => (
                      <option key={country.id} value={country.id}>{country.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">{t('city')}</label>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    disabled={!isEditing || !selectedCountry}
                    className="w-full bg-white dark:bg-black/50 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all disabled:opacity-70 font-medium cursor-pointer"
                  >
                    <option value="">{t('selectCity')}</option>
                    {cities.map(city => (
                      <option key={city.id} value={city.id}>{city.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Portfolio Gallery */}
            <div className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/5 rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-cyan-500" />
                  Галерея работ
                </h3>
                {isEditing && (
                  <button
                    onClick={() => portfolioInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 px-4 py-2 rounded-xl font-bold transition-colors text-sm"
                  >
                    <Upload className="w-4 h-4" />
                    Загрузить фото
                  </button>
                )}
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  ref={portfolioInputRef}
                  onChange={handlePortfolioUpload}
                  className="hidden"
                />
              </div>

              {profile.portfolio_image_urls && profile.portfolio_image_urls.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {profile.portfolio_image_urls.map((url, i) => (
                    <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
                      <img src={url} alt={`Portfolio ${i}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      {isEditing && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={() => removePortfolioImage(url)}
                            className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-full shadow-lg transition-transform hover:scale-110"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-neutral-100/50 dark:bg-black/30 border-2 border-dashed border-neutral-300 dark:border-neutral-800 rounded-3xl p-12 text-center">
                  <ImageIcon className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                  <p className="text-neutral-500 dark:text-neutral-400 font-medium mb-2">У вас еще нет добавленных работ</p>
                  {isEditing && (
                    <p className="text-sm text-neutral-400">Нажмите "Загрузить фото", чтобы пополнить портфолио.</p>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
