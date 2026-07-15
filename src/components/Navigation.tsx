'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import PdfIcon from '@/components/PdfIcon';

const links = [
  { href: '/', label: 'Home' },
  { href: '/projects', label: 'My Projects' },
  {
    href: 'https://overtone.art/',
    label: 'My Gallery',
    external: true,
  },
];

export default function Navigation() {
  const pathname = usePathname();

  // The home page is a full-bleed, self-contained design with its own header.
  if (pathname === '/') return null;

  if (pathname === '/projects') {
    return (
      <nav className='fixed left-4 top-4 z-40 font-primary'>
        <Link
          href='/'
          className='inline-flex items-center gap-2 rounded-lg border border-amber-200/20 bg-[#100e0b]/85 px-3 py-2 text-sm font-medium text-[#ece7dd] shadow-sm backdrop-blur-md transition-colors hover:border-amber-200/40 hover:text-[#e0a458] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0a458] focus-visible:ring-offset-2 focus-visible:ring-offset-[#100e0b]'
        >
          <span aria-hidden='true'>←</span>
          Back
        </Link>
      </nav>
    );
  }

  return (
    <nav className='fixed left-0 right-0 top-0 z-40 flex justify-center gap-1 border-b border-gray-200 bg-white/70 px-2 py-2 font-primary shadow-sm backdrop-blur-md md:left-1/2 md:right-auto md:-translate-x-1/2 md:rounded-b-xl md:border md:border-t-0 whitespace-nowrap dark:border-gray-700 dark:bg-gray-900/70'>
      {links.map((link) => {
        const isActive =
          !('external' in link) &&
          (link.href === '/'
            ? pathname === '/'
            : pathname.startsWith(link.href));

        const cls = `rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-white/90 text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white'
            : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
        }`;

        if ('external' in link && link.external) {
          return (
            <a
              key={link.href}
              href={link.href}
              target='_blank'
              rel='noopener noreferrer'
              className={cls}
            >
              {link.label}
            </a>
          );
        }

        return (
          <Link key={link.href} href={link.href} className={cls}>
            {link.label}
          </Link>
        );
      })}
      <a
        href='https://docs.google.com/document/d/1FozMEumbKlGOmrFjOYAsLtrpIC0WKh1Y/export?format=pdf'
        title='Download resume as PDF'
        className='ml-1 rounded-lg p-1 text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
      >
        <PdfIcon size={20} />
      </a>
    </nav>
  );
}
