import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';
import UserProfileModal from './UserProfileModal';
import { Search } from 'lucide-react';

const TIMEOUT_MS      = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE  =  1 * 60 * 1000; // show warning 1 minute before

export default function Layout() {
  const navigate = useNavigate();
  const session = localStorage.getItem('ics_auth_user');
  const timeoutRef  = useRef(null);
  const warningRef  = useRef(null);
  const [paletteOpen,     setPaletteOpen]     = useState(false);
  const [profileOpen,     setProfileOpen]     = useState(false);
  const [showWarning,     setShowWarning]      = useState(false);
  const [countdown,       setCountdown]        = useState(60);
  const countdownRef = useRef(null);

  const doLogout = useCallback(() => {
    clearTimeout(timeoutRef.current);
    clearTimeout(warningRef.current);
    clearInterval(countdownRef.current);
    localStorage.removeItem('ics_auth_user');
    navigate('/login');
    window.location.reload();
  }, [navigate]);

  const resetTimer = useCallback(() => {
    clearTimeout(timeoutRef.current);
    clearTimeout(warningRef.current);
    clearInterval(countdownRef.current);
    setShowWarning(false);
    setCountdown(60);

    // Refresh the expiry timestamp in localStorage on every activity
    const stored = localStorage.getItem('ics_auth_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        parsed.sessionExpiry = Date.now() + TIMEOUT_MS;
        localStorage.setItem('ics_auth_user', JSON.stringify(parsed));
      } catch (_) {}
    }

    // Warn 1 minute before timeout
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(60);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, TIMEOUT_MS - WARNING_BEFORE);

    // Auto-logout after full timeout
    timeoutRef.current = setTimeout(doLogout, TIMEOUT_MS);
  }, [doLogout]);

  useEffect(() => {
    if (!session) return;

    // On every page load/refresh: validate the stored expiry timestamp
    try {
      const parsed = JSON.parse(session);
      if (parsed.sessionExpiry && Date.now() > parsed.sessionExpiry) {
        // Session has expired — clear and redirect immediately
        doLogout();
        return;
      }
    } catch (_) {}

    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart', 'click'];
    resetTimer();
    events.forEach(e => window.addEventListener(e, resetTimer));
    return () => {
      clearTimeout(timeoutRef.current);
      clearTimeout(warningRef.current);
      clearInterval(countdownRef.current);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [session, resetTimer, doLogout]);

  // Ctrl+K / Cmd+K global shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(open => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', background: 'var(--bg-deep)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {/* Top Header Bar — Clean Light Theme */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 32px',
          borderBottom: '1px solid #e2e8f0',
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          zIndex: 50
        }}>
          {/* Left: Quick Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '7px 16px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                color: '#475569',
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            >
              <Search size={15} color="#64748b" />
              <span style={{ color: '#64748b' }}>Quick search across all records...</span>
              <kbd style={{
                background: '#e2e8f0',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                padding: '1px 6px',
                fontSize: '0.72rem',
                fontFamily: 'monospace',
                color: '#334155'
              }}>Ctrl+K</kbd>
            </button>
          </div>

          {/* Right: Active Session & Station Info */}
          {(() => {
            let u = null;
            try { u = JSON.parse(session || '{}'); } catch (_) {}
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '8px',
                  background: '#f1f5f9', border: '1px solid #e2e8f0',
                  fontSize: '0.78rem', fontWeight: 600, color: '#334155'
                }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                  <span>{u?.branch || 'Head Office (Addis Ababa)'}</span>
                </div>

                <div 
                  onClick={() => setProfileOpen(true)}
                  title="Click to view profile & change password"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '4px 12px 4px 6px', borderRadius: '24px',
                    background: '#f8fafc', border: '1px solid #cbd5e1',
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0f2b5c 0%, #1e3a5f 100%)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.84rem'
                  }}>
                    {(u?.fullName || u?.username || 'U')[0].toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                      {u?.fullName || u?.username || 'Staff Member'}
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b' }}>
                      {u?.role || 'User'} &bull; <span style={{ color: '#2563eb' }}>Profile / Password</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }} className="animate-fade-in">
          <Outlet />
        </main>
      </div>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
      <UserProfileModal 
        isOpen={profileOpen} 
        onClose={() => setProfileOpen(false)} 
        currentUser={(() => { try { return JSON.parse(session || '{}'); } catch (_) { return null; } })()} 
      />

      {/* ── Inactivity Warning Banner ── */}
      {showWarning && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '36px 40px',
            maxWidth: '420px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 25px 60px rgba(15,43,92,0.3)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}>
            {/* Countdown Ring */}
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: countdown > 30 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
              border: `3px solid ${countdown > 30 ? '#f59e0b' : '#ef4444'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '1.8rem', fontWeight: 800,
              color: countdown > 30 ? '#f59e0b' : '#ef4444',
            }}>
              {countdown}
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 700, color: '#0f2b5c' }}>
              Session Expiring Soon
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6 }}>
              You have been inactive for 14 minutes. You will be automatically logged out in <strong>{countdown} second{countdown !== 1 ? 's' : ''}</strong>.
            </p>
            <button
              onClick={resetTimer}
              style={{
                width: '100%', padding: '12px',
                borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #0f2b5c, #1d4ed8)',
                color: '#fff', fontWeight: 700, fontSize: '0.95rem',
                cursor: 'pointer', letterSpacing: '0.3px'
              }}
            >
              Stay Logged In
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
