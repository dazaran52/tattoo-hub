import re

with open('frontend/src/components/BackgroundGlow.tsx', 'r') as f:
    content = f.read()

bg_replace = """'use client'

import React, { useEffect, useState } from 'react'
import { motion, useSpring, useMotionValue } from 'framer-motion'

type Palette = {
    c1: string
    c2: string
    c3: string
    spot: string
}

const PALETTES: Record<string, Palette> = {
    'client': { c1: 'bg-blue-500/15', c2: 'bg-cyan-500/15', c3: 'bg-sky-500/15', spot: 'bg-blue-400/10' },
    'master_standard': { c1: 'bg-purple-600/15', c2: 'bg-fuchsia-500/15', c3: 'bg-violet-600/15', spot: 'bg-purple-400/10' },
    'master_pro': { c1: 'bg-yellow-500/15', c2: 'bg-amber-500/15', c3: 'bg-orange-500/15', spot: 'bg-yellow-400/10' },
    'master_vip': { c1: 'bg-red-600/15', c2: 'bg-rose-500/15', c3: 'bg-pink-600/15', spot: 'bg-red-400/10' },
    'admin': { c1: 'bg-emerald-500/15', c2: 'bg-teal-500/15', c3: 'bg-green-500/15', spot: 'bg-emerald-400/10' },
    'default': { c1: 'bg-primary-500/15', c2: 'bg-accent-500/15', c3: 'bg-purple-500/15', spot: 'bg-primary-400/10' }
}

export default function BackgroundGlow() {
  const [mounted, setMounted] = useState(false)
  const [palette, setPalette] = useState<Palette>(PALETTES.default)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  
  const springX = useSpring(mouseX, { stiffness: 40, damping: 20 })
  const springY = useSpring(mouseY, { stiffness: 40, damping: 20 })

  useEffect(() => {
    setMounted(true)
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    
    // Determine Role
    try {
        const cached = localStorage.getItem('tattoo_hub_profile_cache')
        if (cached) {
            const profile = JSON.parse(cached)
            if (profile.role === 'admin') setPalette(PALETTES.admin)
            else if (profile.role === 'client') setPalette(PALETTES.client)
            else if (profile.role === 'master') {
                if (profile.subscription_tier === 'vip') setPalette(PALETTES.master_vip)
                else if (profile.subscription_tier === 'pro') setPalette(PALETTES.master_pro)
                else setPalette(PALETTES.master_standard)
            }
        }
    } catch(e) {}
    
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1] bg-white dark:bg-[#09090b]">
      {/* 1. Пассивная Лава-лампа (Mesh Gradient) */}
      <motion.div 
        animate={{
          scale: [1, 1.4, 1],
          rotate: [0, 180, 360],
          x: ['0%', '10%', '0%'],
          y: ['0%', '15%', '0%']
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className={`absolute -top-[20%] -left-[10%] w-[60%] h-[60%] ${palette.c1} blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen`}
      />
      <motion.div 
        animate={{
          scale: [1, 1.5, 1],
          rotate: [0, -180, -360],
          x: ['0%', '-15%', '0%'],
          y: ['0%', '-10%', '0%']
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className={`absolute top-[10%] -right-[10%] w-[50%] h-[50%] ${palette.c2} blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen`}
      />
      <motion.div 
        animate={{
          scale: [1, 1.3, 1],
          rotate: [0, 90, 360],
          x: ['0%', '10%', '0%'],
          y: ['0%', '-15%', '0%']
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        className={`absolute -bottom-[20%] left-[10%] w-[70%] h-[70%] ${palette.c3} blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen`}
      />

      {/* 2. Интерактивный Spotlight (тянется за мышкой) */}
      <motion.div
        className={`absolute w-[600px] h-[600px] ${palette.spot} rounded-full blur-[100px] mix-blend-screen -ml-[300px] -mt-[300px]`}
        style={{ x: springX, y: springY }}
      />

      {/* 3. Пленочное зерно (Premium Matte Texture) */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] mix-blend-overlay" 
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      ></div>
    </div>
  )
}
"""

with open('frontend/src/components/BackgroundGlow.tsx', 'w') as f:
    f.write(bg_replace)
