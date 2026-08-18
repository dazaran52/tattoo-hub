import type { Metadata } from 'next'
import { useLocale } from 'next-intl';
import PrivacyEn from '@/components/legal/privacy/PrivacyEn';
import PrivacyRu from '@/components/legal/privacy/PrivacyRu';
import PrivacyCs from '@/components/legal/privacy/PrivacyCs';
import PrivacyUk from '@/components/legal/privacy/PrivacyUk';

export const metadata: Metadata = {
  title: 'Privacy | Tattoo HUB',
}

export default function PrivacyPage() {
  const locale = useLocale();
  
  if (locale === 'ru') return <PrivacyRu />;
  if (locale === 'cs') return <PrivacyCs />;
  if (locale === 'uk') return <PrivacyUk />;
  return <PrivacyEn />;
}
