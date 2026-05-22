import EmailDecode from '@/components/EmailDecode';
import GallerySlideshow from '@/components/GallerySlideshow';
import UnderlineLink from '@/components/links/UnderlineLink';
import Resume from '@/components/Resume';

export default function HomePage() {
  return (
    <main>
      <GallerySlideshow />
      <div className='mx-auto max-w-4xl px-4 py-14'>
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
