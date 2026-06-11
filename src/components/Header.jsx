import { useState, useEffect } from 'react';
import { ShieldCheck, Bell } from 'lucide-react';

export default function Header() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header style={{
      height: '80px',
      borderBottom: '1px solid var(--border-glass)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      background: 'rgba(5, 10, 21, 0.4)',
      backdropFilter: 'blur(8px)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ShieldCheck className="neon-text-emerald" size={24} />
        <span style={{ fontWeight: 600, letterSpacing: '1px' }}>SYSTEM SECURE</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(0,0,0,0.3)', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-emerald)', boxShadow: '0 0 10px #10b981' }}></div>
          <div style={{ fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-emerald)' }}>
            {time.toISOString().substring(11, 19)} UTC
          </div>
        </div>
        
        <button style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', position: 'relative' }}>
          <Bell size={24} />
          <span style={{ position: 'absolute', top: -2, right: -2, width: 10, height: 10, background: 'var(--accent-danger)', borderRadius: '50%', border: '2px solid var(--bg-deep)' }}></span>
        </button>
      </div>
    </header>
  );
}
