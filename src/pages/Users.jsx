import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Download } from 'lucide-react';
import { getAllUsers, addUser, updateUser, deleteUser } from '../utils/db';
import notify from '../utils/toast';
import UserFormModal from '../components/UserFormModal';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = () => { setEditingUser(null); setIsModalOpen(true); };
  const handleEdit = (u) => { setEditingUser(u); setIsModalOpen(true); };
  const handleClose = () => { setIsModalOpen(false); setEditingUser(null); };

  const handleSave = async (user) => {
    try {
      // Username uniqueness check (case-insensitive)
      const uname = (user.username || '').trim().toUpperCase();
      const exists = users.some(u => u.username && u.username.trim().toUpperCase() === uname && u.id !== user.id);
      if (exists) { notify('error', `Username "${user.username}" already exists`); return; }

      if (user.id) await updateUser(user);
      else await addUser(user);
      handleClose();
      await load();
      notify('success', `User ${user.username} saved`);
    } catch (err) {
      console.error('Save user failed', err);
      notify('error', 'Failed to save user');
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete user ${u.username}?`)) return;
    try {
      await deleteUser(u.id);
      await load();
      notify('success', `Deleted ${u.username}`);
    } catch (err) {
      console.error('Delete user failed', err);
      notify('error', 'Failed to delete user');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Users</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Plus /> Add User</button>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e6e6e6', borderRadius: 12, padding: 12 }}>
        {loading ? <div>Loading...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: 8 }}>#</th>
                <th style={{ padding: 8 }}>Username</th>
                <th style={{ padding: 8 }}>Full Name</th>
                <th style={{ padding: 8 }}>Role</th>
                <th style={{ padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id}>
                  <td style={{ padding: 8 }}>{i + 1}</td>
                  <td style={{ padding: 8 }}>{u.username}</td>
                  <td style={{ padding: 8 }}>{u.fullName}</td>
                  <td style={{ padding: 8 }}>{u.role}</td>
                  <td style={{ padding: 8 }}>
                    <button onClick={() => handleEdit(u)} style={{ marginRight: 8 }}><Edit size={14} /></button>
                    <button onClick={() => handleDelete(u)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <UserFormModal isOpen={isModalOpen} onClose={handleClose} onSave={handleSave} initialUser={editingUser} />
    </div>
  );
}
