import React from 'react'

interface LogoProps {
  className?: string
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className="font-extrabold tracking-tight text-xl md:text-2xl text-neutral-900 dark:text-white">
        Tattoo
      </span>
      <div className="bg-neutral-900 dark:bg-white rounded-md px-1.5 py-0.5 flex items-center justify-center shadow-sm">
        <span className="text-white dark:text-neutral-900 font-bold text-[10px] md:text-xs tracking-widest leading-none">
          HUB
        </span>
      </div>
    </div>
  )
}
