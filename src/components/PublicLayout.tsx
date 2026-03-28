import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import WhatsAppButton from './WhatsAppButton';
import BackToTop from './BackToTop';

export default function PublicLayout() {
  const { pathname } = useLocation();

  return (
    <>
      <Navbar />
      <main key={pathname} className="animate-fade-in">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppButton />
      <BackToTop />
    </>
  );
}
