import { useState } from 'react';

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  width?: number;
  quality?: number;
  productName?: string;
}

function transformSupabaseUrl(src: string, width: number, quality: number): string {
  if (!src.includes('supabase.co/storage')) return src;
  if (/[?&](width|quality|format)=/.test(src)) return src;
  const sep = src.includes('?') ? '&' : '?';
  return `${src}${sep}width=${width}&quality=${quality}&format=webp`;
}

export default function ProductImage({ src, alt, className, width = 600, quality = 75, productName }: ProductImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const hasImage = !!src && !error;

  if (!hasImage && productName) {
    return (
      <div className={`relative overflow-hidden bg-muted flex items-center justify-center ${className || ''}`}>
        <span className="font-display text-espresso/60 text-center text-balance line-clamp-2 px-4 text-base sm:text-lg font-semibold">
          {productName}
        </span>
      </div>
    );
  }

  const rawSrc = hasImage ? src! : '/placeholder.svg';
  const imgSrc = hasImage ? transformSupabaseUrl(rawSrc, width, quality) : rawSrc;

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
