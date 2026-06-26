import { useState, useEffect } from 'react';
import { getAuditLogs } from '../utils/db';
import { FileText, Filter, Download, Search, X, Calendar, User, ChevronDown, CheckCircle, Edit2, Trash2, Plus, ClipboardList } from 'lucide-react';

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
  const [reportReady, setReportReady] = useState(false);

  // Load audit logs on mount and when filters change
  useEffect(() => {
    setReportReady(false); // hide table whenever filters change
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
    setReportReady(false);
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

  const generateReport = () => {
    setReportReady(true);
    const actionCounts = auditLogs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {});

    const actionLabelMap = { CREATE: 'Added', UPDATE: 'Modified', DELETE: 'Deleted', IMPORT: 'Imported' };
    const actionColorMap = { CREATE: '#059669', UPDATE: '#1d4ed8', DELETE: '#dc2626', IMPORT: '#a855f7' };
    const actionBgMap   = { CREATE: '#d1fae5', UPDATE: '#dbeafe', DELETE: '#fee2e2', IMPORT: '#f3e8ff' };

    const dateRange = [
      filters.dateFrom ? `From: ${filters.dateFrom}` : null,
      filters.dateTo   ? `To: ${filters.dateTo}`   : null
    ].filter(Boolean).join('   |   ');

    const summaryRows = Object.entries(actionCounts)
      .map(([action, count]) => `
        <div style="display:flex;align-items:center;gap:12px;padding:16px 20px;background:#fff;
          border-radius:10px;border:1px solid #e2e8f0;">
          <div style="width:12px;height:12px;border-radius:50%;background:${actionColorMap[action] || '#64748b'}"></div>
          <span style="font-weight:600;color:#1e293b;flex:1">${actionLabelMap[action] || action}</span>
          <span style="font-weight:700;font-size:1.2rem;color:${actionColorMap[action] || '#64748b'}">${count}</span>
        </div>`
      ).join('');

    const tableRows = auditLogs.map((log, i) => {
      const action = log.action || 'CREATE';
      const fullName = (log.recordData && log.recordData.fullName) || (log.previousData && log.previousData.fullName) || '—';
      return `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
          <td style="padding:10px 14px;font-size:0.82rem;color:#475569;white-space:nowrap">${new Date(log.timestamp).toLocaleString()}</td>
          <td style="padding:10px 14px">
            <span style="padding:3px 10px;border-radius:6px;font-size:0.75rem;font-weight:700;
              background:${actionBgMap[action] || '#f1f5f9'};color:${actionColorMap[action] || '#64748b'}">
              ${actionLabelMap[action] || action}
            </span>
          </td>
          <td style="padding:10px 14px;font-size:0.82rem;color:#1e293b;font-weight:600">${log.storeName || '—'}</td>
          <td style="padding:10px 14px;font-size:0.82rem;color:#1e293b;font-weight:600">${fullName}</td>
          <td style="padding:10px 14px;font-size:0.82rem;color:#1e293b">${log.userName || log.userId || '—'}</td>
          <td style="padding:10px 14px;font-size:0.82rem;color:#64748b;font-family:monospace">${log.recordId || '—'}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Audit Log Report — ${new Date().toLocaleDateString()}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: #f1f5f9; color: #1e293b; }
    .page { max-width: 1000px; margin: 0 auto; padding: 40px 32px; }
    @media print {
      body { background: #fff; }
      .no-print { display: none !important; }
      .page { padding: 20px; }
    }
  </style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);border-radius:16px;
    padding:32px;color:#fff;margin-bottom:28px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <div style="font-size:0.75rem;font-weight:600;letter-spacing:2px;color:rgba(255,255,255,0.5);text-transform:uppercase;margin-bottom:8px">System Report</div>
        <h1 style="font-size:2rem;font-weight:800;letter-spacing:-0.5px">Audit Log Report</h1>
        <p style="margin-top:6px;color:rgba(255,255,255,0.6);font-size:0.9rem">Track all user actions, record changes, and data modifications</p>
      </div>
      <div style="text-align:right;">
        <div style="font-size:0.75rem;color:rgba(255,255,255,0.5);margin-bottom:4px">Generated</div>
        <div style="font-weight:700;font-size:0.95rem">${new Date().toLocaleString()}</div>
        ${dateRange ? `<div style="margin-top:6px;font-size:0.8rem;color:rgba(255,255,255,0.6)">${dateRange}</div>` : ''}
      </div>
    </div>
  </div>

  <!-- Print button -->
  <div class="no-print" style="text-align:right;margin-bottom:20px;">
    <button onclick="window.print()" style="padding:10px 24px;background:#1d4ed8;color:#fff;
      border:none;border-radius:8px;font-weight:700;font-size:0.9rem;cursor:pointer;">
      🖨 Print / Save as PDF
    </button>
  </div>

  <!-- Summary cards -->
  <div style="margin-bottom:28px;">
    <h2 style="font-size:1rem;font-weight:700;color:#475569;text-transform:uppercase;
      letter-spacing:1px;margin-bottom:14px">Summary</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;">
      <div style="padding:16px 20px;background:#fff;border-radius:10px;border:1px solid #e2e8f0;
        display:flex;align-items:center;gap:12px;">
        <div style="width:12px;height:12px;border-radius:50%;background:#0f172a"></div>
        <span style="font-weight:600;color:#1e293b;flex:1">Total Entries</span>
        <span style="font-weight:700;font-size:1.2rem;color:#0f172a">${auditLogs.length}</span>
      </div>
      ${summaryRows}
    </div>
  </div>

  <!-- Table -->
  <div style="background:#fff;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;">
    <div style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
      <h2 style="font-size:1rem;font-weight:700;color:#1e293b">
        Activity Log (${auditLogs.length} ${auditLogs.length === 1 ? 'entry' : 'entries'})
      </h2>
    </div>
    ${auditLogs.length === 0
      ? '<div style="padding:40px;text-align:center;color:#94a3b8">No audit log entries found.</div>'
      : `<div style="overflow-x:auto">
           <table style="width:100%;border-collapse:collapse;">
             <thead>
               <tr style="background:#f8fafc;">
                 <th style="padding:12px 14px;text-align:left;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0">Timestamp</th>
                 <th style="padding:12px 14px;text-align:left;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0">Action</th>
                 <th style="padding:12px 14px;text-align:left;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0">Module</th>
                 <th style="padding:12px 14px;text-align:left;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0">Full Name</th>
                 <th style="padding:12px 14px;text-align:left;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0">User</th>
                 <th style="padding:12px 14px;text-align:left;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0">Record ID</th>
               </tr>
             </thead>
             <tbody>${tableRows}</tbody>
           </table>
         </div>`
    }
  </div>

  <!-- Footer -->
  <div style="margin-top:24px;text-align:center;font-size:0.78rem;color:#94a3b8">
    Generated by File Management System &mdash; ${new Date().toLocaleString()}
  </div>
</div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    } else {
      // Popup blocked — fall back to downloading the report as an HTML file
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_report_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('Popup was blocked by your browser. The report has been downloaded as an HTML file instead. Open it in your browser to view and print it.');
    }
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
          <button onClick={generateReport} style={{
            flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)',
            background: 'rgba(16,185,129,0.1)', color: '#059669', fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s', whiteSpace: 'nowrap'
          }}><ClipboardList size={14} style={{ display: 'inline', marginRight: '6px' }} /> Generate Report</button>
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
            Activity Log {reportReady ? `(${auditLogs.length} ${auditLogs.length === 1 ? 'entry' : 'entries'})` : ''}
          </h3>
          {loading && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading...</span>}
        </div>

        {!reportReady ? (
          /* ── Locked placeholder ── */
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '16px',
              background: 'rgba(16,185,129,0.08)', border: '2px dashed rgba(16,185,129,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <ClipboardList size={28} style={{ color: '#059669', opacity: 0.6 }} />
            </div>
            <p style={{ margin: '0 0 6px 0', fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
              Log data is hidden
            </p>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              Click <strong style={{ color: '#059669' }}>Generate Report</strong> to load and view the activity log.
            </p>
          </div>
        ) : auditLogs.length === 0 ? (
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
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</th>
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
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {(log.recordData && log.recordData.fullName) || (log.previousData && log.previousData.fullName) || '—'}
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
