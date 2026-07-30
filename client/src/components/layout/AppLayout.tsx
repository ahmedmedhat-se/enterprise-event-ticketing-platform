import { Outlet } from 'react-router-dom';
import { Navbar } from '../../shared/ui/Navbar';
import { Footer } from '../../shared/ui/Footer';

export function AppLayout() {
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}