import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart2, FileText, Fingerprint, Award, FileWarning, Users, LogOut, Shield, ShieldAlert, UserCheck, Eye, IdCard, Globe, ClipboardList, Bell, X, Trash2, Settings, Package, Key } from 'lucide-react';
import { getAuditLogs, getAllRecords, getSystemModules, getModuleOverrides } from '../utils/db';
import UserProfileModal from './UserProfileModal';

const ACTION_META = {
  CREATE: { label: 'Added', color: '#059669', bg: '#d1fae5' },
  UPDATE: { label: 'Modified', color: '#1d4ed8', bg: '#dbeafe' },
  DELETE: { label: 'Deleted', color: '#dc2626', bg: '#fee2e2' },
  IMPORT: { label: 'Imported', color: '#a855f7', bg: '#f3e8ff' },
  RESTORE: { label: 'Restored', color: '#059669', bg: '#d1fae5' },
  PERMANENT_DELETE: { label: 'Purged', color: '#b91c1c', bg: '#fee2e2' },
};

const STORE_KEY_MAP = {
  'visa': 'visa',
  'eoid': 'eoid',
  'residence-id': 'residence_id',
  'residence-id-cancellation': 'residence_id_cancellation',
  'etd': 'etd',
  'eritrean-id': 'eritrean_id',
  'alien-passport': 'alien_passport',
  'recycle-bin': 'recycle_bin',
  'users': 'users',
};

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Sidebar() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [counts, setCounts] = useState({});
  const [customModules, setCustomModules] = useState([]);
  const [moduleOverrides, setModuleOverrides] = useState(getModuleOverrides());

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('ics_auth_user'));
    setCurrentUser(session);
    loadAll();
    const handleModulesChanged = () => {
      setModuleOverrides(getModuleOverrides());
      loadAll();
    };
    window.addEventListener('ics_modules_changed', handleModulesChanged);
    window.addEventListener('storage', handleModulesChanged);
    const id = setInterval(loadAll, 30000);
    return () => {
      clearInterval(id);
      window.removeEventListener('ics_modules_changed', handleModulesChanged);
      window.removeEventListener('storage', handleModulesChanged);
    };
  }, []);

  const loadAll = async () => {
    try {
      const storeKeys = Object.values(STORE_KEY_MAP);
      const [logs, mods, ...storeCounts] = await Promise.all([
        getAuditLogs({}).catch(() => []),
        getSystemModules().catch(() => []),
        ...storeKeys.map(s => getAllRecords(s).then(r => r.length).catch(() => 0))
      ]);
      setNotifications(logs.slice(0, 10));
      setModuleOverrides(getModuleOverrides());
      setCustomModules((mods || []).filter(m => m.isActive));
      const countMap = {};
      storeKeys.forEach((key, i) => { countMap[key] = storeCounts[i]; });
      setCounts(countMap);
    } catch (err) {
      console.error('Sidebar data error:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ics_auth_user');
    navigate('/login');
  };

  const getRoleIcon = (role) => {
    const r = (role || '').toUpperCase();
    if (r === 'ADMIN') return <ShieldAlert size={14} style={{ color: 'var(--accent-danger)' }} />;
    if (r === 'SUPERVISOR') return <Shield size={14} style={{ color: 'var(--accent-gold)' }} />;
    if (r === 'AUDITOR') return <ClipboardList size={14} style={{ color: '#0ea5e9' }} />;
    if (r === 'OFFICER') return <UserCheck size={14} style={{ color: 'var(--accent-blue)' }} />;
    return <Eye size={14} style={{ color: 'var(--text-secondary)' }} />;
  };

  const links = [
    { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard', key: 'dashboard', activeColor: 'var(--accent-emerald)' },
    { to: '/visa', icon: <FileText size={20} />, label: 'VISA Files', key: 'visa', activeColor: 'var(--accent-emerald)' },
    { to: '/eoid', icon: <Fingerprint size={20} />, label: 'Ethiopian Origin ID File', key: 'eoid', activeColor: 'var(--accent-gold)' },
    { to: '/residence-id', icon: <Award size={20} />, label: 'Residence ID File', key: 'residence-id', activeColor: 'var(--accent-emerald)' },
    { to: '/residence-id-cancellation', icon: <FileWarning size={20} />, label: 'Residence ID Cancellation', key: 'residence-id-cancellation', activeColor: '#dc2626' },
    { to: '/etd', icon: <FileWarning size={20} />, label: 'Emergency Travel Document File', key: 'etd', activeColor: 'var(--accent-emerald)' },
    { to: '/eritrean-id', icon: <IdCard size={20} />, label: 'Eritrean ID File', key: 'eritrean-id', activeColor: 'var(--accent-emerald)' },
    { to: '/alien-passport', icon: <Globe size={20} />, label: 'Alien Passport File', key: 'alien-passport', activeColor: 'var(--accent-emerald)' },
    { to: '/reports', icon: <BarChart2 size={20} />, label: 'Reports & Analytics', key: 'reports', activeColor: 'var(--accent-blue)' },
    { to: '/audit-log', icon: <ClipboardList size={20} />, label: 'Audit Log', key: 'audit-log', activeColor: 'var(--accent-emerald)', adminOnly: true },
    { to: '/recycle-bin', icon: <Trash2 size={20} />, label: 'Recycle Bin', key: 'recycle-bin', activeColor: 'var(--accent-danger)', adminOnly: true }
  ];

  const userRole = (currentUser?.role || '').toUpperCase();
  const isAdmin = userRole === 'ADMIN';
  const isSupervisor = userRole === 'SUPERVISOR';
  const isAuditor = userRole === 'AUDITOR';
  const allowed = currentUser?.allowedDivisions || [];
  const modulePerms = currentUser?.modulePermissions || {};

  const canAccessDivision = (key) => {
    if (!currentUser) return false;
    if (isAdmin || isSupervisor) return true;

    // 1. Check fine-grained module permissions if defined
    if (modulePerms && Object.keys(modulePerms).length > 0) {
      if (key === 'eoid') {
        const norm = modulePerms['eoid-normal'];
        const under = modulePerms['eoid-underage'];
        const general = modulePerms['eoid'];
        return (norm && norm !== 'NO_ACCESS') || (under && under !== 'NO_ACCESS') || (general && general !== 'NO_ACCESS');
      }
      if (modulePerms[key] !== undefined) {
        return modulePerms[key] !== 'NO_ACCESS';
      }
    }

    // 2. Role-based fallback
    if (isAuditor) return key !== 'recycle-bin';
    if (key === 'eoid') {
      return allowed.includes('eoid') || allowed.includes('eoid-normal') || allowed.includes('eoid-underage');
    }
    return allowed.includes(key);
  };

  const filteredLinks = links.filter(link => {
    if (link.key !== 'dashboard' && link.key !== 'reports' && link.key !== 'audit-log' && link.key !== 'recycle-bin') {
      if (moduleOverrides[link.key]?.isActive === false) return false;
    }
    if (isAdmin || isSupervisor) return true;
    if (link.key === 'dashboard') return true;
    return canAccessDivision(link.key);
  });

  const canSeeNormalEoid = canAccessDivision('eoid-normal');
  const canSeeUnderageEoid = canAccessDivision('eoid-underage');
  const canSeeAnyEoid = isAdmin || isSupervisor || isAuditor || canSeeNormalEoid || canSeeUnderageEoid;

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
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '11px 20px', borderRadius: '8px',
      color: isActive ? customColor : 'var(--text-secondary)',
      background: isActive ? bg : 'transparent',
      textDecoration: 'none',
      fontWeight: isActive ? 600 : 500,
      transition: 'all 0.2s ease',
      border: isActive ? `1px solid ${border}` : '1px solid transparent',
      boxShadow: isActive ? shadow : 'none',
      fontSize: '0.88rem'
    };
  };

  const getBadgeCount = (key) => {
    const storeKey = STORE_KEY_MAP[key];
    if (!storeKey) return null;
    const c = counts[storeKey];
    return c !== undefined ? c : null;
  };

  const renderBadge = (count) => count !== null && (
    <span style={{
      background: 'rgba(15,43,92,0.08)', color: 'var(--text-secondary)',
      borderRadius: '20px', padding: '1px 8px',
      fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
      minWidth: '22px', textAlign: 'center'
    }}>{count}</span>
  );

  const renderLink = (link) => (
    <NavLink key={link.to} to={link.to} style={({ isActive }) => navLinkStyle(isActive, link.activeColor)}>
      {link.icon}
      <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{link.label}</span>
      {link.key === 'recycle-bin' && renderBadge(getBadgeCount(link.key))}
    </NavLink>
  );

  const unreadCount = notifications.length;

  return (
    <>
      {/* Notification Drawer */}
      {notifOpen && (
        <>
          <div
            onClick={() => setNotifOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 998, background: 'rgba(0,0,0,0.18)' }}
          />
          <div style={{
            position: 'fixed', top: 0, left: '280px',
            width: '360px', height: '100vh',
            background: '#fff',
            borderRight: '1px solid var(--border-glass)',
            boxShadow: '8px 0 40px rgba(15,43,92,0.14)',
            zIndex: 999,
            display: 'flex', flexDirection: 'column',
            animation: 'slideInFromLeft 0.22s cubic-bezier(0.4,0,0.2,1)'
          }}>
            {/* Drawer Header */}
            <div style={{
              padding: '20px', borderBottom: '1px solid var(--border-glass)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'linear-gradient(135deg,#0f172a,#1e293b)', color: '#fff'
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={17} /> Recent Activity
                </div>
                <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                  Last {unreadCount} system events · auto-refreshes
                </div>
              </div>
              <button onClick={() => setNotifOpen(false)} style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px',
                padding: '7px', color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}><X size={16} /></button>
            </div>

            {/* Drawer Body */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Bell size={32} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>No recent activity</p>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', opacity: 0.6 }}>Actions will appear here as users interact with the system.</p>
                </div>
              ) : notifications.map((n, idx) => {
                const meta = ACTION_META[n.action] || ACTION_META.CREATE;
                const fullName = n.recordData?.fullName || n.previousData?.fullName || '—';
                return (
                  <div key={idx}
                    style={{
                      padding: '14px 20px',
                      borderBottom: '1px solid var(--border-glass)',
                      transition: 'background 0.15s', cursor: 'default'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(15,43,92,0.025)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {fullName}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          {n.storeName} · {n.userName || 'Unknown'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '6px',
                          fontSize: '0.68rem', fontWeight: 700,
                          background: meta.bg, color: meta.color
                        }}>{meta.label}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{timeAgo(n.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div style={{
              padding: '12px 20px', borderTop: '1px solid var(--border-glass)',
              fontSize: '0.74rem', color: 'var(--text-secondary)', textAlign: 'center'
            }}>
              🔄 Refreshes every 30 seconds
            </div>
          </div>
        </>
      )}

      <aside style={{
        width: '280px', height: '100vh',
        background: 'var(--bg-card)',
        backdropFilter: 'blur(16px)',
        borderRight: '1px solid var(--border-glass)',
        padding: '24px 0',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Logo & Title */}
        <div style={{ padding: '0 24px', marginBottom: '28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <img src="/logo.png" alt="ICS Logo" style={{ height: '48px', objectFit: 'contain', display: 'block' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 'bold', margin: 0, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            File Management System
          </p>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 10px', overflowY: 'auto' }}>
          {filteredLinks.map(renderLink)}

          {(isAdmin || isSupervisor) && (
            <>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-glass)', margin: '10px 8px' }} />
              <div style={{ padding: '4px 10px 2px', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                System &amp; Access
              </div>
              <NavLink to="/user-management" style={({ isActive }) => navLinkStyle(isActive, '#059669')}>
                <Users size={20} />
                <span style={{ flex: 1 }}>User Module</span>
                {renderBadge(getBadgeCount('users'))}
              </NavLink>
              {isAdmin && (
                <NavLink to="/system-config" style={({ isActive }) => navLinkStyle(isActive, '#7c3aed')}>
                  <Settings size={20} />
                  <span style={{ flex: 1 }}>System Configuration</span>
                </NavLink>
              )}
            </>
          )}

          {/* Dynamic Custom Modules — shown to all who have access */}
          {customModules.length > 0 && (
            <>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-glass)', margin: '10px 8px' }} />
              <div style={{ padding: '4px 10px 2px', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Custom Modules
              </div>
              {customModules.map(mod => {
                if (!canAccessDivision(mod.key)) return null;
                return (
                  <NavLink key={mod.key} to={`/modules/${mod.key}`} style={({ isActive }) => navLinkStyle(isActive, mod.color || 'var(--accent-emerald)')}>
                    <Package size={20} style={{ color: mod.color || 'var(--accent-emerald)' }} />
                    <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mod.title}</span>
                  </NavLink>
                );
              })}
            </>
          )}
        </nav>

        {/* Footer */}
        {currentUser && (
          <div style={{ padding: '16px 14px 0 14px', borderTop: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Avatar */}
              <div style={{
                width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                background: isAdmin ? 'linear-gradient(135deg,var(--accent-danger),#b91c1c)' :
                            userRole === 'SUPERVISOR' ? 'linear-gradient(135deg,var(--accent-gold),#b45309)' :
                            userRole === 'AUDITOR' ? 'linear-gradient(135deg,#0ea5e9,#0284c7)' :
                            'linear-gradient(135deg,var(--accent-emerald),var(--accent-blue))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 'bold', fontSize: '0.9rem'
              }}>
                {currentUser.fullName ? currentUser.fullName[0].toUpperCase() : 'U'}
              </div>
              {/* Name & role */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: '0.83rem', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {currentUser.fullName}
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {getRoleIcon(currentUser.role)} {currentUser.role}
                </p>
              </div>
              {/* Change Password & Profile button */}
              <button
                onClick={() => setProfileOpen(true)}
                title="Change Password & My Profile"
                style={{
                  position: 'relative', flexShrink: 0,
                  background: 'transparent',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px', padding: '6px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <Key size={16} />
              </button>

              {/* Bell button */}
              <button
                onClick={() => setNotifOpen(o => !o)}
                title="Recent Activity"
                style={{
                  position: 'relative', flexShrink: 0,
                  background: notifOpen ? 'rgba(29,78,216,0.1)' : 'transparent',
                  border: `1px solid ${notifOpen ? 'rgba(29,78,216,0.25)' : 'var(--border-glass)'}`,
                  borderRadius: '8px', padding: '6px',
                  color: notifOpen ? 'var(--accent-blue)' : unreadCount > 0 ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <Bell size={17} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '-5px', right: '-5px',
                    background: 'var(--accent-danger)', color: '#fff',
                    borderRadius: '50%', width: '17px', height: '17px',
                    fontSize: '0.58rem', fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid #fff'
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={handleLogout}
              style={{
                background: 'rgba(239,68,68,0.08)',
                color: 'var(--accent-danger)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '6px', padding: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '8px', fontSize: '0.8rem', fontWeight: 'bold',
                cursor: 'pointer', transition: 'all 0.2s',
                marginBottom: '8px'
              }}
              className="logout-btn-hover"
            >
              <LogOut size={14} /> Log Out Terminal
            </button>
          </div>
        )}
      </aside>

      <UserProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        currentUser={currentUser}
      />
    </>
  );
}