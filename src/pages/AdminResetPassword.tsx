import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AdminResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    let resolved = false;

    const finish = (ok: boolean, errMsg?: string) => {
      if (!active || resolved) return;
      resolved = true;
      setReady(ok);
      setLinkError(ok ? null : errMsg ?? 'No se detectó un enlace de recuperación válido. Pedí uno nuevo desde "¿Olvidaste tu contraseña?".');
      setChecking(false);
    };

    // Listen for the recovery event Supabase fires when it parses the URL hash.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        finish(true);
      }
    });

    // Fallback: check if a session is already present.
    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data.session) finish(true);
      } catch (err: any) {
        finish(false, err?.message || 'Error validando el enlace de recuperación.');
      }
    })();

    // Hard timeout — never leave the UI stuck.
    const timeout = setTimeout(() => finish(false), 4000);

    return () => {
      active = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
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
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Contraseña actualizada. Ingresá nuevamente.');
      await supabase.auth.signOut();
      navigate('/admin', { replace: true });
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="bg-soft-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold text-espresso text-center">Nueva contraseña</h1>
        <p className="text-center text-sm text-warm-gray mt-2">
          {checking
            ? 'Validando enlace de recuperación...'
            : ready
              ? 'Elegí una contraseña segura (mín. 12 caracteres).'
              : linkError}
        </p>

        {!checking && !ready && (
          <button
            type="button"
            onClick={() => navigate('/admin', { replace: true })}
            className="mt-6 w-full rounded-full border-[1.5px] border-espresso text-espresso px-8 py-3 text-sm font-semibold uppercase tracking-[0.1em] hover:bg-espresso hover:text-white transition-all duration-300 active:scale-95"
          >
            Volver al login
          </button>
        )}

        {ready && (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <input
              type="password"
              placeholder="Nueva contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              className="w-full rounded-xl border border-input bg-white px-4 py-3 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-dusty-pink/30 disabled:opacity-60"
              autoComplete="new-password"
              minLength={12}
            />
            <input
              type="password"
              placeholder="Confirmar contraseña"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              disabled={loading}
              className="w-full rounded-xl border border-input bg-white px-4 py-3 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-dusty-pink/30 disabled:opacity-60"
              autoComplete="new-password"
              minLength={12}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-dusty-pink text-white px-8 py-3 text-sm font-semibold uppercase tracking-[0.1em] hover:bg-mauve transition-all duration-300 active:scale-95 disabled:opacity-60"
            >
              {loading ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
