import { getTranslations } from "next-intl/server";
import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ username: string, locale: string }> }): Promise<Metadata> {
  const { username, locale } = await params
  const t = await getTranslations({ locale })
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/public/master/${username}`, {
      next: { revalidate: 60 }
    })
    
    if (res.ok) {
      const data = await res.json()
      const displayName = data.display_name || data.username || t('master')
      const title = `Запись к ${displayName} | TattooHUB`
      const description = data.bio || `Запишись на сеанс татуировки к мастеру ${displayName} через TattooHUB.`
      
      return {
        title,
        description,
        openGraph: {
          title,
          description,
          type: 'website',
          siteName: 'TattooHUB',
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description,
        }
      }
    }
  } catch (err) {
    console.error('Error fetching metadata for master', err)
  }

  return {
    title: t('tattoohub'),
    description: t('leaveARequestFor2')
  }
}

export default function BookMasterLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return <>{children}</>
}
