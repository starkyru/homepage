import { Metadata } from 'next';
import Script from 'next/script';
import * as React from 'react';

import '@/styles/globals.css';
// !STARTERCONF This is for demo purposes, remove @/styles/colors.css import immediately
import '@/styles/colors.css';

import { personLd, websiteLd } from '@/lib/structured-data';

import SiteShell from '@/components/home/SiteShell';
import Navigation from '@/components/Navigation';
import PortfolioChat from '@/components/PortfolioChat';

import { siteConfig } from '@/constant/config';

const fullTitle = `${siteConfig.title} — ${siteConfig.tagline}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: fullTitle,
    template: `%s | ${siteConfig.title}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.title,
  authors: [{ name: siteConfig.title, url: siteConfig.url }],
  creator: siteConfig.title,
  keywords: [
    'Ilia Dzhiubanskii',
    'Frontend Engineer',
    'Full-Stack Engineer',
    'React',
    'React Native',
    'Vue',
    'TypeScript',
    'Node.js',
    'Next.js',
    'Software Engineer',
  ],
  robots: { index: true, follow: true },
  icons: {
    icon: '/favicon/favicon.ico',
    shortcut: '/favicon/favicon-16x16.png',
    apple: '/favicon/apple-touch-icon.png',
  },
  manifest: `/favicon/site.webmanifest`,
  // OG/Twitter images are supplied by src/app/opengraph-image.tsx (Next injects
  // the generated 1200×630 card into both og:image and twitter:image).
  openGraph: {
    url: siteConfig.url,
    title: fullTitle,
    description: siteConfig.description,
    siteName: siteConfig.title,
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: fullTitle,
    description: siteConfig.description,
  },
};

// Site-wide identity graph, generated from resume.json (see @/lib/structured-
// data). Pages add their own page-level node — ProfilePage on /, CollectionPage
// on /projects — and point at this Person by @id rather than repeating it.
const siteGraph = [personLd(), websiteLd()];

// The whole site now uses the single "hanging chain" palette (dark amber on
// near-black). `dark` is pinned so existing `dark:` variants render in that
// theme; the day/night canvas + toggle were removed.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' className='dark' suppressHydrationWarning>
      <body>
        {siteGraph.map((node) => (
          <script
            key={node['@id']}
            type='application/ld+json'
            dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }}
          />
        ))}
        <Navigation />
        {/* / and /projects are one view with two contents: the shell holds the
            identity panel and the chain across the navigation between them, so
            the panel never moves and the chain can slide out of the way instead
            of being torn down. Any other route it passes straight through. */}
        <SiteShell>{children}</SiteShell>
        <PortfolioChat />
        <Script
          src='https://stats.ilia.to/script.js'
          data-website-id='9cbf542a-4bc0-40c5-a310-ddce1f02a4e9'
          strategy='afterInteractive'
        />
      </body>
    </html>
  );
}
