import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

function App() {
  const token = localStorage.getItem('token');
  const isAdmin = localStorage.getItem('admin') === 'true';

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={token ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="dashboard" element={!token ? <Navigate to="/login" /> : <Dashboard />} />
        <Route path="admin" element={!isAdmin ? <Navigate to="/" /> : <Admin />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
