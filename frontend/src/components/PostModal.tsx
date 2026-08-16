import { useTranslations } from "next-intl";
import Image from 'next/image'
import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Trash2, Edit2, Check, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export interface PostMedia {
  url: string
  type: 'image' | 'video'
}

export interface PortfolioPost {
  id: string
  media: PostMedia[]
  description: string | null
  created_at: string
}

interface PostModalProps {
  isOpen: boolean
  post: PortfolioPost | null
  onClose: () => void
  isEditable?: boolean
  onPostDeleted?: (postId: string) => void
  onPostUpdated?: (post: PortfolioPost) => void
}

export function PostModal({ isOpen, post, onClose, isEditable = false, onPostDeleted, onPostUpdated }: PostModalProps) {
    const t = useTranslations();
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [editDescription, setEditDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  if (!isOpen || !post) return null

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev === post.media.length - 1 ? 0 : prev + 1))
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev === 0 ? post.media.length - 1 : prev - 1))
  }

  const handleDelete = async () => {
    if (!confirm(t('Auto.text_3a4368'))) return
    
    setIsDeleting(true)
    try {
      const { error } = await supabase.from('portfolio_posts').delete().eq('id', post.id)
      if (error) throw error
      if (onPostDeleted) onPostDeleted(post.id)
      onClose()
    } catch (err) {
      console.error(err)
      alert(t('Auto.text_17bf22'))
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSaveDescription = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('portfolio_posts')
        .update({ description: editDescription })
        .eq('id', post.id)
      if (error) throw error
      
      const updatedPost = { ...post, description: editDescription }
      if (onPostUpdated) onPostUpdated(updatedPost)
      setIsEditing(false)
    } catch (err) {
      console.error(err)
      alert(t('Auto.text_126f18'))
    } finally {
      setIsSaving(false)
    }
  }

  const startEditing = () => {
    setEditDescription(post.description || '')
    setIsEditing(true)
  }

  const currentMedia = post.media[currentIndex]

  return (
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6"
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
    >
      <button 
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
      >
        <X className="w-6 h-6" />
      </button>

      <div 
        className="flex flex-col md:flex-row bg-white dark:bg-neutral-900 w-full max-w-5xl h-[85vh] md:h-[80vh] rounded-2xl overflow-hidden shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Left Side: Media Carousel */}
        <div className="w-full md:w-[60%] h-[50vh] md:h-full bg-black relative flex items-center justify-center group">
          {currentMedia?.type === 'video' ? (
            <video 
              src={currentMedia.url} 
              controls 
              autoPlay 
              playsInline
              loop
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <Image 
              src={currentMedia?.url || ''} 
              alt="Post media" 
              className="max-w-full max-h-full object-contain"
             width={800} height={800} />
          )}

          {/* Navigation Arrows */}
          {post.media.length > 1 && (
            <>
              <button 
                onClick={handlePrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              
              {/* Indicators */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {post.media.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-1.5 rounded-full transition-all ${idx === currentIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right Side: Details & Comments */}
        <div className="w-full md:w-[40%] h-[35vh] md:h-full flex flex-col bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-950">
            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              {new Date(post.created_at).toLocaleDateString()}
            </div>
            {isEditable && (
              <div className="flex gap-2">
                <button 
                  onClick={startEditing}
                  disabled={isEditing}
                  className="p-2 text-neutral-500 hover:text-accent-500 hover:bg-accent-500/10 rounded-full transition-colors disabled:opacity-50"
                  title={t('edit')}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="p-2 text-neutral-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors disabled:opacity-50"
                  title={t('delete')}
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {isEditing ? (
              <div className="space-y-3">
                <textarea 
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full h-32 bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl p-3 text-neutral-900 dark:text-white focus:ring-2 focus:ring-accent-500 resize-none"
                  placeholder={t('Auto.text_38389a')}
                />
                <div className="flex gap-2 justify-end">
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                  >
                    {t('cancel')}
                                                        </button>
                  <button 
                    onClick={handleSaveDescription}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-bold bg-accent-500 text-white hover:bg-accent-600 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {t('save')}
                                                        </button>
                </div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-neutral-800 dark:text-neutral-200 text-[15px] leading-relaxed">
                {post.description || <span className="text-neutral-400 italic">{t('Auto.text_f29ff9')}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
