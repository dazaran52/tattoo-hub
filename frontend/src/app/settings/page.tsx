'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { api, Profile } from '@/lib/api'
import { useLanguage } from '@/i18n/LanguageContext'
import { 
  User, Mail, Settings, Bell, Lock, Globe, Moon, Sun,
  Trash2, AlertTriangle, Eye, EyeOff, Check, ArrowLeft
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

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
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

  // Email change state
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [isChangingEmail, setIsChangingEmail] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailSuccess, setEmailSuccess] = useState(false)

  const { t, lang: language, setLang } = useLanguage()

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

      let profileData;
      let retries = 3;
      while (retries > 0) {
        try {
          profileData = await api.getProfile();
          break;
        } catch (e) {
          if (retries === 1) throw e;
          await new Promise(r => setTimeout(r, 1000));
          retries--;
        }
      }
      
      if (profileData) {
        setProfile(profileData)
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
      localStorage.setItem('theme', themeValue)
    }
  }

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

  const handlePasswordChange = async () => {
    setPasswordError(null)
    setPasswordSuccess(false)

    if (newPassword.length < 6) {
      setPasswordError('Heslo musí mít alespoň 6 znaků')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t('passwordMismatch'))
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

  const handleEmailChange = async () => {
    setEmailError(null)
    setEmailSuccess(false)

    if (!newEmail || !newEmail.includes('@')) {
      setEmailError(language === 'ru' ? 'Неверный формат email' : 'Invalid email format')
      return
    }

    try {
      setIsChangingEmail(true)
      const { error } = await supabase.auth.updateUser({ email: newEmail })
      if (error) throw error

      setEmailSuccess(true)
      setNewEmail('')
      setShowEmailForm(false)
      setTimeout(() => setEmailSuccess(false), 5000)
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Nepodařilo se změnit email')
    } finally {
      setIsChangingEmail(false)
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
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse mb-2" />
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
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">{t('settings')}</h1>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-2xl mb-6 backdrop-blur-md">
            {error}
          </div>
        )}

        <div className="bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md border border-neutral-200/50 dark:border-white/5 shadow-xl rounded-3xl overflow-hidden">
          {/* Language */}
          <div className="p-6 border-b border-neutral-200/50 dark:border-white/5 hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-neutral-900 dark:text-white font-bold">{t('language')}</p>
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-0.5">{t('languageDescription')}</p>
                </div>
              </div>
              <select
                value={language}
                onChange={(e) => setLang(e.target.value as 'ru' | 'en' | 'cs')}
                className="bg-white/60 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold cursor-pointer transition-all shadow-sm"
              >
                <option value="cs">Čeština</option>
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          {/* Theme */}
          <div className="p-6 border-b border-neutral-200/50 dark:border-white/5 hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                  {theme === 'dark' ? <Moon className="w-5 h-5 text-amber-500" /> : <Sun className="w-5 h-5 text-amber-500" />}
                </div>
                <div>
                  <p className="text-neutral-900 dark:text-white font-bold">{t('theme')}</p>
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-0.5">{t('themeDescription')}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`px-4 py-2.5 rounded-xl transition-all font-bold flex items-center shadow-sm ${theme === 'dark' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 scale-[1.02]' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}
                >
                  <Moon className="w-4 h-4 inline mr-2" />
                  {t('dark')}
                </button>
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`px-4 py-2.5 rounded-xl transition-all font-bold flex items-center shadow-sm ${theme === 'light' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 scale-[1.02]' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}
                >
                  <Sun className="w-4 h-4 inline mr-2" />
                  {t('light')}
                </button>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="p-6 border-b border-neutral-200/50 dark:border-white/5">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-neutral-900 dark:text-white font-bold">{t('notifications')}</p>
            </div>

            <div className="space-y-4 pl-14">
              <div className="flex items-center justify-between">
                <p className="text-neutral-700 dark:text-neutral-300 font-bold">{t('emailNotifications')}</p>
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
                <p className="text-neutral-700 dark:text-neutral-300 font-bold">{t('enablePushNotifications')}</p>
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
                    <p className="text-neutral-700 dark:text-neutral-300 font-bold">{t('newLeadAlerts')}</p>
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
                    <p className="text-neutral-700 dark:text-neutral-300 font-bold">{t('lowCreditAlerts')}</p>
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

          {/* Email Change */}
          <div className="p-6 border-b border-neutral-200/50 dark:border-white/5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-cyan-500" />
              </div>
              <p className="text-neutral-900 dark:text-white font-bold">{t('changeEmail')}</p>
            </div>

            <div className="pl-14">
              {emailSuccess && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 p-3.5 rounded-xl mb-4 flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4" />
                  {t('emailSuccess')}
                </div>
              )}

              {emailError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-3.5 rounded-xl mb-4 text-sm font-medium">
                  {emailError}
                </div>
              )}

              {!showEmailForm ? (
                <button
                  onClick={() => setShowEmailForm(true)}
                  className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors text-sm font-bold"
                >
                  {t('changeEmail')} →
                </button>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('changeEmailDesc')}</p>
                  <div>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder={t('newEmail')}
                      className="w-full bg-white/40 dark:bg-neutral-950/40 border border-neutral-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all shadow-inner"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleEmailChange}
                      disabled={isChangingEmail || !newEmail}
                      className="px-5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-xl font-bold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all disabled:opacity-50 text-sm"
                    >
                      {isChangingEmail ? t('loading') : t('changeEmail')}
                    </button>
                    <button
                      onClick={() => {
                        setShowEmailForm(false)
                        setNewEmail('')
                        setEmailError(null)
                      }}
                      className="px-5 py-2.5 bg-neutral-200/50 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-all text-sm font-bold"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Password Change */}
          <div className="p-6 border-b border-neutral-200/50 dark:border-white/5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-indigo-500" />
              </div>
              <p className="text-neutral-900 dark:text-white font-bold">{t('changePassword')}</p>
            </div>

            <div className="pl-14">
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
                  className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors text-sm font-bold"
                >
                  {t('changePassword')} →
                </button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('newPassword')}
                      className="w-full bg-white/40 dark:bg-neutral-950/40 border border-neutral-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('confirmPassword')}
                      className="w-full bg-white/40 dark:bg-neutral-950/40 border border-neutral-200 dark:border-white/10 rounded-xl pr-12 pl-4 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
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
                      className="px-5 py-2.5 bg-neutral-200/50 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-all text-sm font-bold"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="p-6 bg-red-500/5 dark:bg-red-500/10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-red-500 font-bold">{t('dangerZone')}</p>
            </div>

            <div className="pl-14">
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 text-red-500 hover:text-red-600 transition-colors text-sm font-bold"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('deleteAccount')}
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-neutral-700 dark:text-neutral-300 text-sm font-medium">
                    {t('typeToConfirm')}:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={language === 'ru' ? 'УДАЛИТЬ' : language === 'cs' ? 'SMAZAT' : 'DELETE'}
                    className="w-full bg-white border border-red-500/30 dark:bg-neutral-900/50 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-inner"
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
                      className="px-5 py-2.5 bg-neutral-200/50 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-all text-sm font-bold"
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
