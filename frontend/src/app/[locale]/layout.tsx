import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ChatWidget } from '@/components/ChatWidget'
import { Toaster } from 'react-hot-toast'
import { InstallPrompt } from '@/components/InstallPrompt'
import { LanguageProvider } from '@/i18n/LanguageContext'
import { CustomCursor } from '@/components/CustomCursor'
import { TouchEffect } from '@/components/TouchEffect'
import { CookieBanner } from '@/components/CookieBanner'
import { OnlinePresenceTracker } from '@/components/OnlinePresenceTracker'
import { OfflineIndicator } from '@/components/OfflineIndicator'

import { PresenceProvider } from '@/components/PresenceContext'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: {
    template: '%s | Tattoo HUB',
    default: 'Tattoo HUB | Find & Book the Best Tattoo Artists',
  },
  description: 'Premium B2B Lead Platform for Tattoo Masters. Discover top artists, book sessions, and elevate your tattoo experience.',
  keywords: ['tattoo', 'tattoo artists', 'book tattoo', 'tattoo studio', 'prague tattoo', 'tattoo hub', 'tattoo leads'],
  authors: [{ name: 'Tattoo HUB Team' }],
  openGraph: {
    title: 'Tattoo HUB',
    description: 'Find & Book the Best Tattoo Artists',
    url: 'https://tattoo-hub.xyz',
    siteName: 'Tattoo HUB',
    images: [
      {
        url: 'https://tattoo-hub.xyz/icon-512x512.png',
        width: 512,
        height: 512,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tattoo HUB',
    description: 'Find & Book the Best Tattoo Artists',
    images: ['https://tattoo-hub.xyz/icon-512x512.png'],
  },
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

import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';

export default async function RootLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  let messages;
  try {
    messages = await getMessages();
  } catch (error) {
    notFound();
  }

  return (
    <html lang={locale} suppressHydrationWarning>
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
        <NextIntlClientProvider messages={messages} locale={locale}>
          <PresenceProvider>
            <LanguageProvider>
              <CustomCursor />
              <TouchEffect />
              <ThemeProvider />
              <Toaster 
                position="top-center" 
                reverseOrder={false} 
                toastOptions={{
                  className: '!bg-neutral-900/90 !text-white !backdrop-blur-xl !border !border-white/10 !rounded-2xl !shadow-[0_10px_30px_rgba(0,0,0,0.5)] !text-sm !font-semibold',
                  duration: 4000,
                  success: {
                    iconTheme: {
                      primary: '#10B981',
                      secondary: '#090A0F',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#EF4444',
                      secondary: '#090A0F',
                    },
                  },
                }}
              />
              <OfflineIndicator />
              {children}
              <ChatWidget />
              <InstallPrompt />
              <CookieBanner />
            </LanguageProvider>
          </PresenceProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

