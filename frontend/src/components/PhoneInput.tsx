import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const COUNTRIES = [
  { code: 'CZ', dialCode: '420', flag: '🇨🇿', mask: '### ### ###' },
  { code: 'PL', dialCode: '48', flag: '🇵🇱', mask: '### ### ###' },
  { code: 'DE', dialCode: '49', flag: '🇩🇪', mask: '#### #######' },
  { code: 'UA', dialCode: '380', flag: '🇺🇦', mask: '## ### ## ##' },
  { code: 'SK', dialCode: '421', flag: '🇸🇰', mask: '### ### ###' },
  { code: 'RU', dialCode: '7', flag: '🇷🇺', mask: '### ### ## ##' },
  { code: 'KZ', dialCode: '7', flag: '🇰🇿', mask: '### ### ## ##' },
  { code: 'US', dialCode: '1', flag: '🇺🇸', mask: '### ### ####' },
  { code: 'GB', dialCode: '44', flag: '🇬🇧', mask: '#### ######' },
  { code: 'Other', dialCode: '', flag: '🌐', mask: '###############' } // Fallback
]

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function PhoneInput({ value, onChange, placeholder = "Номер телефона" }: PhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Determine current country based on the value's dial code
  const getCurrentCountry = () => {
    if (!value || !value.startsWith('+')) return COUNTRIES[0] // Default to CZ
    const numericValue = value.replace(/\D/g, '')
    // Find the longest matching dial code
    const matched = COUNTRIES.filter(c => c.dialCode && numericValue.startsWith(c.dialCode))
      .sort((a, b) => b.dialCode.length - a.dialCode.length)[0]
    return matched || COUNTRIES[COUNTRIES.length - 1]
  }

  const [selectedCountry, setSelectedCountry] = useState(getCurrentCountry())

  useEffect(() => {
    const country = getCurrentCountry()
    if (country.code !== selectedCountry.code && value) {
      setSelectedCountry(country)
    }
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatPhone = (rawInput: string, country: typeof COUNTRIES[0]) => {
    let digitsOnly = rawInput.replace(/\D/g, '')
    
    // If the input doesn't start with the dial code, but we know the country, prepend it
    // But only if we are typing normally. Actually, it's easier to format the local part.
    if (country.dialCode && digitsOnly.startsWith(country.dialCode)) {
      digitsOnly = digitsOnly.slice(country.dialCode.length)
    }

    // Apply mask
    let formatted = ''
    let digitIndex = 0
    let maskIndex = 0

    while (digitIndex < digitsOnly.length && maskIndex < country.mask.length) {
      if (country.mask[maskIndex] === '#') {
        formatted += digitsOnly[digitIndex]
        digitIndex++
      } else {
        formatted += country.mask[maskIndex]
      }
      maskIndex++
    }

    return { 
      formattedLocal: formatted, 
      digitsOnly: digitsOnly,
      maxLength: country.mask.replace(/[^#]/g, '').length 
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value
    // If user deletes the prefix
    if (!input.startsWith(`+${selectedCountry.dialCode}`)) {
       // Allow deleting but we need to re-evaluate
       const numericInput = input.replace(/\D/g, '')
       onChange(numericInput ? `+${numericInput}` : '')
       return
    }

    const localPart = input.slice(`+${selectedCountry.dialCode}`.length)
    const { digitsOnly, maxLength } = formatPhone(localPart, selectedCountry)
    
    // Limit to max length
    const finalDigits = digitsOnly.slice(0, maxLength)
    const { formattedLocal } = formatPhone(finalDigits, selectedCountry)
    
    onChange(finalDigits ? `+${selectedCountry.dialCode} ${formattedLocal}`.trim() : `+${selectedCountry.dialCode}`)
  }

  const handleCountrySelect = (country: typeof COUNTRIES[0]) => {
    setSelectedCountry(country)
    setIsOpen(false)
    onChange(country.dialCode ? `+${country.dialCode} ` : '+')
  }

  // Calculate remaining chars
  let displayValue = value
  if (!value && selectedCountry.dialCode) {
    displayValue = `+${selectedCountry.dialCode} `
  }

  const currentLocalPartLength = displayValue.replace(/\D/g, '').replace(selectedCountry.dialCode, '').length
  const maxLocalPartLength = selectedCountry.mask.replace(/[^#]/g, '').length
  const charsRemaining = maxLocalPartLength - currentLocalPartLength

  const fullPlaceholder = selectedCountry.dialCode ? `+${selectedCountry.dialCode} ${selectedCountry.mask.replace(/#/g, '_')}` : ''

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="flex items-center w-full bg-neutral-100 dark:bg-neutral-800 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-violet-500/20 transition-all">
        {/* Country Selector Dropdown Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 pl-4 pr-3 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors border-r border-neutral-200 dark:border-neutral-700"
        >
          <span className="text-xl leading-none">{selectedCountry.flag}</span>
          <ChevronDown className="w-4 h-4 text-neutral-500" />
        </button>

        {/* Input Field */}
        <div className="relative flex-1 font-mono">
          {/* Underlay for gaps */}
          <div className="absolute inset-0 px-4 py-2.5 text-sm text-neutral-400/50 dark:text-neutral-500/50 pointer-events-none select-none whitespace-pre overflow-hidden flex items-center">
            <span className="invisible">{displayValue}</span>
            <span>{fullPlaceholder ? fullPlaceholder.slice(displayValue.length) : ''}</span>
          </div>
          
          <input
            type="tel"
            value={displayValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="w-full bg-transparent border-none px-4 py-2.5 text-sm focus:ring-0 outline-none relative z-10 text-neutral-900 dark:text-white"
          />
          {selectedCountry.dialCode && maxLocalPartLength > 0 && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold z-20">
              {charsRemaining <= 0 ? (
                <span className="text-green-500 dark:text-green-400">✓</span>
              ) : currentLocalPartLength > 0 ? (
                <span className="text-red-400 dark:text-red-500">✗</span>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full left-0 mt-2 w-64 max-h-60 overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl py-2"
          >
            {COUNTRIES.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => handleCountrySelect(country)}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                <span className="text-xl">{country.flag}</span>
                <span className="font-medium text-sm text-neutral-900 dark:text-white flex-1 text-left">
                  {country.code === 'Other' ? 'Другая страна' : country.code}
                </span>
                <span className="text-xs text-neutral-500 font-mono">
                  {country.dialCode ? `+${country.dialCode}` : ''}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
