'use client'
import { useTranslations } from "next-intl";


import Image from 'next/image'
import { useState, useEffect } from 'react'
import { X, User, Star, ImageIcon, Video } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { PostModal } from './PostModal'
import { OnlineIndicator } from '@/components/OnlineIndicator'
import { VerifiedMasterBadge } from '@/components/PublicMasterTrust'

export function MasterProfileModal({ username, onClose, onBook }: { username: string, onClose: () => void, onBook: (masterId: string) => void }) {
    const t = useTranslations();
  const [master, setMaster] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'portfolio' | 'reviews'>('portfolio')
  const [selectedPost, setSelectedPost] = useState<any>(null)

  useEffect(() => {
    async function fetchMaster() {
      try {
        setIsLoading(true)
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/public/master/${username}`)
        if (res.ok) {
          const data = await res.json()
          setMaster(data)
        }
        
        const revRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/public/master/${username}/reviews`)
        if (revRes.ok) {
          const revData = await revRes.json()
          setReviews(revData)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }
    fetchMaster()
  }, [username])

  if (!username) return null

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}>
      <div 
        className="w-full max-w-2xl bg-white dark:bg-[#0a0a0a] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-neutral-200 dark:border-neutral-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-[#0a0a0a] z-10 sticky top-0">
          <h2 className="text-lg font-bold">{t('masterProfile')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="animate-pulse space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-neutral-200 dark:bg-neutral-800 rounded-full"></div>
                <div className="space-y-2">
                  <div className="w-32 h-6 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
                  <div className="w-24 h-4 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
                </div>
              </div>
            </div>
          ) : master ? (
            <>
              {/* Profile Info */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 text-center sm:text-left">
                <div className="relative">
                  <Image 
                    src={master.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(master.display_name || master.username || 'M')}`} 
                    alt="Avatar" 
                    className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-neutral-900 shadow-lg"
                    width={96} height={96} 
                  />
                  <OnlineIndicator userId={master?.id} lastSeen={master.last_seen} size="lg" className="bottom-1 right-1" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                    <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                      {master.display_name || master.username}
                    </h1>
                    <VerifiedMasterBadge verified={master.certificate_status === 'approved' || master.is_verified_master} />
                  </div>
                  <p className="text-neutral-500 dark:text-neutral-400 mb-3">@{master.username}</p>
                  
                  {master.review_count > 0 && (
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 mb-3 text-yellow-500">
                      <Star className="w-5 h-5 fill-current" />
                      <span className="font-bold text-lg">{master.rating}</span>
                      <span className="text-neutral-500 dark:text-neutral-400 text-sm">({master.review_count} {t('reviews')}</span>
                    </div>
                  )}

                  {master.bio && (
                    <p className="text-neutral-700 dark:text-neutral-300 text-sm max-w-md">
                      {master.bio}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button 
                onClick={() => {
                  onClose()
                  onBook(master.id)
                }}
                className="w-full py-4 mb-8 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                {t('leaveARequestFor')}
                                                </button>

              {/* Tabs */}
              <div className="flex gap-2 p-1.5 bg-neutral-100 dark:bg-neutral-900 rounded-xl mb-6">
                <button
                  onClick={() => setActiveTab('portfolio')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                    activeTab === 'portfolio' 
                      ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm' 
                      : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-white/50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  {t('portfolio')}
                                                      </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                    activeTab === 'reviews' 
                      ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm' 
                      : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-white/50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  {t('reviews2')}
                                                      </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'portfolio' ? (
                <div className="grid grid-cols-2 gap-3">
                  {master.portfolio_posts && master.portfolio_posts.length > 0 ? (
                    master.portfolio_posts.map((post: any) => {
                      const firstMedia = post.media[0]
                      const hasMultiple = post.media.length > 1
                      const hasVideo = post.media.some((m: any) => m.type === 'video')

                      return (
                        <div 
                          key={post.id} 
                          onClick={() => setSelectedPost(post)}
                          className="group relative aspect-square rounded-2xl overflow-hidden bg-black cursor-pointer shadow-sm"
                        >
                          {firstMedia?.type === 'video' ? (
                            <video src={firstMedia.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                          ) : (
                            <Image src={firstMedia?.url || ''} alt="Portfolio item" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"  width={800} height={800} />
                          )}
                          
                          <div className="absolute top-2 right-2 flex gap-1">
                            {hasVideo && <div className="p-1.5 bg-black/50 backdrop-blur-md rounded-lg text-white"><Video className="w-3 h-3" /></div>}
                            {hasMultiple && <div className="p-1.5 bg-black/50 backdrop-blur-md rounded-lg text-white"><ImageIcon className="w-3 h-3" /></div>}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="col-span-2 text-center py-12 text-neutral-500">
                      {t('portfolioIsEmptyYet')}
                                                                      </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.length > 0 ? (
                    reviews.map((r: any) => (
                      <div key={r.id} className="p-5 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-sm">{r.client_name}</span>
                          <span className="text-xs text-neutral-500">{format(parseISO(r.created_at), 'd MMM yyyy', { locale: ru })}</span>
                        </div>
                        <div className="flex gap-1 mb-3">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star key={star} className={`w-3 h-3 ${star <= r.rating ? 'text-yellow-500 fill-yellow-500' : 'text-neutral-300 dark:text-neutral-700 fill-current opacity-30'}`} />
                          ))}
                        </div>
                        {r.text && <p className="text-sm text-neutral-700 dark:text-neutral-300">{r.text}</p>}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-neutral-500">
                      {t('noReviewsYet')}
                                                                          </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-neutral-500">{t('profileLoadError')}</div>
          )}
        </div>
      </div>

      {selectedPost && (
        <PostModal
          isOpen={true}
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          isEditable={false}
        />
      )}
    </div>
  )
}
