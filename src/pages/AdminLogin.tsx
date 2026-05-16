import { useState } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const { login } = useAdminAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('Completá email y contraseña');
      return;
    }
    setLoading(true);
    const error = await login(email.trim(), password);
    setLoading(false);
    if (error) {
      console.error('Login failed');
      toast.error(error);
      setPassword('');
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Ingresá tu email');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    });
    setLoading(false);
    // Always show the same generic confirmation to avoid account enumeration.
    toast.success('Si el email existe, te enviamos un enlace para restablecer la contraseña.');
    setMode('login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="bg-soft-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold text-espresso text-center">
          {mode === 'login' ? 'Panel de Administración' : 'Recuperar contraseña'}
        </h1>
        <p className="text-center text-sm text-warm-gray mt-2">
          {mode === 'login'
            ? 'Le Sucrée Pastelería'
            : 'Te enviaremos un enlace seguro a tu email.'}
        </p>

        {mode === 'login' ? (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-xl border border-input bg-white px-4 py-3 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-dusty-pink/30"
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-xl border border-input bg-white px-4 py-3 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-dusty-pink/30"
              autoComplete="current-password"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-dusty-pink text-white px-8 py-3 text-sm font-semibold uppercase tracking-[0.1em] hover:bg-mauve transition-all duration-300 active:scale-95 disabled:opacity-60"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
            <button
              type="button"
              onClick={() => setMode('forgot')}
              className="w-full text-center text-xs text-warm-gray hover:text-espresso underline underline-offset-4"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgot} className="mt-8 space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-xl border border-input bg-white px-4 py-3 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-dusty-pink/30"
              autoComplete="email"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-dusty-pink text-white px-8 py-3 text-sm font-semibold uppercase tracking-[0.1em] hover:bg-mauve transition-all duration-300 active:scale-95 disabled:opacity-60"
            >
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-center text-xs text-warm-gray hover:text-espresso underline underline-offset-4"
            >
              Volver al inicio de sesión
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
