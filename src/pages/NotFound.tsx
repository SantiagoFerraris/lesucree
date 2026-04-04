import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="text-center max-w-md">
        <span className="font-display uppercase tracking-[0.25em] text-5xl text-dusty-pink">Oops!</span>
        <h1 className="font-display text-6xl font-bold text-espresso mt-4">404</h1>
        <p className="text-warm-gray mt-4 leading-relaxed">
          La página que buscás no existe o fue movida. Volvé al inicio para seguir explorando nuestras creaciones.
        </p>
        <Link
          to="/"
          className="inline-block mt-8 rounded-full bg-dusty-pink text-white px-8 py-3.5 text-[15px] font-semibold uppercase tracking-[0.1em] hover:bg-mauve hover:scale-[1.02] transition-all duration-300 active:scale-95 focus-visible:ring-2 focus-visible:ring-dusty-pink focus-visible:outline-none"
        >
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
