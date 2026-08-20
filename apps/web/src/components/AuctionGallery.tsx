'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function AuctionGallery({ images, title }: { images: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  const photos = images.slice(0, 4);
  if (photos.length === 0) {
    return (
      <div className="aspect-video bg-surface-container-high rounded-md mb-6 flex items-center justify-center text-outline">
        No image available
      </div>
    );
  }

  const current = photos[Math.min(index, photos.length - 1)];
  const go = (dir: number) => setIndex((i) => (i + dir + photos.length) % photos.length);

  return (
    <div className="mb-6">
      <div className="relative aspect-video bg-surface-container-high rounded-md overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current} alt={title} className="w-full h-full object-cover" />
        {photos.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="grid grid-cols-4 gap-2 mt-2">
          {photos.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setIndex(i)}
              className={`aspect-video rounded-md overflow-hidden border-2 ${i === index ? 'border-primary' : 'border-transparent'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${title} ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
