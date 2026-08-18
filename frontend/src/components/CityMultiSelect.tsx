import React, { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, X, MapPin } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'

interface City {
  id: string
  name_ru: string
  name_en?: string
  [key: string]: any
}

interface CityMultiSelectProps {
  cities: City[]
  selectedCityIds: string[]
  onChange: (cityIds: string[]) => void
  placeholder?: string
  className?: string
}

export function CityMultiSelect({ cities, selectedCityIds, onChange, placeholder, className = '' }: CityMultiSelectProps) {
  const t = useTranslations()
  const lang = useLocale()
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getCityName = (c: City) => lang === 'en' && c.name_en ? c.name_en : c.name_ru

  const filteredCities = cities.filter(c =>
    getCityName(c).toLowerCase().includes(search.toLowerCase())
  )

  const toggleCity = (cityId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (selectedCityIds.includes(cityId)) {
      onChange(selectedCityIds.filter(id => id !== cityId))
    } else {
      onChange([...selectedCityIds, cityId])
    }
  }

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
  }

  const renderTriggerText = () => {
    if (selectedCityIds.length === 0) {
      return <span className="text-neutral-500">{placeholder || t(t('Все города')) || t('Все города')}</span>
    }

    if (selectedCityIds.length === 1) {
      const city = cities.find(c => c.id === selectedCityIds[0])
      return <span className="text-neutral-900 dark:text-white font-medium truncate">{city ? getCityName(city) : ''}</span>
    }

    return (
      <span className="text-neutral-900 dark:text-white font-medium">
        {t('selected') || t('selected2')}: {selectedCityIds.length}
      </span>
    )
  }

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div
        className="flex items-center justify-between gap-2 px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors shadow-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
          <div className="text-sm truncate">
            {renderTriggerText()}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedCityIds.length > 0 && (
            <button
              onClick={clearSelection}
              className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 border-b border-neutral-100 dark:border-neutral-800">
            <input
              type="text"
              placeholder={t(t('Поиск города...')) || t('Поиск города...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-white transition-all"
              onClick={e => e.stopPropagation()}
            />
          </div>

          <div className="max-h-60 overflow-y-auto p-2 space-y-0.5 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-800">
            {filteredCities.length === 0 ? (
              <div className="p-4 text-center text-sm text-neutral-500">
                {t('noResults') || t('crmBoard.list.nothingFound')}
              </div>
            ) : (
              filteredCities.map(city => {
                const isSelected = selectedCityIds.includes(city.id)
                return (
                  <div
                    key={city.id}
                    onClick={(e) => toggleCity(city.id, e)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors ${isSelected
                      ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 font-medium'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                  >
                    <span className="truncate">{getCityName(city)}</span>
                    {isSelected && <Check className="w-4 h-4" />}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
