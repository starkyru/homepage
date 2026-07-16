import { Metadata } from 'next';
import * as React from 'react';

// Internal starter/demo page — keep it out of search + the sitemap.
export const metadata: Metadata = {
  title: 'Components',
  description: 'Internal component sandbox',
  robots: { index: false, follow: false },
};

export default function ComponentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
