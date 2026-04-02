import { useState } from 'react';

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
}

export default function ProductImage({ src, alt, className }: ProductImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const imgSrc = src && !error ? src : '/placeholder.svg';

  return (
    <div className={`relative overflow-hidden ${className || ''}`}>
      {!loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <img
        src={imgSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onError={() => setError(true)}
        onLoad={() => setLoaded(true)}
        loading="lazy"
        decoding="async"
        width={800}
        height={600}
      />
    </div>
  );
}
