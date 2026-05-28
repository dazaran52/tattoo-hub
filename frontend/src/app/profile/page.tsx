'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { api, Profile } from '@/lib/api'
import { 
  User, Mail, Coins, Calendar, Phone, FileText, Save, X, Edit2, 
  Unlock, CreditCard, Settings, Bell, Lock, 
  Trash2, AlertTriangle, Eye, EyeOff, Check 
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
      setEmailNotifications(localStorage.getItem('emailNotifications') !== 'false')
      setNewLeadAlerts(localStorage.getItem('newLeadAlerts') !== 'false')
      setLowCreditAlerts(localStorage.getItem('lowCreditAlerts') !== 'false')
    }
  }

  const saveSetting = (key: string, value: string | boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value.toString())
    }
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
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-neutral-400">Načítání...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-red-400">Nepodařilo se načíst profil</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <Header profile={profile} onLogout={handleLogout} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-white mb-8">Profil a nastavení</h1>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Card */}
          <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar and main info */}
              <div className="flex-shrink-0 text-center md:text-left">
                <div className="w-24 h-24 bg-gradient-to-br from-neutral-700 to-neutral-600 rounded-full mx-auto md:mx-0 mb-4 flex items-center justify-center">
                  <User className="w-12 h-12 text-neutral-400" />
                </div>
                <h2 className="text-lg font-semibold text-white mb-1">
                  {profile.display_name || 'Uživatel'}
                </h2>
                <p className="text-neutral-400 text-sm mb-2">{profile.email}</p>
                <div className="flex items-center justify-center md:justify-start gap-2 text-amber-400">
                  <Coins className="w-5 h-5" />
                  <span className="font-bold text-lg">{profile.credits}</span>
                  <span className="text-sm text-neutral-400">kreditů</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex-1 grid grid-cols-3 gap-4">
                <div className="bg-neutral-800 rounded-lg p-4 text-center">
                  <Unlock className="w-5 h-5 text-neutral-400 mx-auto mb-2" />
                  <p className="text-white font-medium">{profile.unlocked_leads_count || 0}</p>
                  <p className="text-neutral-400 text-xs">Odemčených</p>
                </div>
                <div className="bg-neutral-800 rounded-lg p-4 text-center">
                  <CreditCard className="w-5 h-5 text-neutral-400 mx-auto mb-2" />
                  <p className="text-white font-medium">{profile.total_spent || 0}</p>
                  <p className="text-neutral-400 text-xs">Utopených</p>
                </div>
                <div className="bg-neutral-800 rounded-lg p-4 text-center">
                  <Calendar className="w-5 h-5 text-neutral-400 mx-auto mb-2" />
                  <p className="text-white font-medium text-sm">
                    {new Date(profile.created_at).toLocaleDateString('cs-CZ')}
                  </p>
                  <p className="text-neutral-400 text-xs">Členem od</p>
                </div>
              </div>
            </div>

            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="mt-6 flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Upravit profil
              </button>
            )}
          </div>

          {/* Edit Form */}
          {isEditing && (
            <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Upravit profil</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    Zobrazované jméno
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Vaše jméno"
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    Telefon
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+420 123 456 789"
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    O mně
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-5 h-5 text-neutral-500" />
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Krátký popis o sobě..."
                      rows={3}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-50 text-neutral-950 rounded-lg font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Ukládání...' : 'Uložit změny'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  Zrušit
                </button>
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="bg-neutral-900 rounded-xl border border-neutral-800">
            <div className="p-6 border-b border-neutral-800">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-neutral-400" />
                Nastavení
              </h2>
            </div>

            {/* Notifications */}
            <div className="p-6 border-b border-neutral-800">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-neutral-400" />
                <p className="text-white font-medium">Notifikace</p>
              </div>

              <div className="space-y-4 pl-7">
                <div className="flex items-center justify-between">
                  <p className="text-neutral-300">Emailové notifikace</p>
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
                  <p className="text-neutral-300">Nové poptávky</p>
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
                  <p className="text-neutral-300">Nízký zůstatek kreditů</p>
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
            <div className="p-6 border-b border-neutral-800">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-5 h-5 text-neutral-400" />
                <p className="text-white font-medium">Změna hesla</p>
              </div>

              {passwordSuccess && (
                <div className="bg-green-900/50 border border-green-500 text-green-200 p-3 rounded-lg mb-4 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Heslo bylo úspěšně změněno
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
                  className="text-neutral-300 hover:text-white transition-colors text-sm"
                >
                  Změnit heslo →
                </button>
              ) : (
                <div className="space-y-3 pl-7">
                  <div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nové heslo (min. 6 znaků)"
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Potvrzení hesla"
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pr-12 pl-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                    />
                    <button
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePasswordChange}
                      disabled={isChangingPassword || !newPassword || !confirmPassword}
                      className="px-4 py-2 bg-neutral-50 text-neutral-950 rounded-lg font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50 text-sm"
                    >
                      {isChangingPassword ? 'Ukládání...' : 'Změnit heslo'}
                    </button>
                    <button
                      onClick={() => {
                        setShowPasswordForm(false)
                        setNewPassword('')
                        setConfirmPassword('')
                        setPasswordError(null)
                      }}
                      className="px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 transition-colors text-sm"
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
                <p className="text-red-400 font-medium">Nebezpečná zóna</p>
              </div>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors text-sm pl-7"
                >
                  <Trash2 className="w-4 h-4" />
                  Smazat účet
                </button>
              ) : (
                <div className="pl-7 space-y-3">
                  <p className="text-neutral-300 text-sm">
                    Pro potvrzení napište <strong>SMazat</strong>:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="SMazat"
                    className="w-full bg-neutral-800 border border-red-900/50 rounded-lg px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={deleteConfirmText !== 'SMazat'}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-500 transition-colors disabled:opacity-50 text-sm"
                    >
                      <Trash2 className="w-4 h-4 inline mr-1" />
                      Smazat účet
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false)
                        setDeleteConfirmText('')
                      }}
                      className="px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 transition-colors text-sm"
                    >
                      Zrušit
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
