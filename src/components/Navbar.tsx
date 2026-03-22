import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

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

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
              className={`nav-link focus-visible:ring-2 focus-visible:ring-dusty-pink focus-visible:outline-none rounded ${pathname === l.to ? 'nav-link-active' : ''}`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 text-espresso active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-dusty-pink focus-visible:outline-none rounded"
          aria-label="Menú"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 top-[72px] bg-cream z-40 flex flex-col items-center justify-center gap-8 animate-fade-in">
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
