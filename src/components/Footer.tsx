import { Link } from 'react-router-dom';
import { Instagram, MapPin, Phone, Clock } from 'lucide-react';
import { INSTAGRAM_URL, INSTAGRAM_HANDLE, WHATSAPP_URL, WHATSAPP_NUMBER } from '@/lib/constants';

export default function Footer() {
  return (
    <footer className="bg-espresso text-blush">
      <div className="container py-10 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 md:gap-12">
          <div>
            <span className="font-script text-3xl sm:text-4xl">Le Sucrée</span>
            <p className="font-body text-sm mt-2 opacity-80">Pastelería Artesanal</p>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-[0.08em] font-semibold text-gold-accent">Enlaces</span>
            {[
              { to: '/', label: 'Inicio' },
              { to: '/catalogo', label: 'Catálogo' },
              { to: '/historia', label: 'Historia' },
              { to: '/contacto', label: 'Contacto' },
            ].map(l => (
              <Link key={l.to} to={l.to} className="text-sm opacity-80 hover:opacity-100 transition-opacity focus-visible:ring-2 focus-visible:ring-dusty-pink focus-visible:outline-none rounded">
                {l.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-[0.08em] font-semibold text-gold-accent">Contacto</span>
            <div className="flex items-center gap-2 text-sm opacity-80">
              <MapPin size={14} className="flex-shrink-0" /> Rosario, Santa Fe
            </div>
            <a href={`tel:+${WHATSAPP_NUMBER}`} className="flex items-center gap-2 text-sm opacity-80 hover:opacity-100 transition-opacity">
              <Phone size={14} className="flex-shrink-0" /> +54 9 341 274-1229
            </a>
            <div className="flex items-center gap-2 text-sm opacity-80">
              <Clock size={14} className="flex-shrink-0" /> Pedidos con 48hs de anticipación
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-[0.08em] font-semibold text-gold-accent">Seguinos</span>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm opacity-80 hover:opacity-100 transition-opacity" aria-label="Instagram de Le Sucrée">
              <Instagram size={16} /> {INSTAGRAM_HANDLE}
            </a>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-sm opacity-80 hover:opacity-100 transition-opacity" aria-label="WhatsApp de Le Sucrée">
              📱 WhatsApp
            </a>
          </div>
        </div>

        {/* Payment methods */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-10 text-sm opacity-70">
          <span className="text-xs uppercase tracking-wider text-gold-accent font-semibold">Medios de pago:</span>
          <span className="flex items-center gap-1.5">💳 Mercado Pago</span>
          <span className="hidden sm:inline text-blush/30">|</span>
          <span className="flex items-center gap-1.5">🏦 Transferencia</span>
          <span className="hidden sm:inline text-blush/30">|</span>
          <span className="flex items-center gap-1.5">💵 Efectivo</span>
        </div>

        <div className="section-divider mt-10 mb-6" style={{ background: 'hsl(var(--gold-accent) / 0.3)' }} />
        <p className="text-center text-xs opacity-60">© {new Date().getFullYear()} Le Sucrée Pastelería. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
