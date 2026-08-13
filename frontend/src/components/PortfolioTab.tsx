import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Plus, Image as ImageIcon, Video, Trash2, Edit2, Loader2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PostModal, PortfolioPost } from './PostModal'
import { useTranslations, useLocale } from 'next-intl'
import imageCompression from 'browser-image-compression'
import { EmptyState } from '@/components/EmptyState'

interface PortfolioTabProps {
  profile: any
}

export function PortfolioTab({ profile }: PortfolioTabProps) {
  const t = useTranslations()
  const lang = useLocale()
  const [posts, setPosts] = useState<PortfolioPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [isCreating, setIsCreating] = useState(false)
  const [newDescription, setNewDescription] = useState('')
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  
  const [selectedPost, setSelectedPost] = useState<PortfolioPost | null>(null)

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('portfolio_posts')
        .select('*')
        .eq('master_id', profile.id)
        .order('created_at', { ascending: false })
        
      if (error) throw error
      setPosts(data as PortfolioPost[])
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreatePost = async () => {
    if (newFiles.length === 0) {
      alert(lang === 'ru' ? 'Выберите хотя бы один файл' : 'Select at least one file')
      return
    }

    try {
      setIsUploading(true)
      const mediaUrls = []

      for (const file of newFiles) {
        // Validate size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
          alert(`Файл ${file.name} превышает 50 МБ.`)
          setIsUploading(false)
          return
        }

        let fileToUpload = file
        let fileExt = file.name.split('.').pop()
        const isVideo = file.type.startsWith('video/')
        const type = isVideo ? 'video' : 'image'

        if (!isVideo) {
          const compressionOptions = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          }
          fileToUpload = await imageCompression(file, compressionOptions)
          fileExt = fileToUpload.name.split('.').pop() || 'webp'
        }

        const fileName = `${profile.id}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('portfolio')
          .upload(fileName, fileToUpload)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('portfolio')
          .getPublicUrl(fileName)

        mediaUrls.push({
          url: publicUrlData.publicUrl,
          type
        })
      }

      const { data, error } = await supabase
        .from('portfolio_posts')
        .insert([{
          master_id: profile.id,
          media: mediaUrls,
          description: newDescription
        }])
        .select()
        .single()

      if (error) throw error

      setPosts([data as PortfolioPost, ...posts])
      setIsCreating(false)
      setNewFiles([])
      setNewDescription('')
    } catch (err) {
      console.error(err)
      alert(lang === 'ru' ? 'Ошибка при создании поста' : 'Error creating post')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files)
      if (newFiles.length + filesArray.length > 5) {
        alert(lang === 'ru' ? 'Максимум 5 файлов' : 'Max 5 files')
        return
      }
      setNewFiles(prev => [...prev, ...filesArray])
    }
  }

  const removeFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 md:p-8 border border-neutral-200/50 dark:border-white/5 shadow-xl transition-colors duration-300">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Портфолио</h2>
          <p className="text-neutral-500 text-sm mt-1">Управляйте своими работами, добавляйте фото и видео (до 5 файлов в пост)</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-5 py-2.5 rounded-xl font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Новый пост
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800"></div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          className="py-16 border-dashed"
          icon={<ImageIcon className="w-10 h-10 text-neutral-400" />}
          title="У вас еще нет постов"
          description="Создайте первый пост, чтобы клиенты могли оценить ваши работы."
          actionLabel="Создать пост"
          onAction={() => setIsCreating(true)}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {posts.map(post => {
            const firstMedia = post.media[0]
            const hasMultiple = post.media.length > 1
            const hasVideo = post.media.some(m => m.type === 'video')

            return (
              <div 
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="group relative aspect-square rounded-2xl overflow-hidden bg-black cursor-pointer"
              >
                {firstMedia?.type === 'video' ? (
                  <video src={firstMedia.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <Image src={firstMedia?.url || ''} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"  alt="" width={800} height={800} />
                )}
                
                {/* Icons overlay */}
                <div className="absolute top-2 right-2 flex gap-1">
                  {hasVideo && <div className="p-1.5 bg-black/50 backdrop-blur-md rounded-lg text-white"><Video className="w-4 h-4" /></div>}
                  {hasMultiple && <div className="p-1.5 bg-black/50 backdrop-blur-md rounded-lg text-white"><ImageIcon className="w-4 h-4" /></div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Post Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
              <h3 className="text-xl font-bold">Новый пост</h3>
              <button onClick={() => !isUploading && setIsCreating(false)} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">Медиа файлы (до 5 шт, макс 50 МБ каждый)</label>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {newFiles.map((file, idx) => {
                    const isVid = file.type.startsWith('video/')
                    const url = URL.createObjectURL(file)
                    return (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800">
                        {isVid ? (
                          <video src={url} className="w-full h-full object-cover" />
                        ) : (
                          <Image src={url || ''} className="w-full h-full object-cover"  alt="" width={800} height={800} />
                        )}
                        <button
                          onClick={() => removeFile(idx)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-md"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                  {newFiles.length < 5 && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <Plus className="w-6 h-6 text-neutral-400 mb-1" />
                      <span className="text-xs text-neutral-500 font-medium">Добавить</span>
                      <input 
                        type="file" 
                        accept="image/*,video/*" 
                        multiple 
                        className="hidden" 
                        onChange={handleFileSelect}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Описание</label>
                <textarea
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Опишите вашу работу..."
                  className="w-full h-32 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex justify-end gap-3">
              <button 
                onClick={() => setIsCreating(false)}
                disabled={isUploading}
                className="px-6 py-2.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-xl transition-colors disabled:opacity-50"
              >
                Отмена
              </button>
              <button 
                onClick={handleCreatePost}
                disabled={isUploading || newFiles.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-accent-500 hover:bg-accent-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50 shadow-lg shadow-accent-500/25"
              >
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Опубликовать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View/Edit Modal */}
      <PostModal 
        isOpen={!!selectedPost}
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        isEditable={true}
        onPostUpdated={(updated) => {
          setPosts(posts.map(p => p.id === updated.id ? updated : p))
          setSelectedPost(updated)
        }}
        onPostDeleted={(id) => {
          setPosts(posts.filter(p => p.id !== id))
        }}
      />
    </div>
  )
}
