'use client'
import { useTranslations } from "next-intl";


import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { User, Loader2, Image as ImageIcon, Video, Star, AtSign, Link as LinkIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { PostModal, PortfolioPost } from '@/components/PostModal'
import { LeadWizard } from '@/components/LeadWizard'
import { MasterTrustSummary, VerifiedMasterBadge, MasterTierBadge, WhatHappensNext } from '@/components/PublicMasterTrust'
import { publicApi, PublicMaster, PublicReview } from '@/lib/publicApi'
import { OnlineIndicator } from '@/components/OnlineIndicator'

type BookMaster = Omit<PublicMaster, 'portfolio_posts'> & {
  portfolio_posts?: PortfolioPost[]
}

const getThemeClasses = (theme: string) => {
  switch (theme) {
    case 'dark':
      return {
        bg: 'bg-[#050505] text-white',
        card: 'bg-neutral-900/40 backdrop-blur-xl border border-white/5 shadow-2xl',
        input: 'bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 shadow-inner',
        buttonPrimary: 'bg-white text-neutral-900 hover:bg-neutral-200 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all',
        tabsBg: 'bg-neutral-900 p-1.5',
        tabActive: 'bg-neutral-800 text-white',
        tabInactive: 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50',
      }
    case 'light':
      return {
        bg: 'bg-neutral-50 text-neutral-900',
        card: 'bg-white/60 backdrop-blur-xl border border-neutral-200/50 shadow-xl',
        input: 'bg-white border border-neutral-200 text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 shadow-inner',
        buttonPrimary: 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all',
        tabsBg: 'bg-neutral-100 p-1.5',
        tabActive: 'bg-white text-neutral-900 shadow-sm',
        tabInactive: 'text-neutral-500 hover:text-neutral-700 hover:bg-white/50',
      }
    case 'violet':
      return {
        bg: 'bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white',
        card: 'bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl shadow-primary-500/20',
        input: 'bg-black/40 border border-primary-500/30 text-white placeholder-primary-300/50 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 shadow-inner',
        buttonPrimary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/25 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all',
        tabsBg: 'bg-black/20 p-1.5',
        tabActive: 'bg-primary-600/40 text-white border border-primary-500/50',
        tabInactive: 'text-primary-300/60 hover:text-white hover:bg-white/5',
      }
    case 'cyberpunk':
      return {
        bg: 'bg-neutral-950 text-white bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]',
        card: 'bg-neutral-900/80 backdrop-blur-xl border border-pink-500/30 shadow-2xl shadow-pink-500/10',
        input: 'bg-black/80 border border-accent-500/30 text-white placeholder-accent-700 focus:outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500 shadow-inner',
        buttonPrimary: 'bg-gradient-to-r from-pink-600 to-accent-600 text-white hover:from-pink-500 hover:to-accent-500 shadow-lg shadow-accent-500/25 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all',
        tabsBg: 'bg-black/40 border border-white/5 p-1.5',
        tabActive: 'bg-pink-600/20 text-pink-400 border border-pink-500/50',
        tabInactive: 'text-neutral-500 hover:text-accent-400 hover:bg-accent-500/10',
      }
    case 'system':
    default:
      return {
        bg: 'bg-transparent text-neutral-900 dark:text-white',
        card: 'bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-neutral-200/50 dark:border-white/5 shadow-xl',
        input: 'bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 shadow-inner',
        buttonPrimary: 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all',
        tabsBg: 'bg-neutral-100 dark:bg-neutral-900 p-1.5',
        tabActive: 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm',
        tabInactive: 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-white/50 dark:hover:bg-neutral-800/50',
      }
  }
}

// Use a subset of Lucide icons or basic SVG if needed
export default function BookMasterPage() {
    const t = useTranslations();
  const params = useParams<{ username: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const source = searchParams.get('source')
  const [master, setMaster] = useState<BookMaster | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'booking' | 'portfolio' | 'reviews'>('booking')
  const [selectedPost, setSelectedPost] = useState<PortfolioPost | null>(null)
  const [reviews, setReviews] = useState<PublicReview[]>([])
  const [isLoadingReviews, setIsLoadingReviews] = useState(false)
  const [isBookingStarted, setIsBookingStarted] = useState(false)

  useEffect(() => {
    fetchMasterProfile()
  }, [params.username])

  const fetchMasterProfile = async () => {
    try {
      setIsLoading(true)
      const data = await publicApi.getMaster(params.username)
      setMaster(data as BookMaster)

      setIsLoadingReviews(true)
      try {
        setReviews(await publicApi.getMasterReviews(params.username))
      } catch {
        setReviews([])
      } finally {
        setIsLoadingReviews(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profileLoadError'))
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-24 h-24 bg-neutral-200 dark:bg-neutral-800 rounded-full mb-4"></div>
          <div className="w-48 h-6 bg-neutral-200 dark:bg-neutral-800 rounded mb-2"></div>
          <div className="w-32 h-4 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !master) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-neutral-200 dark:border-neutral-800">
          <User className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">{t('pageNotFound')}</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6">{error}</p>
          <button 
            onClick={() => router.push('/')}
            className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold py-3 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
          >
            {t('home')}
                              </button>
        </div>
      </div>
    )
  }

  const theme = master?.theme || 'system'
  const tClasses = getThemeClasses(theme)

  return (
    <div className={`min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-500 ${tClasses.bg}`}>
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Profile Card */}
        <div className={`rounded-3xl p-8 mb-8 text-center transition-colors duration-500 ${tClasses.card}`}>
          <div className="relative inline-block mb-5">
            <div className={`absolute inset-0 rounded-full pointer-events-none ${
              master.badge_tier === 'vip' 
                ? 'border-[#F59E0B] border-[3px] shadow-[0_0_25px_rgba(245,158,11,0.6)] ring-4 ring-[#F59E0B]/20 animate-pulse-border'
                : master.badge_tier === 'pro'
                  ? 'border-purple-500 border-[3px] shadow-[0_0_20px_rgba(168,85,247,0.5)] ring-4 ring-purple-500/30 animate-pulse-border'
                  : ''
            }`} />
            <div className={`w-28 h-28 rounded-full flex items-center justify-center mx-auto overflow-hidden transition-all relative z-10 ${
              master.badge_tier === 'vip' 
                ? 'border-[3px] border-transparent'
                : master.badge_tier === 'pro'
                  ? 'border-[3px] border-transparent'
                  : 'border-[3px] border-white dark:border-neutral-950 shadow-xl'
            }`}>
              {master.avatar_url ? (
                <Image src={master.avatar_url || ''} alt="Avatar" className="w-full h-full object-cover"  width={800} height={800} />
              ) : (
                <User className="w-12 h-12 text-neutral-500" />
              )}
            </div>
            <OnlineIndicator userId={master.id} lastSeen={master.last_seen} size="lg" className="bottom-1 right-1 border-4 border-white dark:border-neutral-950" />
          </div>
          <div className="mb-2 flex flex-wrap items-center justify-center gap-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight">
              {master.display_name || master.username || t('master')}
            </h1>
            <VerifiedMasterBadge verified={master.certificate_status === 'approved'} />
            <MasterTierBadge badgeTier={master.badge_tier} />
          </div>
          
          {(master.review_count || 0) > 0 && (
            <div className="flex items-center justify-center gap-1.5 mb-4 text-yellow-500">
              <Star className="w-5 h-5 fill-current" />
              <span className="font-bold text-lg">{master.rating}</span>
              <span className="text-neutral-500 dark:text-neutral-400 text-sm">({master.review_count})</span>
            </div>
          )}

          <MasterTrustSummary cityIds={master.city_ids} />
          
          {master.bio && (
            <p className="text-neutral-600 dark:text-neutral-400 max-w-md mx-auto mb-6">
              {master.bio}
            </p>
          )}

          {master.portfolio_url && source !== 'platform' && (
            <a 
              href={master.portfolio_url.startsWith('http') ? master.portfolio_url : `https://${master.portfolio_url}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white rounded-full transition-colors font-medium text-sm"
            >
              {master.portfolio_url.includes('instagram') ? (
                <AtSign className="w-4 h-4" />
              ) : (
                <LinkIcon className="w-4 h-4" />
              )}
              {t('viewExternalPortfolio')}
                                      </a>
          )}
        </div>

        {/* Tabs */}
        <div className={`flex gap-2 mb-8 rounded-2xl max-w-sm mx-auto relative z-10 transition-colors duration-500 ${tClasses.tabsBg}`}>
          <button
            onClick={() => setActiveTab('booking')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              activeTab === 'booking' ? tClasses.tabActive : tClasses.tabInactive
            }`}
          >
            {t('signUpForA2')}
                                </button>
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              activeTab === 'portfolio' ? tClasses.tabActive : tClasses.tabInactive
            }`}
          >
            {t('portfolio')}
                                </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              activeTab === 'reviews' ? tClasses.tabActive : tClasses.tabInactive
            }`}
          >
            {t('reviews2')}
                                </button>
        </div>

        {activeTab === 'booking' ? (
          <>
            {!isBookingStarted ? (
              <div className="flex flex-col gap-4 max-w-xl mx-auto">
                <WhatHappensNext className={tClasses.card} />
                <button
                  onClick={() => setIsBookingStarted(true)}
                  className={`w-full py-4 rounded-2xl font-bold text-lg ${tClasses.buttonPrimary}`}
                >
                  {t('onboarding.onb_start')}
                                                  </button>
              </div>
            ) : (
              <LeadWizard
                master={master}
                source={source === 'platform' ? 'platform' : 'personal'}
                themeClasses={{
                  card: tClasses.card,
                  input: tClasses.input,
                  buttonPrimary: tClasses.buttonPrimary
                }}
              />
            )}
          </>
        ) : activeTab === 'portfolio' ? (
          <div className={`rounded-3xl p-8 transition-colors duration-500 ${tClasses.card}`}>
            <h2 className="text-2xl font-bold mb-6 text-center">{t('portfolio')}</h2>
            {master.portfolio_posts && master.portfolio_posts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {master.portfolio_posts.map((post: PortfolioPost) => {
                  const firstMedia = post.media[0]
                  const hasMultiple = post.media.length > 1
                  const hasVideo = post.media.some(m => m.type === 'video')

                  return (
                    <div 
                      key={post.id} 
                      onClick={() => setSelectedPost(post)}
                      className="group relative aspect-square rounded-2xl overflow-hidden bg-black shadow-md cursor-pointer"
                    >
                      {firstMedia?.type === 'video' ? (
                        <video src={firstMedia.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                      ) : (
                        <Image src={firstMedia?.url || ''} alt="Portfolio item" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"  width={800} height={800} />
                      )}
                      
                      <div className="absolute top-2 right-2 flex gap-1">
                        {hasVideo && <div className="p-1.5 bg-black/50 backdrop-blur-md rounded-lg text-white"><Video className="w-4 h-4" /></div>}
                        {hasMultiple && <div className="p-1.5 bg-black/50 backdrop-blur-md rounded-lg text-white"><ImageIcon className="w-4 h-4" /></div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
                <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t('theArtistHasNot')}</p>
              </div>
            )}
          </div>
        ) : (
          <div className={`rounded-3xl p-8 transition-colors duration-500 ${tClasses.card}`}>
            <h2 className="text-2xl font-bold mb-6 text-center">{t('reviews2')}</h2>
            {isLoadingReviews ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-neutral-500" /></div>
            ) : reviews.length > 0 ? (
              <div className="space-y-4 text-left">
                {reviews.map((r) => (
                  <div key={r.id} className="p-5 rounded-2xl bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-white/5">
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-bold">{r.client_name}</span>
                      <span className="text-xs text-neutral-500">{format(parseISO(r.created_at), 'd MMM yyyy', { locale: ru })}</span>
                    </div>
                    <div className="flex gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star key={star} className={`w-4 h-4 ${star <= r.rating ? 'text-yellow-500 fill-yellow-500' : 'text-neutral-300 dark:text-neutral-700 fill-current opacity-30'}`} />
                      ))}
                    </div>
                    {r.text && <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{r.text}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
                <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t('theMasterHasNo')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <PostModal
        isOpen={!!selectedPost}
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        isEditable={false}
      />
    </div>
  )
}
