'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Car as CarIcon } from 'lucide-react';

export default function CarImageFallback({
  src,
  alt = 'Car photo',
  className = '',
  fill = false,
  width,
  height,
  priority = false,
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className={`bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center text-slate-400 select-none ${
          fill ? 'absolute inset-0 w-full h-full' : ''
        } ${className}`}
        style={!fill && width && height ? { width, height } : {}}
      >
        <CarIcon className="w-10 h-10 mb-1 text-slate-400 stroke-1" />
        <span className="text-xs font-medium text-slate-500">Sheggar Wheels</span>
      </div>
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={priority}
        className={`object-cover ${className}`}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width || 600}
      height={height || 400}
      priority={priority}
      className={`object-cover ${className}`}
      onError={() => setHasError(true)}
    />
  );
}
