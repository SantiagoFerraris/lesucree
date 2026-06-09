import { Link } from 'react-router-dom';
import { Instagram, MapPin, Phone, Clock } from 'lucide-react';
import { getWhatsAppLink } from '@/lib/whatsapp';
import { useSiteSettings } from '@/hooks/useSiteSettings';

export default function Footer() {
  const { data: settings } = useSiteSettings();
  const whatsappNumber = settings?.whatsapp_number || '5493412741229';
  const instagramUrl = settings?.instagram_url || 'https://www.instagram.com/pasteleria.lesucree';
  const instagramHandle = settings?.instagram_handle || '@pasteleria.lesucree';
  const footerPhoneDisplay = settings?.footer_phone_display || '+54 9 341 274-1229';
  const footerAddress = settings?.footer_address || settings?.address || 'Rosario, Santa Fe';
  const businessHours = settings?.business_hours || 'Pedidos con 48hs de anticipación';
  const paymentMethodsRaw = settings?.payment_methods || 'Mercado Pago, Transferencia, Efectivo';
  const paymentMethods = paymentMethodsRaw.split(',').map(s => s.trim()).filter(Boolean);

  return (
    <footer className="bg-espresso text-blush">
      <div className="container py-10 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 md:gap-12">
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
              { to: '/politica-de-privacidad', label: 'Política de Privacidad' },
              { to: '/terminos-y-condiciones', label: 'Términos y Condiciones' },
            ].map(l => (
              <Link key={l.to} to={l.to} className="text-sm opacity-80 hover:opacity-100 transition-opacity focus-visible:ring-2 focus-visible:ring-dusty-pink focus-visible:outline-none rounded">
                {l.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-[0.08em] font-semibold text-gold-accent">Contacto</span>
            <div className="flex items-center gap-2 text-sm opacity-80">
              <MapPin size={14} className="flex-shrink-0" /> {footerAddress}
            </div>
            <a href={`tel:+${whatsappNumber}`} className="flex items-center gap-2 text-sm opacity-80 hover:opacity-100 transition-opacity">
              <Phone size={14} className="flex-shrink-0" /> {footerPhoneDisplay}
            </a>
            <div className="flex items-center gap-2 text-sm opacity-80">
              <Clock size={14} className="flex-shrink-0" /> {businessHours}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-[0.08em] font-semibold text-gold-accent">Seguime</span>
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm opacity-80 hover:opacity-100 transition-opacity" aria-label="Instagram de Le Sucrée">
              <Instagram size={16} /> {instagramHandle}
            </a>
            <a href={getWhatsAppLink(whatsappNumber) ?? '#'} target="_blank" rel="noopener noreferrer" className="text-sm opacity-80 hover:opacity-100 transition-opacity" aria-label="WhatsApp de Le Sucrée">
              📱 WhatsApp
            </a>
          </div>
        </div>

        {/* Payment methods */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-10 text-sm opacity-70">
          <span className="text-xs uppercase tracking-wider text-gold-accent font-semibold">Medios de pago:</span>
          {paymentMethods.map((method, idx) => (
            <span key={method} className="flex items-center gap-1.5">
              {idx > 0 && <span className="hidden sm:inline text-blush/30 mr-3">|</span>}
              {method}
            </span>
          ))}
        </div>

        <div className="section-divider mt-10 mb-6" style={{ background: 'hsl(var(--gold-accent) / 0.3)' }} />
        <p className="text-center text-xs opacity-60">© {new Date().getFullYear()} Le Sucrée Pastelería. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
