'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { api, Profile } from '@/lib/api'
import { useLanguage } from '@/i18n/LanguageContext'
import { 
  User, Mail, Coins, Calendar, Phone, FileText, Save, X, Edit2, 
  Unlock, CreditCard, Settings, Bell, Lock, Globe, Moon, Sun,
  Trash2, AlertTriangle, Eye, EyeOff, Check, ArrowLeft, Gem, Tag, Copy, Gift, MapPin
} from 'lucide-react'

// Toggle Switch Component
function Toggle({ checked, onChange, disabled = false }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative w-14 h-8 rounded-full transition-colors duration-200 ease-in-out ${
        checked ? 'bg-amber-500' : 'bg-neutral-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-200 ease-in-out ${
          checked ? 'left-7' : 'left-1'
        }`}
      />
    </button>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [countries, setCountries] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedCity, setSelectedCity] = useState('')

  // Settings state
  const [theme, setTheme] = useState('dark')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)
  const [newLeadAlerts, setNewLeadAlerts] = useState(true)
  const [lowCreditAlerts, setLowCreditAlerts] = useState(true)

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  useEffect(() => {
    fetchProfile()
    loadSettings()
  }, [])

  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const profileData = await api.getProfile()
      setProfile(profileData)
      
      setDisplayName(profileData.display_name || '')
      setPhone(profileData.phone || '')
      setBio(profileData.bio || '')
      setPortfolioUrl(profileData.portfolio_url || '')
      if (profileData.country_ids && profileData.country_ids.length > 0) {
        setSelectedCountry(profileData.country_ids[0])
      }
      if (profileData.city_ids && profileData.city_ids.length > 0) {
        setSelectedCity(profileData.city_ids[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  const loadSettings = () => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') || 'dark'
      setTheme(savedTheme)
      setEmailNotifications(localStorage.getItem('emailNotifications') !== 'false')
      setNewLeadAlerts(localStorage.getItem('newLeadAlerts') !== 'false')
      setLowCreditAlerts(localStorage.getItem('lowCreditAlerts') !== 'false')
      setPushNotifications(localStorage.getItem('pushNotifications') === 'true')
      
      // Apply theme immediately
      applyTheme(savedTheme)
    }
  }

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/locations/countries`)
      .then(res => res.json())
      .then(data => setCountries(data))
      .catch(err => console.error(err))
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

  const applyTheme = (themeValue: string) => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement
      
      if (themeValue === 'light') {
        root.classList.remove('dark')
      } else {
        root.classList.add('dark')
      }
      
      // Also update localStorage immediately
      localStorage.setItem('theme', themeValue)
    }
  }

  const { t, lang: language, setLang } = useLanguage()

  const saveSetting = (key: string, value: string | boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value.toString())
    }
  }

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    saveSetting('theme', newTheme)
    applyTheme(newTheme)
  }

  const handleLanguageChange = (newLang: 'cs' | 'en' | 'ru') => {
    setLang(newLang)
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      
      const updated = await api.updateProfile({
        display_name: displayName,
        phone: phone,
        bio: bio,
        portfolio_url: portfolioUrl,
        country_ids: selectedCountry ? [selectedCountry] : [],
        city_ids: selectedCity ? [selectedCity] : []
      })
      
      setProfile(updated)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setDisplayName(profile.display_name || '')
      setPhone(profile.phone || '')
      setBio(profile.bio || '')
      setPortfolioUrl(profile.portfolio_url || '')
      setSelectedCountry(profile.country_ids?.[0] || '')
      setSelectedCity(profile.city_ids?.[0] || '')
    }
    setIsEditing(false)
    setError(null)
  }

  const handlePasswordChange = async () => {
    setPasswordError(null)
    setPasswordSuccess(false)

    if (newPassword.length < 6) {
      setPasswordError('Heslo musí mít alespoň 6 znaků')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Hesla se neshodují')
      return
    }

    try {
      setIsChangingPassword(true)
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      setPasswordSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Nepodařilo se změnit heslo')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    window.location.href = '/login'
  }

  const handleDeleteAccount = async () => {
    try {
      setError(null)
      setIsLoading(true)
      await api.deleteProfile()
      await supabase.auth.signOut()
      document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      window.location.href = '/login'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se smazat účet')
      setIsLoading(false)
    }
  }


  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-200">
        <div className="h-16 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900" />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200 dark:border-neutral-800 animate-pulse h-24" />
            ))}
          </div>
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 animate-pulse h-64 mb-6" />
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 animate-pulse h-48" />
        </main>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center transition-colors duration-200">
        <div className="text-red-400">{t('failedToLoad')}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#050505] text-neutral-900 dark:text-white transition-colors duration-300 relative overflow-hidden">
      {/* Premium ambient glows */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        {profile.role === 'master' ? (
          <>
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-orange-500/5 dark:bg-orange-500/10 blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/5 dark:bg-amber-500/10 blur-[120px]" />
          </>
        ) : (
          <>
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/5 dark:bg-purple-500/10 blur-[120px]" />
          </>
        )}
      </div>

      <Header profile={profile} onLogout={handleLogout} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('back')}
          </button>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">{t('profileAndSettings')}</h1>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-2xl mb-6 backdrop-blur-md">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Card */}
          <div className="bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md border border-neutral-200/50 dark:border-white/5 shadow-xl rounded-3xl p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar and main info */}
              <div className="flex-shrink-0 text-center md:text-left">
                <div className="w-24 h-24 bg-gradient-to-br from-neutral-200 dark:from-neutral-800 to-neutral-300 dark:to-neutral-700 rounded-full mx-auto md:mx-0 mb-4 flex items-center justify-center border border-neutral-200/50 dark:border-white/5 shadow-inner">
                  <User className="w-12 h-12 text-neutral-600 dark:text-neutral-400" />
                </div>
                <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {profile.display_name || t('user')}
                  </h2>
                  {profile.gamification_level && profile.gamification_level !== 'Newbie' && (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      profile.gamification_level === 'Elite' 
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                    }`}>
                      {profile.gamification_level}
                    </span>
                  )}
                </div>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-3">{profile.email}</p>
                

                {profile.role === 'master' && (
                  <div className="flex items-center justify-center md:justify-start gap-2 text-cyan-600 dark:text-cyan-400">
                    <Gem className="w-5 h-5 animate-pulse" />
                    <span className="font-extrabold text-xl tracking-tight">{profile.balance}</span>
                    <span className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">{t('credits')}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              {profile.role === 'master' && (
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white/50 dark:bg-neutral-800/40 border border-neutral-200/30 dark:border-white/5 backdrop-blur-md rounded-2xl p-4 text-center shadow-sm hover:scale-[1.02] transition-all duration-300">
                    <Unlock className="w-5 h-5 text-neutral-500 dark:text-neutral-400 mx-auto mb-2" />
                    <p className="text-neutral-900 dark:text-white font-bold text-lg">{profile.unlocked_leads_count || 0}</p>
                    <p className="text-neutral-500 dark:text-neutral-400 text-xs font-medium">{t('unlocked')}</p>
                  </div>
                  <div className="bg-white/50 dark:bg-neutral-800/40 border border-neutral-200/30 dark:border-white/5 backdrop-blur-md rounded-2xl p-4 text-center shadow-sm hover:scale-[1.02] transition-all duration-300">
                    <CreditCard className="w-5 h-5 text-neutral-500 dark:text-neutral-400 mx-auto mb-2" />
                    <p className="text-neutral-900 dark:text-white font-bold text-lg">{profile.total_spent || 0}</p>
                    <p className="text-neutral-500 dark:text-neutral-400 text-xs font-medium">{t('spent')}</p>
                  </div>
                  <div className="bg-white/50 dark:bg-neutral-800/40 border border-neutral-200/30 dark:border-white/5 backdrop-blur-md rounded-2xl p-4 text-center shadow-sm hover:scale-[1.02] transition-all duration-300">
                    <Tag className="w-5 h-5 text-neutral-500 dark:text-neutral-400 mx-auto mb-2" />
                    <p className="text-neutral-900 dark:text-white font-bold text-lg">{profile.discount_tokens || 0}</p>
                    <p className="text-neutral-500 dark:text-neutral-400 text-xs font-medium">{language === 'ru' ? 'Скидки' : language === 'cs' ? 'Slevy' : 'Discounts'}</p>
                  </div>
                  <div className="bg-white/50 dark:bg-neutral-800/40 border border-neutral-200/30 dark:border-white/5 backdrop-blur-md rounded-2xl p-4 text-center shadow-sm hover:scale-[1.02] transition-all duration-300">
                    <Calendar className="w-5 h-5 text-neutral-500 dark:text-neutral-400 mx-auto mb-2" />
                    <p className="text-neutral-900 dark:text-white font-bold text-sm leading-6">
                      {new Date(profile.created_at).toLocaleDateString('cs-CZ')}
                    </p>
                    <p className="text-neutral-500 dark:text-neutral-400 text-xs font-medium">{t('memberSince')}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Referral Card */}
            {profile.role === 'master' && (
              <div className="mt-6 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-200 dark:border-purple-500/20 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Gift className="w-24 h-24 text-purple-500" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-1">
                      <Gift className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      {language === 'ru' ? 'Пригласи друга - получи бонус!' : language === 'cs' ? 'Pozvi přítele a získej bonus!' : 'Invite a friend and get a bonus!'}
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md">
                      {language === 'ru' 
                        ? 'Поделись своим кодом с другими мастерами. Когда их профиль одобрят, ты получишь 1 скидочный токен (скидка 50% на любую заявку).'
                        : language === 'cs'
                        ? 'Sdílej svůj kód s dalšími tatéry. Když bude jejich profil schválen, získáš 1 slevový token (sleva 50 % na jakoukoli poptávku).'
                        : 'Share your code with other artists. When their profile is approved, you will get 1 discount token (50% discount on any lead).'}
                    </p>
                  </div>
                  
                  {profile.own_referral_code && (
                    <div className="flex flex-col items-center md:items-end">
                      <div className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md shadow-sm border border-purple-200 dark:border-purple-900/30 rounded-xl px-4 py-2 flex items-center gap-3">
                        <span className="font-mono font-bold text-lg text-purple-700 dark:text-purple-400">
                          {profile.own_referral_code}
                        </span>
                        <button 
                          onClick={() => navigator.clipboard.writeText(profile.own_referral_code || '')}
                          className="p-1.5 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-300 rounded transition-colors"
                          title="Скопировать"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="mt-6 flex items-center gap-2 px-5 py-3 bg-neutral-900 dark:bg-neutral-800 hover:bg-neutral-800 dark:hover:bg-neutral-700 text-white rounded-xl transition-all shadow-md hover:scale-[1.02]"
              >
                <Edit2 className="w-4 h-4" />
                {t('editProfile')}
              </button>
            )}
          </div>

          {/* Edit Form */}
          {isEditing && (
            <div className="bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md border border-neutral-200/50 dark:border-white/5 shadow-xl rounded-3xl p-6">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-6">{t('editProfile')}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
                    {t('displayName')}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={t('displayName')}
                      className="w-full bg-white/40 dark:bg-neutral-950/40 border border-neutral-200 dark:border-white/10 rounded-xl pl-11 pr-4 py-3 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
                    {t('phone')}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+X 000 000 000"
                      className="w-full bg-white/40 dark:bg-neutral-950/40 border border-neutral-200 dark:border-white/10 rounded-xl pl-11 pr-4 py-3 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
                    {t('country')}
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                    <select
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      className="w-full bg-white/40 dark:bg-neutral-950/40 border border-neutral-200 dark:border-white/10 rounded-xl pl-11 pr-4 py-3 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all shadow-inner appearance-none"
                    >
                      <option value="" disabled className="text-neutral-900 dark:text-white bg-white dark:bg-neutral-900">{t('selectCountry')}</option>
                      {countries.map(c => (
                        <option key={c.id} value={c.id} className="text-neutral-900 dark:text-white bg-white dark:bg-neutral-900">{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
                    {t('city')}
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      disabled={!selectedCountry || cities.length === 0}
                      className="w-full bg-white/40 dark:bg-neutral-950/40 border border-neutral-200 dark:border-white/10 rounded-xl pl-11 pr-4 py-3 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all shadow-inner appearance-none disabled:opacity-50"
                    >
                      <option value="" disabled className="text-neutral-900 dark:text-white bg-white dark:bg-neutral-900">{t('selectCity')}</option>
                      {cities.map(c => (
                        <option key={c.id} value={c.id} className="text-neutral-900 dark:text-white bg-white dark:bg-neutral-900">{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {profile.role === 'master' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
                      {t('bio')}
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3.5 top-3.5 w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder={t('aboutMe')}
                        rows={3}
                        className="w-full bg-white/40 dark:bg-neutral-950/40 border border-neutral-200 dark:border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all resize-none shadow-inner"
                      />
                    </div>
                  </div>
                )}

                {profile.role === 'master' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
                      {t('portfolioUrl')}
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                      <input
                        type="url"
                        value={portfolioUrl}
                        onChange={(e) => setPortfolioUrl(e.target.value)}
                        placeholder="https://instagram.com/..."
                        className="w-full bg-white/40 dark:bg-neutral-950/40 border border-neutral-200 dark:border-white/10 rounded-xl pl-11 pr-4 py-3 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all shadow-inner"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-xl font-bold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? t('loading') : t('saveChanges')}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-3 bg-neutral-200/50 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-all disabled:opacity-50 font-semibold"
                >
                  <X className="w-4 h-4" />
                  {t('cancel')}
                </button>
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md border border-neutral-200/50 dark:border-white/5 shadow-xl rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-neutral-200/50 dark:border-white/5">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                {t('settings')}
              </h2>
            </div>

            {/* Language */}
            <div className="p-6 border-b border-neutral-200/50 dark:border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  <div>
                    <p className="text-neutral-900 dark:text-white font-semibold">{t('language')}</p>
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm">{t('languageDescription')}</p>
                  </div>
                </div>
                <select
                  value={language}
                  onChange={(e) => setLang(e.target.value as 'ru' | 'en' | 'cs')}
                  className="bg-white/60 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 font-semibold cursor-pointer transition-all shadow-sm"
                >
                  <option value="cs">Čeština</option>
                  <option value="ru">Русский</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            {/* Theme */}
            <div className="p-6 border-b border-neutral-200/50 dark:border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? <Moon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" /> : <Sun className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />}
                  <div>
                    <p className="text-neutral-900 dark:text-white font-semibold">{t('theme')}</p>
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm">{t('themeDescription')}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`px-4 py-2.5 rounded-xl transition-all font-semibold flex items-center shadow-sm ${theme === 'dark' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 scale-[1.02]' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}
                  >
                    <Moon className="w-4 h-4 inline mr-2" />
                    {t('dark')}
                  </button>
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`px-4 py-2.5 rounded-xl transition-all font-semibold flex items-center shadow-sm ${theme === 'light' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 scale-[1.02]' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}
                  >
                    <Sun className="w-4 h-4 inline mr-2" />
                    {t('light')}
                  </button>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="p-6 border-b border-neutral-200/50 dark:border-white/5">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                <p className="text-neutral-900 dark:text-white font-bold">{t('notifications')}</p>
              </div>

              <div className="space-y-4 pl-7">
                <div className="flex items-center justify-between">
                  <p className="text-neutral-700 dark:text-neutral-300 font-medium">{t('emailNotifications')}</p>
                  <Toggle 
                    checked={emailNotifications} 
                    onChange={() => {
                      const newVal = !emailNotifications
                      setEmailNotifications(newVal)
                      saveSetting('emailNotifications', newVal)
                    }} 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-neutral-700 dark:text-neutral-300 font-medium">{t('pushNotifications') || 'Push-уведомления'}</p>
                  <Toggle 
                    checked={pushNotifications} 
                    onChange={async () => {
                      const newVal = !pushNotifications
                      setPushNotifications(newVal)
                      saveSetting('pushNotifications', newVal)
                      if (newVal) {
                        try {
                          const { subscribeToPush } = await import('@/lib/push');
                          await subscribeToPush();
                          import('react-hot-toast').then(mod => mod.default.success(t('pushEnabled') || 'Уведомления включены'));
                        } catch (e) {
                          setPushNotifications(false);
                          saveSetting('pushNotifications', false);
                          import('react-hot-toast').then(mod => mod.default.error(t('pushFailed') || 'Не удалось включить уведомления'));
                        }
                      }
                    }} 
                  />
                </div>
                {profile.role === 'master' && (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-neutral-700 dark:text-neutral-300 font-medium">{t('newLeadAlerts')}</p>
                      <Toggle 
                        checked={newLeadAlerts} 
                        onChange={() => {
                          const newVal = !newLeadAlerts
                          setNewLeadAlerts(newVal)
                          saveSetting('newLeadAlerts', newVal)
                        }}
                        disabled={!emailNotifications}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-neutral-700 dark:text-neutral-300 font-medium">{t('lowCreditAlerts')}</p>
                      <Toggle 
                        checked={lowCreditAlerts} 
                        onChange={() => {
                          const newVal = !lowCreditAlerts
                          setLowCreditAlerts(newVal)
                          saveSetting('lowCreditAlerts', newVal)
                        }}
                        disabled={!emailNotifications}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Password Change */}
            <div className="p-6 border-b border-neutral-200/50 dark:border-white/5">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                <p className="text-neutral-900 dark:text-white font-bold">{t('changePassword')}</p>
              </div>

              {passwordSuccess && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 p-3.5 rounded-xl mb-4 flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4" />
                  {t('passwordSuccess')}
                </div>
              )}

              {passwordError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-3.5 rounded-xl mb-4 text-sm font-medium">
                  {passwordError}
                </div>
              )}

              {!showPasswordForm ? (
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors text-sm font-semibold pl-7"
                >
                  {t('changePassword')} →
                </button>
              ) : (
                <div className="space-y-4 pl-7">
                  <div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('newPassword')}
                      className="w-full bg-white/40 dark:bg-neutral-950/40 border border-neutral-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all shadow-inner"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('confirmPassword')}
                      className="w-full bg-white/40 dark:bg-neutral-950/40 border border-neutral-200 dark:border-white/10 rounded-xl pr-12 pl-4 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all shadow-inner"
                    />
                    <button
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePasswordChange}
                      disabled={isChangingPassword || !newPassword || !confirmPassword}
                      className="px-5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-xl font-bold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all disabled:opacity-50 text-sm"
                    >
                      {isChangingPassword ? t('loading') : t('changePassword')}
                    </button>
                    <button
                      onClick={() => {
                        setShowPasswordForm(false)
                        setNewPassword('')
                        setConfirmPassword('')
                        setPasswordError(null)
                      }}
                      className="px-5 py-2.5 bg-neutral-200/50 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-all text-sm font-semibold"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <p className="text-red-500 font-bold">{t('dangerZone')}</p>
              </div>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 text-red-500 hover:text-red-600 transition-colors text-sm font-bold pl-7"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('deleteAccount')}
                </button>
              ) : (
                <div className="pl-7 space-y-3">
                  <p className="text-neutral-700 dark:text-neutral-300 text-sm font-medium">
                    {t('typeToConfirm')}:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={language === 'ru' ? 'УДАЛИТЬ' : language === 'cs' ? 'SMAZAT' : 'DELETE'}
                    className="w-full bg-white/40 dark:bg-neutral-950/40 border border-red-500/30 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-inner"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== (language === 'ru' ? 'УДАЛИТЬ' : language === 'cs' ? 'SMAZAT' : 'DELETE')}
                      className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500 transition-all disabled:opacity-50 text-sm flex items-center gap-1.5 shadow-md"
                    >
                      <Trash2 className="w-4 h-4" />
                      {t('deleteAccount')}
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false)
                        setDeleteConfirmText('')
                      }}
                      className="px-5 py-2.5 bg-neutral-200/50 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-all text-sm font-semibold"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 mb-8 border-t border-neutral-200/50 dark:border-white/5 pt-8 pb-4 text-center">
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-neutral-500 dark:text-neutral-500">
            <a href="/terms" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Terms of Service</a>
            <a href="/privacy" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Privacy Policy</a>
            <a href="/refunds" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Refund Policy</a>
          </div>
          <p className="mt-4 text-xs text-neutral-400 dark:text-neutral-600">
            &copy; 2026 Tattoo HUB. Все права защищены.
          </p>
        </div>
      </main>
    </div>
  )
}

