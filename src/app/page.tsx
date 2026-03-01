import * as React from 'react';

import EmailDecode from '@/components/EmailDecode';
import UnderlineLink from '@/components/links/UnderlineLink';
import PdfIcon from '@/components/PdfIcon';
import Resume from '@/components/Resume';

export default function HomePage() {
  return (
    <main className='bg-white'>
      <a
        href='https://docs.google.com/document/d/1FozMEumbKlGOmrFjOYAsLtrpIC0WKh1Y/export?format=pdf'
        title='Download resume as PDF'
        className='fixed right-6 top-6 z-50 rounded-lg bg-white p-2 shadow-lg transition-opacity hover:opacity-80'
      >
        <PdfIcon size={36} />
      </a>
      <div className='mx-auto max-w-4xl px-4 py-12'>
        <Resume />
        <EmailDecode />
      </div>
      <footer className='py-4 text-center text-sm text-gray-700'>
        &copy; {new Date().getFullYear()} By{' '}
        <UnderlineLink href='https://ilia.to'>Ilia Dzhiubanskii</UnderlineLink>
      </footer>
    </main>
  );
}
