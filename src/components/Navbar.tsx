import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ShoppingBag } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

const links = [
  { to: '/', label: 'Inicio' },
  { to: '/catalogo', label: 'Catálogo' },
  { to: '/nosotros', label: 'Nosotros' },
  { to: '/contacto', label: 'Contacto' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const { getCartCount, setIsOpen } = useCart();
  const count = getCartCount();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 h-[72px] md:h-[72px] flex items-center bg-cream/95 backdrop-blur-[10px] transition-shadow duration-300 ${scrolled ? 'shadow-sm' : ''}`}>
      <div className="container flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1">
          <span className="font-script text-2xl text-espresso">Le Sucrée</span>
          <span className="hidden sm:inline text-xs font-body uppercase tracking-[0.08em] text-warm-gray ml-2">Pastelería</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`nav-link focus-visible:ring-2 focus-visible:ring-dusty-pink focus-visible:outline-none rounded ${pathname === l.to ? 'nav-link-active text-dusty-pink' : ''}`}
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={() => setIsOpen(true)}
            className="relative p-2 text-espresso hover:text-dusty-pink transition-colors focus-visible:ring-2 focus-visible:ring-dusty-pink focus-visible:outline-none rounded"
            aria-label="Carrito de pedidos"
          >
            <ShoppingBag size={20} />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] rounded-full bg-dusty-pink text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {count}
              </span>
            )}
          </button>
        </div>

        {/* Mobile toggle + cart */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setIsOpen(true)}
            className="relative p-2 text-espresso active:scale-95 transition-transform"
            aria-label="Carrito de pedidos"
          >
            <ShoppingBag size={22} />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] rounded-full bg-dusty-pink text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {count}
              </span>
            )}
          </button>
          <button
            onClick={() => setOpen(!open)}
            className="p-2 text-espresso active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-dusty-pink focus-visible:outline-none rounded"
            aria-label="Menú"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center justify-center gap-8 animate-fade-in"
          style={{ top: '72px', backgroundColor: 'hsl(30, 100%, 97%)', opacity: 1 }}
        >
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={`nav-link text-xl ${pathname === l.to ? 'nav-link-active' : ''}`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
