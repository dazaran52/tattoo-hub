'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, User, Loader2, ArrowRight } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageContext'
import toast from 'react-hot-toast'

export default function OnboardingPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [profile, setProfile] = useState<any>(null)

  // Form State
  const [displayName, setDisplayName] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  
  // Locations Data
  const [countries, setCountries] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])

  useEffect(() => {
    fetchProfile()
    fetchCountries()
  }, [])

  useEffect(() => {
    if (selectedCountry) {
      setCities([])
      setSelectedCities([])
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/locations/countries/${selectedCountry}/cities`)
        .then(res => res.json())
        .then(data => {
          setCities(data)
          if (data.length > 0) setSelectedCities([data[0].id])
        })
        .catch(err => console.error(err))
    }
  }, [selectedCountry])

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return router.push('/login')

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/profile`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        if (data.display_name) setDisplayName(data.display_name)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchCountries = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/locations/countries`)
      const data = await res.json()
      setCountries(data)
    } catch (e) {
      console.error(e)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCountry || selectedCities.length === 0 || !displayName.trim()) {
      toast.error('Пожалуйста, заполните все поля')
      return
    }

    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          display_name: displayName,
          country_ids: [selectedCountry],
          city_ids: selectedCities
        })
      })

      if (!response.ok) throw new Error('Failed to update profile')
      
      toast.success('Профиль успешно настроен!')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.message || 'Произошла ошибка')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex flex-col justify-center items-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-3xl p-8"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Добро пожаловать! 🎉</h1>
          <p className="text-neutral-500">Остался всего один шаг перед тем, как вы начнете работу.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium ml-1">Как вас зовут? (Или название студии)</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                required
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Имя / Псевдоним"
                className="w-full pl-12 pr-4 py-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium ml-1">Страна</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <select
                required
                value={selectedCountry}
                onChange={e => setSelectedCountry(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="" disabled>Выберите страну</option>
                {countries.map(c => (
                  <option key={c.id} value={c.id}>{c.name_ru}</option>
                ))}
              </select>
            </div>
          </div>

          <AnimatePresence>
            {cities.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2 overflow-hidden"
              >
                <label className="text-sm font-medium ml-1">Город</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <select
                    required
                    value={selectedCities[0] || ''}
                    onChange={e => setSelectedCities([e.target.value])}
                    className="w-full pl-12 pr-4 py-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Выберите город</option>
                    {cities.map(c => (
                      <option key={c.id} value={c.id}>{c.name_ru}</option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/25"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                Продолжить <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
