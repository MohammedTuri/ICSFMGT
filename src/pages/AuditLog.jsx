import { useState, useEffect } from 'react';
import { getAuditLogs } from '../utils/db';
import { FileText, Filter, Download, Search, X, Calendar, User, ChevronDown, CheckCircle, Edit2, Trash2, Plus } from 'lucide-react';

const ACTION_COLORS = {
  'CREATE': { bg: 'rgba(16,185,129,0.1)', color: '#059669', label: 'Added', icon: Plus },
  'UPDATE': { bg: 'rgba(59,130,246,0.1)', color: '#1d4ed8', label: 'Modified', icon: Edit2 },
  'DELETE': { bg: 'rgba(239,68,68,0.1)', color: '#dc2626', label: 'Deleted', icon: Trash2 },
  'IMPORT': { bg: 'rgba(168,85,247,0.1)', color: '#a855f7', label: 'Imported', icon: FileText }
};

export default function AuditLog() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    action: '',
    storeName: '',
    userId: '',
    keyword: '',
    dateFrom: '',
    dateTo: ''
  });
  const [expandedLogId, setExpandedLogId] = useState(null);

  // Load audit logs on mount and when filters change
  useEffect(() => {
    loadAuditLogs();
  }, [filters]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const logs = await getAuditLogs({
        action: filters.action || undefined,
        storeName: filters.storeName || undefined,
        userId: filters.userId || undefined,
        startDate: filters.dateFrom || undefined,
        endDate: filters.dateTo || undefined
      });

      // Apply keyword filter
      let filtered = logs;
      if (filters.keyword.trim()) {
        const term = filters.keyword.toUpperCase();
        filtered = logs.filter(log => 
          (log.userName && log.userName.toUpperCase().includes(term)) ||
          (log.recordData && JSON.stringify(log.recordData).toUpperCase().includes(term))
        );
      }

      setAuditLogs(filtered);
    } catch (err) {
      console.error('Error loading audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setFilters({
      action: '',
      storeName: '',
      userId: '',
      keyword: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  const exportAuditLogs = () => {
    const csv = [
      ['Timestamp', 'Action', 'Module', 'User', 'Record ID', 'Details'].join(','),
      ...auditLogs.map(log => [
        log.timestamp,
        log.action,
        log.storeName,
        log.userName || log.userId,
        log.recordId || '—',
        JSON.stringify(log.recordData || {}).substring(0, 100)
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const storeOptions = [
    { value: 'visa', label: 'VISA Files' },
    { value: 'eoid_normal', label: 'Ethiopian Origin ID — Normal' },
    { value: 'eoid_underage', label: 'Ethiopian Origin ID — Under-Age' },
    { value: 'residence_id', label: 'Residence ID' },
    { value: 'etd', label: 'Emergency Travel Document' },
    { value: 'eritrean_id', label: 'Eritrean ID' },
    { value: 'alien_passport', label: 'Alien Passport' },
    { value: 'yellow_card', label: 'Yellow Card' },
    { value: 'users', label: 'Users' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '16px',
        padding: '32px',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)' }} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: '50px', height: '50px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <FileText size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontWeight: 700, fontSize: '2rem', letterSpacing: '0.5px' }}>System Audit Log</h1>
            <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem' }}>Track all user actions, record changes, and data modifications</p>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <div style={{
        background: '#fff',
        border: '1px solid var(--border-glass)',
        borderRadius: '16px',
        padding: '24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        {/* Action Filter */}
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Action</label>
          <select value={filters.action} onChange={(e) => handleFilterChange('action', e.target.value)} style={{
            width: '100%', marginTop: '8px', padding: '10px 12px', borderRadius: '8px',
            border: '1px solid var(--border-glass)', background: '#fff', fontSize: '0.9rem',
            color: 'var(--text-primary)', fontWeight: 500, cursor: 'pointer'
          }}>
            <option value="">All Actions</option>
            <option value="CREATE">Added</option>
            <option value="UPDATE">Modified</option>
            <option value="DELETE">Deleted</option>
            <option value="IMPORT">Imported</option>
          </select>
        </div>

        {/* Module Filter */}
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Module</label>
          <select value={filters.storeName} onChange={(e) => handleFilterChange('storeName', e.target.value)} style={{
            width: '100%', marginTop: '8px', padding: '10px 12px', borderRadius: '8px',
            border: '1px solid var(--border-glass)', background: '#fff', fontSize: '0.9rem',
            color: 'var(--text-primary)', fontWeight: 500, cursor: 'pointer'
          }}>
            <option value="">All Modules</option>
            {storeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>

        {/* Date From */}
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>From Date</label>
          <input type="date" value={filters.dateFrom} onChange={(e) => handleFilterChange('dateFrom', e.target.value)} style={{
            width: '100%', marginTop: '8px', padding: '10px 12px', borderRadius: '8px',
            border: '1px solid var(--border-glass)', background: '#fff', fontSize: '0.9rem',
            color: 'var(--text-primary)'
          }} />
        </div>

        {/* Date To */}
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>To Date</label>
          <input type="date" value={filters.dateTo} onChange={(e) => handleFilterChange('dateTo', e.target.value)} style={{
            width: '100%', marginTop: '8px', padding: '10px 12px', borderRadius: '8px',
            border: '1px solid var(--border-glass)', background: '#fff', fontSize: '0.9rem',
            color: 'var(--text-primary)'
          }} />
        </div>

        {/* Keyword Search */}
        <div style={{ gridColumn: filters.keyword || filters.dateFrom || filters.dateTo ? 'span 1' : 'span 2' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Search</label>
          <input type="text" placeholder="Username, record data..." value={filters.keyword} onChange={(e) => handleFilterChange('keyword', e.target.value)} style={{
            width: '100%', marginTop: '8px', padding: '10px 12px', borderRadius: '8px',
            border: '1px solid var(--border-glass)', background: '#fff', fontSize: '0.9rem',
            color: 'var(--text-primary)'
          }} />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <button onClick={handleReset} style={{
            flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-glass)',
            background: '#fff', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s'
          }}><X size={14} style={{ display: 'inline', marginRight: '6px' }} /> Reset</button>
          <button onClick={exportAuditLogs} style={{
            flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-glass)',
            background: 'rgba(29,78,216,0.1)', color: '#1d4ed8', fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s'
          }}><Download size={14} style={{ display: 'inline', marginRight: '6px' }} /> Export CSV</button>
        </div>
      </div>

      {/* Results Table */}
      <div style={{
        background: '#fff',
        border: '1px solid var(--border-glass)',
        borderRadius: '16px',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
            Activity Log ({auditLogs.length} {auditLogs.length === 1 ? 'entry' : 'entries'})
          </h3>
          {loading && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading...</span>}
        </div>

        {auditLogs.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <FileText size={40} style={{ opacity: 0.3, marginBottom: '12px', display: 'block' }} />
            <p style={{ margin: 0 }}>No audit logs found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(15,43,92,0.02)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Timestamp</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Action</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Module</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>User</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Record ID</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log, idx) => {
                  const actionCfg = ACTION_COLORS[log.action] || ACTION_COLORS.CREATE;
                  const IconComponent = actionCfg.icon;
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-glass)', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(15,43,92,0.015)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px',
                          borderRadius: '6px', background: actionCfg.bg, color: actionCfg.color, fontWeight: 700, fontSize: '0.75rem'
                        }}>
                          <IconComponent size={12} /> {actionCfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {log.storeName}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {log.userName || log.userId || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                        {log.recordId || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                        <button onClick={() => setExpandedLogId(expandedLogId === idx ? null : idx)} style={{
                          background: 'transparent', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer',
                          fontWeight: 600, padding: 0, display: 'flex', alignItems: 'center', gap: '4px'
                        }}>
                          View <ChevronDown size={14} style={{ transform: expandedLogId === idx ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                        </button>
                        {expandedLogId === idx && (
                          <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(15,43,92,0.05)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace', maxHeight: '300px', overflowY: 'auto' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>Record Data:</strong>
                            <pre style={{ margin: '6px 0 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(log.recordData, null, 2)}</pre>
                            {log.previousData && (
                              <>
                                <strong style={{ color: 'var(--text-primary)', marginTop: '12px', display: 'block' }}>Previous Data:</strong>
                                <pre style={{ margin: '6px 0 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(log.previousData, null, 2)}</pre>
                              </>
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
