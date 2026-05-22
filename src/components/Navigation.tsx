'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Home' },
  {
    href: 'https://overtone.art/gallery',
    label: 'My Gallery',
    external: true,
  },
  { href: '/projects', label: 'My Projects' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className='fixed left-1/2 top-0 z-40 flex -translate-x-1/2 gap-1 rounded-b-xl border border-t-0 border-gray-200 bg-white/70 px-2 py-2 font-primary shadow-sm backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/70'>
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
    </nav>
  );
}
