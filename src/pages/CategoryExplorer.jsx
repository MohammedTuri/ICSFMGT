import { useState, useEffect } from 'react';
import { Download, Upload, Search, Plus, Edit, Trash2, Eye, FileText, CheckCircle, AlertTriangle, FileDown, ArrowUpDown, X } from 'lucide-react';
import { getAllRecords, addRecord, updateRecord, deleteRecord, importRecords } from '../utils/db';
import RecordFormModal from '../components/RecordFormModal';

export default function CategoryExplorer({ category }) {
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('boxNumber');
  const [sortAsc, setSortAsc] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [expandedRecordId, setExpandedRecordId] = useState(null);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Store name mapping
  const storeName = 
    category === 'residence-id' ? 'residence_id' : 
    category === 'eritrean-id' ? 'eritrean_id' :
    category === 'alien-passport' ? 'alien_passport' :
    category === 'yellow-card' ? 'yellow_card' :
    category === 'eoid-normal' ? 'eoid_normal' :
    category === 'eoid-underage' ? 'eoid_underage' :
    category;

  // Load records
  const loadRecords = async () => {
    try {
      const data = await getAllRecords(storeName);
      setRecords(data);
      applyFiltersAndSort(data, searchTerm, sortField, sortAsc);
    } catch (err) {
      console.error('Error loading records:', err);
    }
  };

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('ics_auth_user'));
    setCurrentUser(session);
    loadRecords();
    setExpandedRecordId(null);
    setSearchTerm('');
  }, [category]);

  // Apply search & sorting
  const applyFiltersAndSort = (data, search, field, ascending) => {
    let result = [...data];
    
    // Search filter
    if (search.trim()) {
      const term = search.toUpperCase();
      result = result.filter(r => 
        (r.fullName && r.fullName.toUpperCase().includes(term)) ||
        (r.passportNumber && r.passportNumber.toUpperCase().includes(term)) ||
        (r.boxNumber && r.boxNumber.toUpperCase().includes(term)) ||
        (r.requestNumber && r.requestNumber.toUpperCase().includes(term))
      );
    }

    // Sort
    result.sort((a, b) => {
      let valA = (a[field] || '').toString().toUpperCase();
      let valB = (b[field] || '').toString().toUpperCase();
      
      // Numeric sort for box number if it has numbers
      if (field === 'boxNumber') {
        const numA = parseInt(valA.replace(/\D/g, '')) || 0;
        const numB = parseInt(valB.replace(/\D/g, '')) || 0;
        if (numA !== numB) return ascending ? numA - numB : numB - numA;
      }

      if (valA < valB) return ascending ? -1 : 1;
      if (valA > valB) return ascending ? 1 : -1;
      return 0;
    });

    setFilteredRecords(result);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    applyFiltersAndSort(records, value, sortField, sortAsc);
  };

  const handleSort = (field) => {
    const isAsc = sortField === field ? !sortAsc : true;
    setSortField(field);
    setSortAsc(isAsc);
    applyFiltersAndSort(filteredRecords, searchTerm, field, isAsc);
  };

  // CRUD Operations
  const handleSaveRecord = async (savedRecord) => {
    try {
      if (savedRecord.id) {
        // Edit Mode
        await updateRecord(storeName, savedRecord);
      } else {
        // Add Mode
        await addRecord(storeName, savedRecord);
      }
      setIsModalOpen(false);
      setEditingRecord(null);
      loadRecords();
    } catch (err) {
      console.error('Failed to save record:', err);
      alert('Error saving record. Check database.');
    }
  };

  const handleDeleteRecord = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}'s record?`)) {
      try {
        await deleteRecord(storeName, id);
        loadRecords();
        if (expandedRecordId === id) setExpandedRecordId(null);
      } catch (err) {
        console.error('Failed to delete record:', err);
      }
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (records.length === 0) {
      alert('No records to export.');
      return;
    }

    // Determine headers based on category
    let headers = ['BOX Number', 'Full Name', 'Sex', 'Citizenship'];
    if (category === 'eoid' || category === 'eoid-normal' || category === 'eoid-underage') headers.push('EOID Number');
    if (category === 'residence-id') headers.push('Residence ID No.', 'Company Name');
    if (category === 'etd') headers.push('ETD Number');
    if (category === 'eritrean-id') headers.push('Eritrean ID No.');
    if (category === 'alien-passport') headers.push('Alien Passport No.');
    if (category === 'yellow-card') headers.push('Yellow Card No.');
    headers.push('Passport Number', 'Request Number', 'Date', 'Service Provided');

    // Generate CSV content
    const csvRows = [];
    csvRows.push(headers.join(','));

    records.forEach(r => {
      const row = [
        `"${r.boxNumber || ''}"`,
        `"${r.fullName || ''}"`,
        `"${r.sex || ''}"`,
        `"${r.citizenship || ''}"`,
      ];

      if (category === 'eoid' || category === 'eoid-normal' || category === 'eoid-underage') row.push(`"${r.eoidNumber || ''}"`);
      if (category === 'residence-id') row.push(`"${r.residenceIdNumber || ''}"`, `"${r.companyName || ''}"`);
      if (category === 'etd') row.push(`"${r.etdNumber || ''}"`);
      if (category === 'eritrean-id') row.push(`"${r.eritreanIdNumber || ''}"`);
      if (category === 'alien-passport') row.push(`"${r.alienPassportNumber || ''}"`);
      if (category === 'yellow-card') row.push(`"${r.yellowCardNumber || ''}"`);

      row.push(
        `"${r.passportNumber || ''}"`,
        `"${r.requestNumber || ''}"`,
        `"${r.date || ''}"`,
        `"${r.serviceProvided || ''}"`
      );

      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ics_${category.replace('-', '_')}_records.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Import (Fuzzy Mapper)
  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target.result;
      const lines = text.split(/\r?\n/);
      if (lines.length < 2) {
        alert('Invalid CSV file.');
        return;
      }

      // Helper function to split a CSV line into fields respecting quotes
      const splitCSVLine = (line) => {
        let values = [];
        let insideQuotes = false;
        let currentVal = '';
        for (let char of line) {
          if (char === '"') {
            insideQuotes = !insideQuotes;
          } else if (char === ',' && !insideQuotes) {
            values.push(currentVal.trim().replace(/^"|"$/g, ''));
            currentVal = '';
          } else {
            currentVal += char;
          }
        }
        values.push(currentVal.trim().replace(/^"|"$/g, ''));
        return values;
      };

      let headerLineIndex = -1;
      let rawHeaders = [];

      // Scan first 15 lines to detect header row dynamically
      for (let i = 0; i < Math.min(lines.length, 15); i++) {
        if (!lines[i].trim()) continue;
        const cols = splitCSVLine(lines[i]).map(c => c.toLowerCase());
        const hasPassport = cols.some(c => c.includes('passport'));
        const hasName = cols.some(c => c.includes('name'));
        const hasBox = cols.some(c => c.includes('box'));
        const hasDate = cols.some(c => c.includes('date'));
        
        // If it contains at least two header indicators, this is our header row
        const indicators = [hasPassport, hasName, hasBox, hasDate].filter(Boolean).length;
        if (indicators >= 2) {
          headerLineIndex = i;
          rawHeaders = cols;
          break;
        }
      }

      // If we couldn't find a header row with indicators, fallback to the first non-empty row
      if (headerLineIndex === -1) {
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim()) {
            headerLineIndex = i;
            rawHeaders = splitCSVLine(lines[i]).map(c => c.toLowerCase());
            break;
          }
        }
      }

      if (headerLineIndex === -1) {
        alert('Empty or invalid CSV file.');
        return;
      }
      
      const importedRecords = [];

      for (let i = headerLineIndex + 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = splitCSVLine(lines[i]);
        const record = {};
        
        // Map values to record object based on header mapping
        rawHeaders.forEach((h, idx) => {
          const val = values[idx] || '';
          
          // Fuzzy match headers to normalized attributes
          if (h.includes('box')) record.boxNumber = val.toUpperCase();
          else if (h.includes('name') && !h.includes('company')) record.fullName = val.toUpperCase();
          else if (h.includes('sex') || h.includes('gender')) record.sex = val.toUpperCase() === 'FEMALE' ? 'FEMALE' : 'MALE';
          else if (h.includes('citizen') || h.includes('citizens')) record.citizenship = val.toUpperCase();
          else if (h.includes('passport')) record.passportNumber = val.toUpperCase();
          else if (h.includes('request')) record.requestNumber = val.toUpperCase();
          else if (h.includes('date')) record.date = val || new Date().toISOString().split('T')[0];
          else if (h.includes('service')) record.serviceProvided = val.toUpperCase();
          else if (h.includes('eoid')) record.eoidNumber = val.toUpperCase();
          else if (h.includes('residence') || h.includes('res id') || h.includes('residence id')) record.residenceIdNumber = val.toUpperCase();
          else if (h.includes('company')) record.companyName = val.toUpperCase();
          else if (h.includes('etd')) record.etdNumber = val.toUpperCase();
          else if (h.includes('eritrean') || h.includes('erit id') || h.includes('eritrean id')) record.eritreanIdNumber = val.toUpperCase();
          else if (h.includes('alien') || h.includes('alien pass') || h.includes('alien passport')) record.alienPassportNumber = val.toUpperCase();
          else if (h.includes('yellow') || h.includes('yellow card')) record.yellowCardNumber = val.toUpperCase();
        });

        // Ensure minimum requirements are met
        if (record.fullName && record.passportNumber) {
          if (!record.boxNumber) record.boxNumber = 'UNBOXED';
          record.attachments = [];
          importedRecords.push(record);
        }
      }

      if (importedRecords.length === 0) {
        alert('No valid records found in CSV. Make sure "Full Name" and "Passport Number" columns exist.');
        return;
      }

      try {
        await importRecords(storeName, importedRecords);
        alert(`Successfully imported ${importedRecords.length} records into ${category.toUpperCase()} store!`);
        loadRecords();
      } catch (err) {
        console.error('Import error:', err);
        alert('Failed to import records.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const getTitle = () => {
    if (category === 'visa') return 'VISA Files';
    if (category === 'eoid') return 'Ethiopian Origin ID File';
    if (category === 'eoid-normal') return 'Ethiopian Origin ID — Normal File';
    if (category === 'eoid-underage') return 'Ethiopian Origin ID — Under-Age File';
    if (category === 'residence-id') return 'Residence ID File';
    if (category === 'etd') return 'Emergency Travel Document File';
    if (category === 'eritrean-id') return 'Eritrean ID File';
    if (category === 'alien-passport') return 'Alien Passport File';
    if (category === 'yellow-card') return 'Yellow Card File';
    return 'File Explorer';
  };

  const getHeaderStyle = () => {
    // Return curated color themes for each tab to match Excel screenshot colors
    if (category === 'visa') return { borderLeft: '6px solid var(--accent-emerald)', labelColor: 'var(--accent-emerald)' };
    if (category === 'eoid' || category === 'eoid-normal') return { borderLeft: '6px solid var(--accent-gold)', labelColor: 'var(--accent-gold)' };
    if (category === 'eoid-underage') return { borderLeft: '6px solid #f97316', labelColor: '#f97316' };
    if (category === 'residence-id') return { borderLeft: '6px solid var(--accent-blue)', labelColor: 'var(--accent-blue)' };
    if (category === 'etd') return { borderLeft: '6px solid rgba(165, 180, 252, 1)', labelColor: 'rgba(165, 180, 252, 1)' };
    if (category === 'eritrean-id') return { borderLeft: '6px solid #8b5cf6', labelColor: '#8b5cf6' };
    if (category === 'alien-passport') return { borderLeft: '6px solid #0ea5e9', labelColor: '#0ea5e9' };
    if (category === 'yellow-card') return { borderLeft: '6px solid #ca8a04', labelColor: '#ca8a04' };
    return { borderLeft: '6px solid var(--border-glass)', labelColor: 'var(--text-primary)' };
  };

  const isAuthorized = !currentUser || currentUser.role === 'ADMIN' || currentUser.role === 'SUPERVISOR' || (currentUser.allowedDivisions || []).includes(category) || (currentUser.allowedDivisions || []).includes('eoid-normal') && category === 'eoid-normal' || (currentUser.allowedDivisions || []).includes('eoid-underage') && category === 'eoid-underage';

  if (!isAuthorized) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        gap: '16px',
        color: 'var(--text-secondary)'
      }}>
        <AlertTriangle size={48} style={{ color: 'var(--accent-danger)' }} />
        <h2 style={{ color: 'var(--text-primary)', fontWeight: 400 }}>Unauthorized Clearance Access</h2>
        <p style={{ maxWidth: '400px', ...{ color: 'var(--text-secondary)' }, textAlign: 'center', fontSize: '0.9rem' }}>
          Your account is restricted. You are not assigned to work in the <strong>{category.toUpperCase()} Division</strong>.
        </p>
      </div>
    );
  }
  const styles = getHeaderStyle();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Page Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        paddingLeft: '16px',
        ...styles
      }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 300, fontSize: '1.8rem', letterSpacing: '1px' }}>{getTitle()}</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '0.85rem' }}>Source: - FSD Division Data structuring</p>
        </div>
        
        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {currentUser && currentUser.role !== 'VIEWER' && (
            <button className="glass-button" onClick={() => { setEditingRecord(null); setIsModalOpen(true); }}>
              <Plus size={18} /> Add Entry
            </button>
          )}
          
          <button className="glass-button" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#fff', border: '1px solid rgba(59, 130, 246, 0.3)', boxShadow: 'none' }} onClick={handleExportCSV}>
            <Download size={18} /> Export CSV
          </button>

          {currentUser && currentUser.role !== 'VIEWER' && (
            <label className="glass-button" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', border: '1px solid var(--border-glass)', boxShadow: 'none', cursor: 'pointer' }}>
              <Upload size={18} /> Import CSV
              <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCSV} />
            </label>
          )}
        </div>
      </div>

      {/* Search Widget */}
      <div className="glass-panel" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Search size={20} style={{ color: 'var(--text-secondary)' }} />
        <input 
          className="glass-input" 
          placeholder="Filter this division by Box, Name, Passport or Request Number..." 
          style={{ border: 'none', background: 'transparent', padding: '8px 0', fontSize: '1rem', width: '100%', outline: 'none', boxShadow: 'none' }}
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </div>

      {/* Data Table */}
      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table className="glass-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('boxNumber')} style={{ cursor: 'pointer' }}>
                BOX Number <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
              </th>
              <th onClick={() => handleSort('fullName')} style={{ cursor: 'pointer' }}>
                Full Name <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
              </th>
              <th>Sex</th>
              <th>Citizenship</th>
              
              {/* Category specific headers */}
              {(category === 'eoid' || category === 'eoid-normal' || category === 'eoid-underage') && <th>EOID Number</th>}
              {category === 'residence-id' && (
                <>
                  <th>Residence ID No.</th>
                  <th>Company Name</th>
                </>
              )}
              {category === 'etd' && <th>ETD Number</th>}
              {category === 'eritrean-id' && <th>Eritrean ID No.</th>}
              {category === 'alien-passport' && <th>Alien Passport No.</th>}
              {category === 'yellow-card' && <th>Yellow Card No.</th>}

              <th>Passport Number</th>
              <th>Request Number</th>
              <th>Date</th>
              <th>Service Provided</th>
              <th>Scans</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={category === 'residence-id' ? 12 : 11} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  No records found. Click "Add Entry" or upload a CSV to populate.
                </td>
              </tr>
            ) : (
              filteredRecords.map((r) => {
                const isExpanded = expandedRecordId === r.id;
                const hasAttachments = r.attachments && r.attachments.length > 0;
                return (
                  <>
                    <tr key={r.id} style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border-glass)' }}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.boxNumber}</td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{r.fullName}</span>
                      </td>
                      <td>{r.sex}</td>
                      <td>{r.citizenship || 'N/A'}</td>

                      {/* Category specific cells */}
                      {(category === 'eoid' || category === 'eoid-normal') && <td style={{ fontFamily: 'monospace', color: 'var(--accent-gold)' }}>{r.eoidNumber}</td>}
                      {category === 'eoid-underage' && <td style={{ fontFamily: 'monospace', color: '#f97316' }}>{r.eoidNumber}</td>}
                      {category === 'residence-id' && (
                        <>
                          <td style={{ fontFamily: 'monospace', color: 'var(--accent-blue)' }}>{r.residenceIdNumber}</td>
                          <td>{r.companyName || 'N/A'}</td>
                        </>
                      )}
                      {category === 'etd' && <td style={{ fontFamily: 'monospace', color: 'rgba(165, 180, 252, 1)' }}>{r.etdNumber}</td>}
                      {category === 'eritrean-id' && <td style={{ fontFamily: 'monospace', color: '#8b5cf6' }}>{r.eritreanIdNumber}</td>}
                      {category === 'alien-passport' && <td style={{ fontFamily: 'monospace', color: '#0ea5e9' }}>{r.alienPassportNumber}</td>}
                      {category === 'yellow-card' && <td style={{ fontFamily: 'monospace', color: '#ca8a04' }}>{r.yellowCardNumber}</td>}

                      <td style={{ fontFamily: 'monospace' }}>{r.passportNumber}</td>
                      <td>{r.requestNumber || 'N/A'}</td>
                      <td>{r.date}</td>
                      <td style={{ fontSize: '0.85rem' }}>{r.serviceProvided || 'N/A'}</td>
                      
                      {/* Attachments status indicator */}
                      <td>
                        <span 
                          onClick={() => setExpandedRecordId(isExpanded ? null : r.id)}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            color: hasAttachments ? 'var(--accent-emerald)' : 'var(--accent-danger)',
                            fontWeight: 600
                          }}
                        >
                          {hasAttachments ? (
                            <>
                              <CheckCircle size={14} /> {r.attachments.length} file(s)
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={14} /> Missing
                            </>
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button 
                            className="glass-button" 
                            style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', boxShadow: 'none' }}
                            onClick={() => setExpandedRecordId(isExpanded ? null : r.id)}
                            title="View Attachments"
                          >
                            <Eye size={15} />
                          </button>
                          {currentUser && currentUser.role !== 'VIEWER' && (
                            <button 
                              className="glass-button" 
                              style={{ padding: '6px 10px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', boxShadow: 'none' }}
                              onClick={() => { setEditingRecord(r); setIsModalOpen(true); }}
                              title="Edit"
                            >
                              <Edit size={15} />
                            </button>
                          )}
                          {currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPERVISOR') && (
                            <button 
                              className="glass-button danger" 
                              style={{ padding: '6px 10px' }}
                              onClick={() => handleDeleteRecord(r.id, r.fullName)}
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Row for Evidence Scans */}
                    {isExpanded && (
                      <tr style={{ background: 'rgba(5, 10, 21, 0.3)' }}>
                        <td colSpan={category === 'residence-id' ? 12 : 11} style={{ padding: '24px 32px' }}>
                          <div className="glass-panel animate-fade-in" style={{ padding: '20px', border: '1px solid var(--border-glass)', background: 'rgba(13, 22, 43, 0.8)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                              <h4 style={{ margin: 0, textTransform: 'uppercase', fontSize: '0.85rem', color: 'var(--text-secondary)', letterSpacing: '1px' }}>
                                File Scan Management & Evidence Explorer
                              </h4>
                              {currentUser && currentUser.role !== 'VIEWER' && (
                                <button 
                                  className="glass-button" 
                                  style={{ padding: '4px 10px', fontSize: '0.75rem', height: 'fit-content' }}
                                  onClick={() => { setEditingRecord(r); setIsModalOpen(true); }}
                                >
                                  Edit & Scan New Documents
                                </button>
                              )}
                            </div>

                            {(!r.attachments || r.attachments.length === 0) ? (
                              <div style={{ border: '1px dashed var(--accent-danger)', color: 'var(--accent-danger)', padding: '16px', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <AlertTriangle size={20} />
                                <span><strong>No scanned evidence files attached!</strong> The user has not attached any Passport or Visa documents. Click "Edit & Scan" to attach scans.</span>
                              </div>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
                                {r.attachments.map(att => (
                                  <div key={att.id} className="glass-panel" style={{ padding: '10px', background: 'rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div 
                                      onClick={() => setPreviewAttachment(att)}
                                      style={{ height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', borderRadius: '4px', overflow: 'hidden', cursor: 'pointer' }}
                                      title="Click to view full screen"
                                    >
                                      {att.type.startsWith('image/') ? (
                                        <img src={att.dataUrl} alt={att.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      ) : (
                                        <FileText size={40} style={{ color: 'var(--accent-blue)' }} />
                                      )}
                                    </div>
                                    <div style={{ overflow: 'hidden' }}>
                                      <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={att.name}>
                                        {att.name}
                                      </span>
                                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>
                                        {Math.round(att.size / 1024)} KB
                                      </span>
                                    </div>
                                    <a 
                                      href={att.dataUrl} 
                                      download={att.name}
                                      style={{ 
                                        textDecoration: 'none', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        gap: '6px', 
                                        fontSize: '0.75rem', 
                                        color: 'var(--accent-emerald)', 
                                        background: 'rgba(16, 185, 129, 0.1)',
                                        border: '1px solid rgba(16, 185, 129, 0.3)',
                                        borderRadius: '4px',
                                        padding: '6px',
                                        fontWeight: 'bold',
                                        transition: 'all 0.2s'
                                      }}
                                      className="download-btn-hover"
                                    >
                                      <FileDown size={14} /> Download Scan
                                    </a>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit/Add Modal */}
      <RecordFormModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingRecord(null); }}
        onSave={handleSaveRecord}
        activeTab={category}
        initialRecord={editingRecord}
      />

      {/* Lightbox Preview Modal */}
      {previewAttachment && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 10, 21, 0.96)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 2000,
          padding: '24px'
        }}>
          {/* Lightbox Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            marginBottom: '16px',
            borderBottom: '1px solid var(--border-glass)',
            paddingBottom: '16px'
          }}>
            <div>
              <h3 style={{ margin: 0, fontWeight: 300, fontSize: '1.2rem' }}>
                Document Viewer — <span style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>{previewAttachment.name}</span>
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {Math.round(previewAttachment.size / 1024)} KB • Attached on {new Date(previewAttachment.uploadedAt).toLocaleString()}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <a 
                href={previewAttachment.dataUrl} 
                download={previewAttachment.name}
                className="glass-button"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                <FileDown size={16} /> Download
              </a>
              <button 
                onClick={() => setPreviewAttachment(null)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-glass)',
                  color: 'var(--text-primary)',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Lightbox Image Preview Body */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            {previewAttachment.type.startsWith('image/') ? (
              <img 
                src={previewAttachment.dataUrl} 
                alt={previewAttachment.name} 
                style={{
                  maxWidth: '95%',
                  maxHeight: '95%',
                  objectFit: 'contain',
                  border: '2px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  boxShadow: '0 30px 60px rgba(0,0,0,0.9)',
                  background: '#000'
                }} 
              />
            ) : (
              <iframe 
                src={previewAttachment.dataUrl} 
                title={previewAttachment.name}
                style={{
                  width: '85vw',
                  height: '75vh',
                  border: 'none',
                  borderRadius: '8px',
                  background: '#fff'
                }}
              />
            )}
          </div>
        </div>
      )}

    </div>
  );
}
