'use client'

import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { LeadWizard } from '@/components/LeadWizard'

export default function NewLeadPage() {
  const t = useTranslations()
  const router = useRouter()

  const themeClasses = {
    card: 'bg-transparent border-0 p-0 shadow-none',
    input: 'bg-black/50 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-inner',
    buttonPrimary: 'bg-gradient-to-r from-primary-500 to-primary-500 text-white hover:from-primary-400 hover:to-primary-400 shadow-lg shadow-primary-500/25 hover:scale-[1.01] transition-all'
  }

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white flex flex-col relative overflow-x-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(79,70,229,0.15)_0%,transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] z-0 opacity-30 pointer-events-none" />

      {/* Header */}
      <header className="p-6 relative z-10 flex items-center justify-between">
        <button 
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-sm font-medium tracking-widest uppercase text-neutral-400">
          {t('fastLead')}
        </div>
        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl w-full"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">{t('describeYourIdeaTitle')}</h1>
            <p className="text-neutral-400 text-lg">
              {t('describeYourIdeaDesc')}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl">
            <LeadWizard source="platform" themeClasses={themeClasses} />
          </div>
        </motion.div>
      </main>
    </div>
  )
}
