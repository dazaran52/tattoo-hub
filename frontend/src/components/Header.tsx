'use client'

import { useState } from 'react'
import { LogOut, Coins, Menu, X, LayoutDashboard, Settings } from 'lucide-react'
import { Profile } from '@/lib/supabase'

interface HeaderProps {
  profile: Profile
  onLogout: () => void
}

export function Header({ profile, onLogout }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <header className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-neutral-100 to-neutral-400 rounded-lg flex items-center justify-center">
              <span className="text-neutral-950 font-bold text-sm">OUT</span>
            </div>
            <h1 className="text-lg font-semibold text-neutral-50 tracking-tight">
              OUT Tattoo Leads
            </h1>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-6">
            {/* Email */}
            <span className="hidden sm:block text-sm text-neutral-300">
              {profile.email}
            </span>

            {/* Credits Counter */}
            <div className="flex items-center gap-2 bg-neutral-800/50 px-4 py-2 rounded-lg border border-neutral-700">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-white">{profile.credits}</span>
              <span className="text-sm text-neutral-300">Кредитов</span>
            </div>

            {/* Menu Button */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl py-1 z-50">
                  <a href="/dashboard" className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </a>
                  <a href="/profile" className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800">
                    <Settings className="w-4 h-4" />
                    Nastavení
                  </a>
                  <div className="border-t border-neutral-800 my-1"></div>
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-neutral-800 w-full text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Odhlásit se
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
