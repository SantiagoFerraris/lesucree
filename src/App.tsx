import { useEffect, lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { CartProvider } from "@/contexts/CartContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import PublicLayout from "@/components/PublicLayout";
import CartSidebar from "@/components/CartSidebar";
import Index from "./pages/Index";

const Catalogo = lazy(() => import("./pages/Catalogo"));
const Nosotros = lazy(() => import("./pages/Nosotros"));
const Contacto = lazy(() => import("./pages/Contacto"));
const Pedido = lazy(() => import("./pages/Pedido"));
const Zumbita = lazy(() => import("./pages/Zumbita"));
const NotFound = lazy(() => import("./pages/NotFound"));

const AdminLayout = lazy(() => import("./pages/AdminLayout"));
const AdminResetPassword = lazy(() => import("./pages/AdminResetPassword"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminProductos = lazy(() => import("./pages/AdminProductos"));
const AdminMensajes = lazy(() => import("./pages/AdminMensajes"));
const AdminPedidos = lazy(() => import("./pages/AdminPedidos"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const AdminClientes = lazy(() => import("./pages/AdminClientes"));
const AdminConfiguracion = lazy(() => import("./pages/AdminConfiguracion"));
const AdminPromociones = lazy(() => import("./pages/AdminPromociones"));
const CobranzaPage = lazy(() => import("./pages/CobranzaPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      gcTime: 10 * 60 * 1000,
    },
  },
});

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

const AdminSuspense = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="p-8 text-center text-warm-gray">Cargando...</div>}>
    {children}
  </Suspense>
);

const PublicSuspense = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><p className="text-muted-foreground">Cargando...</p></div>}>
    {children}
  </Suspense>
);

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <CartProvider>
        <AdminAuthProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <ScrollToTop />
              <CartSidebar />
              <Routes>
                {/* Public routes */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/catalogo" element={<PublicSuspense><Catalogo /></PublicSuspense>} />
                  <Route path="/historia" element={<PublicSuspense><Nosotros /></PublicSuspense>} />
                  <Route path="/contacto" element={<PublicSuspense><Contacto /></PublicSuspense>} />
                  <Route path="/pedido" element={<PublicSuspense><Pedido /></PublicSuspense>} />
                  <Route path="/zumbita" element={<PublicSuspense><Zumbita /></PublicSuspense>} />
                </Route>

                {/* Admin password reset (public, must be outside AdminLayout auth gate) */}
                <Route path="/admin/reset-password" element={<AdminSuspense><AdminResetPassword /></AdminSuspense>} />

                {/* Admin routes */}
                <Route path="/admin" element={<AdminSuspense><AdminLayout /></AdminSuspense>}>
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<AdminSuspense><AdminDashboard /></AdminSuspense>} />
                  <Route path="productos" element={<AdminSuspense><AdminProductos /></AdminSuspense>} />
                  <Route path="promociones" element={<AdminSuspense><AdminPromociones /></AdminSuspense>} />
                  <Route path="mensajes" element={<AdminSuspense><AdminMensajes /></AdminSuspense>} />
                  <Route path="pedidos" element={<AdminSuspense><AdminPedidos /></AdminSuspense>} />
                  <Route path="estadisticas" element={<AdminSuspense><AdminAnalytics /></AdminSuspense>} />
                  <Route path="clientes" element={<AdminSuspense><AdminClientes /></AdminSuspense>} />
                  <Route path="configuracion" element={<AdminSuspense><AdminConfiguracion /></AdminSuspense>} />
                </Route>

                <Route path="*" element={<PublicSuspense><NotFound /></PublicSuspense>} />
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </AdminAuthProvider>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
