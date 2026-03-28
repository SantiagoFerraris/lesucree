import { useState } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { toast } from 'sonner';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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
      console.error('Login error:', error);
      toast.error('Email o contraseña incorrectos');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="bg-soft-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold text-espresso text-center">Panel de Administración</h1>
        <p className="text-center text-sm text-warm-gray mt-2">Le Sucrée Pastelería</p>
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
        </form>
      </div>
    </div>
  );
}
