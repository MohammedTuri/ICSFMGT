import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  // Check for active authenticated user session
  const session = localStorage.getItem('ics_auth_user');

  if (!session) {
    // If no active session is found, redirect directly to the Login page
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', background: 'var(--bg-deep)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <Header />
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }} className="animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
