import { NavLink, Outlet } from 'react-router-dom';
import { Package, MessageSquare, ShoppingCart, LogOut, Menu, X, Lock, LayoutDashboard } from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import AdminLogin from './AdminLogin';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/productos', label: 'Productos', icon: Package },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ShoppingCart },
  { to: '/admin/mensajes', label: 'Mensajes', icon: MessageSquare },
];

export default function AdminLayout() {
  const { isAuthenticated, loading, logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <p className="text-warm-gray">Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated) return <AdminLogin />;

  const handleLogout = async () => {
    await logout();
    setSidebarOpen(false);
  };

  const resetPasswordForm = () => {
    setShowPasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleChangePassword = async () => {
    if (!currentPassword) { toast.error('Ingresá tu contraseña actual'); return; }
    if (newPassword.length < 8) { toast.error('La nueva contraseña debe tener al menos 8 caracteres'); return; }
    if (newPassword !== confirmPassword) { toast.error('Las contraseñas no coinciden'); return; }

    setChangingPassword(true);

    // Verify current password
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      toast.error('Ocurrió un error. Intentá de nuevo.');
      setChangingPassword(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verifyError) {
      console.error('Password verification error:', verifyError.message);
      toast.error('La contraseña actual es incorrecta');
      setChangingPassword(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      console.error('Password update error:', error.message);
      toast.error('Ocurrió un error al cambiar la contraseña. Intentá de nuevo.');
    } else {
      toast.success('Contraseña actualizada correctamente');
      resetPasswordForm();
    }
    setChangingPassword(false);
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex w-56 flex-col bg-espresso text-blush fixed inset-y-0 left-0">
        <div className="p-6">
          <span className="font-script text-xl">Le Sucrée</span>
          <p className="text-xs opacity-60 mt-1">Panel de Administración</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive ? 'bg-sidebar-accent text-white' : 'text-blush/70 hover:bg-sidebar-accent/50 hover:text-blush'}`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
          <button onClick={() => setShowPasswordModal(true)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-blush/70 hover:text-blush hover:bg-sidebar-accent/50 transition-colors w-full">
            <Lock size={18} /> Cambiar contraseña
          </button>
        </nav>
        <div className="p-3">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-blush/70 hover:bg-sidebar-accent/50 hover:text-blush transition-colors w-full">
            <LogOut size={18} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-espresso flex items-center justify-between px-4">
        <span className="font-script text-lg text-blush">Le Sucrée</span>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-blush p-1">
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-espresso/95 flex flex-col pt-14 animate-fade-in">
          <nav className="px-6 py-4 space-y-2">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-lg text-sm ${isActive ? 'bg-sidebar-accent text-white' : 'text-blush/70'}`
                }
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
            <button onClick={() => { setShowPasswordModal(true); setSidebarOpen(false); }} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-blush/70 w-full">
              <Lock size={18} /> Cambiar contraseña
            </button>
            <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-blush/70 w-full mt-4">
              <LogOut size={18} /> Cerrar sesión
            </button>
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-56 pt-14 md:pt-0">
        <div className="p-6 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Change password modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="font-display text-lg font-bold text-espresso">Cambiar contraseña</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Contraseña actual</label>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-espresso" placeholder="Contraseña actual" autoComplete="current-password" />
              </div>
              <div>
                <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Nueva contraseña</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-espresso" placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
              </div>
              <div>
                <label className="text-xs font-semibold text-warm-gray uppercase tracking-wider">Confirmar contraseña</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-espresso" placeholder="Repetir contraseña" autoComplete="new-password" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={resetPasswordForm} className="flex-1 px-4 py-2 rounded-full border border-espresso text-espresso text-sm font-semibold">Cancelar</button>
              <button disabled={changingPassword} onClick={handleChangePassword} className="flex-1 px-4 py-2 rounded-full bg-espresso text-white text-sm font-semibold disabled:opacity-50">
                {changingPassword ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
