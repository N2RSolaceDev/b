import { Outlet } from 'react-router-dom';
import Header from './Header';

export default function Layout() {
  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </>
  );
}
