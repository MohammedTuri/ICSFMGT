import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function UserFormModal({ isOpen, onClose, onSave, initialUser = null }) {
  const [form, setForm] = useState({ username: '', firstName: '', middleName: '', lastName: '', role: 'USER', password: '' });\n  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    if (initialUser) {
      const fullName = initialUser.fullName || '';
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts[nameParts.length - 1] || '';
      const middleName = nameParts.slice(1, nameParts.length - 1).join(' ') || '';
      
      setForm({ 
        username: initialUser.username || '', 
        firstName,
        middleName,
        lastName,
        role: initialUser.role || 'USER', 
        password: '' 
      });
    } else {
      setForm({ username: '', firstName: '', middleName: '', lastName: '', role: 'USER', password: '' });
    }
    setValidationErrors({});
  }, [isOpen, initialUser]);

  if (!isOpen) return null;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setValidationErrors(prev => ({ ...prev, [name]: '' }));
  }

  function validateForm() {
    const errors = {};
    if (!form.username?.trim()) errors.username = 'Username is required';
    if (!form.firstName?.trim()) errors.firstName = 'First Name is required';
    if (!form.lastName?.trim()) errors.lastName = 'Last Name is required';
    if (!initialUser && !form.password?.trim()) errors.password = 'Password is required';
    if (form.password && form.password.length < 6) errors.password = 'Password must be at least 6 characters';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) {
      alert('Please fix the validation errors');
      return;
    }
    const fullName = [form.firstName, form.middleName, form.lastName]
      .filter(part => part && part.trim())
      .join(' ');
    const payload = { ...form, fullName };
    if (initialUser && initialUser.id) payload.id = initialUser.id;
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
          <label style={{ fontSize: 12, fontWeight: 700, color: validationErrors.username ? '#dc2626' : '#000' }}>Username *</label>
          <input name="username" value={form.username} onChange={handleChange} required style={{ padding: '8px 10px', borderRadius: 8, border: validationErrors.username ? '1px solid #dc2626' : '1px solid #d1d5db' }} />
          {validationErrors.username && <span style={{ fontSize: '10px', color: '#dc2626' }}>{validationErrors.username}</span>}

          <label style={{ fontSize: 12, fontWeight: 700, color: validationErrors.firstName ? '#dc2626' : '#000' }}>First Name *</label>
          <input name="firstName" value={form.firstName} onChange={handleChange} style={{ padding: '8px 10px', borderRadius: 8, border: validationErrors.firstName ? '1px solid #dc2626' : '1px solid #d1d5db' }} />
          {validationErrors.firstName && <span style={{ fontSize: '10px', color: '#dc2626' }}>{validationErrors.firstName}</span>}

          <label style={{ fontSize: 12, fontWeight: 700 }}>Middle Name</label>
          <input name="middleName" value={form.middleName} onChange={handleChange} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db' }} />

          <label style={{ fontSize: 12, fontWeight: 700, color: validationErrors.lastName ? '#dc2626' : '#000' }}>Last Name *</label>
          <input name="lastName" value={form.lastName} onChange={handleChange} style={{ padding: '8px 10px', borderRadius: 8, border: validationErrors.lastName ? '1px solid #dc2626' : '1px solid #d1d5db' }} />
          {validationErrors.lastName && <span style={{ fontSize: '10px', color: '#dc2626' }}>{validationErrors.lastName}</span>}

          <label style={{ fontSize: 12, fontWeight: 700 }}>Role</label>
          <select name="role" value={form.role} onChange={handleChange} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db' }}>
            <option value="ADMIN">ADMIN</option>
            <option value="OFFICER">OFFICER</option>
            <option value="VIEWER">VIEWER</option>
            <option value="USER">USER</option>
          </select>

          <label style={{ fontSize: 12, fontWeight: 700, color: validationErrors.password ? '#dc2626' : '#000' }}>{initialUser ? 'Password (leave blank to keep)' : 'Password *'}</label>
          <input name="password" type="password" value={form.password} onChange={handleChange} style={{ padding: '8px 10px', borderRadius: 8, border: validationErrors.password ? '1px solid #dc2626' : '1px solid #d1d5db' }} />
          {validationErrors.password && <span style={{ fontSize: '10px', color: '#dc2626' }}>{validationErrors.password}</span>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' }}>{initialUser ? 'Save' : 'Create'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
