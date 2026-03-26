import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

interface AdminAuthContextType {
    isAuthenticated: boolean;
    isAdmin: boolean;
    loading: boolean;
    login: (email: string, password: string) => Promise<string | null>;
    logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

async function checkIsAdmin(userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    return !!data;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

  useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
                setSession(session);
                if (session?.user) {
                          const admin = await checkIsAdmin(session.user.id);
                          setIsAdmin(admin);
                } else {
                          setIsAdmin(false);
                }
                setLoading(false);
        });

                supabase.auth.getSession().then(async ({ data: { session } }) => {
                        setSession(session);
                        if (session?.user) {
                                  const admin = await checkIsAdmin(session.user.id);
                                  setIsAdmin(admin);
                        }
                        setLoading(false);
                });

                return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<string | null> => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return error.message;
        // Verify admin role after login
        if (data.user) {
                const admin = await checkIsAdmin(data.user.id);
                if (!admin) {
                          await supabase.auth.signOut();
                          return 'No tenés permisos de administrador';
                }
                setIsAdmin(true);
        }
        return null;
  };

  const logout = async () => {
        await supabase.auth.signOut();
        setIsAdmin(false);
  };

  return (
        <AdminAuthContext.Provider value={{ isAuthenticated: !!session, isAdmin, loading, login, logout }}>
          {children}
        </AdminAuthContext.Provider>AdminAuthContext.Provider>
      );
}

export function useAdminAuth() {
    const ctx = useContext(AdminAuthContext);
    if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
    return ctx;
}
