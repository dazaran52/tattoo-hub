'use client'

import React, { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

export function CustomCursor() {
  const [isHovering, setIsHovering] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  // Использование motion values позволяет обновлять позицию без ре-рендера React,
  // что убирает лаги и делает курсор максимально отзывчивым
  const mouseX = useMotionValue(-100)
  const mouseY = useMotionValue(-100)
  const dotMouseX = useMotionValue(-100)
  const dotMouseY = useMotionValue(-100)
  
  // Быстрые пружины для внешнего кольца (чуть-чуть плавности)
  const ringX = useSpring(mouseX, { stiffness: 1500, damping: 50, mass: 0.1 })
  const ringY = useSpring(mouseY, { stiffness: 1500, damping: 50, mass: 0.1 })
  
  // Мгновенные пружины для внутренней точки (следует 1 в 1 за системным курсором)
  const dotX = useSpring(dotMouseX, { stiffness: 3000, damping: 60, mass: 0.05 })
  const dotY = useSpring(dotMouseY, { stiffness: 3000, damping: 60, mass: 0.05 })

  useEffect(() => {
    // Только для не-touch устройств
    const checkDesktop = () => {
      setIsDesktop(window.matchMedia('(pointer: fine)').matches)
    }
    checkDesktop()
    window.addEventListener('resize', checkDesktop)

    const updateMousePosition = (e: MouseEvent) => {
      mouseX.set(e.clientX - 20) // Половина w-10 (40px)
      mouseY.set(e.clientY - 20)
      dotMouseX.set(e.clientX - 4) // Половина w-2 (8px)
      dotMouseY.set(e.clientY - 4)
    }

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Проверка на кликабельные элементы
      const isClickable = window.getComputedStyle(target).cursor === 'pointer' || 
                          target.tagName.toLowerCase() === 'button' ||
                          target.tagName.toLowerCase() === 'a' ||
                          target.closest('button') || target.closest('a')
      
      setIsHovering(!!isClickable)
    }

    if (isDesktop) {
      window.addEventListener('mousemove', updateMousePosition, { passive: true })
      window.addEventListener('mouseover', handleMouseOver, { passive: true })
    }

    return () => {
      window.removeEventListener('resize', checkDesktop)
      if (isDesktop) {
        window.removeEventListener('mousemove', updateMousePosition)
        window.removeEventListener('mouseover', handleMouseOver)
      }
    }
  }, [isDesktop, mouseX, mouseY, dotMouseX, dotMouseY])

  if (!isDesktop) return null

  return (
    <>
      {/* Outer Ring */}
      <motion.div
        className="fixed top-0 left-0 w-10 h-10 border border-white/50 rounded-full pointer-events-none z-[9998] mix-blend-difference flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.2)]"
        style={{
          x: ringX,
          y: ringY
        }}
        animate={{
          scale: isHovering ? 1.5 : 1,
          backgroundColor: isHovering ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0)',
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      />
      {/* Inner Dot */}
      <motion.div
        className="fixed top-0 left-0 w-2 h-2 bg-white rounded-full mix-blend-difference pointer-events-none z-[9999]"
        style={{
          x: dotX,
          y: dotY
        }}
        animate={{
          scale: isHovering ? 0 : 1,
          opacity: isHovering ? 0 : 1
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      />
    </>
  )
}
