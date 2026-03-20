import { useState } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { toast } from 'sonner';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const { login } = useAdminAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!login(password)) {
      toast.error('Contraseña incorrecta');
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
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full rounded-xl border border-input bg-white px-4 py-3 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-dusty-pink/30"
          />
          <button
            type="submit"
            className="w-full rounded-full bg-dusty-pink text-white px-8 py-3 text-sm font-semibold uppercase tracking-[0.1em] hover:bg-mauve transition-all duration-300 active:scale-95"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}
