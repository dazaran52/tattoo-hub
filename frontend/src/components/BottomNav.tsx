import { motion } from 'framer-motion'
import { LayoutDashboard, ShoppingBag, ImageIcon, MessageCircle, FileText, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface BottomNavProps {
  activeTab: string
  setActiveTab: (tab: any) => void
  unreadMessagesCount?: number
  userRole?: 'master' | 'client'
}

export function BottomNav({ activeTab, setActiveTab, unreadMessagesCount = 0, userRole = 'master' }: BottomNavProps) {
  const t = useTranslations()

  const tabs = userRole === 'client' ? [
    { id: 'leads', label: t('my_leads') || t('myLeads'), icon: FileText },
    { id: 'top_masters', label: t('masters') || t('masters'), icon: Users },
    { id: 'messages', label: t('messages') || t('messages'), icon: MessageCircle, badge: unreadMessagesCount },
  ] : [
    { id: 'crm', label: t('crm') || 'CRM', icon: LayoutDashboard },
    { id: 'feed', label: t('marketplace') || t('marketplace'), icon: ShoppingBag },
    { id: 'portfolio', label: t('portfolio') || t('portfolio'), icon: ImageIcon },
    { id: 'messages', label: t('messages') || t('messages'), icon: MessageCircle, badge: unreadMessagesCount },
  ]

  const handleTabClick = (tabId: string) => {
    try {
      if (typeof window !== 'undefined' && window.navigator && typeof window.navigator.vibrate === 'function') {
        window.navigator.vibrate(10)
      }
    } catch (e) {}
    setActiveTab(tabId)
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[80] md:hidden w-[calc(100%-2rem)] max-w-md pointer-events-auto">
      <div className="glass-dock rounded-full p-1.5 flex items-center justify-around shadow-[0_12px_40px_rgba(0,0,0,0.6)] border border-white/15">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`relative flex flex-col items-center justify-center py-2 px-3 rounded-full transition-all duration-300 ${
                isActive ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute inset-0 bg-primary-600 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.5)] -z-10"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
                {!!tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-extrabold tracking-tight mt-0.5">
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
