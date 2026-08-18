'use client'

import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { api, Profile } from '@/lib/api'
import { useTranslations, useLocale } from 'next-intl'
import imageCompression from 'browser-image-compression'
import { 
  User, Image as ImageIcon, Check, X, Camera, MapPin, 
  Globe, AtSign, Link as LinkIcon, Share2, ArrowLeft, Trash2, Upload,
  Crown, Sparkles, Zap, ArrowRight
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { ImageViewerModal } from '@/components/ImageViewerModal'
import { QRCodeModal } from '@/components/QRCodeModal'
import { QrCode } from 'lucide-react'
import { CertificateVerificationCard } from '@/components/CertificateVerificationCard'
import { TATTOO_STYLES } from '@/lib/constants'
import { OnlineIndicator } from '@/components/OnlineIndicator'
import { MasterTierBadge } from '@/components/PublicMasterTrust'

export default function ProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations()
  const language = useLocale()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isQRModalOpen, setIsQRModalOpen] = useState(false)

  // Form State
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [theme, setTheme] = useState('system')
  const [selectedStyles, setSelectedStyles] = useState<string[]>([])

  const [countries, setCountries] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])

  const avatarInputRef = useRef<HTMLInputElement>(null)

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
      setTheme(profileData.theme || 'system')
      setSelectedStyles(profileData.styles || [])

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
        city_ids: selectedCity ? [selectedCity] : [],
        theme,
        styles: selectedStyles
      })
      
      setProfile(updated)
      setIsEditing(false)
      toast.success(language === 'ru' ? t('key_707972') : 'Profile saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
      toast.error(language === 'ru' ? t('key_03870f') : 'Save failed')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return
      const file = e.target.files[0]
      setIsUploading(true)
      
      const compressionOptions = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      }
      
      const fileExt = file.name.split('.').pop()
      const fileName = `avatar-${Math.random()}.${fileExt}`
      const filePath = `${profile?.id}/${fileName}`

      const compressedFile = await imageCompression(file, compressionOptions)
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, compressedFile)
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      
      const updated = await api.updateProfile({ avatar_url: data.publicUrl })
      setProfile(updated)
      toast.success(language === 'ru' ? t('key_3bf0a3') : 'Avatar updated')
    } catch (error: any) {
      toast.error(language === 'ru' ? t('key_bacef8') : 'Upload error')
      console.error(error)
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

  const copyPublicLink = async () => {
    if (!profile?.username) {
      toast.error(language === 'ru' ? t('username3') : 'Set username first')
      return
    }
    const url = `${window.location.origin}/book/${profile.username}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: profile.display_name || 'Tattoo Master',
          text: language === 'ru' ? t('key_3c6e98') : 'Book a session with me!',
          url: url
        })
        return
      } catch (err) {
        // Fallback to clipboard if share was cancelled or failed
        console.error('Share failed', err)
      }
    }

    navigator.clipboard.writeText(url)
    toast.success(language === 'ru' ? t('key_fbd40e') : 'Link copied')
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
      
      <QRCodeModal 
        isOpen={isQRModalOpen} 
        onClose={() => setIsQRModalOpen(false)} 
        url={`${window.location.origin}/book/${profile.username}`} 
      />
      
      {/* Cool Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-[500px] overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[80%] bg-primary-500/20 dark:bg-primary-600/20 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen opacity-70 animate-blob"></div>
        <div className="absolute top-[10%] right-[-10%] w-[40%] h-[60%] bg-accent-400/20 dark:bg-accent-500/20 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-screen opacity-70 animate-blob animation-delay-2000"></div>
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
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">{t('key_2bb0a6')}</h1>
          </div>
          <button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={isSaving}
            className={`px-6 py-2.5 rounded-full font-bold transition-all shadow-lg ${
              isEditing 
                ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-500/25 scale-105'
                : 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 hover:border-primary-500/50 hover:shadow-primary-500/10'
            }`}
          >
            {isSaving ? '...' : isEditing ? (language === 'ru' ? t('save') : 'Save') : (language === 'ru' ? t('edit') : 'Edit')}
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
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-accent-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative inline-block mb-6">
                <div className={`absolute inset-0 rounded-full pointer-events-none ${
                  profile.badge_tier === 'vip' 
                    ? 'border-[#F59E0B] border-[3px] shadow-[0_0_25px_rgba(245,158,11,0.6)] ring-4 ring-[#F59E0B]/20 animate-pulse-border'
                    : profile.badge_tier === 'pro'
                      ? 'border-purple-500 border-[3px] shadow-[0_0_20px_rgba(168,85,247,0.5)] ring-4 ring-purple-500/30 animate-pulse-border'
                      : ''
                }`} />
                <div className={`w-32 h-32 rounded-full flex items-center justify-center mx-auto overflow-hidden transition-all relative z-10 ${
                  profile.badge_tier === 'vip' 
                    ? 'border-[3px] border-transparent'
                    : profile.badge_tier === 'pro'
                      ? 'border-[3px] border-transparent'
                      : 'border-[3px] border-white dark:border-neutral-800 shadow-xl'
                }`}>
                  {profile.avatar_url ? (
                    <Image src={profile.avatar_url || ''} alt="Avatar" className="w-full h-full object-cover"  width={800} height={800} />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/30 dark:to-accent-900/30 flex items-center justify-center text-primary-500">
                      <User className="w-12 h-12" />
                    </div>
                  )}
                </div>
                <OnlineIndicator userId={profile.id} lastSeen={new Date().toISOString()} size="lg" className="bottom-2 right-2 border-4 border-white dark:border-neutral-800" />
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute -bottom-1 -right-1 z-20 w-10 h-10 bg-primary-600 hover:bg-primary-700 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 disabled:opacity-50"
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

              <h2 className="text-2xl font-black text-neutral-900 dark:text-white mb-1 flex items-center justify-center gap-2">
                <span>{profile.display_name || t('yourName')}</span>
                <MasterTierBadge badgeTier={profile.badge_tier || 'none'} />
              </h2>
              <p className="text-primary-600 dark:text-primary-400 font-bold mb-4">
                @{profile.username || 'username'}
              </p>
              
              {(profile.country_ids?.[0] || profile.city_ids?.[0]) && (
                <div className="flex items-center justify-center gap-1.5 text-neutral-500 text-sm font-medium">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {cities.find(c => c.id === profile.city_ids?.[0])?.name_ru || 
                     countries.find(c => c.id === profile.country_ids?.[0])?.name_ru || 
                     (language === 'ru' ? t('city') : 'Location')}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-primary-600 to-primary-600 rounded-3xl p-6 shadow-xl shadow-primary-500/20 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {t('key_18f9b5')}
                                            </h3>
              <p className="text-primary-100 text-sm mb-4">
                {t('key_68ebab')}
                                            </p>
              
              <div className="bg-black/20 rounded-xl p-3 flex items-center justify-between backdrop-blur-sm border border-white/10 mt-4">
                <span className="text-sm truncate font-medium opacity-90">
                  tattoo-hub.xyz/book/{profile.username || '...'}
                </span>
                <div className="flex gap-2 ml-2 shrink-0">
                  <button 
                    onClick={() => {
                      if (!profile.username) {
                        toast.error(language === 'ru' ? t('username3') : 'Set username first')
                        return
                      }
                      setIsQRModalOpen(true)
                    }}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors tooltip"
                    title={language === 'ru' ? t('qr2') : 'Show QR Code'}
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={copyPublicLink}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors tooltip"
                    title={language === 'ru' ? t('key_87bc9c') : 'Share'}
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Clickbait VIP Status Promo Banner */}
            {profile.role === 'master' && (
              <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-purple-500/10 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-amber-500/60 hover:shadow-2xl hover:shadow-amber-500/10 group">
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-500/20 blur-2xl transition-all duration-500 group-hover:scale-125 pointer-events-none" />
                <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-purple-500/20 blur-2xl pointer-events-none" />

                <div className="relative z-10">
                  {profile.badge_tier && profile.badge_tier !== 'none' ? (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Crown className="w-6 h-6 text-amber-400 animate-bounce" />
                          <span className="font-extrabold text-lg text-neutral-900 dark:text-white">
                            {profile.badge_tier === 'vip' ? t('vip3') : t('pro')}
                          </span>
                        </div>
                        <MasterTierBadge badgeTier={profile.badge_tier} />
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 font-medium mb-4 leading-relaxed">
                        {profile.badge_tier === 'vip' 
                          ? t('0') 
                          : t('10Pro')}
                        {profile.badge_expires_at && (
                          <span className="block mt-1.5 font-bold text-amber-500 dark:text-amber-400">
                            {t('key_611ed2')} {new Date(profile.badge_expires_at).toLocaleDateString('ru-RU')}
                          </span>
                        )}
                      </p>
                      <button
                        onClick={() => router.push('/top-up?plan=vip')}
                        className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 hover:opacity-95 text-white font-black text-sm transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 group/btn active:scale-95 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-amber-200" />
                        <span>{profile.badge_tier === 'vip' ? t('vip300Czk3') : t('vip300Czk2')}</span>
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="w-6 h-6 text-amber-400 animate-pulse" />
                        <span className="font-black text-lg text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-400 to-purple-400">
                          {t('vip2')}
                                                                              </span>
                      </div>
                      <h4 className="text-sm font-extrabold text-neutral-900 dark:text-white mb-2 leading-snug">
                        {t('vip')}
                                                                        </h4>
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 font-medium mb-4 leading-relaxed">
                        {t('3')} <strong className="text-amber-500 dark:text-amber-400 font-black">300 CZK</strong> {t('key_0cb4af')}
                                                                        </p>
                      <button
                        onClick={() => router.push('/top-up?plan=vip')}
                        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:opacity-95 text-white font-black text-sm transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 group/btn hover:scale-[1.02] active:scale-98 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-amber-200" />
                        <span>{t('vip300Czk')}</span>
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Settings & Portfolio */}
          <div className="lg:col-span-2 space-y-6">
            {profile.role === 'master' && (
              <CertificateVerificationCard
                profile={profile}
                language={language}
                onProfileChange={setProfile}
              />
            )}
            
            <div className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/5 rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-primary-500" />
                {t('key_6feccb')}
                                            </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">{t('displayName')}</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    disabled={!isEditing}
                    className="w-full bg-white dark:bg-black/50 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all disabled:opacity-70 font-medium"
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
                      className="w-full bg-white dark:bg-black/50 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-9 pr-4 py-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all disabled:opacity-70 font-medium"
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
                    placeholder={t('key_48b3da')}
                    className="w-full bg-white dark:bg-black/50 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all disabled:opacity-70 font-medium resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                    <div className="flex items-center gap-1.5"><AtSign className="w-4 h-4"/> Instagram URL</div>
                  </label>
                  <input
                    type="text"
                    value={portfolioUrl}
                    onChange={e => setPortfolioUrl(e.target.value)}
                    disabled={!isEditing}
                    placeholder="instagram.com/your_nick"
                    className="w-full bg-white dark:bg-black/50 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all disabled:opacity-70 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">{t('key_9fdc3f')}</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    disabled={!isEditing}
                    placeholder="+420..."
                    className="w-full bg-white dark:bg-black/50 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all disabled:opacity-70 font-medium"
                  />
                </div>

                {/* Styles */}
                <div className="md:col-span-2 mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-4">
                    {t('key_e9c05a')}
                                                        </label>
                  <div className="flex flex-wrap gap-2">
                    {TATTOO_STYLES.map(style => {
                      const isSelected = selectedStyles.includes(style)
                      return (
                        <button
                          key={style}
                          type="button"
                          disabled={!isEditing}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedStyles(prev => prev.filter(s => s !== style))
                            } else {
                              setSelectedStyles(prev => [...prev, style])
                            }
                          }}
                          className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                            isSelected
                              ? 'bg-primary-500 text-white border-primary-500 shadow-md shadow-primary-500/20'
                              : 'bg-white dark:bg-black/50 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-primary-500/50'
                          } ${!isEditing && 'opacity-70 cursor-not-allowed'}`}
                        >
                          {style}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Locations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">{t('country')}</label>
                    <select
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      disabled={!isEditing}
                      className="w-full bg-white dark:bg-black/50 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all disabled:opacity-70 font-medium cursor-pointer"
                    >
                      <option value="">{t('selectCountry')}</option>
                      {countries.map(country => (
                        <option key={country.id} value={country.id}>{country.name_ru}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">{t('city')}</label>
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      disabled={!isEditing || !selectedCountry}
                      className="w-full bg-white dark:bg-black/50 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all disabled:opacity-70 font-medium cursor-pointer"
                    >
                      <option value="">{t('selectCity')}</option>
                      {cities.map(city => (
                        <option key={city.id} value={city.id}>{city.name_ru}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Theme Selector */}
                <div className="md:col-span-2 mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-4">
                    {t('key_e781d4')}
                                                        </label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { id: 'system', name: t('key_edb3f9'), classes: 'bg-gradient-to-r from-neutral-200 to-neutral-800 text-black dark:text-white border-neutral-300 dark:border-neutral-700' },
                      { id: 'light', name: t('light'), classes: 'bg-white text-black border-neutral-200 shadow-sm' },
                      { id: 'dark', name: t('dark'), classes: 'bg-neutral-900 text-white border-neutral-700' },
                      { id: 'violet', name: 'Violet', classes: 'bg-gradient-to-br from-primary-600 to-primary-900 text-white border-primary-500' },
                      { id: 'cyberpunk', name: 'Cyberpunk', classes: 'bg-gradient-to-br from-yellow-400 via-pink-500 to-accent-500 text-white border-pink-500' },
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        disabled={!isEditing}
                        onClick={() => setTheme(t.id)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${t.classes} ${
                          theme === t.id ? 'ring-2 ring-offset-2 ring-primary-500 scale-105' : 'opacity-70 hover:opacity-100'
                        } ${!isEditing && 'cursor-not-allowed opacity-50'}`}
                      >
                        <span className="font-bold text-sm mix-blend-difference text-white">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>


          </div>
        </div>
      </main>

    </div>
  )
}
