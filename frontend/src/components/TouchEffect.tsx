'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Ripple {
  id: number
  x: number
  y: number
}

export function TouchEffect() {
  const [ripples, setRipples] = useState<Ripple[]>([])

  useEffect(() => {
    let nextId = 0
    const handlePointerDown = (e: PointerEvent) => {
      // Create a ripple at the touch/click location
      const newRipple = { id: nextId++, x: e.clientX, y: e.clientY }
      setRipples((prev) => [...prev, newRipple])

      // Provide haptic feedback on mobile if supported
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        try {
          window.navigator.vibrate(10) // premium Google Pixel-like tick (10ms)
        } catch (err) {
          // Ignore if not supported/allowed
        }
      }

      // Remove the ripple after animation duration (600ms)
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id))
      }, 800)
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      <AnimatePresence>
        {ripples.map((ripple) => (
          <React.Fragment key={ripple.id}>
            {/* Main Expanding Ripple */}
            <motion.div
              initial={{ opacity: 0.8, scale: 0 }}
              animate={{ opacity: 0, scale: 2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute w-20 h-20 -ml-10 -mt-10 rounded-full border-2 border-white/40"
              style={{ left: ripple.x, top: ripple.y }}
            />
            
            {/* Inner glowing core */}
            <motion.div
              initial={{ opacity: 1, scale: 0 }}
              animate={{ opacity: 0, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute w-12 h-12 -ml-6 -mt-6 rounded-full bg-white/20 blur-md"
              style={{ left: ripple.x, top: ripple.y }}
            />

            {/* Sparkles radiating outwards */}
            {[...Array(4)].map((_, i) => {
              const angle = (i * Math.PI) / 2 + Math.PI / 4 // 45, 135, 225, 315 degrees
              const distance = 40
              const dx = Math.cos(angle) * distance
              const dy = Math.sin(angle) * distance

              return (
                <motion.div
                  key={`sparkle-${ripple.id}-${i}`}
                  initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                  animate={{ opacity: 0, scale: 0, x: dx, y: dy }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="absolute w-1.5 h-1.5 rounded-full bg-white"
                  style={{ left: ripple.x - 3, top: ripple.y - 3 }}
                />
              )
            })}
          </React.Fragment>
        ))}
      </AnimatePresence>
    </div>
  )
}
