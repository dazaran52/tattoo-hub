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
import { OnlinePresenceTracker } from '@/components/OnlinePresenceTracker'

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
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
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
                const supportedLanguages = ['ru', 'en', 'cs', 'uk'];
                const appLang = localStorage.getItem('app_lang');
                const legacyLang = localStorage.getItem('language');
                const savedLang = appLang && supportedLanguages.includes(appLang)
                  ? appLang
                  : legacyLang && supportedLanguages.includes(legacyLang)
                    ? legacyLang
                    : null;
                if (savedLang) {
                  document.documentElement.lang = savedLang;
                } else if (typeof navigator !== 'undefined' && navigator.language) {
                  const browserLang = navigator.language.slice(0, 2);
                  document.documentElement.lang = (browserLang === 'ru' || browserLang === 'uk' || browserLang === 'cs') ? browserLang : 'en';
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
          <OnlinePresenceTracker />
        </LanguageProvider>
      </body>
    </html>
  )
}
