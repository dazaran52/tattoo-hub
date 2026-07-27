'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { User, Loader2, Image as ImageIcon, Video, Star, AtSign, Link as LinkIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { PostModal, PortfolioPost } from '@/components/PostModal'
import { LeadWizard } from '@/components/LeadWizard'
import { MasterTrustSummary, VerifiedMasterBadge, WhatHappensNext } from '@/components/PublicMasterTrust'
import { publicApi, PublicMaster, PublicReview } from '@/lib/publicApi'

type BookMaster = Omit<PublicMaster, 'portfolio_posts'> & {
  portfolio_posts?: PortfolioPost[]
}

const getThemeClasses = (theme: string) => {
  switch (theme) {
    case 'dark':
      return {
        bg: 'bg-[#050505] text-white',
        card: 'bg-neutral-900/40 backdrop-blur-xl border border-white/5 shadow-2xl',
        input: 'bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 shadow-inner',
        buttonPrimary: 'bg-white text-neutral-900 hover:bg-neutral-200 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all',
        tabsBg: 'bg-neutral-900 p-1.5',
        tabActive: 'bg-neutral-800 text-white',
        tabInactive: 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50',
      }
    case 'light':
      return {
        bg: 'bg-neutral-50 text-neutral-900',
        card: 'bg-white/60 backdrop-blur-xl border border-neutral-200/50 shadow-xl',
        input: 'bg-white border border-neutral-200 text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 shadow-inner',
        buttonPrimary: 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all',
        tabsBg: 'bg-neutral-100 p-1.5',
        tabActive: 'bg-white text-neutral-900 shadow-sm',
        tabInactive: 'text-neutral-500 hover:text-neutral-700 hover:bg-white/50',
      }
    case 'violet':
      return {
        bg: 'bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white',
        card: 'bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl shadow-violet-500/20',
        input: 'bg-black/40 border border-violet-500/30 text-white placeholder-violet-300/50 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 shadow-inner',
        buttonPrimary: 'bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-500/25 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all',
        tabsBg: 'bg-black/20 p-1.5',
        tabActive: 'bg-violet-600/40 text-white border border-violet-500/50',
        tabInactive: 'text-violet-300/60 hover:text-white hover:bg-white/5',
      }
    case 'cyberpunk':
      return {
        bg: 'bg-neutral-950 text-white bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]',
        card: 'bg-neutral-900/80 backdrop-blur-xl border border-pink-500/30 shadow-2xl shadow-pink-500/10',
        input: 'bg-black/80 border border-cyan-500/30 text-white placeholder-cyan-700 focus:outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500 shadow-inner',
        buttonPrimary: 'bg-gradient-to-r from-pink-600 to-cyan-600 text-white hover:from-pink-500 hover:to-cyan-500 shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all',
        tabsBg: 'bg-black/40 border border-white/5 p-1.5',
        tabActive: 'bg-pink-600/20 text-pink-400 border border-pink-500/50',
        tabInactive: 'text-neutral-500 hover:text-cyan-400 hover:bg-cyan-500/10',
      }
    case 'system':
    default:
      return {
        bg: 'bg-neutral-50 dark:bg-[#050505] text-neutral-900 dark:text-white',
        card: 'bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-neutral-200/50 dark:border-white/5 shadow-xl',
        input: 'bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 shadow-inner',
        buttonPrimary: 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all',
        tabsBg: 'bg-neutral-100 dark:bg-neutral-900 p-1.5',
        tabActive: 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm',
        tabInactive: 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-white/50 dark:hover:bg-neutral-800/50',
      }
  }
}

// Use a subset of Lucide icons or basic SVG if needed
export default function BookMasterPage() {
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
      setError(err instanceof Error ? err.message : 'Ошибка загрузки профиля')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-[#050505] flex items-center justify-center">
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
      <div className="min-h-screen bg-neutral-50 dark:bg-[#050505] flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-neutral-200 dark:border-neutral-800">
          <User className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Страница не найдена</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6">{error}</p>
          <button 
            onClick={() => router.push('/')}
            className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold py-3 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
          >
            На главную
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
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Profile Card */}
        <div className={`rounded-3xl p-8 mb-8 text-center transition-colors duration-500 ${tClasses.card}`}>
          <div className="w-28 h-28 bg-gradient-to-br from-neutral-200 dark:from-neutral-800 to-neutral-300 dark:to-neutral-700 rounded-full mx-auto mb-5 flex items-center justify-center border-4 border-white dark:border-neutral-950 shadow-xl overflow-hidden">
            {master.avatar_url ? (
              <img src={master.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-neutral-500" />
            )}
          </div>
          <div className="mb-2 flex flex-wrap items-center justify-center gap-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight">
              {master.display_name || master.username || 'Мастер'}
            </h1>
            <VerifiedMasterBadge verified={master.certificate_status === 'approved'} />
          </div>
          
          {master.review_count && master.review_count > 0 && (
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
              Смотреть внешнее портфолио
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
            Запись на сеанс
          </button>
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              activeTab === 'portfolio' ? tClasses.tabActive : tClasses.tabInactive
            }`}
          >
            Портфолио
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              activeTab === 'reviews' ? tClasses.tabActive : tClasses.tabInactive
            }`}
          >
            Отзывы
          </button>
        </div>

        {activeTab === 'booking' ? (
          <>
            <WhatHappensNext className={tClasses.card} />
            <LeadWizard
              master={master}
              source={source === 'platform' ? 'platform' : 'personal'}
              themeClasses={{
                card: tClasses.card,
                input: tClasses.input,
                buttonPrimary: tClasses.buttonPrimary
              }}
            />
          </>
        ) : activeTab === 'portfolio' ? (
          <div className={`rounded-3xl p-8 transition-colors duration-500 ${tClasses.card}`}>
            <h2 className="text-2xl font-bold mb-6 text-center">Портфолио</h2>
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
                        <img src={firstMedia?.url} alt="Portfolio item" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
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
                <p>Мастер пока не добавил фото в портфолио</p>
              </div>
            )}
          </div>
        ) : (
          <div className={`rounded-3xl p-8 transition-colors duration-500 ${tClasses.card}`}>
            <h2 className="text-2xl font-bold mb-6 text-center">Отзывы</h2>
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
                <p>У мастера пока нет отзывов</p>
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
