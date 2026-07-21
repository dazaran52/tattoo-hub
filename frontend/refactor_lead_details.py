import re

path = "frontend/src/components/LeadDetailsModal.tsx"
with open(path, "r") as f:
    content = f.read()

# Add imports
if "import { toast } from 'react-hot-toast'" not in content:
    content = content.replace("import { useState } from 'react'", "import { useState } from 'react'\nimport { toast } from 'react-hot-toast'\nimport { supabase } from '@/lib/supabase'")

# Add onUpdate to props
if "onUpdate?: () => void" not in content:
    content = content.replace("onSessionClick?: (session: any) => void", "onSessionClick?: (session: any) => void\n  onUpdate?: () => void")

# Add isRejecting state and unlock logic
old_state = '''export function LeadDetailsModal({ isOpen, onClose, session, onAccept, onReject, onEdit, onSessionClick, chatId }: LeadDetailsModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)'''

new_state = '''export function LeadDetailsModal({ isOpen, onClose, session, onAccept, onReject, onEdit, onSessionClick, chatId, onUpdate }: LeadDetailsModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)
  
  const isUnlocked = session?.master_clients?.is_unlocked !== false
  const leadId = session?.master_clients?.lead_id
  
  const handleUnlock = async () => {
    try {
      setIsUnlocking(true)
      if (!leadId) throw new Error("No lead ID")
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads/${leadId}/unlock`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authSession?.access_token}` }
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to unlock')
      }
      toast.success('Заявка успешно разблокирована!')
      onUpdate?.()
    } catch(e: any) {
      toast.error(e.message || 'Ошибка разблокировки')
    } finally {
      setIsUnlocking(false)
    }
  }
  
  const submitReject = () => {
    if (!rejectReason.trim()) {
      toast.error('Пожалуйста, укажите причину отказа')
      return
    }
    // We pass the reason via a callback or we can handle the API call here.
    // To make it simple, we can pass it to onReject
    onReject(rejectReason)
    setIsRejecting(false)
    setRejectReason('')
  }'''

if old_state in content:
    content = content.replace(old_state, new_state)

# Replace buttons section
old_buttons = '''            {session.status === 'new' ? (
              <>
                <button 
                  onClick={() => { onClose(); onReject(); }}
                  className="flex-1 py-3.5 px-4 bg-neutral-100 hover:bg-red-50 dark:bg-neutral-800 dark:hover:bg-red-900/30 text-neutral-700 dark:text-neutral-300 hover:text-red-600 dark:hover:text-red-400 rounded-xl font-bold transition-colors"
                >
                  Отклонить
                </button>
                <button 
                  onClick={() => { onClose(); onAccept(); }}
                  className="flex-1 py-3.5 px-4 bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/25 rounded-xl font-bold transition-all hover:scale-[1.02]"
                >
                  Принять заявку
                </button>
              </>
            ) : ('''

new_buttons = '''            {session.status === 'new' ? (
              isRejecting ? (
                <div className="w-full flex flex-col gap-3">
                  <textarea 
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Укажите причину отказа (обязательно)..."
                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 text-sm min-h-[80px] outline-none focus:border-red-500"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setIsRejecting(false)} className="flex-1 py-3 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold">Отмена</button>
                    <button onClick={submitReject} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-500/25">Подтвердить отказ</button>
                  </div>
                </div>
              ) : !isUnlocked ? (
                <div className="w-full flex flex-col gap-3">
                  <button 
                    onClick={handleUnlock}
                    disabled={isUnlocking}
                    className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
                  >
                    {isUnlocking ? 'Разблокировка...' : `Открыть контакты (Платная заявка)`}
                  </button>
                  <button 
                    onClick={() => setIsRejecting(true)}
                    className="w-full py-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:text-red-600 dark:hover:text-red-400 rounded-xl font-bold transition-colors"
                  >
                    Отклонить / Слить в маркетплейс
                  </button>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => setIsRejecting(true)}
                    className="flex-1 py-3.5 px-4 bg-neutral-100 hover:bg-red-50 dark:bg-neutral-800 dark:hover:bg-red-900/30 text-neutral-700 dark:text-neutral-300 hover:text-red-600 dark:hover:text-red-400 rounded-xl font-bold transition-colors"
                  >
                    Отклонить
                  </button>
                  <button 
                    onClick={() => { onClose(); onAccept(); }}
                    className="flex-1 py-3.5 px-4 bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/25 rounded-xl font-bold transition-all hover:scale-[1.02]"
                  >
                    Принять заявку
                  </button>
                </>
              )
            ) : ('''

if old_buttons in content:
    content = content.replace(old_buttons, new_buttons)

# Also fix the interface
content = content.replace("onReject: () => void", "onReject: (reason?: string) => void")

with open(path, "w") as f:
    f.write(content)
print("Updated LeadDetailsModal.tsx successfully")
