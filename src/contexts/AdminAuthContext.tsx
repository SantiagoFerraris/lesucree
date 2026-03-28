import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

interface AdminAuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdminRole = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      if (error) {
        console.error('Role check error:', error);
        return false;
      }
      return !!data;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const admin = await checkAdminRole(session.user.id);
        setIsAdmin(admin);
        if (!admin) {
          await supabase.auth.signOut();
          setSession(null);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const admin = await checkAdminRole(session.user.id);
        setIsAdmin(admin);
        if (!admin) {
          await supabase.auth.signOut();
          setSession(null);
          setIsAdmin(false);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<string | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Login error:', error.message);
      return 'Credenciales inválidas';
    }
    // Check admin role
    const admin = await checkAdminRole(data.user.id);
    if (!admin) {
      await supabase.auth.signOut();
      return 'Acceso denegado. No tenés permisos de administrador.';
    }
    return null;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  return (
    <AdminAuthContext.Provider value={{ isAuthenticated: !!session && isAdmin, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
