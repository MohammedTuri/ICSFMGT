import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserPlus, Edit, Trash2, Shield, Eye, ShieldAlert, Key, UserCheck, 
  CheckCircle, XCircle, Power, ClipboardList, AlertTriangle, Building2, 
  MapPin, Lock, X, Search, LayoutGrid, Table, Users as UsersIcon, ChevronRight, ChevronLeft
} from 'lucide-react';
import { getAllRecords, addRecord, updateRecord, deleteRecord, getSystemModules } from '../utils/db';
import { useBranch } from '../context/BranchContext';

export default function UserManagement() {
  const navigate = useNavigate();
  const { branches, userBranch, isAdmin: isSuperAdmin } = useBranch();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const STATIC_DIVISIONS = [
    { key: 'visa',                      label: 'VISA Files',                        color: '#10b981', category: 'File Division' },
    { key: 'eoid-normal',               label: 'Ethiopian Origin ID — Normal',       color: '#f59e0b', category: 'File Division' },
    { key: 'eoid-underage',             label: 'Ethiopian Origin ID — Under-Age',    color: '#f97316', category: 'File Division' },
    { key: 'residence-id',              label: 'Residence ID File',                  color: '#3b82f6', category: 'File Division' },
    { key: 'residence-id-cancellation', label: 'Residence ID Cancellation',          color: '#dc2626', category: 'File Division' },
    { key: 'etd',                       label: 'Emergency Travel Document',          color: '#818cf8', category: 'File Division' },
    { key: 'eritrean-id',               label: 'Eritrean ID File',                   color: '#8b5cf6', category: 'File Division' },
    { key: 'alien-passport',            label: 'Alien Passport File',                color: '#0ea5e9', category: 'File Division' },
    { key: 'reports',                   label: 'Reports & Analytics',                color: '#2563eb', category: 'Reports & Analytics' },
    { key: 'audit-log',                 label: 'Audit Trail Log',                    color: '#059669', category: 'System Audits' },
    { key: 'recycle-bin',               label: 'Recycle Bin Recovery',               color: '#dc2626', category: 'System Operations' },
  ];

  const [DIVISIONS, setDivisions] = useState(STATIC_DIVISIONS);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'VIEWER',
    fullName: '',
    branch: 'Head Office (Addis Ababa)',
    allowedDivisions: [],
    permissions: { add: false, edit: false, delete: false },
    modulePermissions: {},
    isActive: true
  });
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('ics_auth_user'));
    const role = (session?.role || '').toUpperCase();
    if (!session || (role !== 'ADMIN' && role !== 'SUPERVISOR')) {
      navigate('/dashboard');
      return;
    }
    session.role = role;
    setCurrentUser(session);
    loadUsers();

    getSystemModules().then(mods => {
      if (mods && mods.length > 0) {
        const customDivs = mods.filter(m => m.isActive).map(m => ({
          key: m.key,
          label: m.title,
          color: m.color || '#10b981',
          isCustom: true,
          category: 'Custom File Module'
        }));
        setDivisions([...STATIC_DIVISIONS, ...customDivs]);
      }
    }).catch(() => {});
  }, []);

  const loadUsers = async () => {
    try {
      const allUsers = await getAllRecords('users');
      setUsers(allUsers || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const getDefaultModulePerms = (role = 'VIEWER') => {
    const perms = {};
    const defaultLevel = role === 'ADMIN' ? 'FULL_ACCESS' : (role === 'OFFICER' ? 'READ_WRITE' : (role === 'AUDITOR' ? 'VIEW_ONLY' : 'VIEW_ONLY'));
    STATIC_DIVISIONS.forEach(d => {
      if (d.key === 'audit-log') perms[d.key] = (role === 'ADMIN' || role === 'AUDITOR') ? 'FULL_ACCESS' : 'NO_ACCESS';
      else if (d.key === 'recycle-bin') perms[d.key] = role === 'ADMIN' ? 'FULL_ACCESS' : 'NO_ACCESS';
      else if (d.key === 'reports') perms[d.key] = 'VIEW_ONLY';
      else perms[d.key] = defaultLevel;
    });
    return perms;
  };

  const handleOpenAddModal = () => {
    setEditingUser(null);
    const initialBranch = currentUser?.role === 'SUPERVISOR' ? (currentUser.branch || 'Head Office (Addis Ababa)') : (branches[0]?.name || 'Head Office (Addis Ababa)');
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      role: 'VIEWER',
      fullName: '',
      branch: initialBranch,
      allowedDivisions: [],
      permissions: { add: false, edit: false, delete: false },
      modulePermissions: getDefaultModulePerms('VIEWER'),
      isActive: true
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    const savedPerms = user.modulePermissions && Object.keys(user.modulePermissions).length > 0
      ? { ...user.modulePermissions }
      : {};
    
    DIVISIONS.forEach(d => {
      if (!savedPerms[d.key]) {
        const hasDiv = (user.allowedDivisions || []).includes(d.key);
        if (user.role === 'ADMIN') savedPerms[d.key] = 'FULL_ACCESS';
        else if (user.role === 'SUPERVISOR') savedPerms[d.key] = 'FULL_ACCESS';
        else if (user.role === 'AUDITOR') savedPerms[d.key] = d.key === 'recycle-bin' ? 'NO_ACCESS' : 'VIEW_ONLY';
        else if (hasDiv) savedPerms[d.key] = user.role === 'OFFICER' ? 'READ_WRITE' : 'VIEW_ONLY';
        else savedPerms[d.key] = 'NO_ACCESS';
      }
    });

    setFormData({
      email: user.email || user.username || '',
      password: user.password,
      confirmPassword: '',
      role: user.role,
      fullName: user.fullName,
      branch: user.branch || 'Head Office (Addis Ababa)',
      allowedDivisions: user.allowedDivisions || [],
      permissions: user.permissions || { add: false, edit: false, delete: false },
      modulePermissions: savedPerms,
      isActive: user.isActive !== false
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleToggleUserStatus = (user) => {
    if (currentUser.id === user.id) {
      alert('Safety Lock: You cannot deactivate your own active session account.');
      return;
    }
    if (currentUser.role === 'SUPERVISOR' && user.role === 'ADMIN') {
      alert('Unauthorized: Supervisors cannot modify Administrator accounts.');
      return;
    }
    const newStatus = user.isActive === false ? true : false;
    const actionName = newStatus ? 'activate' : 'deactivate';
    
    setConfirmDialog({
      title: `${newStatus ? 'Activate' : 'Deactivate'} User Account`,
      message: `Are you sure you want to ${actionName} access for ${user.fullName || user.username}?`,
      type: newStatus ? 'activate' : 'deactivate',
      confirmText: newStatus ? 'Yes, Activate' : 'Yes, Deactivate',
      onConfirm: async () => {
        try {
          await updateRecord('users', { ...user, isActive: newStatus });
          loadUsers();
          setConfirmDialog(null);
        } catch (err) {
          console.error('Error toggling user status:', err);
          alert('Failed to update user status.');
        }
      }
    });
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setFormError(null);

    const needsDivision = formData.role === 'OFFICER' || formData.role === 'VIEWER';
    if (needsDivision && formData.allowedDivisions.length === 0) {
      setFormError('Please assign at least one division to this user before saving.');
      return;
    }

    const assignedBranch = formData.role === 'ADMIN' ? 'Head Office (Addis Ababa)' : (formData.branch || 'Head Office (Addis Ababa)');

    const activeDivisions = Object.entries(formData.modulePermissions || {})
      .filter(([k, lvl]) => lvl !== 'NO_ACCESS' && !['reports', 'audit-log', 'recycle-bin'].includes(k))
      .map(([k]) => k);

    const userToSave = {
      email: formData.email.trim().toLowerCase(),
      username: formData.email.trim().toLowerCase(),
      password: formData.password,
      role: formData.role,
      fullName: formData.fullName.trim(),
      branch: assignedBranch,
      allowedBranches: formData.role === 'ADMIN' ? ['ALL'] : [assignedBranch],
      isActive: formData.isActive !== false,
      allowedDivisions: formData.role === 'ADMIN' ? ['visa','eoid-normal','eoid-underage','residence-id','residence-id-cancellation','etd','eritrean-id','alien-passport'] : activeDivisions,
      modulePermissions: formData.modulePermissions || {},
      permissions: {
        add: Object.values(formData.modulePermissions || {}).some(lvl => lvl === 'READ_WRITE' || lvl === 'FULL_ACCESS') || formData.role === 'ADMIN',
        edit: Object.values(formData.modulePermissions || {}).some(lvl => lvl === 'READ_WRITE' || lvl === 'FULL_ACCESS') || formData.role === 'ADMIN',
        delete: Object.values(formData.modulePermissions || {}).some(lvl => lvl === 'FULL_ACCESS') || formData.role === 'ADMIN',
      }
    };

    if (!userToSave.email || !userToSave.password || !userToSave.fullName) {
      setFormError('All fields are required.');
      return;
    }

    if (!editingUser && formData.password !== formData.confirmPassword) {
      setFormError('Passwords do not match. Please re-enter.');
      return;
    }

    if (currentUser.role === 'SUPERVISOR' && userToSave.role === 'ADMIN') {
      setFormError('Supervisors are not permitted to delegate Administrator access.');
      return;
    }

    try {
      if (editingUser) {
        if (currentUser.role === 'SUPERVISOR' && editingUser.role === 'ADMIN') {
          alert('Unauthorized: You cannot modify an Administrator.');
          return;
        }

        const payload = {
          ...userToSave,
          id: editingUser.id,
          createdAt: editingUser.createdAt
        };
        await updateRecord('users', payload);
        
        if (currentUser.id === editingUser.id) {
          localStorage.setItem('ics_auth_user', JSON.stringify({
            id: payload.id,
            username: payload.username,
            email: payload.email,
            role: payload.role,
            fullName: payload.fullName,
            allowedDivisions: payload.allowedDivisions,
            permissions: payload.permissions,
            modulePermissions: payload.modulePermissions
          }));
          window.location.reload();
        }
      } else {
        const existing = users.find(u => (u.email || u.username || '').toLowerCase() === userToSave.email.toLowerCase());
        if (existing) {
          setFormError('Email already exists. Use a different email.');
          return;
        }
        await addRecord('users', userToSave);
      }

      setIsModalOpen(false);
      loadUsers();
    } catch (err) {
      console.error('handleSaveUser error:', err);
      const msg = err?.message || 'Unknown error';
      setFormError(`Failed to save user: ${msg}`);
    }
  };

  const handleDeleteUser = (id, role, usernameToDelete) => {
    if (currentUser.id === id) {
      alert('Safety Lock: You cannot delete your own logged-in session account.');
      return;
    }

    if (currentUser.role === 'SUPERVISOR' && role === 'ADMIN') {
      alert('Unauthorized: Supervisors cannot delete Administrators.');
      return;
    }

    setConfirmDialog({
      title: 'Delete User Account',
      message: `Are you sure you want to delete ${usernameToDelete}'s user account? This cannot be undone.`,
      type: 'delete',
      confirmText: 'Yes, Delete',
      onConfirm: async () => {
        try {
          await deleteRecord('users', id);
          loadUsers();
          setConfirmDialog(null);
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const getRoleBadge = (role) => {
    const styles = {
      ADMIN:      { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5', icon: ShieldAlert },
      SUPERVISOR: { bg: '#fef3c7', color: '#b45309', border: '#fcd34d', icon: Shield },
      AUDITOR:    { bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc', icon: ClipboardList },
      OFFICER:    { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd', icon: UserCheck },
      VIEWER:     { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', icon: Eye }
    };
    const s = styles[role] || styles.VIEWER;
    const IconComponent = s.icon;
    return (
      <span style={{
        fontSize: '0.74rem',
        fontWeight: 700,
        padding: '3px 9px',
        borderRadius: '6px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`
      }}>
        <IconComponent size={12} />
        {role}
      </span>
    );
  };

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || 
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.branch && u.branch.toLowerCase().includes(q));
      
      const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchQuery && matchRole;
    });
  }, [users, searchQuery, roleFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredUsers.length);
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Summary counts
  const totalUsers = users.length;
  const activeCount = users.filter(u => u.isActive !== false).length;
  const adminCount = users.filter(u => u.role === 'ADMIN').length;
  const officerCount = users.filter(u => u.role === 'OFFICER').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '100%', overflow: 'hidden' }}>
      
      {/* Top Banner & Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0b1e3d 0%, #0f2b5c 100%)',
        borderRadius: '20px',
        padding: '26px 32px',
        color: '#ffffff',
        boxShadow: '0 12px 30px rgba(11, 30, 61, 0.22)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: 'rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#34d399', border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <UsersIcon size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#93c5fd' }}>
              System Access Control &amp; Identity Management
            </div>
            <h1 style={{ margin: '2px 0 0 0', fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.5px' }}>
              User Module &amp; Staff Accounts
            </h1>
            <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '0.84rem' }}>
              Manage credentials, assigned branch stations, and fine-grained division permissions
            </p>
          </div>
        </div>

        <button 
          onClick={handleOpenAddModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 22px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#ffffff',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
            transition: 'transform 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <UserPlus size={18} /> Create Account
        </button>
      </div>

      {/* Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        {[
          { label: 'TOTAL STAFF ACCOUNTS', value: totalUsers, color: '#0f2b5c', sub: 'Registered users' },
          { label: 'ACTIVE PERSONNEL', value: activeCount, color: '#059669', sub: `${totalUsers - activeCount} suspended` },
          { label: 'SYSTEM ADMINISTRATORS', value: adminCount, color: '#dc2626', sub: 'Full system clearance' },
          { label: 'FIELD OFFICERS', value: officerCount, color: '#2563eb', sub: 'Read & write clearance' }
        ].map((m, idx) => (
          <div key={idx} style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '16px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(15, 43, 92, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {m.label}
            </span>
            <span style={{ fontSize: '1.9rem', fontWeight: 900, color: m.color, lineHeight: 1.1 }}>
              {m.value}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {m.sub}
            </span>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        padding: '14px 20px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        {/* Search */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '7px 14px',
          flex: '1 1 260px',
          maxWidth: '380px'
        }}>
          <Search size={16} color="#64748b" />
          <input 
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search by name, email, or branch..."
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '0.84rem',
              color: '#0f172a',
              width: '100%'
            }}
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setCurrentPage(1); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <X size={14} color="#94a3b8" />
            </button>
          )}
        </div>

        {/* Role Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {['ALL', 'ADMIN', 'SUPERVISOR', 'OFFICER', 'AUDITOR', 'VIEWER'].map(r => (
            <button
              key={r}
              onClick={() => { setRoleFilter(r); setCurrentPage(1); }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: roleFilter === r ? '#0f2b5c' : '#e2e8f0',
                background: roleFilter === r ? '#0f2b5c' : '#f8fafc',
                color: roleFilter === r ? '#ffffff' : '#475569',
                transition: 'all 0.15s'
              }}
            >
              {r === 'ALL' ? 'All Roles' : r}
            </button>
          ))}
        </div>

        {/* View Switcher: Table vs Cards */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: '#f1f5f9',
          borderRadius: '8px',
          padding: '3px',
          border: '1px solid #e2e8f0'
        }}>
          <button
            onClick={() => setViewMode('table')}
            title="Compact Table View"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: viewMode === 'table' ? '#ffffff' : 'transparent',
              color: viewMode === 'table' ? '#0f2b5c' : '#64748b',
              boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <Table size={14} /> Table
          </button>
          <button
            onClick={() => setViewMode('cards')}
            title="Card Grid View"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: viewMode === 'cards' ? '#ffffff' : 'transparent',
              color: viewMode === 'cards' ? '#0f2b5c' : '#64748b',
              boxShadow: viewMode === 'cards' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <LayoutGrid size={14} /> Cards
          </button>
        </div>
      </div>

      {/* Main Content: TABLE VIEW (Clean, No Horizontal Scrollbar) */}
      {viewMode === 'table' && (
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 15px rgba(15, 43, 92, 0.04)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'auto' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '14px 18px', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Staff Member</th>
                <th style={{ padding: '14px 14px', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</th>
                <th style={{ padding: '14px 14px', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Branch Station</th>
                <th style={{ padding: '14px 14px', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Access &amp; Clearance</th>
                <th style={{ padding: '14px 14px', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                <th style={{ padding: '14px 18px', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center', color: '#94a3b8' }}>
                    <UsersIcon size={36} style={{ opacity: 0.3, margin: '0 auto 8px auto', display: 'block' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>No users match the selected filters</span>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u, idx) => {
                  const isAdmin = u.role === 'ADMIN';
                  const canModify = currentUser?.role === 'ADMIN' || (currentUser?.role === 'SUPERVISOR' && !isAdmin);
                  const isSelf = currentUser?.id === u.id;
                  const isUserActive = u.isActive !== false;
                  
                  // Initial avatar
                  const initial = (u.fullName || u.username || 'U')[0].toUpperCase();
                  const avatarColors = ['#059669', '#2563eb', '#7c3aed', '#d97706', '#0284c7'];
                  const avatarColor = avatarColors[idx % avatarColors.length];

                  return (
                    <tr 
                      key={u.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s',
                        opacity: isUserActive ? 1 : 0.6
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Col 1: Staff Member */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '38px', height: '38px', borderRadius: '50%',
                            background: u.role === 'ADMIN' ? '#fee2e2' : `${avatarColor}18`,
                            color: u.role === 'ADMIN' ? '#dc2626' : avatarColor,
                            fontWeight: 800, fontSize: '0.95rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, border: `1px solid ${u.role === 'ADMIN' ? '#fca5a5' : avatarColor + '30'}`
                          }}>
                            {initial}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f2b5c' }}>
                                {u.fullName || u.username}
                              </span>
                              {isSelf && (
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: '#d1fae5', color: '#059669' }}>
                                  You
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '1px' }}>
                              {u.email || u.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Col 2: Role */}
                      <td style={{ padding: '14px 14px' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          {getRoleBadge(u.role)}
                          {u.locked && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '1px 6px', borderRadius: '4px' }}>
                              Locked
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Col 3: Branch Station */}
                      <td style={{ padding: '14px 14px' }}>
                        {u.role === 'ADMIN' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: 700, color: '#059669' }}>
                            <Building2 size={13} /> All Branches
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>
                            <MapPin size={13} color="#64748b" /> {u.branch || 'Head Office (Addis Ababa)'}
                          </span>
                        )}
                      </td>

                      {/* Col 4: Clearance & Access */}
                      <td style={{ padding: '14px 14px' }}>
                        {u.role === 'ADMIN' || u.role === 'SUPERVISOR' ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', background: '#d1fae5', padding: '3px 8px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                            👑 All Modules (Full Access)
                          </span>
                        ) : u.role === 'AUDITOR' ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', background: '#e0f2fe', padding: '3px 8px', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                            👁️ All Modules (Audit View)
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '260px' }}>
                            {(() => {
                              const modPerms = u.modulePermissions || {};
                              const active = Object.entries(modPerms).filter(([, lvl]) => lvl && lvl !== 'NO_ACCESS');
                              if (active.length === 0) {
                                const allowed = u.allowedDivisions || [];
                                if (allowed.length === 0) return <span style={{ color: '#dc2626', fontSize: '0.75rem', fontWeight: 600 }}>No Access</span>;
                                return allowed.slice(0, 3).map(d => (
                                  <span key={d} style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>
                                    {d.toUpperCase()}
                                  </span>
                                ));
                              }
                              return active.slice(0, 3).map(([k, lvl]) => (
                                <span key={k} style={{
                                  fontSize: '0.68rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                                  background: lvl === 'FULL_ACCESS' ? '#dcfce7' : lvl === 'READ_WRITE' ? '#e0f2fe' : '#f1f5f9',
                                  color: lvl === 'FULL_ACCESS' ? '#15803d' : lvl === 'READ_WRITE' ? '#0369a1' : '#475569'
                                }}>
                                  {k.replace(/-/g, ' ').toUpperCase()} ({lvl === 'FULL_ACCESS' ? 'Full' : lvl === 'READ_WRITE' ? 'R/W' : 'View'})
                                </span>
                              ));
                            })()}
                            {Object.keys(u.modulePermissions || {}).length > 3 && (
                              <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>
                                +{Object.keys(u.modulePermissions).length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Col 5: Status */}
                      <td style={{ padding: '14px 14px' }}>
                        <button
                          type="button"
                          disabled={!canModify || isSelf}
                          onClick={() => handleToggleUserStatus(u)}
                          title={isSelf ? 'Cannot modify yourself' : !canModify ? 'Unauthorized' : isUserActive ? 'Click to Deactivate' : 'Click to Activate'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            border: '1px solid',
                            cursor: canModify && !isSelf ? 'pointer' : 'default',
                            background: isUserActive ? '#dcfce7' : '#fee2e2',
                            color: isUserActive ? '#15803d' : '#b91c1c',
                            borderColor: isUserActive ? '#86efac' : '#fca5a5',
                            transition: 'all 0.15s'
                          }}
                        >
                          {isUserActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {isUserActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Col 6: Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          {u.locked && (
                            <button
                              onClick={async () => {
                                if (window.confirm(`Unlock account for ${u.fullName}?`)) {
                                  await updateRecord('users', { ...u, locked: false, loginAttempts: 0 });
                                  loadUsers();
                                }
                              }}
                              title="Unlock User Account"
                              style={{
                                padding: '6px 8px', borderRadius: '6px', border: '1px solid #86efac',
                                background: '#dcfce7', color: '#15803d', cursor: 'pointer'
                              }}
                            >
                              <UserCheck size={14} />
                            </button>
                          )}
                          <button
                            disabled={!canModify}
                            onClick={() => handleOpenEditModal(u)}
                            title={canModify ? 'Edit Credentials & Permissions' : 'Supervisors cannot modify Administrators'}
                            style={{
                              padding: '6px 10px', borderRadius: '6px', border: '1px solid #bfdbfe',
                              background: '#eff6ff', color: '#1d4ed8', cursor: canModify ? 'pointer' : 'not-allowed',
                              display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600
                            }}
                          >
                            <Edit size={13} /> Edit
                          </button>
                          <button
                            disabled={!canModify || isSelf}
                            onClick={() => handleDeleteUser(u.id, u.role, u.username)}
                            title={isSelf ? 'Cannot delete yourself' : canModify ? 'Delete User' : 'Unauthorized'}
                            style={{
                              padding: '6px 8px', borderRadius: '6px', border: '1px solid #fecaca',
                              background: '#fee2e2', color: '#dc2626', cursor: canModify && !isSelf ? 'pointer' : 'not-allowed',
                              display: 'inline-flex', alignItems: 'center'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Main Content: CARD GRID VIEW */}
      {viewMode === 'cards' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {paginatedUsers.map((u, idx) => {
            const isAdmin = u.role === 'ADMIN';
            const canModify = currentUser?.role === 'ADMIN' || (currentUser?.role === 'SUPERVISOR' && !isAdmin);
            const isSelf = currentUser?.id === u.id;
            const isUserActive = u.isActive !== false;
            const initial = (u.fullName || u.username || 'U')[0].toUpperCase();

            return (
              <div 
                key={u.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '20px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 15px rgba(15, 43, 92, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  opacity: isUserActive ? 1 : 0.65
                }}
              >
                <div>
                  {/* Top card bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '42px', height: '42px', borderRadius: '50%',
                        background: '#eff6ff', color: '#1d4ed8', fontWeight: 800, fontSize: '1rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid #bfdbfe'
                      }}>
                        {initial}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f2b5c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {u.fullName || u.username}
                          {isSelf && <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', background: '#d1fae5', color: '#059669' }}>You</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.email || u.username}</div>
                      </div>
                    </div>
                    {getRoleBadge(u.role)}
                  </div>

                  {/* Branch info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#475569', marginBottom: '10px' }}>
                    <MapPin size={13} color="#64748b" />
                    <span>{u.role === 'ADMIN' ? 'All Branches' : (u.branch || 'Head Office (Addis Ababa)')}</span>
                  </div>

                  {/* Clearance summary */}
                  <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '8px 10px', fontSize: '0.75rem' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Clearance</div>
                    <span style={{ fontWeight: 600, color: '#0f2b5c' }}>
                      {u.role === 'ADMIN' || u.role === 'SUPERVISOR' ? '👑 Full Access to All Modules' :
                       u.role === 'AUDITOR' ? '👁️ Audit Read for All Modules' :
                       `${(u.allowedDivisions || []).length} assigned file division(s)`}
                    </span>
                  </div>
                </div>

                {/* Footer card actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    disabled={!canModify || isSelf}
                    onClick={() => handleToggleUserStatus(u)}
                    style={{
                      padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
                      border: '1px solid', cursor: canModify && !isSelf ? 'pointer' : 'default',
                      background: isUserActive ? '#dcfce7' : '#fee2e2',
                      color: isUserActive ? '#15803d' : '#b91c1c',
                      borderColor: isUserActive ? '#86efac' : '#fca5a5'
                    }}
                  >
                    {isUserActive ? 'Active' : 'Inactive'}
                  </button>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      disabled={!canModify}
                      onClick={() => handleOpenEditModal(u)}
                      style={{
                        padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1',
                        background: '#ffffff', color: '#0f2b5c', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      disabled={!canModify || isSelf}
                      onClick={() => handleDeleteUser(u.id, u.role, u.username)}
                      style={{
                        padding: '5px 8px', borderRadius: '6px', border: '1px solid #fecaca',
                        background: '#fee2e2', color: '#dc2626', cursor: canModify && !isSelf ? 'pointer' : 'not-allowed'
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Toolbar */}
      {filteredUsers.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '14px 20px',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(15, 43, 92, 0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.84rem', color: '#64748b', flexWrap: 'wrap' }}>
            <span>
              Showing <strong style={{ color: '#0f2b5c' }}>{filteredUsers.length === 0 ? 0 : startIndex + 1}</strong>–<strong style={{ color: '#0f2b5c' }}>{endIndex}</strong> of <strong style={{ color: '#0f2b5c' }}>{filteredUsers.length}</strong> personnel
            </span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem' }}>Rows per page:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#0f2b5c',
                  cursor: 'pointer'
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              disabled={validCurrentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              title="Previous Page"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: validCurrentPage <= 1 ? '#f1f5f9' : '#ffffff',
                color: validCurrentPage <= 1 ? '#94a3b8' : '#0f2b5c',
                cursor: validCurrentPage <= 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.78rem',
                fontWeight: 600,
                transition: 'all 0.15s'
              }}
            >
              <ChevronLeft size={14} /> Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - validCurrentPage) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) {
                  acc.push('...');
                }
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) => {
                if (item === '...') {
                  return <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: '#94a3b8', fontSize: '0.8rem' }}>…</span>;
                }
                const isActive = item === validCurrentPage;
                return (
                  <button
                    key={item}
                    onClick={() => setCurrentPage(item)}
                    style={{
                      minWidth: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: isActive ? '#0f2b5c' : '#cbd5e1',
                      background: isActive ? '#0f2b5c' : '#ffffff',
                      color: isActive ? '#ffffff' : '#0f2b5c',
                      fontWeight: isActive ? 800 : 500,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {item}
                  </button>
                );
              })}

            <button
              disabled={validCurrentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              title="Next Page"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: validCurrentPage >= totalPages ? '#f1f5f9' : '#ffffff',
                color: validCurrentPage >= totalPages ? '#94a3b8' : '#0f2b5c',
                cursor: validCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
                fontSize: '0.78rem',
                fontWeight: 600,
                transition: 'all 0.15s'
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* User Add/Edit Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '680px',
            background: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 25px 60px rgba(15, 43, 92, 0.3)',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #e2e8f0'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 26px',
              borderBottom: '1px solid #e2e8f0',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
              color: '#ffffff'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                  {editingUser ? 'Edit User Credentials & Access' : 'Create Staff User Account'}
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>
                  {editingUser ? `Updating privileges for ${editingUser.fullName || editingUser.username}` : 'Configure login credentials, role clearance, and division permissions'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                  width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {formError && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px', color: '#b91c1c', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Full Name *</label>
                    <input 
                      value={formData.fullName} 
                      onChange={e => setFormData({ ...formData, fullName: e.target.value })} 
                      placeholder="e.g. Samuel Yohannes"
                      required
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Email *</label>
                    <input 
                      type="email"
                      value={formData.email} 
                      onChange={e => setFormData({ ...formData, email: e.target.value })} 
                      placeholder="e.g. officer@ics.gov"
                      required
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: editingUser ? '1fr' : '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Password *</label>
                    <input 
                      type="password"
                      value={formData.password} 
                      onChange={e => setFormData({ ...formData, password: e.target.value })} 
                      placeholder="Access Password"
                      required
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                    />
                  </div>
                  {!editingUser && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Confirm Password *</label>
                      <input 
                        type="password"
                        value={formData.confirmPassword} 
                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} 
                        placeholder="Re-enter password"
                        required
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>System Role</label>
                    <select
                      value={formData.role}
                      onChange={e => {
                        const newRole = e.target.value;
                        setFormData({
                          ...formData,
                          role: newRole,
                          modulePermissions: getDefaultModulePerms(newRole)
                        });
                      }}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', background: '#fff' }}
                    >
                      {currentUser?.role === 'ADMIN' && <option value="ADMIN">System Administrator (Full)</option>}
                      <option value="SUPERVISOR">Supervisor</option>
                      <option value="OFFICER">Field Officer (Read / Write)</option>
                      <option value="AUDITOR">Auditor (View Logs &amp; Reports)</option>
                      <option value="VIEWER">Viewer (Read Only)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Branch Station</label>
                    <select
                      value={formData.branch}
                      onChange={e => setFormData({ ...formData, branch: e.target.value })}
                      disabled={formData.role === 'ADMIN'}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', background: '#fff' }}
                    >
                      {branches.map(b => (
                        <option key={b.id || b.name} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Division Permissions Grid */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f2b5c', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Module Clearance Tiers
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                    {DIVISIONS.map(d => {
                      const perm = formData.modulePermissions[d.key] || 'NO_ACCESS';
                      return (
                        <div key={d.key} style={{
                          border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px',
                          background: perm !== 'NO_ACCESS' ? '#f0fdf4' : '#ffffff'
                        }}>
                          <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                            {d.label}
                          </div>
                          <select
                            value={perm}
                            disabled={formData.role === 'ADMIN'}
                            onChange={e => setFormData({
                              ...formData,
                              modulePermissions: { ...formData.modulePermissions, [d.key]: e.target.value }
                            })}
                            style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.74rem' }}
                          >
                            <option value="NO_ACCESS">No Access</option>
                            <option value="VIEW_ONLY">View Only</option>
                            <option value="READ_WRITE">Read &amp; Write</option>
                            <option value="FULL_ACCESS">Full Access</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Submit buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '9px 24px', borderRadius: '8px', border: 'none',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff', fontWeight: 700, cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    {editingUser ? 'Update Account' : 'Save Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)',
          zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', maxWidth: '440px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{confirmDialog.title}</h4>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.86rem', color: '#64748b' }}>{confirmDialog.message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setConfirmDialog(null)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                style={{
                  padding: '8px 18px', borderRadius: '8px', border: 'none',
                  background: confirmDialog.type === 'delete' || confirmDialog.type === 'deactivate' ? '#dc2626' : '#10b981',
                  color: '#fff', fontWeight: 700, cursor: 'pointer'
                }}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
