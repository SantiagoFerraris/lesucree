import { Outlet, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

const WhatsAppButton = lazy(() => import('./WhatsAppButton'));
const BackToTop = lazy(() => import('./BackToTop'));

export default function PublicLayout() {
  const { pathname } = useLocation();

  return (
    <>
      <Navbar />
      <main key={pathname} className="animate-fade-in">
        <Outlet />
      </main>
      <Footer />
      <Suspense fallback={null}>
        <WhatsAppButton />
        <BackToTop />
      </Suspense>
    </>
  );
}

