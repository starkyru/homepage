import { Metadata } from 'next';
import Script from 'next/script';
import * as React from 'react';

import '@/styles/globals.css';
// !STARTERCONF This is for demo purposes, remove @/styles/colors.css import immediately
import '@/styles/colors.css';

import Navigation from '@/components/Navigation';

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

// Person structured data → richer search results / knowledge panel.
const personLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: siteConfig.title,
  url: siteConfig.url,
  jobTitle: siteConfig.tagline,
  description: siteConfig.description,
  sameAs: [
    'https://github.com/starkyru',
    'https://www.linkedin.com/in/starkyru/',
  ],
  knowsAbout: [
    'React',
    'React Native',
    'Vue',
    'TypeScript',
    'Node.js',
    'Next.js',
  ],
};

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
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }}
        />
        <Navigation />
        {children}
        <Script
          src='https://stats.ilia.to/script.js'
          data-website-id='9cbf542a-4bc0-40c5-a310-ddce1f02a4e9'
          strategy='afterInteractive'
        />
      </body>
    </html>
  );
}
