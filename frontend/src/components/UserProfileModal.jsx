import { useState } from 'react';
import { X, Lock, Key, Shield, CheckCircle, AlertCircle, Eye, EyeOff, Building2, User } from 'lucide-react';
import { changeUserPassword } from '../utils/db';

export default function UserProfileModal({ isOpen, onClose, currentUser }) {
  const [activeTab, setActiveTab] = useState('password'); // 'password' | 'overview'
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmitPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!currentPassword) {
      setError('Please enter your current password.');
      return;
    }

    if (newPassword.length < 4) {
      setError('New password must be at least 4 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from current password.');
      return;
    }

    setLoading(true);
    try {
      await changeUserPassword(currentUser?.id || currentUser?.username, currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setSuccess(false);
      }, 4000);
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  const initial = (currentUser?.fullName || currentUser?.username || 'U')[0].toUpperCase();

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '520px',
        boxShadow: '0 25px 60px rgba(15, 43, 92, 0.3)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0b1e3d 0%, #0f2b5c 100%)',
          padding: '22px 26px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              color: '#34d399', fontWeight: 900, fontSize: '1.2rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid rgba(255,255,255,0.2)'
            }}>
              {initial}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                {currentUser?.fullName || currentUser?.username || 'Staff Profile'}
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={12} color="#34d399" /> {currentUser?.role || 'User'} &bull; {currentUser?.branch || 'Head Office'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
              width: '32px', height: '32px', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <button
            onClick={() => setActiveTab('password')}
            style={{
              flex: 1, padding: '12px', border: 'none', background: 'transparent',
              fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer',
              color: activeTab === 'password' ? '#0f2b5c' : '#64748b',
              borderBottom: activeTab === 'password' ? '2px solid #0f2b5c' : '2px solid transparent'
            }}
          >
            <Key size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
            Change Password
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              flex: 1, padding: '12px', border: 'none', background: 'transparent',
              fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer',
              color: activeTab === 'overview' ? '#0f2b5c' : '#64748b',
              borderBottom: activeTab === 'overview' ? '2px solid #0f2b5c' : '2px solid transparent'
            }}
          >
            <User size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
            Account Overview
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {activeTab === 'password' && (
            <form onSubmit={handleSubmitPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.82rem', color: '#64748b' }}>
                Keep your account secure by updating your access password periodically.
              </p>

              {error && (
                <div style={{
                  background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px',
                  padding: '10px 14px', color: '#b91c1c', fontSize: '0.82rem',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  <AlertCircle size={16} flexShrink={0} />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div style={{
                  background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px',
                  padding: '10px 14px', color: '#15803d', fontSize: '0.84rem',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  <CheckCircle size={16} flexShrink={0} />
                  <span>Your password has been changed successfully!</span>
                </div>
              )}

              {/* Current Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '5px' }}>
                  Current Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                    style={{ width: '100%', padding: '9px 38px 9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '5px' }}>
                  New Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 4 chars)"
                    required
                    style={{ width: '100%', padding: '9px 38px 9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '5px' }}>
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '9px 24px', borderRadius: '8px', border: 'none',
                    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                    color: '#ffffff', fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Full Name</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f2b5c', marginTop: '2px' }}>{currentUser?.fullName || '—'}</div>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Username / Email</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#334155', marginTop: '2px' }}>{currentUser?.email || currentUser?.username || '—'}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>System Role</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#059669', marginTop: '2px' }}>{currentUser?.role || 'VIEWER'}</div>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Assigned Branch</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#2563eb', marginTop: '2px' }}>{currentUser?.branch || 'Head Office'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  onClick={onClose}
                  style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
