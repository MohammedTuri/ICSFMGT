import { useState, useEffect } from 'react';
import { Trash2, RefreshCw, Search, ChevronDown, Calendar, User, Archive, CheckCircle, AlertTriangle } from 'lucide-react';
import { getRecycleBinRecords, restoreRecord, deletePermanently, emptyRecycleBin, logAuditEntry } from '../utils/db';
import { notify } from '../utils/toast';

const DIVISION_LABEL_MAP = {
  'visa': 'VISA Files',
  'eoid_normal': 'Ethiopian Origin ID — Normal File',
  'eoid_underage': 'Ethiopian Origin ID — Under-Age File',
  'residence_id': 'Residence ID File',
  'residence_id_cancellation': 'Residence ID Cancellation',
  'etd': 'Emergency Travel Document File',
  'eritrean_id': 'Eritrean ID File',
  'alien_passport': 'Alien Passport File',
};

const DIVISION_COLOR_MAP = {
  'visa': { color: '#059669', bg: 'rgba(5,150,105,0.08)' },
  'eoid_normal': { color: '#b45309', bg: 'rgba(180,83,9,0.08)' },
  'eoid_underage': { color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
  'residence_id': { color: '#1d4ed8', bg: 'rgba(29,78,216,0.08)' },
  'residence_id_cancellation': { color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
  'etd': { color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
  'eritrean_id': { color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
  'alien_passport': { color: '#0ea5e9', bg: 'rgba(14,165,233,0.08)' },
};

export default function RecycleBin() {
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('ics_auth_user')) || {};
    setCurrentUser(session);
    loadRecycleBin();
  }, []);

  const loadRecycleBin = async () => {
    setLoading(true);
    try {
      const data = await getRecycleBinRecords();
      setRecords(data);
      applyFilter(data, searchTerm);
    } catch (err) {
      console.error('Failed to load recycle bin:', err);
      notify('error', 'Failed to load recycle bin records.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = (data, search) => {
    if (!search.trim()) {
      setFilteredRecords(data);
      return;
    }
    const term = search.toUpperCase();
    const filtered = data.filter(r => {
      const rec = r.recordData || {};
      return (
        (rec.fullName && rec.fullName.toUpperCase().includes(term)) ||
        (rec.passportNumber && rec.passportNumber.toUpperCase().includes(term)) ||
        (rec.personalId && rec.personalId.toUpperCase().includes(term)) ||
        (r.deletedBy && r.deletedBy.toUpperCase().includes(term)) ||
        (r.originalStore && r.originalStore.toUpperCase().includes(term))
      );
    });
    setFilteredRecords(filtered);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    applyFilter(records, value);
  };

  const handleRestore = async (recycleRecord) => {
    const name = recycleRecord.recordData?.fullName || 'this record';
    if (!window.confirm(`Are you sure you want to restore ${name}'s record?`)) return;

    try {
      await restoreRecord(recycleRecord);
      
      // Log audit
      await logAuditEntry(
        'RESTORE',
        recycleRecord.originalStore,
        currentUser?.id || 'unknown',
        currentUser?.fullName || currentUser?.username || 'Unknown User',
        recycleRecord.recordData?.id,
        recycleRecord.recordData
      );

      notify('success', `${name} has been restored successfully.`);
      loadRecycleBin();
    } catch (err) {
      console.error('Restore error:', err);
      notify('error', 'Failed to restore record.');
    }
  };

  const handleDeletePermanent = async (recycleRecord) => {
    const name = recycleRecord.recordData?.fullName || 'this record';
    if (!window.confirm(`WARNING: Are you sure you want to PERMANENTLY delete ${name}? This action is irreversible.`)) return;

    try {
      await deletePermanently(recycleRecord.id);

      // Log audit
      await logAuditEntry(
        'PERMANENT_DELETE',
        recycleRecord.originalStore,
        currentUser?.id || 'unknown',
        currentUser?.fullName || currentUser?.username || 'Unknown User',
        recycleRecord.recordData?.id,
        recycleRecord.recordData
      );

      notify('success', `${name} has been permanently erased.`);
      loadRecycleBin();
    } catch (err) {
      console.error('Permanent delete error:', err);
      notify('error', 'Failed to delete record permanently.');
    }
  };

  const handleEmptyBin = async () => {
    if (records.length === 0) return;
    if (!window.confirm('CRITICAL WARNING: Are you sure you want to empty the Recycle Bin? ALL deleted files will be permanently erased. This cannot be undone.')) return;

    try {
      await emptyRecycleBin();

      // Log audit bulk delete
      await logAuditEntry(
        'PERMANENT_DELETE',
        'all',
        currentUser?.id || 'unknown',
        currentUser?.fullName || currentUser?.username || 'Unknown User',
        'bulk',
        { count: records.length }
      );

      notify('success', 'Recycle bin emptied successfully.');
      loadRecycleBin();
    } catch (err) {
      console.error('Empty recycle bin error:', err);
      notify('error', 'Failed to empty recycle bin.');
    }
  };

  const formatFieldLabel = (key) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace('Id', 'ID')
      .replace('Eoid', 'EOID')
      .replace('Etd', 'ETD');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #311042 100%)',
        borderRadius: '16px',
        padding: '32px',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(31, 16, 66, 0.15)'
      }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)' }} />
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '50px', height: '50px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Archive size={24} style={{ color: '#ec4899' }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontWeight: 700, fontSize: '2rem', letterSpacing: '0.5px' }}>Recycle Bin</h1>
              <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem' }}>Restore deleted files or purge them permanently from system database</p>
            </div>
          </div>
          
          {records.length > 0 && (
            <button
              onClick={handleEmptyBin}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px', background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
            >
              <Trash2 size={16} /> Empty Recycle Bin
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', top: '12px', left: '14px', color: 'var(--text-secondary)' }} />
          <input
            className="glass-input"
            placeholder="Search deleted records by name, passport #, deleted by, or category..."
            style={{ paddingLeft: '44px' }}
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        <button
          onClick={loadRecycleBin}
          title="Refresh Bin"
          style={{
            padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)',
            background: '#fff', color: 'var(--text-secondary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <RefreshCw size={16} className={loading ? 'rpt-spin' : ''} />
        </button>
      </div>

      {/* List / Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
            Deleted Entries ({filteredRecords.length})
          </h3>
        </div>

        {filteredRecords.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{
              width: '54px', height: '54px', borderRadius: '50%',
              background: 'rgba(100,116,139,0.06)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px'
            }}>
              <Archive size={24} style={{ opacity: 0.4 }} />
            </div>
            <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600 }}>The Recycle Bin is empty</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', opacity: 0.7 }}>Deleted records across all modules will appear here for recovery.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(15,43,92,0.015)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Original Division</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Passport</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deleted By</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deleted At</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((item) => {
                  const divLabel = DIVISION_LABEL_MAP[item.originalStore] || item.originalStore;
                  const divCfg = DIVISION_COLOR_MAP[item.originalStore] || { color: '#64748b', bg: '#f1f5f9' };
                  const rec = item.recordData || {};
                  const isExpanded = expandedId === item.id;
                  
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px',
                          borderRadius: '6px', background: divCfg.bg, color: divCfg.color, fontWeight: 700, fontSize: '0.73rem'
                        }}>
                          {divLabel}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {rec.fullName || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                        {rec.passportNumber || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={13} style={{ opacity: 0.5 }} /> {item.deletedBy}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={13} style={{ opacity: 0.5 }} /> {new Date(item.deletedAt).toLocaleString()}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : item.id)}
                            style={{
                              background: 'transparent', border: '1px solid var(--border-glass)',
                              padding: '6px 12px', borderRadius: '6px', color: 'var(--text-secondary)',
                              fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            Details <ChevronDown size={13} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                          </button>
                          
                          <button
                            onClick={() => handleRestore(item)}
                            title="Restore to original Division"
                            style={{
                              background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)',
                              padding: '6px 12px', borderRadius: '6px', color: '#059669',
                              fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            <RefreshCw size={12} /> Restore
                          </button>
                          
                          <button
                            onClick={() => handleDeletePermanent(item)}
                            title="Delete Permanently"
                            style={{
                              background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                              padding: '6px 12px', borderRadius: '6px', color: '#dc2626',
                              fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            <Trash2 size={12} /> Purge
                          </button>
                        </div>

                        {isExpanded && (
                          <div style={{
                            textAlign: 'left', marginTop: '16px', padding: '16px',
                            background: 'rgba(15,43,92,0.02)', border: '1px solid var(--border-glass)',
                            borderRadius: '8px', animation: 'fadeIn 0.2s ease-out'
                          }}>
                            <h4 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Record Details</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px 24px' }}>
                              {Object.entries(rec)
                                .filter(([k, v]) => k !== 'attachments' && k !== 'id' && v !== null && v !== '')
                                .map(([key, value]) => (
                                  <div key={key}>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 500 }}>{formatFieldLabel(key)}</span>
                                    <span style={{ fontSize: '0.83rem', color: 'var(--text-primary)', fontWeight: 600 }}>{String(value)}</span>
                                  </div>
                                ))}
                            </div>
                            
                            {rec.attachments && rec.attachments.length > 0 && (
                              <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-glass)', paddingTop: '10px' }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 500, marginBottom: '6px' }}>Scanned Attachments ({rec.attachments.length})</span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                  {rec.attachments.map(att => (
                                    <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid var(--border-glass)', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                                      📄 {att.name}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
