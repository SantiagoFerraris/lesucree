import { useState } from 'react';

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
}

const FALLBACK = 'https://images.unsplash.com/photo-1486427944544-d2c246c4df4f?w=600&h=600&fit=crop';

export default function ProductImage({ src, alt, className }: ProductImageProps) {
  const [error, setError] = useState(false);

  return (
    <img
      src={error || !src ? FALLBACK : src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}
