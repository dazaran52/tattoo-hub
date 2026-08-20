'use client'

import React, { useEffect, useState } from 'react'
import { motion, useSpring, useMotionValue } from 'framer-motion'

export default function BackgroundGlow() {
  const [mounted, setMounted] = useState(false)
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
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY])

  // Чтобы избежать проблем с гидратацией из-за window.innerWidth
  if (!mounted) return null

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1] bg-white dark:bg-[#09090b]">
      {/* 1. Пассивная Лава-лампа (Mesh Gradient) */}
      <motion.div 
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
          x: ['0%', '5%', '0%'],
          y: ['0%', '10%', '0%']
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-primary-500/15 dark:bg-primary-500/10 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen"
      />
      <motion.div 
        animate={{
          scale: [1, 1.3, 1],
          rotate: [0, -90, 0],
          x: ['0%', '-10%', '0%'],
          y: ['0%', '-5%', '0%']
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute top-[10%] -right-[10%] w-[50%] h-[50%] bg-accent-500/15 dark:bg-accent-500/10 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen"
      />
      <motion.div 
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 45, 0],
          x: ['0%', '5%', '0%'],
          y: ['0%', '-10%', '0%']
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-[20%] left-[10%] w-[70%] h-[70%] bg-purple-500/15 dark:bg-purple-500/10 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen"
      />

      {/* 2. Интерактивный Spotlight (тянется за мышкой) */}
      <motion.div
        className="absolute w-[600px] h-[600px] bg-primary-400/10 dark:bg-primary-400/5 rounded-full blur-[100px] mix-blend-screen -ml-[300px] -mt-[300px]"
        style={{ x: springX, y: springY }}
      />

      {/* 3. Пленочное зерно (Premium Matte Texture) */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04] mix-blend-overlay" 
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      ></div>
    </div>
  )
}
