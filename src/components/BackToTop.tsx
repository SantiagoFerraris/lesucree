import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 left-6 z-[9998] w-10 h-10 rounded-full bg-dusty-pink/80 text-white flex items-center justify-center shadow-md hover:bg-dusty-pink hover:scale-110 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-dusty-pink focus-visible:outline-none"
      aria-label="Volver arriba"
    >
      <ArrowUp size={18} />
    </button>
  );
}
