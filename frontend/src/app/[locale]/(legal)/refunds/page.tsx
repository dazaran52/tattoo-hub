import type { Metadata } from 'next'
import { useLocale } from 'next-intl';
import RefundsEn from '@/components/legal/refunds/RefundsEn';
import RefundsRu from '@/components/legal/refunds/RefundsRu';
import RefundsCs from '@/components/legal/refunds/RefundsCs';
import RefundsUk from '@/components/legal/refunds/RefundsUk';

export const metadata: Metadata = {
  title: 'Refunds | Tattoo HUB',
}

export default function RefundsPage() {
  const locale = useLocale();
  
  if (locale === 'ru') return <RefundsRu />;
  if (locale === 'cs') return <RefundsCs />;
  if (locale === 'uk') return <RefundsUk />;
  return <RefundsEn />;
}
