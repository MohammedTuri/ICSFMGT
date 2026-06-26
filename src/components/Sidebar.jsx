import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, BarChart2, FileText, Fingerprint, Award, FileWarning, Users, LogOut, Shield, ShieldAlert, UserCheck, Eye, IdCard, Globe, CreditCard, Baby, ClipboardList } from 'lucide-react';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('ics_auth_user'));
    setCurrentUser(session);
  }, []);

  // Auto-expand EOID if on an eoid sub-route
  const handleLogout = () => {
    localStorage.removeItem('ics_auth_user');
    navigate('/login');
    window.location.reload();
  };

  const getRoleIcon = (role) => {
    if (role === 'ADMIN') return <ShieldAlert size={14} style={{ color: 'var(--accent-danger)' }} />;
    if (role === 'SUPERVISOR') return <Shield size={14} style={{ color: 'var(--accent-gold)' }} />;
    if (role === 'OFFICER') return <UserCheck size={14} style={{ color: 'var(--accent-blue)' }} />;
    return <Eye size={14} style={{ color: 'var(--text-secondary)' }} />;
  };

  const links = [
    { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard', key: 'dashboard', activeColor: 'var(--accent-emerald)' },
    { to: '/reports', icon: <BarChart2 size={20} />, label: 'Reports & Analytics', key: 'reports', activeColor: 'var(--accent-blue)' },
    { to: '/audit-log', icon: <ClipboardList size={20} />, label: 'Audit Log', key: 'audit-log', activeColor: 'var(--accent-emerald)', adminOnly: true },
    { to: '/visa', icon: <FileText size={20} />, label: 'VISA Files', key: 'visa', activeColor: 'var(--accent-emerald)' },
    // EOID is handled separately as a group
    { to: '/residence-id', icon: <Award size={20} />, label: 'Residence ID File', key: 'residence-id', activeColor: 'var(--accent-emerald)' },
    { to: '/etd', icon: <FileWarning size={20} />, label: 'Emergency Travel Document File', key: 'etd', activeColor: 'var(--accent-emerald)' },
    { to: '/eritrean-id', icon: <IdCard size={20} />, label: 'Eritrean ID File', key: 'eritrean-id', activeColor: 'var(--accent-emerald)' },
    { to: '/alien-passport', icon: <Globe size={20} />, label: 'Alien Passport File', key: 'alien-passport', activeColor: 'var(--accent-emerald)' },
    { to: '/yellow-card', icon: <CreditCard size={20} />, label: 'Yellow Card File', key: 'yellow-card', activeColor: 'var(--accent-emerald)' }
  ];

  // Determine access
  const allowed = currentUser?.allowedDivisions || [];
  const isAdmin = currentUser && currentUser.role === 'ADMIN';
  
  const canAccessDivision = (key) => {
    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN' || currentUser.role === 'SUPERVISOR') return true;
    return allowed.includes(key);
  };

  const filteredLinks = links.filter(link => {
    if (link.adminOnly && !isAdmin) return false;
    if (link.key === 'dashboard' || link.key === 'reports' || link.key === 'audit-log') return true;
    return canAccessDivision(link.key);
  });

  const canSeeNormalEoid = canAccessDivision('eoid-normal');
  const canSeeUnderageEoid = canAccessDivision('eoid-underage');
  const canSeeAnyEoid = canSeeNormalEoid || canSeeUnderageEoid;


  // Find where to inject EOID in the list (after visa)
  const eoidInsertIndex = filteredLinks.findIndex(l => l.key === 'visa');
  const beforeEoid = eoidInsertIndex >= 0 ? filteredLinks.slice(0, eoidInsertIndex + 1) : filteredLinks;
  const afterEoid = eoidInsertIndex >= 0 ? filteredLinks.slice(eoidInsertIndex + 1) : [];

  const navLinkStyle = (isActive, customColor = 'var(--accent-emerald)') => {
    let bg = 'rgba(16, 185, 129, 0.1)';
    let border = 'rgba(16, 185, 129, 0.2)';
    let shadow = 'var(--shadow-neon)';
    if (customColor === 'var(--accent-blue)') {
      bg = 'rgba(29, 78, 216, 0.1)';
      border = 'rgba(29, 78, 216, 0.2)';
      shadow = '0 4px 15px rgba(29, 78, 216, 0.08)';
    } else if (customColor === 'var(--accent-gold)') {
      bg = 'rgba(245, 158, 11, 0.1)';
      border = 'rgba(245, 158, 11, 0.2)';
      shadow = '0 0 12px rgba(245,158,11,0.12)';
    }
    return {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '12px 24px',
      borderRadius: '8px',
      color: isActive ? customColor : 'var(--text-secondary)',
      background: isActive ? bg : 'transparent',
      textDecoration: 'none',
      fontWeight: isActive ? 600 : 500,
      transition: 'all 0.2s ease',
      border: isActive ? `1px solid ${border}` : '1px solid transparent',
      boxShadow: isActive ? shadow : 'none'
    };
  };

  const renderLink = (link) => (
    <NavLink key={link.to} to={link.to} style={({ isActive }) => navLinkStyle(isActive, link.activeColor)}>
      {link.icon}
      {link.label}
    </NavLink>
  );

  return (
    <aside style={{
      width: '280px',
      height: '100vh',
      background: 'var(--bg-card)',
      backdropFilter: 'blur(16px)',
      borderRight: '1px solid var(--border-glass)',
      padding: '24px 0',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Title Header */}
      <div style={{ padding: '0 24px', marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <img src="/logo.png" alt="ICS Logo" style={{ height: '48px', objectFit: 'contain', display: 'block' }} />
        
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '0.8rem', 
          fontWeight: 'bold', 
          margin: 0,
          letterSpacing: '0.5px', 
          textTransform: 'uppercase' 
        }}>
          File Management System
        </p>
      </div>

      {/* Navigation Links */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', padding: '0 12px', overflowY: 'auto' }}>
        {/* Links before EOID */}
        {beforeEoid.map(renderLink)}

        {/* Ethiopian Origin ID */}
        {canSeeAnyEoid && (
          <NavLink
            to={canSeeNormalEoid ? '/eoid/normal' : '/eoid/underage'}
            style={({ isActive }) => navLinkStyle(isActive, 'var(--accent-gold)')}
          >
            <Fingerprint size={20} />
            Ethiopian Origin ID File
          </NavLink>
        )}

        {/* Links after EOID */}
        {afterEoid.map(renderLink)}

        {/* User Directory — Admin only */}
        {isAdmin && (
          <>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border-glass)', margin: '12px 10px' }} />
            <NavLink
              to="/user-management"
              style={({ isActive }) => navLinkStyle(isActive)}
            >
              <Users size={20} />
              User Directory
            </NavLink>
          </>
        )}
      </nav>

      {/* Footer Profile with Sign-Out */}
      {currentUser && (
        <div style={{ padding: '20px 16px 0 16px', borderTop: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              background: currentUser.role === 'ADMIN' ? 'linear-gradient(135deg, var(--accent-danger), #b91c1c)' :
                          currentUser.role === 'SUPERVISOR' ? 'linear-gradient(135deg, var(--accent-gold), #b45309)' :
                          'linear-gradient(135deg, var(--accent-emerald), var(--accent-blue))', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: currentUser.role === 'VIEWER' ? '#fff' : '#000', 
              fontWeight: 'bold',
              fontSize: '0.95rem'
            }}>
              {currentUser.fullName ? currentUser.fullName[0].toUpperCase() : 'U'}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p style={{ fontWeight: 600, fontSize: '0.85rem', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {currentUser.fullName}
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {getRoleIcon(currentUser.role)} {currentUser.role}
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--accent-danger)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '6px',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            className="logout-btn-hover"
          >
            <LogOut size={14} /> Log Out Terminal
          </button>
        </div>
      )}
    </aside>
  );
}
