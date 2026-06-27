import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Upload, Search, Plus, Edit, Trash2, FileText, CheckCircle, AlertTriangle, FileDown, ArrowUpDown, X, BarChart2, Fingerprint, Award, FileWarning, IdCard, Globe, CreditCard, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getAllRecords, addRecord, updateRecord, deleteRecord, importRecords, logAuditEntry } from '../utils/db';
import RecordFormModal from '../components/RecordFormModal';

export default function CategoryExplorer({ category }) {
  const navigate = useNavigate();
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
  const [toast, setToast] = useState(null);
  // Scans uploaded via header (preview/download/remove)
  const [scans, setScans] = useState([]);
  const [scanModalOpen, setScanModalOpen] = useState(false);

  const handleScanFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const readers = files.map(file => new Promise(resolve => {
      const r = new FileReader();
      r.onload = () => resolve({ name: file.name, size: file.size, dataUrl: r.result, uploadedAt: Date.now() });
      r.readAsDataURL(file);
    }));
    Promise.all(readers).then(results => {
      setScans(prev => [...results, ...prev]);
      setScanModalOpen(true);
    }).catch(err => console.error('Scan read error:', err));
    e.target.value = '';
  };

  const removeScan = (index) => {
    setScans(prev => prev.filter((_, i) => i !== index));
  };
  
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
        (r.personalId && r.personalId.toUpperCase().includes(term)) ||
        (r.passportNumber && r.passportNumber.toUpperCase().includes(term)) ||
        (r.boxNumber && r.boxNumber.toUpperCase().includes(term)) ||
        (r.requestNumber && r.requestNumber.toUpperCase().includes(term)) ||
        (r.shelfNumber && r.shelfNumber.toUpperCase().includes(term))
      );
    }

    // Sort
    result.sort((a, b) => {
      let valA = (a[field] || '').toString().toUpperCase();
      let valB = (b[field] || '').toString().toUpperCase();
      
      // Numeric sort for box/shelf numbers if they contain digits
      if (field === 'boxNumber' || field === 'shelfNumber') {
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
      // Duplicate Passport Number Check
      const passportKey = savedRecord.passportNumber?.trim().toUpperCase();
      const isDuplicate = records.some(r => r.id !== savedRecord.id && r.passportNumber?.trim().toUpperCase() === passportKey);
      if (isDuplicate) {
        alert(`Clearance Error: A record with Passport Number "${savedRecord.passportNumber}" already exists in this division!`);
        return;
      }

      if (savedRecord.id) {
        // Edit Mode
        const existingRecord = records.find(r => r.id === savedRecord.id);
        const recordToUpdate = { ...savedRecord, officerName: currentUser?.fullName || currentUser?.username || 'Unknown Officer' };
        await updateRecord(storeName, recordToUpdate);
        
        // Log the update
        await logAuditEntry(
          'UPDATE',
          storeName,
          currentUser?.id || 'unknown',
          currentUser?.fullName || currentUser?.username || 'Unknown User',
          recordToUpdate.id,
          recordToUpdate,
          existingRecord
        );
        setToast({ type: 'update', message: `${recordToUpdate.fullName || 'Record'} has been updated in the system successfully!` });
      } else {
        // Add Mode
        const recordToAdd = { ...savedRecord, officerName: currentUser?.fullName || currentUser?.username || 'Unknown Officer' };
        const newId = await addRecord(storeName, recordToAdd);
        
        // Log the creation
        await logAuditEntry(
          'CREATE',
          storeName,
          currentUser?.id || 'unknown',
          currentUser?.fullName || currentUser?.username || 'Unknown User',
          newId,
          recordToAdd
        );
        setToast({ type: 'create', message: `${recordToAdd.fullName || 'Record'} has been inserted and posted to the system successfully!` });
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
        const recordToDelete = records.find(r => r.id === id);
        await deleteRecord(storeName, id);
        
        // Log the deletion
        await logAuditEntry(
          'DELETE',
          storeName,
          currentUser?.id || 'unknown',
          currentUser?.fullName || currentUser?.username || 'Unknown User',
          id,
          recordToDelete || { id }
        );

        setToast({ type: 'delete', message: `${name || 'Record'} has been deleted from the system successfully!` });
        loadRecords();
        if (expandedRecordId === id) setExpandedRecordId(null);
      } catch (err) {
        console.error('Failed to delete record:', err);
      }
    }
  };

  // Print Record Card
  const handlePrintCard = (record) => {
    const fieldRows = [
      ['Full Name', record.fullName],
      ['Personal ID', record.personalId],
      ['Passport Number', record.passportNumber],
      ['Box Number', record.boxNumber],
      ['Shelf Number', record.shelfNumber],
      ['Date', record.date],
      ['Service Provided', record.serviceProvided],
      ['Citizenship', record.citizenship],
      ['Request Number', record.requestNumber],
      ['Sex', record.sex],
      ['EOID Number', record.eoidNumber],
      ['Residence ID', record.residenceIdNumber],
      ['Company', record.companyName],
      ['ETD Number', record.etdNumber],
      ['Eritrean ID', record.eritreanIdNumber],
      ['Alien Passport No.', record.alienPassportNumber],
      ['Yellow Card No.', record.yellowCardNumber],
    ].filter(([, v]) => v !== undefined && v !== null && v !== '');

    const rows = fieldRows.map(([label, value]) => `
      <tr>
        <td style="padding:9px 14px;font-size:0.82rem;font-weight:600;color:#64748b;width:42%;border-bottom:1px solid #e2e8f0;">${label}</td>
        <td style="padding:9px 14px;font-size:0.82rem;color:#0f2b5c;border-bottom:1px solid #e2e8f0;font-weight:500;">${value}</td>
      </tr>`).join('');

    const divisionTitle = category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const printDate = new Date().toLocaleString();

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Record Card — ${record.fullName || record.personalId}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: #f1f5f9; display: flex; align-items: flex-start; justify-content: center; padding: 40px 20px; }
    .card { width: 100%; max-width: 560px; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.12); }
    .no-print { }
    @media print {
      body { background: #fff; padding: 0; }
      .card { box-shadow: none; border-radius: 0; max-width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
<div class="card">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:24px 28px;color:#fff;">
    <div style="font-size:0.7rem;font-weight:600;letter-spacing:2px;color:rgba(255,255,255,0.45);text-transform:uppercase;margin-bottom:6px;">ICS File Management System</div>
    <div style="font-size:1.4rem;font-weight:800;letter-spacing:-0.3px;">${record.fullName || '—'}</div>
    <div style="margin-top:4px;font-size:0.82rem;color:rgba(255,255,255,0.6);">Division: ${divisionTitle} &nbsp;|&nbsp; Record ID: ${record.id || '—'}</div>
  </div>

  <!-- Fields table -->
  <table style="width:100%;border-collapse:collapse;">
    <tbody>${rows}</tbody>
  </table>

  <!-- Footer -->
  <div style="padding:14px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
    <span style="font-size:0.72rem;color:#94a3b8;">Printed: ${printDate}</span>
    <button class="no-print" onclick="window.print()" style="padding:8px 20px;background:#0f172a;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:0.82rem;cursor:pointer;">🖨 Print</button>
  </div>
</div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    } else {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `record_card_${(record.fullName || record.id || 'record').replace(/\s+/g, '_')}.html`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Excel Export
  const handleExportExcel = () => {
    if (records.length === 0) {
      alert('No records to export.');
      return;
    }

    // Determine headers based on category
    let headers = ['Shelf No.', 'BOX Number', 'Personal ID', 'Full Name', 'Sex', 'Citizenship'];
    if (category === 'eoid' || category === 'eoid-normal' || category === 'eoid-underage') headers.push('EOID Number');
    if (category === 'residence-id') headers.push('Residence ID No.', 'Company Name');
    if (category === 'etd') headers.push('ETD Number');
    if (category === 'eritrean-id') headers.push('Eritrean ID No.');
    if (category === 'alien-passport') headers.push('Alien Passport No.');
    if (category === 'yellow-card') headers.push('Yellow Card No.');
    headers.push('Passport Number', 'Request Number', 'Date', 'Service Provided');

    // Generate sheet data
    const data = records.map(r => {
      const row = {
        'Shelf No.': r.shelfNumber || '',
        'BOX Number': r.boxNumber || '',
        'Personal ID': r.personalId || '',
        'Full Name': r.fullName || '',
        'Sex': r.sex || '',
        'Citizenship': r.citizenship || '',
      };

      if (category === 'eoid' || category === 'eoid-normal' || category === 'eoid-underage') row['EOID Number'] = r.eoidNumber || '';
      if (category === 'residence-id') {
        row['Residence ID No.'] = r.residenceIdNumber || '';
        row['Company Name'] = r.companyName || '';
      }
      if (category === 'etd') row['ETD Number'] = r.etdNumber || '';
      if (category === 'eritrean-id') row['Eritrean ID No.'] = r.eritreanIdNumber || '';
      if (category === 'alien-passport') row['Alien Passport No.'] = r.alienPassportNumber || '';
      if (category === 'yellow-card') row['Yellow Card No'] = r.yellowCardNumber || '';

      row['Passport Number'] = r.passportNumber || '';
      row['Request Number'] = r.requestNumber || '';
      row['Date'] = r.date || '';
      row['Service Provided'] = r.serviceProvided || '';
      
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Records');
    XLSX.writeFile(workbook, `ics_${category.replace('-', '_')}_records.xlsx`);
  };

  // Excel Import
  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Read sheet as raw rows array to find the header row dynamically
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (rows.length === 0) {
          alert('Empty or invalid Excel file.');
          return;
        }

        // Scan first 15 rows to find the actual header row dynamically
        let headerRowIndex = -1;
        let headers = [];

        for (let i = 0; i < Math.min(rows.length, 15); i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          
          const cols = row.map(c => String(c || '').toLowerCase().trim());
          const hasPassport = cols.some(c => c.includes('passport'));
          const hasName = cols.some(c => c.includes('name'));
          const hasBox = cols.some(c => c.includes('box'));
          const hasDate = cols.some(c => c.includes('date'));

          // Match header if at least two indicators are met
          const indicators = [hasPassport, hasName, hasBox, hasDate].filter(Boolean).length;
          if (indicators >= 2) {
            headerRowIndex = i;
            headers = row;
            break;
          }
        }

        // Fallback: use the first non-empty row if indicators fail
        if (headerRowIndex === -1) {
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (row && row.length > 0 && row.some(c => c !== '')) {
              headerRowIndex = i;
              headers = row;
              break;
            }
          }
        }

        if (headerRowIndex === -1) {
          alert('Invalid Excel file structure.');
          return;
        }

        const importedRecords = [];
        const existingPassports = new Set(records.map(r => r.passportNumber?.trim().toUpperCase()));
        const newPassportsInFile = new Set();
        let duplicateCount = 0;

        // Parse data starting from the row after the headers
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0 || row.every(c => c === '')) continue;

          const record = {};
          
          headers.forEach((h, colIdx) => {
            const val = String(row[colIdx] || '').trim();
            const hLower = String(h || '').toLowerCase().trim();

            if (hLower.includes('personal') || hLower.includes('personal id') || hLower.includes('personal_id')) record.personalId = val.toUpperCase();
            else if (hLower.includes('shelf')) record.shelfNumber = val.toUpperCase();
            else if (hLower.includes('box')) record.boxNumber = val.toUpperCase();
            else if (hLower.includes('name') && !hLower.includes('company')) record.fullName = val.toUpperCase();
            else if (hLower.includes('sex') || hLower.includes('gender')) record.sex = val.toUpperCase() === 'FEMALE' ? 'FEMALE' : 'MALE';
            else if (hLower.includes('citizen') || hLower.includes('citizens')) record.citizenship = val.toUpperCase();
            else if (hLower.includes('passport')) record.passportNumber = val.toUpperCase();
            else if (hLower.includes('request')) record.requestNumber = val.toUpperCase();
            else if (hLower.includes('date')) record.date = val || new Date().toISOString().split('T')[0];
            else if (hLower.includes('service')) record.serviceProvided = val.toUpperCase();
            else if (hLower.includes('eoid')) record.eoidNumber = val.toUpperCase();
            else if (hLower.includes('residence') || hLower.includes('res id') || hLower.includes('residence id')) record.residenceIdNumber = val.toUpperCase();
            else if (hLower.includes('company')) record.companyName = val.toUpperCase();
            else if (hLower.includes('etd')) record.etdNumber = val.toUpperCase();
            else if (hLower.includes('eritrean') || hLower.includes('erit id') || hLower.includes('eritrean id')) record.eritreanIdNumber = val.toUpperCase();
            else if (hLower.includes('alien') || hLower.includes('alien pass') || hLower.includes('alien passport')) record.alienPassportNumber = val.toUpperCase();
            else if (hLower.includes('yellow') || hLower.includes('yellow card')) record.yellowCardNumber = val.toUpperCase();
          });

          // Ensure minimum requirements are met
          if (record.fullName && record.passportNumber) {
            const passportKey = record.passportNumber.trim().toUpperCase();
            
            // Duplicate Check: Check if already exists in DB OR is a duplicate in the same file
            if (existingPassports.has(passportKey) || newPassportsInFile.has(passportKey)) {
              duplicateCount++;
            } else {
              if (!record.shelfNumber) record.shelfNumber = '';
              if (!record.boxNumber) record.boxNumber = 'UNBOXED';
              record.attachments = [];
              importedRecords.push(record);
              newPassportsInFile.add(passportKey);
            }
          }
        }

        if (importedRecords.length === 0) {
          if (duplicateCount > 0) {
            alert(`No new records imported. All ${duplicateCount} entries in the Excel file were detected as duplicates of existing records.`);
          } else {
            alert('No valid records found in Excel. Make sure "Full Name" and "Passport Number" columns exist.');
          }
          return;
        }

        await importRecords(storeName, importedRecords);
        
        // Log the bulk import
        await logAuditEntry(
          'IMPORT',
          storeName,
          currentUser?.id || 'unknown',
          currentUser?.fullName || currentUser?.username || 'Unknown User',
          null,
          { importedCount: importedRecords.length, duplicateCount, records: importedRecords }
        );

        let msg = `Successfully imported ${importedRecords.length} records into ${category.toUpperCase()} store!`;
        if (duplicateCount > 0) {
          msg += ` (Ignored ${duplicateCount} duplicate entries to prevent redundancy)`;
        }
        alert(msg);
        loadRecords();
      } catch (err) {
        console.error('Import error:', err);
        alert('Failed to import Excel file. Verify file schema.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Reset input
  };

  const getTitle = () => {
    if (category === 'visa') return 'VISA Files';
    if (category === 'eoid' || category === 'eoid-normal' || category === 'eoid-underage') return 'Ethiopian Origin ID File';
    if (category === 'residence-id') return 'Residence ID File';
    if (category === 'etd') return 'Emergency Travel Document File';
    if (category === 'eritrean-id') return 'Eritrean ID File';
    if (category === 'alien-passport') return 'Alien Passport File';
    if (category === 'yellow-card') return 'Yellow Card File';
    return 'File Explorer';
  };

  const eoidDropdownOptions = [
    { value: 'normal', label: 'Normal EOID File' },
    { value: 'underage', label: 'Under-Age EOID File' }
  ];

  const currentEoidOption = category === 'eoid-underage' ? 'underage' : 'normal';

  const handleEoidSelection = (value) => {
    navigate(`/eoid/${value}`);
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

  // Privilege checking function based on user role and granular permissions
  const canAdd = currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPERVISOR' || (currentUser.role === 'OFFICER' && currentUser.permissions?.add));
  const canEdit = currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPERVISOR' || (currentUser.role === 'OFFICER' && currentUser.permissions?.edit));
  const canDelete = currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPERVISOR' || (currentUser.role === 'OFFICER' && currentUser.permissions?.delete));
  const canImport = currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPERVISOR');

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
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem' }}>Source: - FSD Division Data structuring</p>
            {(category === 'eoid-normal' || category === 'eoid-underage') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 600, whiteSpace: 'nowrap' }}>EOID Type:</label>
                <select
                  value={category === 'eoid-underage' ? 'underage' : 'normal'}
                  onChange={(e) => navigate(`/eoid/${e.target.value}`)}
                  style={{
                    color: '#fff',
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    padding: '8px 12px',
                    borderRadius: '999px',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    outline: 'none',
                    minWidth: '180px'
                  }}
                >
                  <option value="normal">Normal EOID File</option>
                  <option value="underage">Under-Age EOID File</option>
                </select>
              </div>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {canAdd && (
            <button className="glass-button" onClick={() => { setEditingRecord(null); setIsModalOpen(true); }}>
              <Plus size={18} /> Add Entry
            </button>
          )}
          
          <label className="glass-button" style={{ background: 'rgba(255,255,255,0.03)', color: '#fff', border: '1px solid rgba(255,255,255,0.06)', boxShadow: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} /> Scans
            <input type="file" accept="image/*,application/pdf" multiple style={{ display: 'none' }} onChange={handleScanFiles} />
          </label>

          <button className="glass-button" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#fff', border: '1px solid rgba(59, 130, 246, 0.3)', boxShadow: 'none' }} onClick={handleExportExcel}>
            <Download size={18} /> Export Excel
          </button>

          {canImport && (
            <label className="glass-button" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', border: '1px solid var(--border-glass)', boxShadow: 'none', cursor: 'pointer' }}>
              <Upload size={18} /> Import Excel
              <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={handleImportExcel} />
            </label>
          )}
          
        </div>
      </div>

      {/* Informational Panel instead of Data Table */}
      <div style={{ margin: '20px 0' }}>
        {(() => {
          const getModuleConfig = (moduleKey) => {
            const configs = {
              'visa': {
                title: 'VISA Files',
                desc: 'A Visa is an official document or endorsement on a passport indicating that the holder is allowed to enter, leave, or stay for a specified period of time in a country. The VISA Files module manages incoming entry visa records, extension timelines, and stay permit durations, helping officers track and oversee visa classifications and validity states for all foreign nationals.',
                color: '#10b981',
                icon: <FileText size={24} />
              },
              'eoid-normal': {
                title: 'Ethiopian Origin ID — Normal File',
                desc: 'An Ethiopian Origin ID Card (commonly known as the Yellow Card) is issued to foreign nationals of Ethiopian origin, granting them various rights and privileges similar to citizens, such as visa-free entry and residence. This module manages registration files, family lineages, citizenship dossiers, and biometric credentials for adult applicants.',
                color: '#f59e0b',
                icon: <Fingerprint size={24} />
              },
              'eoid-underage': {
                title: 'Ethiopian Origin ID — Under-Age File',
                desc: 'Specifically manages registration files and identification dossiers for minor applicants under the age of 18 of Ethiopian origin. This division handles birth certificates, legal guardian declarations, and child identification records to document family linkage credentials.',
                color: '#f97316',
                icon: <Fingerprint size={24} />
              },
              'residence-id': {
                title: 'Residence ID File',
                desc: 'A Residence ID Card grants a foreign national the legal right to reside in the country under specified conditions (such as work, study, or retirement). This module archives residential permits, employer/sponsor linkages, company registrations, and validity certificates for foreign residents.',
                color: '#3b82f6',
                icon: <Award size={24} />
              },
              'etd': {
                title: 'Emergency Travel Document File',
                desc: 'An Emergency Travel Document (ETD) is a temporary one-way travel pass issued to individuals who need to travel urgently but do not possess a valid passport (due to loss, theft, or expiration). This module documents emergency transit passes, emergency contact directories, departure approvals, and temporary travel permits issued to travelers.',
                color: '#a5b4fc',
                icon: <FileWarning size={24} />
              },
              'eritrean-id': {
                title: 'Eritrean ID File',
                desc: 'A specialized verification registry for individuals of Eritrean origin. This module coordinates registry archives, identity folders, family heritage, background verification dossiers, and immigration status credentials for Eritrean origin identification.',
                color: '#8b5cf6',
                icon: <IdCard size={24} />
              },
              'alien-passport': {
                title: 'Alien Passport File',
                desc: 'An Alien Passport is a travel document issued to stateless persons or foreign residents who are unable to obtain a passport from their country of nationality. This module tracks foreign passport registrations, stateless resident dossiers, alien identification folders, and entry-exit histories.',
                color: '#0ea5e9',
                icon: <Globe size={24} />
              },
              'yellow-card': {
                title: 'Yellow Card File',
                desc: 'Administers registration timelines, validation records, renewal parameters, and dossier credentials for Yellow Card identification holders. It organizes files to ensure compliant renewal histories and valid identity status checks.',
                color: '#ca8a04',
                icon: <CreditCard size={24} />
              }
            };
            return configs[moduleKey] || {
              title: 'Immigration Division Module',
              desc: 'Core file structuring registry for FSD division dossiers.',
              color: '#64748b',
              icon: <FileText size={24} />
            };
          };

          const currentConfig = getModuleConfig(category);

          return (
            <div className="glass-panel animate-fade-in" style={{ 
              padding: '32px', 
              display: 'flex', 
              gap: '24px',
              alignItems: 'center', 
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(248, 250, 252, 0.85) 100%)',
              border: '1px solid var(--border-glass)',
              borderRadius: '16px',
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '14px',
                background: `${currentConfig.color}12`,
                border: `1px solid ${currentConfig.color}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: currentConfig.color,
                boxShadow: `0 0 16px ${currentConfig.color}15`,
                flexShrink: 0
              }}>
                {currentConfig.icon}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 6px 0', fontWeight: 600, fontSize: '1.25rem', color: 'var(--text-primary)', letterSpacing: '0.3px' }}>
                  {currentConfig.title}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.55', margin: 0 }}>
                  {currentConfig.desc}
                </p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Secure Record Lookup Panel — bulk data is hidden; search to access individual records */}
      <div className="glass-panel animate-fade-in" style={{
        marginTop: 8,
        padding: '32px',
        borderRadius: '16px',
        border: '1px solid var(--border-glass)',
        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.95) 100%)',
        backdropFilter: 'blur(8px)',
      }}>

        {/* Panel Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '12px',
              background: `${styles.labelColor}12`,
              border: `1px solid ${styles.labelColor}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: styles.labelColor,
              boxShadow: `0 0 14px ${styles.labelColor}15`,
              flexShrink: 0
            }}>
              <Search size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary)', letterSpacing: '0.3px' }}>Record Lookup</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {records.length === 0
                  ? 'No records registered in this module yet.'
                  : `${records.length} record${records.length !== 1 ? 's' : ''} stored — search to locate and manage individual entries.`}
              </p>
            </div>
          </div>
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); applyFiltersAndSort(records, '', sortField, sortAsc); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: '999px',
                border: '1px solid var(--border-glass)',
                background: 'rgba(15, 43, 92, 0.04)',
                color: 'var(--text-secondary)', fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <X size={13} /> Clear Search
            </button>
          )}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', marginBottom: '24px' }}>
          <Search size={16} style={{
            position: 'absolute', left: '14px', top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-secondary)', pointerEvents: 'none'
          }} />
          <input
            type="text"
            placeholder="Search by Full Name, Passport No., Personal ID, Box Number…"
            value={searchTerm}
            onChange={handleSearchChange}
            style={{
              width: '100%',
              padding: '13px 16px 13px 42px',
              borderRadius: '10px',
              border: '1px solid rgba(15, 43, 92, 0.12)',
              background: '#ffffff',
              color: 'var(--text-primary)',
              fontSize: '0.93rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Results Area */}
        {searchTerm.trim() === '' ? (
          /* Idle state */
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '48px 16px', gap: '14px',
            border: '1px dashed rgba(15, 43, 92, 0.12)', borderRadius: '12px',
            background: 'rgba(15, 43, 92, 0.015)'
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(15, 43, 92, 0.04)',
              border: '1px solid rgba(15, 43, 92, 0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(15, 43, 92, 0.45)'
            }}>
              <Search size={22} />
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', maxWidth: 380 }}>
              Enter a name, passport number, or ID above to locate a specific record.<br />
              <span style={{ opacity: 0.6, fontSize: '0.82rem' }}>Bulk data is restricted for security purposes.</span>
            </p>
          </div>
        ) : filteredRecords.length === 0 ? (
          /* No match */
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '40px 16px', gap: '12px',
            border: '1px dashed rgba(220,38,38,0.2)', borderRadius: '12px',
            background: 'rgba(220,38,38,0.04)'
          }}>
            <AlertTriangle size={28} style={{ color: '#ef4444', opacity: 0.6 }} />
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              No records matched <strong style={{ color: 'var(--text-primary)' }}>"{searchTerm}"</strong> in this module.
            </p>
          </div>
        ) : (
          /* Matched results */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: 'var(--text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              {filteredRecords.length} result{filteredRecords.length !== 1 ? 's' : ''} found
            </p>
            {filteredRecords.map((r) => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
                padding: '18px 22px',
                borderRadius: '12px',
                border: '1px solid var(--border-glass)',
                background: 'linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)',
              }}>
                {/* Record Info */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '28px', flex: 1, minWidth: 0 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</p>
                    <p style={{ margin: '3px 0 0 0', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{r.fullName || '—'}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Personal ID</p>
                    <p style={{ margin: '3px 0 0 0', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem', color: styles.labelColor }}>{r.personalId || '—'}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Passport No.</p>
                    <p style={{ margin: '3px 0 0 0', fontFamily: 'monospace', fontSize: '0.88rem', color: 'var(--text-primary)' }}>{r.passportNumber || '—'}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Box / Shelf</p>
                    <p style={{ margin: '3px 0 0 0', fontSize: '0.88rem', color: 'var(--text-primary)' }}>{r.boxNumber || '—'} / {r.shelfNumber || '—'}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</p>
                    <p style={{ margin: '3px 0 0 0', fontSize: '0.88rem', color: 'var(--text-primary)' }}>{r.date || '—'}</p>
                  </div>
                </div>
                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  {/* Print Card button — always visible */}
                  <button
                    onClick={() => handlePrintCard(r)}
                    title="Print Record Card"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px', borderRadius: '8px',
                      border: '1px solid rgba(16,185,129,0.35)',
                      background: 'rgba(16,185,129,0.08)',
                      color: '#34d399', fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Printer size={14} /> Print
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => { setEditingRecord(r); setIsModalOpen(true); }}
                      title="Edit Record"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 16px', borderRadius: '8px',
                        border: '1px solid rgba(59,130,246,0.35)',
                        background: 'rgba(59,130,246,0.12)',
                        color: '#93c5fd', fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                    >
                      <Edit size={14} /> Edit
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDeleteRecord(r.id, r.fullName || r.personalId)}
                      title="Delete Record"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 16px', borderRadius: '8px',
                        border: '1px solid rgba(220,38,38,0.3)',
                        background: 'rgba(220,38,38,0.08)',
                        color: '#f87171', fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Edit/Add Modal */}
      <RecordFormModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingRecord(null); }}
        onSave={handleSaveRecord}
        activeTab={category}
        initialRecord={editingRecord}
      />

      {/* Scans Modal */}
      {scanModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,10,21,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '24px' }}>
          <div style={{ width: 'min(1000px, 95%)', maxHeight: '90vh', overflow: 'auto', background: 'rgba(10,18,38,0.98)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#fff' }}>Scans</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setScanModalOpen(false)} className="glass-button">Close</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
              {scans.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No scans uploaded.</p>
              ) : scans.map((s, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8 }}>
                  {String(s.dataUrl || '').startsWith('data:image') ? (
                    <img src={s.dataUrl} alt={s.name} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 6 }} />
                  ) : (
                    <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      <FileText size={28} />
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{s.name}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{Math.round(s.size / 1024)} KB</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <a href={s.dataUrl} download={s.name} className="glass-button" style={{ padding: '6px 10px' }}><FileDown size={14} /> Download</a>
                      <button onClick={() => removeScan(i)} className="glass-button" style={{ padding: '6px 10px', background: 'rgba(220,38,38,0.08)', color: '#f87171' }}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
      
      {toast && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="glass-panel animate-fade-in" style={{
            width: '100%',
            maxWidth: '380px',
            padding: '24px 28px',
            textAlign: 'center',
            border: `1px solid ${toast.type === 'delete' ? 'rgba(239, 68, 68, 0.25)' : toast.type === 'create' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(59, 130, 246, 0.25)'}`,
            background: '#ffffff',
            boxShadow: '0 20px 40px rgba(15, 43, 92, 0.12)',
            borderRadius: '16px'
          }}>
            {/* Header Colored Indicator Icon */}
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: toast.type === 'delete' ? 'rgba(239, 68, 68, 0.08)' : toast.type === 'create' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(59, 130, 246, 0.08)',
              color: toast.type === 'delete' ? 'var(--accent-danger)' : toast.type === 'create' ? 'var(--accent-emerald)' : 'var(--accent-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              {toast.type === 'delete' ? <Trash2 size={26} /> : toast.type === 'create' ? <CheckCircle size={26} /> : <Edit size={26} />}
            </div>

            <h3 style={{
              margin: '0 0 8px 0',
              fontWeight: 700,
              fontSize: '1.15rem',
              color: 'var(--text-primary)',
              letterSpacing: '0.2px'
            }}>
              {toast.type === 'delete' ? 'Deleted Successfully' : toast.type === 'create' ? 'Posted Successfully' : 'Updated Successfully'}
            </h3>

            <p style={{
              margin: '0 0 24px 0',
              fontSize: '0.86rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.5'
            }}>
              {toast.message}
            </p>

            <button
              onClick={() => setToast(null)}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                color: '#ffffff',
                background: toast.type === 'delete' ? 'var(--accent-danger)' : toast.type === 'create' ? 'var(--accent-emerald)' : 'var(--accent-blue)',
                transition: 'opacity 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = 0.9}
              onMouseLeave={e => e.currentTarget.style.opacity = 1}
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
