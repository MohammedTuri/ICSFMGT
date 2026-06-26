import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function UserFormModal({ isOpen, onClose, onSave, initialUser = null }) {
  const [form, setForm] = useState({ username: '', fullName: '', role: 'USER', password: '' });

  useEffect(() => {
    if (!isOpen) return;
    if (initialUser) {
      setForm({ username: initialUser.username || '', fullName: initialUser.fullName || '', role: initialUser.role || 'USER', password: '' });
    } else {
      setForm({ username: '', fullName: '', role: 'USER', password: '' });
    }
  }, [isOpen, initialUser]);

  if (!isOpen) return null;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form };
    if (initialUser && initialUser.id) payload.id = initialUser.id;
    // If password empty when editing, don't include it
    if (initialUser && !form.password) delete payload.password;
    onSave(payload);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} onClick={onClose} />
      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 12, padding: 20, minWidth: 360, maxWidth: '90%', zIndex: 12001, boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>{initialUser ? 'Edit User' : 'Add User'}</h3>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 700 }}>Username</label>
          <input name="username" value={form.username} onChange={handleChange} required style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db' }} />

          <label style={{ fontSize: 12, fontWeight: 700 }}>Full Name</label>
          <input name="fullName" value={form.fullName} onChange={handleChange} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db' }} />

          <label style={{ fontSize: 12, fontWeight: 700 }}>Role</label>
          <select name="role" value={form.role} onChange={handleChange} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db' }}>
            <option value="ADMIN">ADMIN</option>
            <option value="OFFICER">OFFICER</option>
            <option value="VIEWER">VIEWER</option>
            <option value="USER">USER</option>
          </select>

          <label style={{ fontSize: 12, fontWeight: 700 }}>{initialUser ? 'Password (leave blank to keep)' : 'Password'}</label>
          <input name="password" type="password" value={form.password} onChange={handleChange} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db' }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' }}>{initialUser ? 'Save' : 'Create'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
