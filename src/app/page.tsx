import type { Metadata } from 'next';

import HangingChainHome from '@/components/home/HangingChainHome';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return <HangingChainHome />;
}
