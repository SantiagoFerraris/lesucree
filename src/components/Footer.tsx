import { Link } from 'react-router-dom';
import { Instagram } from 'lucide-react';
import { INSTAGRAM_URL, INSTAGRAM_HANDLE, WHATSAPP_URL } from '@/lib/constants';

export default function Footer() {
  return (
    <footer className="bg-espresso text-blush">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <span className="font-script text-3xl">Le Sucrée</span>
            <p className="font-body text-sm mt-2 opacity-80">Pastelería Artesanal</p>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-[0.08em] font-semibold text-gold-accent">Enlaces</span>
            {[
              { to: '/', label: 'Inicio' },
              { to: '/catalogo', label: 'Catálogo' },
              { to: '/nosotros', label: 'Nosotros' },
              { to: '/contacto', label: 'Contacto' },
            ].map(l => (
              <Link key={l.to} to={l.to} className="text-sm opacity-80 hover:opacity-100 transition-opacity focus-visible:ring-2 focus-visible:ring-dusty-pink focus-visible:outline-none rounded">
                {l.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-[0.08em] font-semibold text-gold-accent">Seguinos</span>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm opacity-80 hover:opacity-100 transition-opacity focus-visible:ring-2 focus-visible:ring-dusty-pink focus-visible:outline-none rounded" aria-label="Instagram de Le Sucrée">
              <Instagram size={16} /> {INSTAGRAM_HANDLE}
            </a>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-sm opacity-80 hover:opacity-100 transition-opacity focus-visible:ring-2 focus-visible:ring-dusty-pink focus-visible:outline-none rounded" aria-label="WhatsApp de Le Sucrée">
              📱 WhatsApp
            </a>
          </div>
        </div>
        <div className="section-divider mt-12 mb-6" style={{ background: 'hsl(var(--gold-accent) / 0.3)' }} />
        <p className="text-center text-xs opacity-60">© {new Date().getFullYear()} Le Sucrée Pastelería. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
