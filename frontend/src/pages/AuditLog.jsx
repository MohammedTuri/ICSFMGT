import { useState, useEffect } from 'react';
import { getAuditLogs } from '../utils/db';
import { FileText, Filter, Download, Search, X, Calendar, User, ChevronDown, CheckCircle, Edit2, Trash2, Plus, ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';

const ACTION_COLORS = {
  'CREATE': { bg: 'rgba(16,185,129,0.1)', color: '#059669', label: 'Added', icon: Plus },
  'UPDATE': { bg: 'rgba(59,130,246,0.1)', color: '#1d4ed8', label: 'Modified', icon: Edit2 },
  'DELETE': { bg: 'rgba(239,68,68,0.1)', color: '#dc2626', label: 'Deleted', icon: Trash2 },
  'IMPORT': { bg: 'rgba(168,85,247,0.1)', color: '#a855f7', label: 'Imported', icon: FileText },
  'RESTORE': { bg: 'rgba(16,185,129,0.1)', color: '#059669', label: 'Restored', icon: Plus },
  'PERMANENT_DELETE': { bg: 'rgba(239,68,68,0.1)', color: '#dc2626', label: 'Purged', icon: Trash2 },
  'BULK_INGESTION': { bg: 'rgba(13,148,136,0.12)', color: '#0d9488', label: 'Bulk Ingested', icon: ClipboardList }
};

function normalizeAuditItem(log) {
  let action = log.action || 'CREATE';
  let details = '';
  let storeName = log.storeName || '';
  let userName = log.userName || log.userId || '';

  if (typeof action === 'string' && action.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(action);
      action = parsed.action || 'BULK_INGESTION';
      details = parsed.details || '';
      if (parsed.storeName && !storeName) storeName = parsed.storeName;
      if (parsed.performedBy && !userName) userName = parsed.performedBy;
    } catch (_) {
      action = 'BULK_INGESTION';
    }
  }

  if (log.recordData && typeof log.recordData === 'object' && log.recordData.details && !details) {
    details = log.recordData.details;
  }

  return {
    ...log,
    action,
    storeName: storeName || 'files',
    userName: userName || 'System Administrator',
    details
  };
}

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
  const [reportReady, setReportReady] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

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

      // Normalize any logs containing JSON actions
      const normalized = (logs || []).map(normalizeAuditItem);

      // Apply keyword filter
      let filtered = normalized;
      if (filters.keyword.trim()) {
        const term = filters.keyword.toUpperCase();
        filtered = normalized.filter(log => 
          (log.userName && log.userName.toUpperCase().includes(term)) ||
          (log.details && log.details.toUpperCase().includes(term)) ||
          (log.recordData && JSON.stringify(log.recordData).toUpperCase().includes(term))
        );
      }

      setAuditLogs(filtered);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error loading audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setCurrentPage(1);
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setCurrentPage(1);
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
        log.details || JSON.stringify(log.recordData || {}).substring(0, 100)
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
      const act = log.action || 'CREATE';
      acc[act] = (acc[act] || 0) + 1;
      return acc;
    }, {});

    const actionLabelMap = {
      CREATE: 'Added',
      UPDATE: 'Modified',
      DELETE: 'Deleted',
      IMPORT: 'Imported',
      RESTORE: 'Restored',
      PERMANENT_DELETE: 'Purged',
      BULK_INGESTION: 'Bulk Ingested'
    };
    const actionColorMap = {
      CREATE: '#059669',
      UPDATE: '#1d4ed8',
      DELETE: '#dc2626',
      IMPORT: '#a855f7',
      RESTORE: '#059669',
      PERMANENT_DELETE: '#dc2626',
      BULK_INGESTION: '#0d9488'
    };
    const actionBgMap = {
      CREATE: '#d1fae5',
      UPDATE: '#dbeafe',
      DELETE: '#fee2e2',
      IMPORT: '#f3e8ff',
      RESTORE: '#d1fae5',
      PERMANENT_DELETE: '#fee2e2',
      BULK_INGESTION: '#ccfbf1'
    };

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
      const fullName = (log.recordData && log.recordData.fullName) || (log.previousData && log.previousData.fullName) || log.details || '—';
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
           <table style="width:100%;border-collapse:collapse;" id="report-table">
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
         </div>
         <!-- Report Popup Pagination Toolbar -->
         <div class="no-print" id="report-pagination" style="display:flex;justify-content:space-between;align-items:center;padding:14px 20px;background:#f8fafc;border-top:1px solid #e2e8f0;flex-wrap:wrap;gap:12px;">
           <div style="display:flex;align-items:center;gap:12px;font-size:0.84rem;color:#475569;">
             <span>Showing <strong id="report-start" style="color:#0f2b5c">1</strong>–<strong id="report-end" style="color:#0f2b5c">20</strong> of <strong style="color:#0f2b5c">${auditLogs.length}</strong> entries</span>
             <div style="display:flex;align-items:center;gap:6px;">
               <span style="font-size:0.78rem">Per page:</span>
               <select id="report-page-size" style="padding:4px 8px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;font-size:0.8rem;font-weight:600;color:#0f2b5c;cursor:pointer;">
                 <option value="15">15</option>
                 <option value="25" selected>25</option>
                 <option value="50">50</option>
                 <option value="100">100</option>
                 <option value="999999">All</option>
               </select>
             </div>
           </div>
           <div id="report-page-buttons" style="display:flex;align-items:center;gap:6px;"></div>
         </div>`
    }
  </div>

  <!-- Footer -->
  <div style="margin-top:24px;text-align:center;font-size:0.78rem;color:#94a3b8">
    Generated by File Management System &mdash; ${new Date().toLocaleString()}
  </div>
</div>
<script>
(function() {
  var currentPage = 1;
  var pageSize = 25;
  var rows = Array.prototype.slice.call(document.querySelectorAll('#report-table tbody tr'));
  var total = rows.length;

  function render() {
    var sel = document.getElementById('report-page-size');
    if (sel) pageSize = parseInt(sel.value, 10);
    var totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    var start = (currentPage - 1) * pageSize;
    var end = Math.min(start + pageSize, total);

    rows.forEach(function(r, idx) {
      r.style.display = (idx >= start && idx < end) ? '' : 'none';
    });

    var startEl = document.getElementById('report-start');
    var endEl = document.getElementById('report-end');
    if (startEl) startEl.textContent = total === 0 ? '0' : String(start + 1);
    if (endEl) endEl.textContent = String(end);

    var btnBox = document.getElementById('report-page-buttons');
    if (!btnBox) return;
    btnBox.innerHTML = '';

    var prev = document.createElement('button');
    prev.textContent = '‹ Prev';
    prev.disabled = currentPage <= 1;
    prev.style.cssText = 'padding:6px 12px;border-radius:6px;border:1px solid #cbd5e1;background:' + (currentPage <= 1 ? '#f1f5f9' : '#fff') + ';color:' + (currentPage <= 1 ? '#94a3b8' : '#0f2b5c') + ';cursor:' + (currentPage <= 1 ? 'not-allowed' : 'pointer') + ';font-size:0.78rem;font-weight:600;';
    prev.onclick = function() { if (currentPage > 1) { currentPage--; render(); } };
    btnBox.appendChild(prev);

    var pages = [];
    for (var p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) pages.push(p);
    }

    pages.forEach(function(p, idx) {
      if (idx > 0 && p - pages[idx - 1] > 1) {
        var dot = document.createElement('span');
        dot.textContent = '…';
        dot.style.cssText = 'padding:0 4px;color:#94a3b8;font-size:0.8rem;';
        btnBox.appendChild(dot);
      }
      var b = document.createElement('button');
      b.textContent = String(p);
      var active = p === currentPage;
      b.style.cssText = 'min-width:32px;height:32px;border-radius:6px;border:1px solid ' + (active ? '#0f2b5c' : '#cbd5e1') + ';background:' + (active ? '#0f2b5c' : '#fff') + ';color:' + (active ? '#fff' : '#0f2b5c') + ';cursor:pointer;font-size:0.78rem;font-weight:' + (active ? '800' : '500') + ';';
      b.onclick = (function(page) { return function() { currentPage = page; render(); }; })(p);
      btnBox.appendChild(b);
    });

    var next = document.createElement('button');
    next.textContent = 'Next ›';
    next.disabled = currentPage >= totalPages;
    next.style.cssText = 'padding:6px 12px;border-radius:6px;border:1px solid #cbd5e1;background:' + (currentPage >= totalPages ? '#f1f5f9' : '#fff') + ';color:' + (currentPage >= totalPages ? '#94a3b8' : '#0f2b5c') + ';cursor:' + (currentPage >= totalPages ? 'not-allowed' : 'pointer') + ';font-size:0.78rem;font-weight:600;';
    next.onclick = function() { if (currentPage < totalPages) { currentPage++; render(); } };
    btnBox.appendChild(next);
  }

  var sel = document.getElementById('report-page-size');
  if (sel) sel.onchange = function() { currentPage = 1; render(); };

  window.addEventListener('beforeprint', function() {
    rows.forEach(function(r) { r.style.display = ''; });
  });
  window.addEventListener('afterprint', function() {
    render();
  });

  render();
})();
</script>
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
    { value: 'residence_id_cancellation', label: 'Residence ID Cancellation' },
    { value: 'etd', label: 'Emergency Travel Document' },
    { value: 'eritrean_id', label: 'Eritrean ID' },
    { value: 'alien_passport', label: 'Alien Passport' },
    { value: 'users', label: 'Users' }
  ];

  const renderLogDetails = (log) => {
    const formatLabel = (k) => {
      return k
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .replace('Id', 'ID')
        .replace('Eoid', 'EOID')
        .replace('Etd', 'ETD');
    };

    const record = log.recordData || {};
    const prev = log.previousData || null;

    if (log.action === 'UPDATE' && prev) {
      const ignoredKeys = ['id', 'createdAt', 'updatedAt', 'attachments'];
      const allKeys = Array.from(new Set([...Object.keys(prev), ...Object.keys(record)]))
        .filter(k => !ignoredKeys.includes(k));
      
      const diffs = [];
      allKeys.forEach(k => {
        const oldVal = prev[k] !== undefined && prev[k] !== null ? String(prev[k]) : '';
        const newVal = record[k] !== undefined && record[k] !== null ? String(record[k]) : '';
        if (oldVal !== newVal) {
          diffs.push({ key: k, before: oldVal || '—', after: newVal || '—' });
        }
      });

      if (diffs.length > 0) {
        return (
          <div style={{ marginTop: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', overflow: 'hidden' }}>
            <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Field Changes</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: 'rgba(15,43,92,0.02)' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Field</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Before</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>After</th>
                </tr>
              </thead>
              <tbody>
                {diffs.map((d, i) => (
                  <tr key={i} style={{ borderBottom: i < diffs.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>{formatLabel(d.key)}</td>
                    <td style={{ padding: '8px 10px', color: '#dc2626', background: 'rgba(239, 68, 68, 0.04)', textDecoration: 'line-through' }}>{d.before}</td>
                    <td style={{ padding: '8px 10px', color: '#16a34a', background: 'rgba(22, 163, 74, 0.04)', fontWeight: 600 }}>{d.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {((prev.attachments && prev.attachments.length) || (record.attachments && record.attachments.length)) && (
              <div style={{ marginTop: '10px', fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                📎 <strong>Attachments count:</strong> {prev.attachments?.length || 0} → {record.attachments?.length || 0}
              </div>
            )}
          </div>
        );
      }
    }

    const displayFields = Object.entries(record)
      .filter(([k, v]) => k !== 'attachments' && k !== 'id' && v !== null && v !== '');

    return (
      <div style={{ marginTop: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
        <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {log.action === 'CREATE' ? 'Created Record Data' : log.action === 'DELETE' ? 'Deleted Record Data' : 'Record Details'}
        </div>
        
        {displayFields.length === 0 ? (
          <pre style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace' }}>
            {JSON.stringify(record, null, 2)}
          </pre>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px 16px', fontSize: '0.8rem' }}>
            {displayFields.map(([key, value]) => (
              <div key={key} style={{ padding: '4px 0' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 500 }}>{formatLabel(key)}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{String(value)}</span>
              </div>
            ))}
          </div>
        )}

        {record.attachments && record.attachments.length > 0 && (
          <div style={{ marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 500, marginBottom: '4px' }}>Attachments ({record.attachments.length})</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {record.attachments.map(att => (
                <div key={att.id} style={{ fontSize: '0.72rem', color: 'var(--text-primary)', background: '#fff', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '4px' }}>
                  📄 {att.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(auditLogs.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, auditLogs.length);
  const paginatedLogs = auditLogs.slice(startIndex, endIndex);

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
            <option value="BULK_INGESTION">Bulk Ingested</option>
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
        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button onClick={handleReset} style={{
            padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-glass)',
            background: '#fff', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap'
          }}><X size={16} style={{ marginRight: '8px' }} /> Reset</button>
          
          <button onClick={exportAuditLogs} style={{
            padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(29,78,216,0.3)',
            background: 'rgba(29,78,216,0.05)', color: '#1d4ed8', fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap'
          }}><Download size={16} style={{ marginRight: '8px' }} /> Export CSV</button>
          
          <button onClick={generateReport} style={{
            padding: '10px 20px', borderRadius: '8px', border: 'none',
            background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(5,150,105,0.2)'
          }}><ClipboardList size={16} style={{ marginRight: '8px' }} /> Generate Report</button>
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

        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '0.9rem' }}>Loading activity logs...</span>
          </div>
        ) : auditLogs.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <FileText size={40} style={{ opacity: 0.3, marginBottom: '12px', display: 'block', margin: '0 auto 12px auto' }} />
            <p style={{ margin: 0 }}>No audit logs found</p>
          </div>
        ) : (<>
          <div style={{ overflowX: 'auto', width: '100%', paddingBottom: '8px' }}>
            <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse' }}>
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
                {paginatedLogs.map((log, idx) => {
                  const globalIdx = startIndex + idx;
                  const actionCfg = ACTION_COLORS[log.action] || ACTION_COLORS.CREATE;
                  const IconComponent = actionCfg.icon;
                  const logName = (log.recordData && log.recordData.fullName) || 
                    (log.previousData && log.previousData.fullName) || 
                    (log.action === 'BULK_INGESTION' && log.recordData?.count ? `${log.recordData.count} Dossiers Ingested` : null) ||
                    log.details || 
                    '—';
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
                        {logName}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {log.userName || log.userId || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                        {log.recordId || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                        <button onClick={() => setExpandedLogId(expandedLogId === globalIdx ? null : globalIdx)} style={{
                          background: 'transparent', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer',
                          fontWeight: 600, padding: 0, display: 'flex', alignItems: 'center', gap: '4px'
                        }}>
                          View <ChevronDown size={14} style={{ transform: expandedLogId === globalIdx ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                        </button>
                        {expandedLogId === globalIdx && renderLogDetails(log)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* In-Page Pagination Bar */}
          {auditLogs.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '14px 20px',
              background: '#f8fafc',
              borderTop: '1px solid var(--border-glass)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.84rem', color: '#64748b' }}>
                <span>
                  Showing <strong style={{ color: '#0f2b5c' }}>{auditLogs.length === 0 ? 0 : startIndex + 1}</strong>–<strong style={{ color: '#0f2b5c' }}>{endIndex}</strong> of <strong style={{ color: '#0f2b5c' }}>{auditLogs.length}</strong> entries
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
                      background: '#ffffff',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#0f2b5c',
                      cursor: 'pointer'
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
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
        </>)}
      </div>
    </div>
  );
}
