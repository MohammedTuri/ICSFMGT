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
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 56px',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
        borderRight: '1px solid rgba(15, 43, 92, 0.08)'
      }}>

        {/* Decorative animated orbs based on ICS logo colors */}
        <div style={{
          position: 'absolute', top: '-80px', left: '-80px',
          width: '420px', height: '420px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(28,148,68,0.05) 0%, transparent 70%)',
          filter: 'blur(40px)', pointerEvents: 'none',
          animation: 'orb1 8s ease-in-out infinite alternate'
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', right: '-100px',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,84,168,0.06) 0%, transparent 70%)',
          filter: 'blur(60px)', pointerEvents: 'none',
          animation: 'orb2 10s ease-in-out infinite alternate'
        }} />
        <div style={{
          position: 'absolute', top: '15%', right: '-50px',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(247,181,25,0.04) 0%, transparent 70%)',
          filter: 'blur(40px)', pointerEvents: 'none',
          animation: 'orb3 12s ease-in-out infinite alternate'
        }} />
        <div style={{
          position: 'absolute', bottom: '25%', left: '-50px',
          width: '280px', height: '280px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(217,46,43,0.03) 0%, transparent 70%)',
          filter: 'blur(30px)', pointerEvents: 'none',
          animation: 'orb4 9s ease-in-out infinite alternate'
        }} />

        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(15,43,92,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(15,43,92,0.015) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        {/* Top: Logo */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '64px' }}>
            <div style={{
              background: 'rgba(15,43,92,0.04)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(15,43,92,0.08)',
              borderRadius: '16px',
              padding: '10px 16px',
              display: 'flex', alignItems: 'center'
            }}>
              <img src="/logo.png" alt="ICS Logo" style={{ height: '44px', objectFit: 'contain' }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#0f2b5c', letterSpacing: '1px', lineHeight: 1.2 }}>ICS</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>Integrated Core Services</p>
            </div>
          </div>

          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(28,148,68,0.07)',
            border: '1px solid rgba(28,148,68,0.25)',
            borderRadius: '30px', padding: '6px 16px',
            marginBottom: '28px'
          }}>
            <ShieldCheck size={14} color="#1c9444" />
            <span style={{ fontSize: '0.72rem', color: '#1c9444', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Official FSD Structuring System
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(2.2rem, 4vw, 3.2rem)',
            fontWeight: 800,
            color: '#0f2b5c',
            lineHeight: 1.1,
            letterSpacing: '-1px',
            marginBottom: '22px',
            maxWidth: '520px'
          }}>
            Secure Evidence &<br />
            <span style={{
              background: 'linear-gradient(90deg, #d92e2b 0%, #f7b519 33%, #1c9444 66%, #1054a8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 900
            }}>Immigration Files</span> Archive.
          </h1>

          <p style={{
            color: '#475569',
            fontSize: '1rem',
            lineHeight: 1.6,
            maxWidth: '460px',
            marginBottom: '40px'
          }}>
            Authorized portal for ICS officers to upload, catalog, search, and manage immigration evidence dossiers across all critical divisions.
          </p>

          {/* Division Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '520px' }}>
            {divisions.map((div, i) => (
              <div key={i} style={{
                background: '#ffffff',
                border: '1px solid rgba(15,43,92,0.08)',
                borderRadius: '16px',
                padding: '18px 20px',
                display: 'flex', alignItems: 'flex-start', gap: '14px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'default',
                boxShadow: '0 4px 12px rgba(15, 43, 92, 0.02)',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = div.color;
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = `0 10px 20px rgba(15, 43, 92, 0.05), 0 2px 8px ${div.color}15`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = 'rgba(15,43,92,0.08)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 43, 92, 0.02)';
                }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                  background: div.color + '15',
                  border: `1px solid ${div.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: div.color
                }}>
                  {div.icon}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#0f2b5c', letterSpacing: '0.2px' }}>{div.label}</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', marginTop: '4px', lineHeight: 1.3 }}>{div.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Stats Bar */}
        <div style={{
          position: 'relative', zIndex: 2,
          display: 'flex', gap: '36px',
          borderTop: '1px solid rgba(15,43,92,0.08)',
          paddingTop: '28px', marginTop: '40px'
        }}>
          {[
            { label: 'Security', value: 'AES-256', color: '#1c9444' },
            { label: 'Storage', value: 'IndexedDB', color: 'rgba(15,43,92,0.8)' },
            { label: 'Status', value: '● Online', color: '#1c9444' },
          ].map((stat, i) => (
            <div key={i}>
              <p style={{ margin: 0, fontSize: '0.65rem', color: 'rgba(15,43,92,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>{stat.label}</p>
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
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 40px',
        position: 'relative',
        minHeight: '100vh',
      }}>
        {/* Subtle bg pattern using ICS logo colors */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(ellipse at 60% 20%, rgba(28,148,68,0.03) 0%, transparent 60%), radial-gradient(ellipse at 30% 80%, rgba(16,84,168,0.03) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(247,181,25,0.02) 0%, transparent 40%)'
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

            {/* Top accent bar using ICS logo colors */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
              background: 'linear-gradient(90deg, #d92e2b 0%, #f7b519 33%, #1c9444 66%, #1054a8 100%)',
              borderRadius: '24px 24px 0 0'
            }} />
 
            {/* Lock icon badge */}
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #1054a8, #0b3c78)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px auto',
              boxShadow: '0 8px 20px rgba(16,84,168,0.3)'
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
                  fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '1px', color: '#475569'
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
                    style={{ paddingLeft: '44px', height: '48px', fontSize: '0.95rem', borderRadius: '10px' }}
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
                  fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '1px', color: '#475569'
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
                    style={{ paddingLeft: '44px', height: '48px', fontSize: '0.95rem', borderRadius: '10px' }}
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
                    : 'linear-gradient(135deg, #059669 0%, #1054a8 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  letterSpacing: '0.3px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  boxShadow: loading ? 'none' : '0 6px 20px rgba(5,150,105,0.25)',
                  transition: 'all 0.25s ease',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 28px rgba(5,150,105,0.35)';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(5,150,105,0.25)';
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
               fontSize: '0.72rem',
               color: '#64748b',
               fontWeight: 500,
               marginTop: '24px',
               letterSpacing: '0.3px'
             }}>
               🔒 Authorized Personnel Only · All Access Logged
             </p>
          </div>

           {/* Below card note */}
           <p style={{
             textAlign: 'center',
             fontSize: '0.75rem',
             color: '#64748b',
             fontWeight: 500,
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
        @keyframes orb3 {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(-20px, 40px) scale(1.15); }
        }
        @keyframes orb4 {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(30px, -30px) scale(1.12); }
        }
      `}</style>
    </div>
  );
}
