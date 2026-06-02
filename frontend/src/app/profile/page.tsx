'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { api, Profile } from '@/lib/api'
import { getTranslation, Language } from '@/lib/i18n'
import { 
  User, Mail, Coins, Calendar, Phone, FileText, Save, X, Edit2, 
  Unlock, CreditCard, Settings, Bell, Lock, Globe, Moon, Sun,
  Trash2, AlertTriangle, Eye, EyeOff, Check, ArrowLeft, Gem, Tag, Copy, Gift
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

  // Settings state
  const [language, setLanguage] = useState('cs')
  const [theme, setTheme] = useState('dark')
  const [emailNotifications, setEmailNotifications] = useState(true)
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  const loadSettings = () => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('language') || 'cs'
      const savedTheme = localStorage.getItem('theme') || 'dark'
      setLanguage(savedLang)
      setTheme(savedTheme)
      setEmailNotifications(localStorage.getItem('emailNotifications') !== 'false')
      setNewLeadAlerts(localStorage.getItem('newLeadAlerts') !== 'false')
      setLowCreditAlerts(localStorage.getItem('lowCreditAlerts') !== 'false')
      
      // Apply theme immediately
      applyTheme(savedTheme)
    }
  }

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

  // Translation helper
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language as Language, key)

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

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang)
    saveSetting('language', newLang)
    // Force reload to apply language
    window.location.reload()
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      
      const updated = await api.updateProfile({
        display_name: displayName,
        phone: phone,
        bio: bio
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
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center transition-colors duration-200">
        <div className="text-neutral-600 dark:text-neutral-400">{t('loading')}</div>
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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-200">
      <Header profile={profile} onLogout={handleLogout} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('back')}
          </button>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{t('profileAndSettings')}</h1>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Card */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar and main info */}
              <div className="flex-shrink-0 text-center md:text-left">
                <div className="w-24 h-24 bg-gradient-to-br from-neutral-300 dark:from-neutral-700 to-neutral-400 dark:to-neutral-600 rounded-full mx-auto md:mx-0 mb-4 flex items-center justify-center">
                  <User className="w-12 h-12 text-neutral-600 dark:text-neutral-400" />
                </div>
                <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {profile.display_name || t('user')}
                  </h2>
                  {profile.gamification_level && profile.gamification_level !== 'Newbie' && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      profile.gamification_level === 'Elite' 
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                    }`}>
                      {profile.gamification_level}
                    </span>
                  )}
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-2">{profile.email}</p>
                

                <div className="flex items-center justify-center md:justify-start gap-2 text-cyan-500">
                  <Gem className="w-5 h-5" />
                  <span className="font-bold text-lg">{profile.credits}</span>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">{t('credits')}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4 text-center">
                  <Unlock className="w-5 h-5 text-neutral-600 dark:text-neutral-400 mx-auto mb-2" />
                  <p className="text-neutral-900 dark:text-white font-medium">{profile.unlocked_leads_count || 0}</p>
                  <p className="text-neutral-600 dark:text-neutral-400 text-xs">{t('unlocked')}</p>
                </div>
                <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4 text-center">
                  <CreditCard className="w-5 h-5 text-neutral-600 dark:text-neutral-400 mx-auto mb-2" />
                  <p className="text-neutral-900 dark:text-white font-medium">{profile.total_spent || 0}</p>
                  <p className="text-neutral-600 dark:text-neutral-400 text-xs">{t('spent')}</p>
                </div>
                <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4 text-center">
                  <Tag className="w-5 h-5 text-neutral-600 dark:text-neutral-400 mx-auto mb-2" />
                  <p className="text-neutral-900 dark:text-white font-medium">{profile.discount_tokens || 0}</p>
                  <p className="text-neutral-600 dark:text-neutral-400 text-xs">Скидки</p>
                </div>
                <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4 text-center">
                  <Calendar className="w-5 h-5 text-neutral-600 dark:text-neutral-400 mx-auto mb-2" />
                  <p className="text-neutral-900 dark:text-white font-medium text-sm">
                    {new Date(profile.created_at).toLocaleDateString('cs-CZ')}
                  </p>
                  <p className="text-neutral-600 dark:text-neutral-400 text-xs">{t('memberSince')}</p>
                </div>
              </div>
            </div>

            {/* Referral Card */}
            <div className="mt-6 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-200 dark:border-purple-500/30 rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Gift className="w-24 h-24" />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-1">
                    <Gift className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    Пригласи друга - получи бонус!
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md">
                    Поделись своим кодом с другими мастерами. Когда их профиль одобрят, ты получишь 1 скидочный токен (скидка 50% на любую заявку).
                  </p>
                </div>
                
                {profile.own_referral_code && (
                  <div className="flex flex-col items-center md:items-end">
                    <div className="bg-white dark:bg-neutral-900 shadow-sm border border-purple-200 dark:border-purple-800 rounded-lg px-4 py-2 flex items-center gap-3">
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

            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="mt-6 flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                {t('editProfile')}
              </button>
            )}
          </div>

          {/* Edit Form */}
          {isEditing && (
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">{t('editProfile')}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                    {t('displayName')}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={t('displayName')}
                      className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg pl-10 pr-4 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                    {t('phone')}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+420 123 456 789"
                      className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg pl-10 pr-4 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                    {t('bio')}
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder={t('aboutMe')}
                      rows={3}
                      className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg pl-10 pr-4 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-950 rounded-lg font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? t('loading') : t('saveChanges')}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  Zrušit
                </button>
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                {t('settings')}
              </h2>
            </div>

            {/* Language */}
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  <div>
                    <p className="text-neutral-900 dark:text-white font-medium">{t('language')}</p>
                    <p className="text-neutral-600 dark:text-neutral-400 text-sm">{t('languageDescription')}</p>
                  </div>
                </div>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-600"
                >
                  <option value="cs">Čeština</option>
                  <option value="ru">Русский</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            {/* Theme */}
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? <Moon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" /> : <Sun className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />}
                  <div>
                    <p className="text-neutral-900 dark:text-white font-medium">{t('theme')}</p>
                    <p className="text-neutral-600 dark:text-neutral-400 text-sm">{t('themeDescription')}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`px-4 py-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-950' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-700'}`}
                  >
                    <Moon className="w-4 h-4 inline mr-2" />
                    {t('dark')}
                  </button>
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`px-4 py-2 rounded-lg transition-colors ${theme === 'light' ? 'bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-950' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-700'}`}
                  >
                    <Sun className="w-4 h-4 inline mr-2" />
                    {t('light')}
                  </button>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                <p className="text-neutral-900 dark:text-white font-medium">{t('notifications')}</p>
              </div>

              <div className="space-y-4 pl-7">
                <div className="flex items-center justify-between">
                  <p className="text-neutral-700 dark:text-neutral-300">{t('emailNotifications')}</p>
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
                  <p className="text-neutral-700 dark:text-neutral-300">{t('newLeadAlerts')}</p>
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
                  <p className="text-neutral-700 dark:text-neutral-300">{t('lowCreditAlerts')}</p>
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
              </div>
            </div>

            {/* Password Change */}
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                <p className="text-neutral-900 dark:text-white font-medium">{t('changePassword')}</p>
              </div>

              {passwordSuccess && (
                <div className="bg-green-900/50 border border-green-500 text-green-200 p-3 rounded-lg mb-4 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {t('passwordSuccess')}
                </div>
              )}

              {passwordError && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-lg mb-4 text-sm">
                  {passwordError}
                </div>
              )}

              {!showPasswordForm ? (
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:text-white transition-colors text-sm"
                >
                  {t('changePassword')} →
                </button>
              ) : (
                <div className="space-y-3 pl-7">
                  <div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('newPassword')}
                      className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('confirmPassword')}
                      className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg pr-12 pl-4 py-2 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                    />
                    <button
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:text-neutral-300"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePasswordChange}
                      disabled={isChangingPassword || !newPassword || !confirmPassword}
                      className="px-4 py-2 bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-950 rounded-lg font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 text-sm"
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
                      className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors text-sm"
                    >
                      Zrušit
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <p className="text-red-400 font-medium">{t('dangerZone')}</p>
              </div>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors text-sm pl-7"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('deleteAccount')}
                </button>
              ) : (
                <div className="pl-7 space-y-3">
                  <p className="text-neutral-700 dark:text-neutral-300 text-sm">
                    {t('typeToConfirm')}:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={language === 'ru' ? 'УДАЛИТЬ' : language === 'cs' ? 'SMAZAT' : 'DELETE'}
                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-red-900/50 rounded-lg px-4 py-2 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== (language === 'ru' ? 'УДАЛИТЬ' : language === 'cs' ? 'SMAZAT' : 'DELETE')}
                      className="px-4 py-2 bg-red-600 text-neutral-900 dark:text-white rounded-lg font-medium hover:bg-red-500 transition-colors disabled:opacity-50 text-sm"
                    >
                      <Trash2 className="w-4 h-4 inline mr-1" />
                      {t('deleteAccount')}
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false)
                        setDeleteConfirmText('')
                      }}
                      className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors text-sm"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
