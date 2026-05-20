import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Search, CheckCircle, Circle, Mail, MessageCircle, Lightbulb, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { generateReplySuggestion } from '@/lib/messageHelper';
import { buildWhatsAppUrl } from '@/lib/insightEngine';
import { getWhatsAppLink } from '@/lib/whatsapp';

export default function AdminMensajes() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [suggestionOpen, setSuggestionOpen] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const PAGE_SIZE = 10;

  const { data: messages, isLoading } = useQuery({
    queryKey: ['admin-messages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['admin-messages-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      return data as any[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contact_messages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Mensaje eliminado'); qc.invalidateQueries({ queryKey: ['admin-messages'] }); setDeleteConfirm(null); },
  });

  const toggleReadMutation = useMutation({
    mutationFn: async ({ id, read }: { id: string; read: boolean }) => {
      const { error } = await supabase.from('contact_messages').update({ read } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-messages'] }); },
  });

  const filtered = messages?.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil((filtered?.length || 0) / PAGE_SIZE);
  const paginated = filtered?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const unreadCount = messages?.filter(m => !(m as any).read).length ?? 0;

  const toggleSuggestion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSuggestionOpen(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopyReply = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success('Respuesta copiada al portapapeles ✓', { duration: 3000 });
  };

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-espresso mb-2">Mensajes</h2>
      {unreadCount > 0 && <p className="text-xs text-warm-gray mb-4">{unreadCount} sin leer</p>}

      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray" />
        <input placeholder="Buscar por nombre o email..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="w-full sm:w-80 rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dusty-pink/30" />
      </div>

      {isLoading ? (
        <p className="text-warm-gray">Cargando...</p>
      ) : !paginated?.length ? (
        <p className="text-warm-gray">No hay mensajes todavía.</p>
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map(m => {
              const isRead = (m as any).read;
              const isExpanded = expanded === m.id;
              const isSuggestionVisible = suggestionOpen.has(m.id);
              const suggestion = isExpanded && products ? generateReplySuggestion(m.message, products) : null;

              return (
                <div
                  key={m.id}
                  className={`bg-white rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition-shadow ${isRead ? 'border-gray-100' : 'border-dusty-pink/30 bg-blush/10'}`}
                  onClick={() => {
                    setExpanded(isExpanded ? null : m.id);
                    if (!isRead) toggleReadMutation.mutate({ id: m.id, read: true });
                  }}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={e => { e.stopPropagation(); toggleReadMutation.mutate({ id: m.id, read: !isRead }); }}
                            className="text-warm-gray hover:text-dusty-pink transition-colors flex-shrink-0"
                            title={isRead ? 'Marcar como no leído' : 'Marcar como leído'}
                          >
                            {isRead ? <CheckCircle size={16} className="text-sage" /> : <Circle size={16} />}
                          </button>
                          <span className={`font-semibold text-sm ${isRead ? 'text-warm-gray' : 'text-espresso'}`}>{m.name}</span>
                          <span className="text-xs text-warm-gray">{m.email}</span>
                        </div>
                        <p className="text-sm text-warm-gray mt-1 truncate ml-7">
                          {isExpanded ? '' : m.message.slice(0, 100) + (m.message.length > 100 ? '...' : '')}
                        </p>
                        {isExpanded && (
                          <>
                            <p className="text-sm text-espresso mt-2 whitespace-pre-wrap ml-7">{m.message}</p>
                            {/* Reply buttons */}
                            <div className="flex gap-2 ml-7 mt-3">
                              <a
                                href={`mailto:${m.email}?subject=Re: Mensaje de contacto - Le Sucrée`}
                                onClick={e => e.stopPropagation()}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-warm-gray hover:bg-cream/50 transition-colors"
                              >
                                <Mail size={13} /> Responder por Email
                              </a>
                              {(m as any).phone && (
                                <a
                                  href={`https://wa.me/${cleanPhone((m as any).phone)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-warm-gray hover:bg-cream/50 transition-colors"
                                >
                                  <MessageCircle size={13} className="text-green-600" /> Responder por WhatsApp
                                </a>
                              )}
                            </div>
                          </>
                        )}
                        <span className="text-xs text-warm-gray/60 mt-2 block ml-7">{formatDate(m.created_at)}</span>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteConfirm(m.id); }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-warm-gray hover:text-red-500 transition-colors ml-3"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Smart Reply Suggestion */}
                  {isExpanded && suggestion && (
                    <div className="border-t border-gray-100 mx-4 mb-3">
                      <button
                        onClick={e => toggleSuggestion(m.id, e)}
                        className="flex items-center gap-1.5 py-2.5 text-xs font-semibold text-espresso/70 hover:text-espresso transition-colors w-full text-left"
                      >
                        <Lightbulb size={13} className="text-amber-500" />
                        <span>Sugerencia de respuesta</span>
                        <span className="text-[10px] text-warm-gray/60 ml-1">— {suggestion.reason}</span>
                        {isSuggestionVisible ? <ChevronUp size={13} className="ml-auto" /> : <ChevronDown size={13} className="ml-auto" />}
                      </button>

                      {isSuggestionVisible && (
                        <div className="bg-cream/30 rounded-lg p-3 mb-2 animate-fade-in">
                          <p className="text-xs text-espresso whitespace-pre-wrap leading-relaxed">{suggestion.text}</p>

                          {suggestion.matchedProducts.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {suggestion.matchedProducts.slice(0, 5).map(p => (
                                <span key={p.id} className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-warm-gray">
                                  {p.name}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={e => handleCopyReply(suggestion.text, e)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-espresso/20 text-espresso text-xs font-semibold hover:bg-cream transition-colors"
                            >
                              <Copy size={12} />
                              Copiar respuesta
                            </button>
                            <a
                              href={`mailto:${m.email}?subject=Re: Tu consulta en Le Sucrée&body=${encodeURIComponent(suggestion.text)}`}
                              onClick={e => e.stopPropagation()}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-espresso/20 text-espresso text-xs font-semibold hover:bg-cream transition-colors"
                            >
                              <Mail size={12} />
                              Responder por email
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i)} className={`w-8 h-8 rounded-full text-sm font-semibold transition-colors ${page === i ? 'bg-dusty-pink text-white' : 'text-warm-gray hover:bg-blush'}`}>{i + 1}</button>
              ))}
            </div>
          )}
        </>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="font-display text-lg font-bold text-espresso">¿Eliminar mensaje?</h3>
            <p className="text-sm text-warm-gray mt-2">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-full border border-gray-200 py-2 text-sm font-semibold hover:bg-gray-50 transition-colors active:scale-95">Cancelar</button>
              <button onClick={() => deleteMutation.mutate(deleteConfirm)} className="flex-1 rounded-full bg-red-500 text-white py-2 text-sm font-semibold hover:bg-red-600 transition-colors active:scale-95">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
