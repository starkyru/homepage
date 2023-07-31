'use client';

import Head from 'next/head';
import * as React from 'react';

import UnderlineLink from '@/components/links/UnderlineLink';

/**
 * SVGR Support
 * Caveat: No React Props Type.
 *
 * You can override the next-env if the type is important to you
 * @see https://stackoverflow.com/questions/68103844/how-to-override-next-js-svg-module-declaration
 */
// import Logo from '~/svg/Logo.svg';

export default function HomePage() {
  return (
    <main>
      <Head>
        <title>Ilia Dzhiubanskii - Senior Software Developer</title>
      </Head>
      <section className='bg-white'>
        <div className='layout relative flex min-h-screen flex-col items-center justify-center py-12 text-center'>
          {/*<Logo className='w-16' />*/}
          <h1 className='mt-4'>
            Ilia Dzhiubanskii - Senior Software Developer
          </h1>
          <p className='mt-2 text-sm text-gray-800'>
            Highly skilled software engineer with 20+ years of experience. I
            specialize in React and React Native application development. Proven
            ability to lead and mentor performant frontend teams. Experienced in
            frontend and mobile applications development for a wide range of
            companies.
          </p>
          <p className='mt-2 text-sm text-gray-700'>
            <strong>Preferable technology stack:</strong> TypeScript/JavaScript,
            Reac/Next.jst, React Native, Redux, Jest, GIT, GraphQL/REST,
            CSS/Bootstrap/Tailwind/SASS, Jira.
          </p>
          <p>
            <UnderlineLink href='https://docs.google.com/document/d/1YMGDsUACjwvl9xa9Ebgg778UXwCWcV25DFWFl7qfoZk/export?format=pdf'>
              Download my latest resume (PDF).
            </UnderlineLink>
          </p>

          <footer className='absolute bottom-2 text-gray-700'>
            © {new Date().getFullYear()} By{' '}
            <UnderlineLink href='https://dzhiubanskii.com'>
              Ilia Dzhiubanskii
            </UnderlineLink>
          </footer>
        </div>
      </section>
    </main>
  );
}
