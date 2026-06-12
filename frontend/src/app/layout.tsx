import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ChatWidget } from '@/components/ChatWidget'
import { Toaster } from 'react-hot-toast'
import { InstallPrompt } from '@/components/InstallPrompt'
import { LanguageProvider } from '@/i18n/LanguageContext'
import { CustomCursor } from '@/components/CustomCursor'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Tattoo HUB',
  description: 'Premium B2B Lead Platform for Tattoo Masters',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192x192.png',
    apple: '/icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Tattoo HUB',
  },
  other: {
    'mobile-web-app-capable': 'yes'
  }
}

export const viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans`}>
        <LanguageProvider>
          <CustomCursor />
          <ThemeProvider />
          <Toaster position="top-center" reverseOrder={false} />
          {children}
          <ChatWidget />
          <InstallPrompt />
        </LanguageProvider>
      </body>
    </html>
  )
}
