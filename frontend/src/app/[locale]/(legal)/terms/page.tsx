import type { Metadata } from 'next'
import { useLocale } from 'next-intl';
import TermsEn from '@/components/legal/terms/TermsEn';
import TermsRu from '@/components/legal/terms/TermsRu';
import TermsCs from '@/components/legal/terms/TermsCs';
import TermsUk from '@/components/legal/terms/TermsUk';

export const metadata: Metadata = {
  title: 'Terms | Tattoo HUB',
}

export default function TermsPage() {
  const locale = useLocale();
  
  if (locale === 'ru') return <TermsRu />;
  if (locale === 'cs') return <TermsCs />;
  if (locale === 'uk') return <TermsUk />;
  return <TermsEn />;
}
