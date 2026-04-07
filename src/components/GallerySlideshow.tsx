import { GallerySlideshowClient } from '@/components/GallerySlideshowClient';

interface GalleryImage {
  id: number;
  title: string;
  thumbnailPath: string;
}

const UPLOAD_URL = 'https://gallery.ilia.to/uploads';
const API_URL = 'https://gallery.ilia.to/api/images';

export default async function GallerySlideshow() {
  let images: { id: number; title: string; src: string }[] = [];

  try {
    const res = await fetch(API_URL, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data: GalleryImage[] = await res.json();
      images = data.map((img) => ({
        id: img.id,
        title: img.title,
        src: `${UPLOAD_URL}/${img.thumbnailPath}`,
      }));
    }
  } catch {
    // silently fail - gallery is non-critical
  }

  if (images.length === 0) return null;

  return <GallerySlideshowClient images={images} />;
}
