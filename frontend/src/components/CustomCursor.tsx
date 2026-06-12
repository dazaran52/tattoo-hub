'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export function CustomCursor() {
  const [mousePosition, setMousePosition] = useState({ x: -100, y: -100 })
  const [isHovering, setIsHovering] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    // Only show custom cursor on non-touch devices
    const checkDesktop = () => {
      setIsDesktop(window.matchMedia('(pointer: fine)').matches)
    }
    checkDesktop()
    window.addEventListener('resize', checkDesktop)

    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Check if hovering over clickable elements
      const isClickable = window.getComputedStyle(target).cursor === 'pointer' || 
                          target.tagName.toLowerCase() === 'button' ||
                          target.tagName.toLowerCase() === 'a' ||
                          target.closest('button') || target.closest('a')
      
      setIsHovering(!!isClickable)
    }

    if (isDesktop) {
      window.addEventListener('mousemove', updateMousePosition)
      window.addEventListener('mouseover', handleMouseOver)
    }

    return () => {
      window.removeEventListener('resize', checkDesktop)
      if (isDesktop) {
        window.removeEventListener('mousemove', updateMousePosition)
        window.removeEventListener('mouseover', handleMouseOver)
      }
    }
  }, [isDesktop])

  if (!isDesktop) return null

  return (
    <>
      {/* Main dot */}
      <motion.div
        className="fixed top-0 left-0 w-3 h-3 bg-white rounded-full mix-blend-difference pointer-events-none z-[9999]"
        animate={{
          x: mousePosition.x - 6,
          y: mousePosition.y - 6,
          scale: isHovering ? 2.5 : 1,
        }}
        transition={{
          type: "tween",
          ease: "backOut",
          duration: 0.15
        }}
      />
      {/* Sparkle/Glow trail */}
      <motion.div
        className="fixed top-0 left-0 w-12 h-12 bg-white/20 blur-xl rounded-full pointer-events-none z-[9998]"
        animate={{
          x: mousePosition.x - 24,
          y: mousePosition.y - 24,
          scale: isHovering ? 1.5 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 150,
          damping: 15,
          mass: 0.5
        }}
      />
    </>
  )
}
