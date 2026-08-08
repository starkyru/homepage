import type { Metadata } from 'next';

import { profilePageLd } from '@/lib/structured-data';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

/** Structured data only — the view is SiteShell's, in the root layout. */
export default function HomePage() {
  return (
    <script
      type='application/ld+json'
      dangerouslySetInnerHTML={{ __html: JSON.stringify(profilePageLd()) }}
    />
  );
}
