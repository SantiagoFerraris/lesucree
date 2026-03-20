import { NavLink, Outlet } from 'react-router-dom';
import { Package, MessageSquare, LogOut, Menu, X } from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import AdminLogin from './AdminLogin';
import { useState } from 'react';

const navItems = [
  { to: '/admin/productos', label: 'Productos', icon: Package },
  { to: '/admin/mensajes', label: 'Mensajes', icon: MessageSquare },
];

export default function AdminLayout() {
  const { isAuthenticated, logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) return <AdminLogin />;

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
        </nav>
        <div className="p-3">
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-blush/70 hover:bg-sidebar-accent/50 hover:text-blush transition-colors w-full">
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
            <button onClick={() => { logout(); setSidebarOpen(false); }} className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-blush/70 w-full mt-4">
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
    </div>
  );
}
