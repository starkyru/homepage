import { Metadata } from 'next';
import Script from 'next/script';
import * as React from 'react';

import '@/styles/globals.css';
// !STARTERCONF This is for demo purposes, remove @/styles/colors.css import immediately
import '@/styles/colors.css';

import Navigation from '@/components/Navigation';

import { siteConfig } from '@/constant/config';

export const metadata: Metadata = {
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.title}`,
  },
  description: siteConfig.description,
  robots: { index: true, follow: true },
  // !STARTERCONF this is the default favicon, you can generate your own from https://realfavicongenerator.net/
  // ! copy to /favicon folder
  icons: {
    icon: '/favicon/favicon.ico',
    shortcut: '/favicon/favicon-16x16.png',
    apple: '/favicon/apple-touch-icon.png',
  },
  manifest: `/favicon/site.webmanifest`,
  openGraph: {
    url: siteConfig.url,
    title: siteConfig.title,
    description: siteConfig.description,
    siteName: siteConfig.title,
    images: [],
    type: 'website',
    locale: 'en_US',
  },
  // twitter: {
  //   card: 'summary_large_image',
  //   title: siteConfig.title,
  //   description: siteConfig.description,
  //   images: [ ],
  //   // creator: '@th_clarence',
  // },
  // authors: [
  //   {
  //     name: 'Theodorus Clarence',
  //     url: 'https://theodorusclarence.com',
  //   },
  // ],
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
    <html className='dark' suppressHydrationWarning>
      <body>
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
