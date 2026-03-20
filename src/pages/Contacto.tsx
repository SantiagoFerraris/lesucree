import { useState } from 'react';
import { Instagram, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { WHATSAPP_URL, INSTAGRAM_URL, INSTAGRAM_HANDLE } from '@/lib/constants';
import SectionDivider from '@/components/SectionDivider';

export default function Contacto() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('Por favor completá todos los campos');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('contact_messages').insert({
      name: form.name.trim(),
      email: form.email.trim(),
      message: form.message.trim(),
    });
    setLoading(false);
    if (error) {
      toast.error('Error al enviar el mensaje');
    } else {
      toast.success('¡Mensaje enviado! Te responderemos pronto.');
      setForm({ name: '', email: '', message: '' });
    }
  };

  const inputClass = 'w-full rounded-xl border border-input bg-soft-white px-4 py-3 text-sm text-espresso placeholder:text-warm-gray/60 focus:outline-none focus:ring-2 focus:ring-dusty-pink/30 transition-all';

  return (
    <section className="pt-[72px]">
      <div className="py-16 md:py-20 px-4">
        <div className="container">
          <h1 className="font-display text-[32px] md:text-[40px] font-bold text-espresso text-center">Contactanos</h1>
          <SectionDivider />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-12 max-w-4xl mx-auto">
            {/* Info */}
            <div className="space-y-6">
              <div>
                <h3 className="font-display text-lg font-bold text-espresso">Información de contacto</h3>
                <div className="mt-4 space-y-3">
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-warm-gray hover:text-dusty-pink transition-colors">
                    <span className="text-lg">📱</span> WhatsApp
                  </a>
                  <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-warm-gray hover:text-dusty-pink transition-colors">
                    <Instagram size={18} /> {INSTAGRAM_HANDLE}
                  </a>
                  <div className="flex items-center gap-3 text-warm-gray">
                    <Mail size={18} /> hola@lesucree.com.ar
                  </div>
                </div>
              </div>
              <p className="text-sm text-warm-gray leading-relaxed">
                Realizamos pedidos con al menos 48hs de anticipación. Zona de entrega: Rosario y Roldán.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Nombre"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className={inputClass}
                maxLength={100}
              />
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className={inputClass}
                maxLength={255}
              />
              <textarea
                placeholder="Mensaje"
                value={form.message}
                onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                className={`${inputClass} min-h-[120px] resize-none`}
                maxLength={1000}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-dusty-pink text-white px-8 py-3.5 text-[15px] font-semibold uppercase tracking-[0.1em] hover:bg-mauve hover:scale-[1.02] hover:shadow-[0_4px_16px_rgba(212,166,154,0.3)] transition-all duration-300 active:scale-95 disabled:opacity-60"
              >
                {loading ? 'Enviando...' : 'Enviar Mensaje'}
              </button>
            </form>
          </div>

          {/* WhatsApp CTA */}
          <div className="text-center mt-16">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] text-white px-8 py-3.5 text-[15px] font-semibold uppercase tracking-[0.1em] hover:bg-[#1da851] hover:scale-[1.02] transition-all duration-300 active:scale-95"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Chateá con nosotros
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
