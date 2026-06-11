import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Edit, Trash2, Shield, Eye, ShieldAlert, Key, UserCheck, CheckCircle } from 'lucide-react';
import { getAllRecords, addRecord, updateRecord, deleteRecord } from '../utils/db';

export default function UserManagement() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  const DIVISIONS = [
    { key: 'visa',           label: 'VISA Files',             color: '#10b981' },
    { key: 'eoid-normal',    label: 'Ethiopian Origin ID — Normal File', color: '#f59e0b' },
    { key: 'eoid-underage',  label: 'Ethiopian Origin ID — Under-Age File', color: '#f97316' },
    { key: 'residence-id',   label: 'Residence ID File',         color: '#3b82f6' },
    { key: 'etd',            label: 'Emergency Travel Document File', color: '#a5b4fc' },
    { key: 'eritrean-id',    label: 'Eritrean ID File',          color: '#8b5cf6' },
    { key: 'alien-passport', label: 'Alien Passport File',       color: '#0ea5e9' },
    { key: 'yellow-card',    label: 'Yellow Card File',          color: '#ca8a04' },
  ];

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'VIEWER',
    fullName: '',
    allowedDivisions: []
  });
  const [formError, setFormError] = useState(null);

  // Load auth session and users
  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('ics_auth_user'));
    if (!session || session.role !== 'ADMIN') {
      // Only Administrators may access this page
      navigate('/dashboard');
      return;
    }
    setCurrentUser(session);
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const allUsers = await getAllRecords('users');
      setUsers(allUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      role: 'VIEWER',
      fullName: '',
      allowedDivisions: []
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const toggleDivision = (key) => {
    setFormData(prev => ({
      ...prev,
      allowedDivisions: prev.allowedDivisions.includes(key)
        ? prev.allowedDivisions.filter(d => d !== key)
        : [...prev.allowedDivisions, key]
    }));
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email || user.username || '',
      password: user.password,
      confirmPassword: '',
      role: user.role,
      fullName: user.fullName,
      allowedDivisions: user.allowedDivisions || []
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Validate division assignment for restricted roles
    const needsDivision = formData.role === 'OFFICER' || formData.role === 'VIEWER';
    if (needsDivision && formData.allowedDivisions.length === 0) {
      setFormError('Please assign at least one division for this role.');
      return;
    }

    const userToSave = {
      email: formData.email.trim().toLowerCase(),
      username: formData.email.trim().toLowerCase(),
      password: formData.password,
      role: formData.role,
      fullName: formData.fullName.trim(),
      // ADMIN & SUPERVISOR get all divisions; others get their assigned ones
      allowedDivisions: needsDivision ? formData.allowedDivisions : ['visa','eoid-normal','eoid-underage','residence-id','etd','eritrean-id','alien-passport','yellow-card']
    };

    if (!userToSave.email || !userToSave.password || !userToSave.fullName) {
      setFormError('All fields are required.');
      return;
    }

    // Confirm password check (only on new user creation)
    if (!editingUser && formData.password !== formData.confirmPassword) {
      setFormError('Passwords do not match. Please re-enter.');
      return;
    }

    // Role safety checks
    if (currentUser.role === 'SUPERVISOR' && userToSave.role === 'ADMIN') {
      setFormError('Supervisors are not permitted to delegate Administrator access.');
      return;
    }

    try {
      if (editingUser) {
        // Validate update
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
        
        // If updating own account, refresh active localStorage session
        if (currentUser.id === editingUser.id) {
          localStorage.setItem('ics_auth_user', JSON.stringify({
            id: payload.id,
            username: payload.username,
            email: payload.email,
            role: payload.role,
            fullName: payload.fullName,
            allowedDivisions: payload.allowedDivisions
          }));
          window.location.reload();
        }
      } else {
        // Check duplication
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
      console.error(err);
      setFormError('Error saving user to IndexedDB.');
    }
  };

  const handleDeleteUser = async (id, role, usernameToDelete) => {
    if (currentUser.id === id) {
      alert('Safety Lock: You cannot delete your own logged-in session account.');
      return;
    }

    if (currentUser.role === 'SUPERVISOR' && role === 'ADMIN') {
      alert('Unauthorized: Supervisors cannot delete Administrators.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${usernameToDelete}'s user account?`)) {
      try {
        await deleteRecord('users', id);
        loadUsers();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const getRoleBadge = (role) => {
    const styles = {
      ADMIN: { background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-danger)', border: '1px solid rgba(239, 68, 68, 0.4)' },
      SUPERVISOR: { background: 'rgba(251, 191, 36, 0.15)', color: 'var(--accent-gold)', border: '1px solid rgba(251, 191, 36, 0.4)' },
      OFFICER: { background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', border: '1px solid rgba(59, 130, 246, 0.4)' },
      VIEWER: { background: 'rgba(148, 163, 184, 0.15)', color: 'var(--text-secondary)', border: '1px solid var(--border-glass)' }
    };
    return (
      <span style={{
        fontSize: '0.75rem',
        fontWeight: 'bold',
        padding: '4px 10px',
        borderRadius: '4px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        ...styles[role]
      }}>
        {role === 'ADMIN' ? <ShieldAlert size={12} /> : 
         role === 'SUPERVISOR' ? <Shield size={12} /> : 
         role === 'OFFICER' ? <UserCheck size={12} /> : <Eye size={12} />}
        {role}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 300, fontSize: '2rem', letterSpacing: '1px' }}>User Directory & Access Control</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
            Manage staff credentials and role-based clearance
          </p>
        </div>
        
        <button className="glass-button" onClick={handleOpenAddModal}>
          <UserPlus size={18} /> Create Account
        </button>
      </div>

      {/* Directory Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <table className="glass-table">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Email</th>
              <th>System Role</th>
              <th>Accessible Division</th>
              <th>Password (Encrypted)</th>
              <th>Created Date</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isAdmin = u.role === 'ADMIN';
              const canModify = currentUser.role === 'ADMIN' || (currentUser.role === 'SUPERVISOR' && !isAdmin);
              const isSelf = currentUser.id === u.id;
              
              // Helper to render division display text
              const getDivisionDisplay = (user) => {
                if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') {
                  return <span style={{ color: 'var(--accent-emerald)', fontSize: '0.85rem', fontWeight: 600 }}>All Divisions</span>;
                }
                const divs = user.allowedDivisions || [];
                if (divs.length === 0) return <span style={{ color: 'var(--accent-danger)', fontSize: '0.85rem' }}>None Assigned</span>;
                
                const labels = {
                  'visa': 'VISA Files',
                  'eoid': 'Ethiopian Origin ID File',
                  'residence-id': 'Residence ID File',
                  'etd': 'Emergency Travel Document File',
                  'eritrean-id': 'Eritrean ID File',
                  'alien-passport': 'Alien Passport File',
                  'yellow-card': 'Yellow Card File'
                };
                const colors = {
                  'visa': 'var(--accent-emerald)',
                  'eoid': 'var(--accent-gold)',
                  'residence-id': 'var(--accent-blue)',
                  'etd': '#a5b4fc',
                  'eritrean-id': '#8b5cf6',
                  'alien-passport': '#0ea5e9',
                  'yellow-card': '#ca8a04'
                };

                return (
                  <span style={{ color: colors[divs[0]] || 'inherit', fontSize: '0.85rem', fontWeight: 600 }}>
                    {labels[divs[0]] || divs[0]}
                  </span>
                );
              };

              return (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.fullName} {isSelf && <span style={{ color: 'var(--accent-emerald)', fontSize: '0.8rem', fontWeight: 'normal' }}>(You)</span>}</td>
                  <td style={{ fontFamily: 'monospace' }}>{u.email || u.username}</td>
                  <td>{getRoleBadge(u.role)}</td>
                  <td>{getDivisionDisplay(u)}</td>
                  <td style={{ fontFamily: 'monospace', opacity: 0.6, fontSize: '0.8rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Key size={12} /> ••••••••••
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'System'}
                  </td>
                  
                  {/* Action Panel */}
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button 
                        className="glass-button"
                        style={{ padding: '6px 10px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', boxShadow: 'none' }}
                        disabled={!canModify}
                        onClick={() => handleOpenEditModal(u)}
                        title={canModify ? 'Edit' : 'Supervisors cannot modify Administrators'}
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        className="glass-button danger"
                        style={{ padding: '6px 10px' }}
                        disabled={!canModify || isSelf}
                        onClick={() => handleDeleteUser(u.id, u.role, u.username)}
                        title={isSelf ? 'Cannot delete yourself' : canModify ? 'Delete' : 'Supervisors cannot delete Administrators'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* User Add/Edit Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 10, 21, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '500px',
            padding: '32px',
            border: '1px solid rgba(255,255,255,0.12)'
          }}>
            <h3 style={{ margin: '0 0 24px 0', fontWeight: 300, fontSize: '1.4rem' }}>
              {editingUser ? 'Edit User Credentials' : 'Create User Account'}
            </h3>

            {formError && (
              <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid var(--accent-danger)', borderRadius: '8px', padding: '12px', color: '#fff', fontSize: '0.8rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={16} color="var(--accent-danger)" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Full Name</label>
                <input 
                  className="glass-input" 
                  value={formData.fullName} 
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })} 
                  placeholder="e.g. Samuel Yohannes"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Email</label>
                <input 
                  type="email"
                  className="glass-input" 
                  value={formData.email} 
                  onChange={e => setFormData({ ...formData, email: e.target.value })} 
                  placeholder="e.g. officer@ics.gov"
                  disabled={!!editingUser}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Access Password</label>
                <input 
                  type="password"
                  className="glass-input" 
                  value={formData.password} 
                  onChange={e => setFormData({ ...formData, password: e.target.value })} 
                  placeholder="Password"
                  required
                />
              </div>

              {/* Confirm Password — only shown when creating a new user */}
              {!editingUser && (
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Confirm Password</label>
                  <input 
                    type="password"
                    className="glass-input"
                    value={formData.confirmPassword}
                    onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Re-enter password"
                    required
                    style={{
                      border: formData.confirmPassword && formData.confirmPassword !== formData.password
                        ? '1px solid var(--accent-danger)'
                        : formData.confirmPassword && formData.confirmPassword === formData.password
                        ? '1px solid var(--accent-emerald)'
                        : undefined
                    }}
                  />
                  {formData.confirmPassword && formData.confirmPassword !== formData.password && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--accent-danger)', marginTop: '4px', display: 'block' }}>
                      ⚠ Passwords do not match
                    </span>
                  )}
                  {formData.confirmPassword && formData.confirmPassword === formData.password && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', marginTop: '4px', display: 'block' }}>
                      ✓ Passwords match
                    </span>
                  )}
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Account Clearance Role</label>
                <select 
                  className="glass-input"
                  value={formData.role}
                  onChange={e => {
                    const newRole = e.target.value;
                    const isRestricted = newRole === 'OFFICER' || newRole === 'VIEWER';
                    setFormData({
                      ...formData,
                      role: newRole,
                      // Clear division array if role changed to restricted, otherwise fill all
                      allowedDivisions: isRestricted ? [] : ['visa', 'eoid-normal', 'eoid-underage', 'residence-id', 'etd', 'eritrean-id', 'alien-passport', 'yellow-card']
                    });
                  }}
                >
                  {/* Administrators can create Admins; Supervisors cannot */}
                  {currentUser && currentUser.role === 'ADMIN' && (
                    <option value="ADMIN">ADMINISTRATOR (Full Administrative Access)</option>
                  )}
                  <option value="SUPERVISOR">SUPERVISOR (Data Full Control & User Seeding)</option>
                  <option value="OFFICER">OFFICER (Record management only, no deletes)</option>
                  <option value="VIEWER">VIEWER (Read-only data access)</option>
                </select>
              </div>

              {(formData.role === 'OFFICER' || formData.role === 'VIEWER') && (
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Assigned Division</label>
                  <select
                    className="glass-input"
                    value={formData.allowedDivisions[0] || ''}
                    onChange={e => setFormData({ ...formData, allowedDivisions: e.target.value ? [e.target.value] : [] })}
                    required
                  >
                    <option value="">-- Select Division --</option>
                    <option value="visa">VISA Files</option>
                    <option value="eoid-normal">Ethiopian Origin ID — Normal File</option>
                    <option value="eoid-underage">Ethiopian Origin ID — Under-Age File</option>
                    <option value="residence-id">Residence ID File</option>
                    <option value="etd">Emergency Travel Document File</option>
                    <option value="eritrean-id">Eritrean ID File</option>
                    <option value="alien-passport">Alien Passport File</option>
                    <option value="yellow-card">Yellow Card File</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '12px' }}>
                <button 
                  type="button" 
                  className="glass-button"
                  style={{ background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', boxShadow: 'none' }}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="glass-button">
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
