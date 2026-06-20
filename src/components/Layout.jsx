import { useEffect, useRef } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  const navigate = useNavigate();
  // Check for active authenticated user session
  const session = localStorage.getItem('ics_auth_user');
  const timeoutRef = useRef(null);

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      // Clear session and log out
      localStorage.removeItem('ics_auth_user');
      navigate('/login');
      window.location.reload();
    }, 120000); // 2 minutes (120,000 ms)
  };

  useEffect(() => {
    if (!session) return;

    // Actions that define active user interaction
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart', 'click'];
    
    // Set initial timer
    resetTimer();

    // Register active listeners
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Cleanup listeners and timer on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [session]);

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
