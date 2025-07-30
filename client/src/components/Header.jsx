import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const isAdmin = localStorage.getItem('admin') === 'true';

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    localStorage.removeItem('displayName');
    window.location.href = '/';
  };

  return (
    <header className="bg-gray-900 text-white shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between">
        <Link to="/" className="text-2xl font-bold hover:text-blue-300 transition">
          SiteFlow
        </Link>

        <nav className="flex gap-4 mt-2 md:mt-0">
          <Link to="/" className={location.pathname === '/' ? 'font-bold' : 'hover:underline'}>
            Home
          </Link>
          {token && (
            <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'font-bold' : 'hover:underline'}>
              Dashboard
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" className={location.pathname === '/admin' ? 'font-bold' : 'hover:underline'}>
              Admin
            </Link>
          )}
          {token ? (
            <button onClick={logout} className="hover:underline text-red-200">
              Logout
            </button>
          ) : (
            <Link to="/login" className="hover:underline">
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
