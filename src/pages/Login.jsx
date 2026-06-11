import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Lock, Mail, AlertCircle, ShieldCheck, Fingerprint, FileText, Award, FileWarning, ChevronRight } from 'lucide-react';
import { getAllRecords } from '../utils/db';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    try {
      const users = await getAllRecords('users');
      const user = users.find(u =>
        (u.email || u.username || '').toLowerCase() === email.trim().toLowerCase()
      );

      if (!user) {
        setError('Invalid credentials. Access denied.');
        setLoading(false);
        return;
      }

      if (user.password !== password) {
        setError('Incorrect password. Please try again.');
        setLoading(false);
        return;
      }

      localStorage.setItem('ics_auth_user', JSON.stringify({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        allowedDivisions: user.allowedDivisions || []
      }));

      navigate('/dashboard');
      window.location.reload();
    } catch (err) {
      console.error('Login error:', err);
      setError('Database access error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const divisions = [
    { icon: <FileText size={18} />, label: 'VISA Files', color: '#10b981', desc: 'Entry Visa Registry' },
    { icon: <Fingerprint size={18} />, label: 'Ethiopian Origin ID File', color: '#f59e0b', desc: 'Biometric Records' },
    { icon: <Award size={18} />, label: 'Residence ID File', color: '#3b82f6', desc: 'Sponsorship Folders' },
    { icon: <FileWarning size={18} />, label: 'Emergency Travel Document File', color: '#8b5cf6', desc: 'Emergency Travel Docs' },
  ];

  return (
    <div style={{
      width: '100vw',
      minHeight: '100vh',
      display: 'flex',
      fontFamily: 'var(--font-family)',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* ═══════════════════════════════════════════════
          LEFT PANEL — Dark Hero
      ════════════════════════════════════════════════ */}
      <div style={{
        flex: '1.1 1 0',
        background: 'linear-gradient(145deg, #0a1628 0%, #0f2b5c 45%, #0d3d2e 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 56px',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
      }}>

        {/* Decorative animated orbs */}
        <div style={{
          position: 'absolute', top: '-80px', left: '-80px',
          width: '420px', height: '420px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(5,150,105,0.18) 0%, transparent 70%)',
          filter: 'blur(40px)', pointerEvents: 'none',
          animation: 'orb1 8s ease-in-out infinite alternate'
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', right: '-100px',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(29,78,216,0.2) 0%, transparent 70%)',
          filter: 'blur(60px)', pointerEvents: 'none',
          animation: 'orb2 10s ease-in-out infinite alternate'
        }} />
        <div style={{
          position: 'absolute', top: '40%', right: '10%',
          width: '250px', height: '250px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
          filter: 'blur(30px)', pointerEvents: 'none',
        }} />

        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        {/* Top: Logo */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '64px' }}>
            <div style={{
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '16px',
              padding: '10px 16px',
              display: 'flex', alignItems: 'center'
            }}>
              <img src="/logo.png" alt="ICS Logo" style={{ height: '44px', objectFit: 'contain' }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '2px' }}>ICS</p>
              <p style={{ margin: 0, fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Integrated Core Services</p>
            </div>
          </div>

          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '30px', padding: '6px 16px',
            marginBottom: '28px'
          }}>
            <ShieldCheck size={14} color="#10b981" />
            <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Official FSD Structuring System
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(2rem, 3.5vw, 3rem)',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.15,
            letterSpacing: '-0.5px',
            marginBottom: '20px',
            maxWidth: '480px'
          }}>
            Secure Evidence &<br />
            <span style={{
              background: 'linear-gradient(90deg, #10b981, #3b82f6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>Immigration Files</span> Archive.
          </h1>

          <p style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.95rem',
            lineHeight: 1.7,
            maxWidth: '440px',
            marginBottom: '48px'
          }}>
            Authorized portal for ICS officers to upload, catalog, search, and manage immigration evidence dossiers across all critical divisions.
          </p>

          {/* Division Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', maxWidth: '480px' }}>
            {divisions.map((div, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                padding: '16px 18px',
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                transition: 'all 0.3s ease',
                cursor: 'default',
                backdropFilter: 'blur(4px)',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                  e.currentTarget.style.borderColor = div.color + '55';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                  background: div.color + '22',
                  border: `1px solid ${div.color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: div.color
                }}>
                  {div.icon}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>{div.label}</p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{div.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Stats Bar */}
        <div style={{
          position: 'relative', zIndex: 2,
          display: 'flex', gap: '36px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: '28px', marginTop: '40px'
        }}>
          {[
            { label: 'Security', value: 'AES-256', color: '#10b981' },
            { label: 'Storage', value: 'IndexedDB', color: 'rgba(255,255,255,0.8)' },
            { label: 'Status', value: '● Online', color: '#10b981' },
          ].map((stat, i) => (
            <div key={i}>
              <p style={{ margin: 0, fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>{stat.label}</p>
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          RIGHT PANEL — Login Form
      ════════════════════════════════════════════════ */}
      <div style={{
        flex: '0.9 1 0',
        background: '#f3f6fa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 40px',
        position: 'relative',
        minHeight: '100vh',
      }}>
        {/* Subtle bg pattern */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(ellipse at 60% 20%, rgba(16,185,129,0.05) 0%, transparent 60%), radial-gradient(ellipse at 30% 80%, rgba(29,78,216,0.04) 0%, transparent 50%)'
        }} />

        <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>

          {/* Form Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '44px 40px',
            boxShadow: '0 25px 60px rgba(15,43,92,0.12), 0 8px 20px rgba(15,43,92,0.06)',
            border: '1px solid rgba(15,43,92,0.07)',
            position: 'relative',
            overflow: 'hidden',
          }}>

            {/* Top accent bar */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
              background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 50%, #8b5cf6 100%)',
              borderRadius: '24px 24px 0 0'
            }} />

            {/* Lock icon badge */}
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #059669, #047857)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px auto',
              boxShadow: '0 8px 20px rgba(5,150,105,0.3)'
            }}>
              <ShieldCheck size={26} color="#fff" />
            </div>

            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f2b5c', letterSpacing: '0.3px' }}>
                Officer Terminal
              </h2>
              <p style={{ color: '#94a3b8', margin: '6px 0 0 0', fontSize: '0.82rem' }}>
                Secure access · Session encrypted
              </p>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(220,38,38,0.05)',
                border: '1px solid rgba(220,38,38,0.2)',
                borderRadius: '10px',
                padding: '12px 14px',
                color: '#dc2626',
                fontSize: '0.8rem',
                display: 'flex', alignItems: 'center', gap: '10px',
                marginBottom: '20px'
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* Email / Username */}
              <div>
                <label style={{
                  display: 'block', marginBottom: '8px',
                  fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.8px', color: '#64748b'
                }}>Email / Login ID</label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', top: '50%', left: '14px', transform: 'translateY(-50%)',
                    color: '#94a3b8', display: 'flex'
                  }}>
                    <Mail size={16} />
                  </div>
                  <input
                    type="text"
                    className="glass-input"
                    style={{ paddingLeft: '44px', height: '48px', fontSize: '0.9rem', borderRadius: '10px' }}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Email or username"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{
                  display: 'block', marginBottom: '8px',
                  fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.8px', color: '#64748b'
                }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', top: '50%', left: '14px', transform: 'translateY(-50%)',
                    color: '#94a3b8', display: 'flex'
                  }}>
                    <Lock size={16} />
                  </div>
                  <input
                    type="password"
                    className="glass-input"
                    style={{ paddingLeft: '44px', height: '48px', fontSize: '0.9rem', borderRadius: '10px' }}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '8px',
                  width: '100%', height: '50px',
                  background: loading
                    ? 'linear-gradient(135deg, #6b7280, #4b5563)'
                    : 'linear-gradient(135deg, #059669 0%, #0f2b5c 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  letterSpacing: '0.3px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  boxShadow: loading ? 'none' : '0 6px 20px rgba(5,150,105,0.35)',
                  transition: 'all 0.25s ease',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 28px rgba(5,150,105,0.45)';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(5,150,105,0.35)';
                }}
              >
                {loading ? (
                  <span style={{ opacity: 0.8 }}>Authenticating...</span>
                ) : (
                  <>
                    <LogIn size={18} />
                    Access Secure Database
                    <ChevronRight size={16} />
                  </>
                )}
              </button>

            </form>

            {/* Footer note */}
            <p style={{
              textAlign: 'center',
              fontSize: '0.68rem',
              color: '#cbd5e1',
              marginTop: '24px',
              letterSpacing: '0.3px'
            }}>
              🔒 Authorized Personnel Only · All Access Logged
            </p>
          </div>

          {/* Below card note */}
          <p style={{
            textAlign: 'center',
            fontSize: '0.72rem',
            color: '#94a3b8',
            marginTop: '20px'
          }}>
            ICS File Management System · v2.0
          </p>
        </div>
      </div>

      {/* Keyframes for orb animations */}
      <style>{`
        @keyframes orb1 {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(40px, 30px) scale(1.1); }
        }
        @keyframes orb2 {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(-30px, -40px) scale(1.08); }
        }
      `}</style>
    </div>
  );
}
