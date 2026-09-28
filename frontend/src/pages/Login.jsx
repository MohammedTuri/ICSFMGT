import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Lock, Mail, AlertCircle, ShieldCheck, Fingerprint, FileText, Award, FileWarning, ChevronRight, X, Layers, Database, ArrowRight, CheckCircle2 } from 'lucide-react';
import { getAllRecords, updateRecord } from '../utils/db';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

      if (user.isActive === false || user.status === 'INACTIVE') {
        setError('Your account has been deactivated. Please contact the administrator.');
        setLoading(false);
        return;
      }

      if (user.locked) {
        setError('Your account is locked. Please contact the administrator.');
        setLoading(false);
        return;
      }

      if (user.password !== password) {
        const attempts = (user.loginAttempts || 0) + 1;
        const updatedUser = { ...user, loginAttempts: attempts };
        if (attempts >= 4) {
          updatedUser.locked = true;
        }
        await updateRecord('users', updatedUser);

        if (attempts >= 4) {
          setError('Your account is locked. Please contact the administrator.');
        } else {
          setError(`Incorrect password. Please try again. (${4 - attempts} attempts remaining)`);
        }
        setLoading(false);
        return;
      }

      // Reset attempts on successful login
      if (user.loginAttempts > 0) {
        await updateRecord('users', { ...user, loginAttempts: 0 });
      }

      localStorage.setItem('ics_auth_user', JSON.stringify({
        id: user.id,
        username: user.username,
        email: user.email,
        role: (user.role || 'OFFICER').toUpperCase(),   // normalise to uppercase
        fullName: user.fullName,
        branch: user.branch || 'Head Office (Addis Ababa)',
        allowedDivisions: user.allowedDivisions || [],
        permissions: user.permissions || { add: false, edit: false, delete: false },
        sessionExpiry: Date.now() + (15 * 60 * 1000) // expires in 15 minutes
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
    { icon: <FileWarning size={18} />, label: 'Emergency Travel Document', color: '#8b5cf6', desc: 'Emergency Travel Docs' },
  ];

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      color: '#0f172a',
      display: 'flex',
      flexDirection: 'column'
    }}>

      {/* ═══════════════════════════════════════════════
          HEADER / NAVBAR (Matches Official ICS Portal)
      ════════════════════════════════════════════════ */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '14px 48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        {/* Left: Official ICS Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img 
            src="/logo.png" 
            alt="ICS Logo" 
            style={{ height: '48px', objectFit: 'contain' }} 
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f2b5c', letterSpacing: '0.5px', lineHeight: 1.1 }}>
              ICS <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1054a8' }}>የኢሚግሬሽንና ዜግነት አገልግሎት</span>
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: '2px' }}>
              IMMIGRATION AND CITIZENSHIP SERVICE
            </span>
          </div>
        </div>

        {/* Center Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <a href="#home" style={{ textDecoration: 'none', color: '#0f2b5c', fontWeight: 700, fontSize: '0.95rem' }}>
            Home
          </a>
          <a href="#features" style={{ textDecoration: 'none', color: '#64748b', fontWeight: 500, fontSize: '0.95rem', transition: 'color 0.2s' }}>
            Divisions
          </a>
          <a href="#archive" style={{ textDecoration: 'none', color: '#64748b', fontWeight: 500, fontSize: '0.95rem', transition: 'color 0.2s' }}>
            Archive System
          </a>
        </nav>

        {/* Right Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            background: 'linear-gradient(135deg, #1054a8 0%, #0b3c78 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 24px',
            fontSize: '0.92rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(16, 84, 168, 0.25)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 18px rgba(16, 84, 168, 0.35)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 84, 168, 0.25)';
          }}
        >
          <LogIn size={16} /> Login
        </button>
      </header>

      {/* ═══════════════════════════════════════════════
          MAIN HERO CONTENT AREA
      ════════════════════════════════════════════════ */}
      <main style={{ flex: 1, padding: '24px 48px 60px 48px', maxWidth: '1400px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        
        {/* Hero Card Container */}
        <div style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)',
          borderRadius: '32px',
          border: '1px solid #e2e8f0',
          padding: '64px 48px 48px 48px',
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(15, 43, 92, 0.04)',
          position: 'relative',
          overflow: 'hidden'
        }}>

          {/* Background subtle radial glow */}
          <div style={{
            position: 'absolute', top: '-150px', left: '50%', transform: 'translateX(-50%)',
            width: '800px', height: '400px',
            background: 'radial-gradient(circle, rgba(247, 181, 25, 0.08) 0%, rgba(16, 84, 168, 0.04) 50%, transparent 80%)',
            pointerEvents: 'none', filter: 'blur(50px)'
          }} />

          {/* Hero Title */}
          <h1 style={{
            fontSize: 'clamp(2.4rem, 4.5vw, 3.6rem)',
            fontWeight: 800,
            color: '#0f2b5c',
            lineHeight: 1.15,
            letterSpacing: '-1px',
            margin: '0 auto 20px auto',
            maxWidth: '900px'
          }}>
            Immigration and Citizenship Service
          </h1>

          {/* Hero Subtitle */}
          <p style={{
            fontSize: '1.05rem',
            color: '#475569',
            lineHeight: 1.65,
            maxWidth: '820px',
            margin: '0 auto 36px auto',
            fontWeight: 400
          }}>
            Welcome to the official portal of the Ethiopian Immigration and Citizenship Service where you can 
            catalog, search, and manage passport archives, Ethiopian Origin ID cards, visas, and residence files. 
            Our secure digital archive system is designed to make evidence management smooth, structured, and efficient.
          </p>

          {/* CTA Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '48px' }}>
            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #1054a8 0%, #0b3c78 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '14px 32px',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(16, 84, 168, 0.3)',
                transition: 'all 0.25s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(16, 84, 168, 0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 84, 168, 0.3)';
              }}
            >
              Access File System <ArrowRight size={18} />
            </button>
          </div>

          {/* ═══════════════════════════════════════════════
              HERO SHELF IMAGE SHOWCASE (User Requested Feature)
          ════════════════════════════════════════════════ */}
          <div id="archive" style={{
            position: 'relative',
            maxWidth: '1100px',
            margin: '0 auto',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(15, 43, 92, 0.15), 0 10px 25px rgba(15, 43, 92, 0.08)',
            border: '4px solid #ffffff',
            background: '#0f172a'
          }}>
            {/* Shelf Banner Image */}
            <img 
              src="/archive_shelves.jpg" 
              alt="High-Tech File Archive Shelves"
              style={{
                width: '100%',
                maxHeight: '520px',
                objectFit: 'cover',
                display: 'block',
                transition: 'transform 0.5s ease'
              }}
            />

            {/* Shelf Image Floating Glass Badges */}
            <div style={{
              position: 'absolute',
              bottom: '24px',
              left: '24px',
              right: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              borderRadius: '16px',
              padding: '16px 24px',
              color: '#ffffff',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: 'rgba(16, 84, 168, 0.4)',
                  border: '1px solid rgba(59, 130, 246, 0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Layers size={22} color="#60a5fa" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                    Physical Shelf & Digital Dossier Archive
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                    Automated Box-Allocation (50 files/box) · Sequential Shelf Tracking
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#34d399', fontWeight: 600 }}>
                  <CheckCircle2 size={16} /> 8 Scoped Divisions
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#60a5fa', fontWeight: 600 }}>
                  <ShieldCheck size={16} /> Encrypted Access
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ═══════════════════════════════════════════════
            DIVISION CARDS SECTION
        ════════════════════════════════════════════════ */}
        <div id="features" style={{ marginTop: '48px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f2b5c', margin: 0 }}>
              Evidence & File Management Categories
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '6px' }}>
              Structured archives maintained by the Ethiopian Immigration and Citizenship Service
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {divisions.map((div, i) => (
              <div 
                key={i} 
                onClick={() => setIsModalOpen(true)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '20px',
                  padding: '24px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(15, 43, 92, 0.02)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = div.color;
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 12px 28px rgba(15, 43, 92, 0.08), 0 4px 12px ${div.color}20`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 43, 92, 0.02)';
                }}
              >
                <div style={{
                  width: '46px', height: '46px', borderRadius: '14px',
                  background: div.color + '15',
                  border: `1px solid ${div.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: div.color, marginBottom: '16px'
                }}>
                  {div.icon}
                </div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f2b5c' }}>
                  {div.label}
                </h4>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4 }}>
                  {div.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════
          OFFICER LOGIN MODAL TERMINAL
      ════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '440px',
            padding: '40px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            
            {/* Top colored stripe matching ICS branding */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '5px',
              background: 'linear-gradient(90deg, #d92e2b 0%, #f7b519 33%, #1c9444 66%, #1054a8 100%)'
            }} />

            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'rgba(148, 163, 184, 0.1)',
                border: 'none', borderRadius: '50%',
                width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#64748b'
              }}
            >
              <X size={18} />
            </button>

            {/* Header Icon */}
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #1054a8, #0b3c78)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px auto',
              boxShadow: '0 8px 20px rgba(16, 84, 168, 0.3)'
            }}>
              <ShieldCheck size={28} color="#ffffff" />
            </div>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f2b5c' }}>
                Officer Login Terminal
              </h3>
              <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.82rem' }}>
                Immigration & Citizenship Service Access
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                background: 'rgba(220, 38, 38, 0.06)',
                border: '1px solid rgba(220, 38, 38, 0.2)',
                borderRadius: '10px',
                padding: '12px',
                color: '#dc2626',
                fontSize: '0.82rem',
                display: 'flex', alignItems: 'center', gap: '8px',
                marginBottom: '18px'
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Email / Officer ID
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', top: '50%', left: '14px', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="officer@ics.gov"
                    required
                    style={{
                      width: '100%',
                      height: '46px',
                      paddingLeft: '42px',
                      paddingRight: '14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.92rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', top: '50%', left: '14px', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    required
                    style={{
                      width: '100%',
                      height: '46px',
                      paddingLeft: '42px',
                      paddingRight: '14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.92rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '8px',
                  width: '100%',
                  height: '48px',
                  background: loading ? '#94a3b8' : 'linear-gradient(135deg, #1054a8 0%, #0b3c78 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 6px 18px rgba(16, 84, 168, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {loading ? 'Logging in...' : <>Login <ChevronRight size={16} /></>}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#64748b', marginTop: '20px', margin: '20px 0 0 0' }}>
              🔒 Authorized Personnel Only · 15-Min Auto Session Expiry
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          FOOTER (Official Portal Footer)
      ════════════════════════════════════════════════ */}
      <footer style={{
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        padding: '24px 48px',
        textAlign: 'center',
        color: '#64748b',
        fontSize: '0.82rem'
      }}>
        <p style={{ margin: 0, fontWeight: 500 }}>
          © {new Date().getFullYear()} Ethiopian Immigration and Citizenship Service (ICS). File Management System v2.0
        </p>
      </footer>

    </div>
  );
}
