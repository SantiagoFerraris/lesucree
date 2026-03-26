import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { CartProvider } from "@/contexts/CartContext";
import PublicLayout from "@/components/PublicLayout";
import CartSidebar from "@/components/CartSidebar";
import ScrollToTop from "@/components/ScrollToTop";
import Index from "./pages/Index";
import Catalogo from "./pages/Catalogo";
import Nosotros from "./pages/Nosotros";
import Contacto from "./pages/Contacto";
import Pedido from "./pages/Pedido";
import NotFound from "./pages/NotFound";

// Lazy-load admin routes — visitors don't need this code
const AdminLayout = lazy(() => import("./pages/AdminLayout"));
const AdminProductos = lazy(() => import("./pages/AdminProductos"));
const AdminMensajes = lazy(() => import("./pages/AdminMensajes"));
const AdminPedidos = lazy(() => import("./pages/AdminPedidos"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function AdminFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <p className="text-warm-gray">Cargando panel...</p>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <CartProvider>
        <AdminAuthProvider>
          <BrowserRouter>
            <ScrollToTop />
            <CartSidebar />
            <Routes>
              {/* Public routes */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/catalogo" element={<Catalogo />} />
                <Route path="/nosotros" element={<Nosotros />} />
                <Route path="/contacto" element={<Contacto />} />
                <Route path="/pedido" element={<Pedido />} />
              </Route>
              {/* Admin routes — lazy loaded */}
              <Route path="/admin" element={<Suspense fallback={<AdminFallback />}><AdminLayout /></Suspense>}>
                <Route index element={<Navigate to="/admin/productos" replace />} />
                <Route path="productos" element={<Suspense fallback={null}><AdminProductos /></Suspense>} />
                <Route path="mensajes" element={<Suspense fallback={null}><AdminMensajes /></Suspense>} />
                <Route path="pedidos" element={<Suspense fallback={null}><AdminPedidos /></Suspense>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AdminAuthProvider>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
