import * as React from 'react';

import EmailDecode from '@/components/EmailDecode';
import UnderlineLink from '@/components/links/UnderlineLink';
import PdfIcon from '@/components/PdfIcon';
import Resume from '@/components/Resume';

export default function HomePage() {
  return (
    <main>
      <a
        href='https://docs.google.com/document/d/1FozMEumbKlGOmrFjOYAsLtrpIC0WKh1Y/export?format=pdf'
        title='Download resume as PDF'
        className='fixed right-6 top-6 z-50 rounded-lg bg-white/80 p-2 shadow-lg transition-all hover:opacity-80 dark:bg-gray-800/80'
      >
        <PdfIcon size={36} />
      </a>
      <div className='mx-auto max-w-4xl px-4 py-12'>
        <Resume />
        <EmailDecode />
      </div>
      <footer className='py-4 text-center text-sm text-gray-700 transition-colors duration-1000 dark:text-gray-400'>
        &copy; {new Date().getFullYear()} By{' '}
        <UnderlineLink href='https://ilia.to'>Ilia Dzhiubanskii</UnderlineLink>
      </footer>
    </main>
  );
}
