'use client';

import { useEffect, useMemo, useState } from 'react';

interface SlideshowImage {
  id: number;
  title: string;
  src: string;
}

export function GallerySlideshowClient({
  images,
}: {
  images: SlideshowImage[];
}) {
  const [current, setCurrent] = useState(0);

  const shuffled = useMemo(
    () => [...images].sort(() => Math.random() - 0.5),
    [images],
  );

  useEffect(() => {
    if (shuffled.length < 2) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % shuffled.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [shuffled.length]);

  return (
    <div className='fixed right-6 top-24 z-40 hidden w-[120px] overflow-hidden rounded-lg shadow-lg object-contain xl:block'>
      <a
        href='https://gallery.ilia.to'
        target='_blank'
        rel='noopener noreferrer'
        className='block'
      >
        <div className='relative aspect-[3/4]'>
          {shuffled.map((img, i) => (
            <img
              key={img.id}
              src={img.src}
              alt={img.title}
              className='absolute inset-0 h-full w-full object-cover transition-opacity duration-1000'
              style={{ opacity: i === current ? 1 : 0 }}
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          ))}
        </div>
        <div className='bg-white/90 px-2 py-1 text-center text-[10px] font-medium text-gray-700 dark:bg-gray-800/90 dark:text-gray-300'>
          My Gallery
        </div>
      </a>
    </div>
  );
}
