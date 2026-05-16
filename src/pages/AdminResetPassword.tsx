import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AdminResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase puts the recovery session in the URL hash on landing.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 12) {
      toast.error('La contraseña debe tener al menos 12 caracteres');
      return;
    }
    if (password !== confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Contraseña actualizada. Ingresá nuevamente.');
    await supabase.auth.signOut();
    navigate('/admin', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="bg-soft-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold text-espresso text-center">Nueva contraseña</h1>
        <p className="text-center text-sm text-warm-gray mt-2">
          {ready ? 'Elegí una contraseña segura (mín. 12 caracteres).' : 'Validando enlace de recuperación...'}
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={!ready || loading}
            className="w-full rounded-xl border border-input bg-white px-4 py-3 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-dusty-pink/30 disabled:opacity-60"
            autoComplete="new-password"
            minLength={12}
          />
          <input
            type="password"
            placeholder="Confirmar contraseña"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            disabled={!ready || loading}
            className="w-full rounded-xl border border-input bg-white px-4 py-3 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-dusty-pink/30 disabled:opacity-60"
            autoComplete="new-password"
            minLength={12}
          />
          <button
            type="submit"
            disabled={!ready || loading}
            className="w-full rounded-full bg-dusty-pink text-white px-8 py-3 text-sm font-semibold uppercase tracking-[0.1em] hover:bg-mauve transition-all duration-300 active:scale-95 disabled:opacity-60"
          >
            {loading ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
