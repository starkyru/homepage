'use client';

import { useEffect, useMemo, useState } from 'react';

interface GalleryImage {
  id: number;
  title: string;
  thumbnailPath: string;
}

const UPLOAD_URL = 'https://gallery.ilia.to/uploads';

export default function GallerySlideshow() {
  const [images, setImages] = useState<
    { id: number; title: string; src: string }[]
  >([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/gallery', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: GalleryImage[]) => {
        if (data.length > 0) {
          setImages(
            data.map((img) => ({
              id: img.id,
              title: img.title,
              src: `${UPLOAD_URL}/${img.thumbnailPath}`,
            })),
          );
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

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

  if (shuffled.length === 0) return null;

  return (
    <div className='fixed right-6 top-24 z-40 hidden w-[120px] overflow-hidden rounded-lg shadow-lg xl:block'>
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
