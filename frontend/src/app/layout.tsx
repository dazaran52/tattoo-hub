import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ChatWidget } from '@/components/ChatWidget'
import { Toaster } from 'react-hot-toast'
import { InstallPrompt } from '@/components/InstallPrompt'
import { LanguageProvider } from '@/i18n/LanguageContext'
import { CustomCursor } from '@/components/CustomCursor'
import { TouchEffect } from '@/components/TouchEffect'
import { CookieBanner } from '@/components/CookieBanner'

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
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const savedTheme = localStorage.getItem('theme') || 'dark';
                if (savedTheme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <LanguageProvider>
          <CustomCursor />
          <TouchEffect />
          <ThemeProvider />
          <Toaster position="top-center" reverseOrder={false} />
          {children}
          <ChatWidget />
          <InstallPrompt />
          <CookieBanner />
        </LanguageProvider>
      </body>
    </html>
  )
}
