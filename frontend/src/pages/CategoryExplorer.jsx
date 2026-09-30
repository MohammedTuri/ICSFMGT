import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Download, Upload, Search, Plus, Edit, Trash2, FileText, CheckCircle, AlertTriangle, FileDown, ArrowUpDown, X, BarChart2, Fingerprint, Award, FileWarning, IdCard, Globe, CreditCard, Printer, AlertCircle, MapPin, QrCode, Sparkles, Package, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getAllRecords, addRecord, updateRecord, deleteRecord, importRecords, logAuditEntry, getSystemModules } from '../utils/db';
import { useBranch } from '../context/BranchContext';
import RecordFormModal from '../components/RecordFormModal';
import RecordViewModal from '../components/RecordViewModal';
import BarcodeQRModal from '../components/BarcodeQRModal';
import BulkIngestionModal from '../components/BulkIngestionModal';

export default function CategoryExplorer({ category: categoryProp, customModule: customModuleProp = null }) {
  const navigate = useNavigate();
  const params = useParams();
  const category = categoryProp || params.category || '';
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deepOcrSearch, setDeepOcrSearch] = useState(false);
  const [sortField, setSortField] = useState('boxNumber');
  const [sortAsc, setSortAsc] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkIngestOpen, setIsBulkIngestOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [barcodeModalRecord, setBarcodeModalRecord] = useState(null);
  const [expandedRecordId, setExpandedRecordId] = useState(null);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [customModule, setCustomModule] = useState(customModuleProp);
  // Scans uploaded via header (preview/download/remove)
  const [scans, setScans] = useState([]);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [eoidView, setEoidView] = useState('normal');
  const PAGE_SIZE = 15;

  useEffect(() => {
    if (customModuleProp) {
      setCustomModule(customModuleProp);
    } else if (category) {
      getSystemModules().then(mods => {
        const found = (mods || []).find(m => 
          typeof m?.key === 'string' && (
            m.key === category ||
            m.key.toLowerCase() === category.toLowerCase() ||
            m.key.replace(/_/g, '-') === category.replace(/_/g, '-') ||
            m.key.replace(/-/g, '_') === category.replace(/-/g, '_')
          )
        );
        if (found) setCustomModule(found);
      }).catch(() => {});
    }
  }, [category, customModuleProp]);

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
  
  const { selectedBranch, userBranch, isAdmin, filterByBranch } = useBranch();

  // Store name mapping — eoid-normal and eoid-underage both use the single 'eoid' table
  const storeName = 
    category === 'residence-id' ? 'residence_id' : 
    category === 'residence-id-cancellation' ? 'residence_id_cancellation' :
    category === 'eritrean-id' ? 'eritrean_id' :
    category === 'alien-passport' ? 'alien_passport' :
    category === 'eoid-normal' ? 'eoid' :      // unified eoid table
    category === 'eoid-underage' ? 'eoid' :    // unified eoid table
    (category || '').replace(/-/g, '_');

  // Determine expected eoidType for the current category (used for filter and save)
  const eoidTypeForCategory =
    category === 'eoid-normal' ? 'EOID-NORMAL' :
    category === 'eoid-underage' ? 'EOID-UNDER-AGE' :
    category === 'eoid' ? (eoidView === 'underage' ? 'EOID-UNDER-AGE' : 'EOID-NORMAL') :
    null;

  // Load records
  const loadRecords = async () => {
    try {
      let data = await getAllRecords(storeName);
      // For EOID sub-categories, filter by eoidType
      if (eoidTypeForCategory) {
        data = data.filter(r =>
          r.eoidType === eoidTypeForCategory ||
          // Backward compat: records without eoidType fall under eoid-normal
          (!r.eoidType && eoidTypeForCategory === 'EOID-NORMAL')
        );
      }
      const scoped = filterByBranch(data);
      setRecords(scoped);
      applyFiltersAndSort(scoped, searchTerm, sortField, sortAsc);
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
  }, [category, selectedBranch, eoidView]);

  // Apply search & sorting
  const applyFiltersAndSort = (data, search, field, ascending, ocrSearchMode = deepOcrSearch) => {
    let result = Array.isArray(data) ? [...data].filter(Boolean) : [];
    const textValue = value => String(value ?? '');
    const upperValue = value => textValue(value).toUpperCase();
    const lowerValue = value => textValue(value).toLowerCase();
    const attachmentText = attachment => lowerValue(attachment?.ocrText);
    
    // Search filter
    if (textValue(search).trim()) {
      const term = upperValue(search);
      const termLower = lowerValue(search);

      result = result.filter(r => {
        const metaMatch = 
          upperValue(r.fullName).includes(term) ||
          upperValue(r.recordNumber).includes(term) ||
          upperValue(r.personalId).includes(term) ||
          upperValue(r.passportNumber).includes(term) ||
          upperValue(r.building).includes(term) ||
          upperValue(r.room).includes(term) ||
          upperValue(r.boxNumber).includes(term) ||
          upperValue(r.folderNumber).includes(term) ||
          upperValue(r.requestNumber).includes(term) ||
          upperValue(r.shelfNumber).includes(term) ||
          upperValue(r.branch).includes(term);

        if (metaMatch) return true;

        // Deep OCR text matching in attachments
        if (ocrSearchMode) {
          if (lowerValue(r.ocrText).includes(termLower)) return true;
          if (r.attachments && Array.isArray(r.attachments)) {
            return r.attachments.some(att => attachmentText(att).includes(termLower));
          }
        }
        return false;
      });
    }

    // Sort
    result.sort((a, b) => {
      let valA = upperValue(a[field]);
      let valB = upperValue(b[field]);
      
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
    setCurrentPage(1);
    applyFiltersAndSort(records, value, sortField, sortAsc, deepOcrSearch);
  };

  const handleSort = (field) => {
    const isAsc = sortField === field ? !sortAsc : true;
    setSortField(field);
    setSortAsc(isAsc);
    applyFiltersAndSort(filteredRecords, searchTerm, field, isAsc, deepOcrSearch);
  };

  // CRUD Operations
  const handleSaveRecord = async (savedRecord, targetCategory) => {
    try {
      // Resolve target store — all EOID sub-types now go to the unified 'eoid' table
      const resolvedCategory = targetCategory || category;
      const effectiveStore =
        resolvedCategory === 'eoid-underage' ? 'eoid' :
        resolvedCategory === 'eoid-normal'   ? 'eoid' :
        storeName;

      // Stamp eoidType on EOID records so they can be filtered correctly
      if (resolvedCategory === 'eoid-normal') {
        savedRecord = { ...savedRecord, eoidType: 'EOID-NORMAL' };
      } else if (resolvedCategory === 'eoid-underage') {
        savedRecord = { ...savedRecord, eoidType: 'EOID-UNDER-AGE' };
      }

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
        await updateRecord(effectiveStore, savedRecord);
        
        // Log the update
        await logAuditEntry(
          'UPDATE',
          effectiveStore,
          currentUser?.id || 'unknown',
          currentUser?.fullName || currentUser?.username || 'Unknown User',
          savedRecord.id,
          savedRecord,
          existingRecord
        );
        setToast({ type: 'update', message: `${savedRecord.fullName || 'Record'} has been updated in the system successfully!` });
      } else {
        // Add Mode
        const newId = await addRecord(effectiveStore, savedRecord);

        
        // Log the creation
        await logAuditEntry(
          'CREATE',
          effectiveStore,
          currentUser?.id || 'unknown',
          currentUser?.fullName || currentUser?.username || 'Unknown User',
          newId,
          savedRecord
        );
        setToast({ type: 'create', message: `${savedRecord.fullName || 'Record'} has been inserted and posted to the system successfully!` });
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
        
        // Move to Recycle Bin before deleting
        await addRecord('recycle_bin', {
          originalStore: storeName,
          recordData: recordToDelete
        });

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

        setToast({ type: 'delete', message: `${name || 'Record'} has been moved to the Recycle Bin successfully!` });
        loadRecords();
        if (expandedRecordId === id) setExpandedRecordId(null);
      } catch (err) {
        console.error('Failed to delete record:', err);
        alert(`Unable to delete ${name || 'record'}: ${err.message}`);
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
      ['Guardian Full Name', record.guardianFullName],
      ['Guardian Passport / ID', record.guardianPassportId],
      ['Guardian Relationship', record.guardianRelationship],
      ['Residence ID', record.residenceIdNumber],
      ['Company', record.companyName],
      ['ETD Number', record.etdNumber],
      ['Eritrean ID', record.eritreanIdNumber],
      ['Alien Passport No.', record.alienPassportNumber],
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
    let headers = ['Building', 'Room', 'Shelf No.', 'BOX Number', 'Folder No.', 'Personal ID', 'Full Name', 'Sex', 'Citizenship'];
    if (category === 'eoid' || category === 'eoid-normal' || category === 'eoid-underage') {
      headers.push('EOID Type', 'EOID Number');
      if (category === 'eoid-underage' || category === 'eoid') {
        headers.push('Guardian Full Name', 'Guardian Passport/ID', 'Guardian Relationship');
      }
    }
    if (category === 'residence-id') headers.push('Residence ID No.', 'Company Name');
    if (category === 'etd') headers.push('ETD Number');
    if (category === 'eritrean-id') headers.push('Eritrean ID No.');
    if (category === 'alien-passport') headers.push('Alien Passport No.');
    headers.push('Passport Number', 'Request Number', 'Date', 'Service Provided');

    // Generate sheet data
    const data = records.map(r => {
      const row = {
        'Building': r.building || '',
        'Room': r.room || '',
        'Shelf No.': r.shelfNumber || '',
        'BOX Number': r.boxNumber || '',
        'Folder No.': r.folderNumber || '',
        'Personal ID': r.personalId || '',
        'Full Name': r.fullName || '',
        'Sex': r.sex || '',
        'Citizenship': r.citizenship || '',
      };

      if (category === 'eoid' || category === 'eoid-normal' || category === 'eoid-underage') {
        row['EOID Type'] = r.eoidType || '';
        row['EOID Number'] = r.eoidNumber || '';
        if (category === 'eoid-underage' || category === 'eoid') {
          row['Guardian Full Name'] = r.guardianFullName || '';
          row['Guardian Passport/ID'] = r.guardianPassportId || '';
          row['Guardian Relationship'] = r.guardianRelationship || '';
        }
      }
      if (category === 'residence-id') {
        row['Residence ID No.'] = r.residenceIdNumber || '';
        row['Company Name'] = r.companyName || '';
      }
      if (category === 'etd') row['ETD Number'] = r.etdNumber || '';
      if (category === 'eritrean-id') row['Eritrean ID No.'] = r.eritreanIdNumber || '';
      if (category === 'alien-passport') row['Alien Passport No.'] = r.alienPassportNumber || '';

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
          setToast({ type: 'error', message: 'Empty or invalid Excel file.' });
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
          setToast({ type: 'error', message: 'Invalid Excel file structure.' });
          return;
        }

        // Schema Validation: Prevent cross-table imports
        const colsLowerCase = headers.map(h => String(h || '').toLowerCase().trim());
        const normalizeCategory = (mod) => {
          if (mod === 'eoid-normal' || mod === 'eoid-underage') return 'eoid';
          if (mod === 'residence-id-cancellation') return 'residence-id-cancellation';
          return mod;
        };

        const REQUIRED_PATTERNS = {
          visa: ['passport', 'full name', 'box'],
          eoid: ['eoid', 'passport', 'full name'],
          'residence-id': ['residence', 'passport', 'full name'],
          'residence-id-cancellation': ['residence', 'passport', 'full name'],
          etd: ['etd', 'passport', 'full name'],
          'eritrean-id': ['eritrean', 'passport', 'full name'],
          'alien-passport': ['alien', 'passport', 'full name'],
        };

        const FORBIDDEN_PATTERNS = {
          visa: ['eoid', 'residence id', 'residence', 'etd', 'eritrean', 'alien passport', 'alien'],
          eoid: ['residence id', 'residence', 'etd', 'eritrean', 'alien passport', 'alien'],
          'residence-id': ['eoid', 'etd', 'eritrean', 'alien passport', 'alien'],
          'residence-id-cancellation': ['eoid', 'etd', 'eritrean', 'alien passport', 'alien'],
          etd: ['eoid', 'residence id', 'residence', 'eritrean', 'alien passport', 'alien'],
          'eritrean-id': ['eoid', 'residence id', 'residence', 'etd', 'alien passport', 'alien'],
          'alien-passport': ['eoid', 'residence id', 'residence', 'etd', 'eritrean'],
        };

        const expectedCategory = normalizeCategory(category);
        const requiredPatterns = REQUIRED_PATTERNS[expectedCategory] || ['passport', 'full name'];
        const forbiddenPatterns = FORBIDDEN_PATTERNS[expectedCategory] || [];

        const matchesPattern = (value, pattern) => value.includes(pattern);
        let isValidSchema = true;
        let missingColumn = '';

        const hasRequired = requiredPatterns.every(pattern =>
          colsLowerCase.some(col => matchesPattern(col, pattern))
        );

        const hasForbiddenDivisionColumns = forbiddenPatterns.some(pattern =>
          colsLowerCase.some(col => matchesPattern(col, pattern))
        );

        const otherModuleColumns = Object.entries(REQUIRED_PATTERNS)
          .filter(([moduleKey]) => normalizeCategory(moduleKey) !== expectedCategory)
          .some(([moduleKey, patterns]) =>
            patterns.some(pattern =>
              colsLowerCase.some(col => matchesPattern(col, pattern))
            )
          );

        if (!hasRequired) {
          isValidSchema = false;
          missingColumn = `${requiredPatterns.join(' / ')}`;
        } else if (hasForbiddenDivisionColumns || otherModuleColumns) {
          isValidSchema = false;
          missingColumn = '(File contains columns belonging to another division)';
        }

        if (!isValidSchema) {
           setToast({ type: 'error', message: `Validation Failed: This Excel file does not match the ${category.toUpperCase()} schema. Missing or invalid column: ${missingColumn}` });
           return;
        }

        const importedRecords = [];
        const existingPassports = new Set(records.map(r => r.passportNumber?.trim().toUpperCase()));
        const newPassportsInFile = new Set();
        let duplicateCount = 0;

        // Auto Box Allocation setup
        const BOX_PREFIXES = {
          'visa':           'VS',
          'eoid':           'EOID',
          'eoid-normal':    'EOID',
          'eoid_normal':    'EOID',
          'eoid-underage':  'EOID',
          'eoid_underage':  'EOID',
          'residence-id':   'RES',
          'residence_id':   'RES',
          'residence-id-cancellation': 'RC',
          'residence_id_cancellation': 'RC',
          'etd':            'ETD',
          'eritrean-id':    'ERID',
          'eritrean_id':    'ERID',
          'alien-passport': 'AP',
          'alien_passport': 'AP',
        };
        const boxPrefix = BOX_PREFIXES[category] || 'BOX';
        const boxPattern = new RegExp(`^${boxPrefix}-B(\\d+)-(\\d+)$`, 'i');
        let currentBox = 1;
        let currentSlot = 0;

        // Determine existing maximum box and slot in the DB
        records.forEach(r => {
          if (!r.boxNumber) return;
          const match = r.boxNumber.match(boxPattern);
          if (match) {
            const b = parseInt(match[1], 10);
            const s = parseInt(match[2], 10);
            if (b > currentBox || (b === currentBox && s > currentSlot)) {
              currentBox = b;
              currentSlot = s;
            }
          }
        });

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
            else if (hLower.includes('guardian name') || hLower.includes('guardian full') || hLower.includes('parent name')) record.guardianFullName = val.toUpperCase();
            else if (hLower.includes('guardian pass') || hLower.includes('guardian id') || hLower.includes('guardian passport')) record.guardianPassportId = val.toUpperCase();
            else if (hLower.includes('guardian rel') || hLower.includes('relationship')) record.guardianRelationship = val;
            else if (hLower.includes('residence') || hLower.includes('res id') || hLower.includes('residence id')) record.residenceIdNumber = val.toUpperCase();
            else if (hLower.includes('company')) record.companyName = val.toUpperCase();
            else if (hLower.includes('etd')) record.etdNumber = val.toUpperCase();
            else if (hLower.includes('eritrean') || hLower.includes('erit id') || hLower.includes('eritrean id')) record.eritreanIdNumber = val.toUpperCase();
            else if (hLower.includes('alien') || hLower.includes('alien pass') || hLower.includes('alien passport')) record.alienPassportNumber = val.toUpperCase();
          });

          // Ensure minimum requirements are met
          if (record.fullName && record.passportNumber) {
            const passportKey = record.passportNumber.trim().toUpperCase();
            
            // Duplicate Check: Check if already exists in DB OR is a duplicate in the same file
            if (existingPassports.has(passportKey) || newPassportsInFile.has(passportKey)) {
              duplicateCount++;
            } else {
              if (!record.shelfNumber) record.shelfNumber = '';

              // Auto-allocate sequential box number slot if unboxed/empty/missing
              if (!record.boxNumber || record.boxNumber.trim() === '' || record.boxNumber.trim().toUpperCase() === 'UNBOXED') {
                currentSlot += 1;
                if (currentSlot > 50) {
                  currentBox += 1;
                  currentSlot = 1;
                }
                const slotStr = String(currentSlot).padStart(2, '0');
                record.boxNumber = `${boxPrefix}-B${currentBox}-${slotStr}`;
              } else {
                // If boxNumber is provided in Excel, update our tracker if higher
                const match = record.boxNumber.match(boxPattern);
                if (match) {
                  const b = parseInt(match[1], 10);
                  const s = parseInt(match[2], 10);
                  if (b > currentBox || (b === currentBox && s > currentSlot)) {
                    currentBox = b;
                    currentSlot = s;
                  }
                }
              }

              record.attachments = [];
              importedRecords.push(record);
              newPassportsInFile.add(passportKey);
            }
          }
        }

        if (importedRecords.length === 0) {
          if (duplicateCount > 0) {
            setToast({ type: 'error', message: `No new records imported. All ${duplicateCount} entries in the Excel file were detected as duplicates of existing records.` });
          } else {
            setToast({ type: 'error', message: 'No valid records found in Excel. Make sure "Full Name" and "Passport Number" columns exist.' });
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

        let msg = `Successfully imported ${importedRecords.length} records to the ${category.toUpperCase()} table.`;
        if (duplicateCount > 0) {
          msg += ` (Ignored ${duplicateCount} duplicate entries to prevent redundancy)`;
        }
        setToast({ type: 'import', message: msg });
        loadRecords();
      } catch (err) {
        console.error('Import error:', err);
        setToast({ type: 'error', message: 'Failed to import Excel file. Verify file schema.' });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Reset input
  };

  const getTitle = () => {
    if (customModule) return customModule.title;
    if (category === 'visa') return 'VISA Files';
    if (category === 'eoid' || category === 'eoid-normal' || category === 'eoid-underage') return 'Ethiopian Origin ID File';
    if (category === 'residence-id') return 'Residence ID File';
    if (category === 'residence-id-cancellation') return 'Residence ID Cancellation';
    if (category === 'etd') return 'Emergency Travel Document File';
    if (category === 'eritrean-id') return 'Eritrean ID File';
    if (category === 'alien-passport') return 'Alien Passport File';
    return (category || 'File Explorer').replace(/-/g, ' ').toUpperCase();
  };

  const eoidDropdownOptions = [
    { value: 'normal', label: 'Normal EOID File' },
    { value: 'underage', label: 'Under-Age EOID File' }
  ];

  const currentEoidOption = category === 'eoid-underage' ? 'underage' : eoidView;

  const handleEoidSelection = (value) => {
    setEoidView(value);
  };

  const effectiveEoidCategory = category === 'eoid'
    ? (eoidView === 'underage' ? 'eoid-underage' : 'eoid-normal')
    : category;

  const getHeaderStyle = () => {
    if (customModule) return { borderColor: customModule.color || '#10b981', borderLeft: `5px solid ${customModule.color || '#10b981'}`, labelColor: customModule.color || '#10b981' };
    if (category === 'visa') return { borderColor: '#10b981', borderLeft: '5px solid #10b981', labelColor: '#10b981' };
    if (category === 'eoid' || category === 'eoid-normal' || category === 'eoid-underage') return { borderColor: '#f59e0b', borderLeft: '5px solid #f59e0b', labelColor: '#f59e0b' };
    if (category === 'residence-id') return { borderColor: '#3b82f6', borderLeft: '5px solid #3b82f6', labelColor: '#3b82f6' };
    if (category === 'residence-id-cancellation') return { borderColor: '#dc2626', borderLeft: '5px solid #dc2626', labelColor: '#dc2626' };
    if (category === 'etd') return { borderColor: '#818cf8', borderLeft: '5px solid #818cf8', labelColor: '#818cf8' };
    if (category === 'eritrean-id') return { borderColor: '#8b5cf6', borderLeft: '5px solid #8b5cf6', labelColor: '#8b5cf6' };
    if (category === 'alien-passport') return { borderColor: '#0ea5e9', borderLeft: '5px solid #0ea5e9', labelColor: '#0ea5e9' };
    return { borderColor: '#0284c7', borderLeft: '5px solid #0284c7', labelColor: '#0f172a' };
  };

  const userRole = currentUser?.role?.toUpperCase();
  const allowedDivs = (currentUser?.allowedDivisions || []).map(d => (d || '').toLowerCase());
  const modulePerms = currentUser?.modulePermissions || {};
  const catKey = (category || '').toLowerCase();
  const currentModPerm = modulePerms[category] || modulePerms[catKey] || modulePerms[catKey.replace(/-/g, '_')];

  const isAuthorized = !currentUser || userRole === 'ADMIN' || userRole === 'SUPERVISOR' || userRole === 'AUDITOR' || 
    (currentModPerm && currentModPerm !== 'NO_ACCESS') ||
    allowedDivs.includes(catKey) || 
    allowedDivs.includes(catKey.replace(/-/g, '_')) || 
    allowedDivs.includes(catKey.replace(/_/g, '-')) ||
    (allowedDivs.includes('eoid-normal') && category === 'eoid-normal') || 
    (allowedDivs.includes('eoid-underage') && category === 'eoid-underage') ||
    (allowedDivs.includes('eoid') && (category === 'eoid' || category === 'eoid-normal' || category === 'eoid-underage'));

  // Privilege checking function based on user role and fine-grained module permissions
  const hasFullAccess = userRole === 'ADMIN' || userRole === 'SUPERVISOR' || currentModPerm === 'FULL_ACCESS';
  const hasReadWrite = hasFullAccess || currentModPerm === 'READ_WRITE';

  const canAdd = currentUser && (hasReadWrite || (userRole === 'OFFICER' && currentUser.permissions?.add));
  const canEdit = currentUser && (hasReadWrite || (userRole === 'OFFICER' && currentUser.permissions?.edit));
  const canDelete = currentUser && (hasFullAccess || (userRole === 'OFFICER' && currentUser.permissions?.delete));
  const canImport = currentUser && hasFullAccess;

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Page Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        padding: '14px 18px',
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)'
      }}>
        {/* Title Block with Left Accent Bar */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          borderLeft: `5px solid ${styles.borderColor || '#0284c7'}`, 
          paddingLeft: '14px',
          minWidth: '220px'
        }}>
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: '1.45rem', letterSpacing: '-0.3px', color: '#0f172a', lineHeight: 1.2 }}>
            {getTitle()}
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px', fontWeight: 500 }}>
            {filteredRecords.length} {filteredRecords.length === 1 ? 'Record' : 'Records'} Active in Archive
          </span>
        </div>
        
        {/* Actions Toolbar */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'flex-end', 
          flexWrap: 'wrap', 
          gap: '6px',
          marginLeft: 'auto'
        }}>
          {category.startsWith('eoid') && (
            <select 
              style={{ background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '7px', padding: '6px 10px', fontSize: '0.8rem', fontWeight: 600, outline: 'none' }} 
              value={currentEoidOption} 
              onChange={e => handleEoidSelection(e.target.value)}
            >
              {eoidDropdownOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}

          {canAdd && (
            <button 
              className="glass-button" 
              style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, borderRadius: '7px', whiteSpace: 'nowrap' }} 
              onClick={() => { setEditingRecord(null); setIsModalOpen(true); }}
            >
              <Plus size={15} /> Add Entry
            </button>
          )}

          {canAdd && (
            <button
              className="glass-button"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', border: '1px solid #059669', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, borderRadius: '7px', whiteSpace: 'nowrap' }}
              onClick={() => setIsBulkIngestOpen(true)}
              title="Bulk upload legacy dossiers and multi-page PDFs with automated OCR indexing"
            >
              <Sparkles size={15} /> Bulk Ingest &amp; OCR
            </button>
          )}

          <button
            className="glass-button"
            style={{ background: '#0f172a', color: '#ffffff', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, borderRadius: '7px', whiteSpace: 'nowrap' }}
            onClick={() => setBarcodeModalRecord(filteredRecords[0] || records[0] || { id: 'sample', fullName: 'Sample File Tag', boxNumber: `${(category || 'DIV').toUpperCase()}-B1-01` })}
            title="Generate and print QR codes and barcodes for files & boxes"
          >
            <QrCode size={15} /> QR / Barcodes
          </button>

          <button 
            className="glass-button" 
            style={{ background: '#3b82f6', color: '#ffffff', border: '1px solid #2563eb', boxShadow: '0 2px 6px rgba(59, 130, 246, 0.25)', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, borderRadius: '7px', whiteSpace: 'nowrap' }} 
            onClick={handleExportExcel}
          >
            <Download size={15} /> Export Excel
          </button>

          {canImport && (
            <label 
              className="glass-button" 
              style={{ background: '#ef4444', color: '#ffffff', border: '1px solid #dc2626', boxShadow: '0 2px 6px rgba(239, 68, 68, 0.25)', cursor: 'pointer', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, borderRadius: '7px', whiteSpace: 'nowrap' }}
            >
              <Upload size={15} /> Import Excel
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
              'residence-id-cancellation': {
                title: 'Residence ID Cancellation File',
                desc: 'The Residence ID Cancellation module manages archival dossiers and registry records for revoked or cancelled resident identity cards. It tracks cancellation requests, passport biodata, birthdates, and mandatory verification attachments (Passport, Application Form, Application Letter, Previous ID) for complete audit compliance.',
                color: '#dc2626',
                icon: <AlertCircle size={24} />
              }
            };
            if (customModule) {
              return {
                title: customModule.title,
                desc: customModule.description || `Registry system module for managing ${customModule.title} files and dossier records.`,
                color: customModule.color || '#10b981',
                icon: <Package size={24} />
              };
            }
            return configs[moduleKey] || {
              title: (moduleKey || 'Custom Module').replace(/-/g, ' ').toUpperCase(),
              desc: 'Core file structuring registry for division dossiers.',
              color: '#10b981',
              icon: <Package size={24} />
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

        {/* Search Input & Deep OCR Search Switch */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search size={16} style={{
              position: 'absolute', left: '14px', top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)', pointerEvents: 'none'
            }} />
            <input
              type="text"
              placeholder={deepOcrSearch ? "⚡ Deep OCR Search: Type any text to find inside scanned PDFs/images…" : "Search by Full Name, Passport No., Personal ID, Box Number…"}
              value={searchTerm}
              onChange={handleSearchChange}
              style={{
                width: '100%',
                padding: '13px 16px 13px 42px',
                borderRadius: '10px',
                border: deepOcrSearch ? '1.5px solid #10b981' : '1px solid rgba(15, 43, 92, 0.12)',
                background: deepOcrSearch ? 'rgba(16, 185, 129, 0.02)' : '#ffffff',
                color: 'var(--text-primary)',
                fontSize: '0.93rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !deepOcrSearch;
              setDeepOcrSearch(next);
              applyFiltersAndSort(records, searchTerm, sortField, sortAsc, next);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '12px 16px',
              borderRadius: '10px',
              border: deepOcrSearch ? '1.5px solid #10b981' : '1px solid rgba(15, 43, 92, 0.15)',
              background: deepOcrSearch ? '#dcfce7' : '#f8fafc',
              color: deepOcrSearch ? '#15803d' : '#64748b',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
            title="When active, search will scan deep inside the text of all attached PDF pages and image files"
          >
            <Sparkles size={15} style={{ color: deepOcrSearch ? '#10b981' : '#64748b' }} />
            Deep OCR Search: {deepOcrSearch ? 'ACTIVE' : 'OFF'}
          </button>
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
            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: '#ffffff' }}>
                <thead style={{ background: 'rgba(15, 43, 92, 0.03)', borderBottom: '2px solid rgba(15, 43, 92, 0.08)' }}>
                  <tr>
                    <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>#</th>
                    <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>File Category</th>
                    <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Archive Location</th>
                    <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Box No.</th>
                    <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Personal ID</th>
                    <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Full Name</th>
                    <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Sex</th>
                    <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Citizenship</th>
                    <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Passport No.</th>
                    <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Request No.</th>
                    <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Branch</th>
                    <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Date</th>
                    <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Service Provided</th>
                    {category === 'residence-id' && <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Res. ID Type</th>}
                    {category === 'residence-id' && <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Company Name</th>}
                    {category === 'visa' && <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Visa Type</th>}
                    {(category === 'eoid-normal' || category === 'eoid-underage' || category === 'eoid') && <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>EOID No.</th>}
                    {(category === 'eoid-underage' || category === 'eoid') && <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Guardian Details</th>}
                    {category === 'etd' && <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>ETD No.</th>}
                    <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Attachments</th>
                    <th style={{ padding: '14px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((r, i) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border-glass)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{(currentPage - 1) * PAGE_SIZE + i + 1}</td>
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ 
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                          background: `${styles.labelColor}15`, color: styles.labelColor, border: `1px solid ${styles.labelColor}30`
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: styles.labelColor }} />
                          {getTitle()}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {r.shelfNumber || 'Shelf —'}{r.folderNumber ? ` · ${r.folderNumber}` : ''}
                          </span>
                          {(r.building || r.room) && (
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              {[r.building, r.room].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700, whiteSpace: 'nowrap' }}>{r.boxNumber || '—'}</td>
                      <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--accent-blue)', fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{r.personalId || '—'}</td>
                      <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        <div>{r.fullName || '—'}</div>
                        {/* OCR Match Snippet Badge */}
                        {searchTerm && deepOcrSearch && (
                          (() => {
                            const termLower = String(searchTerm ?? '').toLowerCase();
                            const attachments = Array.isArray(r.attachments) ? r.attachments : [];
                            const matchingAtt = attachments.find(a => String(a?.ocrText ?? '').toLowerCase().includes(termLower));
                            const textSource = String(matchingAtt?.ocrText ?? r.ocrText ?? '');
                            if (textSource.toLowerCase().includes(termLower)) {
                              const idx = textSource.toLowerCase().indexOf(termLower);
                              const start = Math.max(0, idx - 25);
                              const end = Math.min(textSource.length, idx + termLower.length + 25);
                              const snippet = textSource.substring(start, end).replace(/[\n\r]+/g, ' ');
                              return (
                                <div style={{
                                  marginTop: '4px', fontSize: '0.68rem', color: '#059669', background: '#dcfce7',
                                  padding: '2px 6px', borderRadius: '4px', border: '1px solid #86efac',
                                  whiteSpace: 'normal', maxWidth: '240px', fontWeight: 600, textTransform: 'none'
                                }}>
                                  🔍 <em>"...{snippet}..."</em>
                                </div>
                              );
                            }
                            return null;
                          })()
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {(() => {
                          const sex = String(r.sex ?? '').toUpperCase();
                          return sex === 'MALE' ? 'M' : (sex === 'FEMALE' ? 'F' : sex || '—');
                        })()}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{r.citizenship || '—'}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-block', padding: '4px 8px', borderRadius: '4px',
                          background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)',
                          fontSize: '0.8rem', fontWeight: 600, fontFamily: 'monospace',
                          border: '1px solid rgba(59, 130, 246, 0.2)', whiteSpace: 'nowrap'
                        }}>
                          {r.passportNumber || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.requestNumber || '—'}</td>
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '3px 8px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 600,
                          background: 'rgba(16, 185, 129, 0.08)', color: 'var(--accent-emerald)', border: '1px solid rgba(16, 185, 129, 0.2)'
                        }}>
                          <MapPin size={11} /> {r.branch || 'Head Office'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.date || '—'}</td>
                      <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.serviceProvided || '—'}</td>
                      {category === 'residence-id' && <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.residenceIdType || '—'}</td>}
                      {category === 'residence-id' && <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.companyName || '—'}</td>}
                      {category === 'visa' && <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.visaType || '—'}</td>}
                      {(category === 'eoid-normal' || category === 'eoid-underage' || category === 'eoid') && <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.eoidNumber || '—'}</td>}
                      {(category === 'eoid-underage' || category === 'eoid') && (
                        <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {r.guardianFullName ? (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 600, color: '#92400e' }}>{r.guardianFullName}</span>
                              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                {r.guardianRelationship || 'Guardian'} {r.guardianPassportId ? `• ${r.guardianPassportId}` : ''}
                              </span>
                            </div>
                          ) : '—'}
                        </td>
                      )}
                      {category === 'etd' && <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.etdNumber || '—'}</td>}
                      <td style={{ padding: '14px 16px' }}>
                        {r.attachments && r.attachments.length > 0 ? (
                          <button 
                            onClick={() => setPreviewAttachment(r.attachments[0])}
                            title="Preview Attachment"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px',
                              borderRadius: '4px', background: 'rgba(16,185,129,0.1)', color: '#10b981',
                              border: '1px solid rgba(16,185,129,0.2)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
                            }}
                          >
                            <FileText size={12} /> {r.attachments.length} {r.attachments.length === 1 ? 'File' : 'Files'}
                          </button>
                        ) : (
                          <span style={{ 
                            display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px',
                            borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)',
                            border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap'
                          }}>
                            <AlertCircle size={12} /> None
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => setViewingRecord(r)} title="View" style={{ padding: '6px', borderRadius: '6px', background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Eye size={14} /></button>
                          <button onClick={() => setBarcodeModalRecord(r)} title="QR Code & Barcode Tag" style={{ padding: '6px', borderRadius: '6px', background: 'rgba(15,23,42,0.08)', color: '#0f172a', border: '1px solid rgba(15,23,42,0.18)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><QrCode size={14} /></button>
                          <button onClick={() => handlePrintCard(r)} title="Print" style={{ padding: '6px', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Printer size={14} /></button>
                          {canEdit && <button onClick={() => { setEditingRecord(r); setIsModalOpen(true); }} title="Edit" style={{ padding: '6px', borderRadius: '6px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit size={14} /></button>}
                          {canDelete && <button onClick={() => handleDeleteRecord(r.id, r.fullName || r.personalId)} title="Delete" style={{ padding: '6px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={14} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredRecords.length > PAGE_SIZE && (() => {
              const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE);
              const startItem = (currentPage - 1) * PAGE_SIZE + 1;
              const endItem = Math.min(currentPage * PAGE_SIZE, filteredRecords.length);
              return (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  paddingTop: '16px', flexWrap: 'wrap', gap: '12px'
                }}>
                  {/* Info */}
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Showing <strong>{startItem}–{endItem}</strong> of <strong>{filteredRecords.length}</strong> results
                  </span>
                  {/* Page buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: '6px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        border: '1px solid rgba(15, 43, 92, 0.15)', background: currentPage === 1 ? 'rgba(15,43,92,0.03)' : '#ffffff',
                        color: currentPage === 1 ? 'var(--text-secondary)' : 'var(--text-primary)', opacity: currentPage === 1 ? 0.5 : 1
                      }}
                    >← Prev</button>

                    {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                      .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                      .reduce((acc, page, idx, arr) => {
                        if (idx > 0 && arr[idx - 1] !== page - 1) acc.push('...');
                        acc.push(page);
                        return acc;
                      }, [])
                      .map((item, idx) =>
                        item === '...' ? (
                          <span key={`ellipsis-${idx}`} style={{ padding: '6px 4px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>…</span>
                        ) : (
                          <button
                            key={item}
                            onClick={() => setCurrentPage(item)}
                            style={{
                              width: '36px', height: '36px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700,
                              border: item === currentPage ? 'none' : '1px solid rgba(15, 43, 92, 0.15)',
                              background: item === currentPage ? 'var(--accent-blue)' : '#ffffff',
                              color: item === currentPage ? '#ffffff' : 'var(--text-primary)',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                          >{item}</button>
                        )
                      )
                    }

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: '6px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        border: '1px solid rgba(15, 43, 92, 0.15)', background: currentPage === totalPages ? 'rgba(15,43,92,0.03)' : '#ffffff',
                        color: currentPage === totalPages ? 'var(--text-secondary)' : 'var(--text-primary)', opacity: currentPage === totalPages ? 0.5 : 1
                      }}
                    >Next →</button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
      {/* Edit/Add Modal */}
      <RecordFormModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingRecord(null); }}
        onSave={handleSaveRecord}
        activeTab={effectiveEoidCategory}
        initialRecord={editingRecord}
        customModule={customModule}
      />
      
      {viewingRecord && (
        <RecordViewModal 
          isOpen={true}
          record={viewingRecord} 
          onClose={() => setViewingRecord(null)} 
          category={category}
          customModule={customModule}
        />
      )}

      {barcodeModalRecord && (
        <BarcodeQRModal
          isOpen={true}
          onClose={() => setBarcodeModalRecord(null)}
          record={barcodeModalRecord}
          category={category}
          allRecords={filteredRecords}
        />
      )}

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
            border: `1px solid ${toast.type === 'delete' || toast.type === 'error' ? 'rgba(239, 68, 68, 0.25)' : (toast.type === 'create' || toast.type === 'import') ? 'rgba(16, 185, 129, 0.25)' : 'rgba(59, 130, 246, 0.25)'}`,
            background: '#ffffff',
            boxShadow: '0 20px 40px rgba(15, 43, 92, 0.12)',
            borderRadius: '16px'
          }}>
            {/* Header Colored Indicator Icon */}
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: toast.type === 'delete' || toast.type === 'error' ? 'rgba(239, 68, 68, 0.08)' : (toast.type === 'create' || toast.type === 'import') ? 'rgba(16, 185, 129, 0.08)' : 'rgba(59, 130, 246, 0.08)',
              color: toast.type === 'delete' || toast.type === 'error' ? 'var(--accent-danger)' : (toast.type === 'create' || toast.type === 'import') ? 'var(--accent-emerald)' : 'var(--accent-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              {toast.type === 'delete' ? <Trash2 size={26} /> : toast.type === 'error' ? <AlertTriangle size={26} /> : (toast.type === 'create' || toast.type === 'import') ? <CheckCircle size={26} /> : <Edit size={26} />}
            </div>

            <h3 style={{
              margin: '0 0 8px 0',
              fontWeight: 700,
              fontSize: '1.15rem',
              color: 'var(--text-primary)',
              letterSpacing: '0.2px'
            }}>
              {toast.type === 'delete' ? 'Deleted Successfully' : toast.type === 'error' ? 'Import Failed' : toast.type === 'import' ? 'Imported Successfully' : toast.type === 'create' ? 'Posted Successfully' : 'Updated Successfully'}
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
                background: toast.type === 'delete' || toast.type === 'error' ? 'var(--accent-danger)' : (toast.type === 'create' || toast.type === 'import') ? 'var(--accent-emerald)' : 'var(--accent-blue)',
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

      {/* Bulk Document Ingestion & Fast OCR Indexer Modal */}
      <BulkIngestionModal
        isOpen={isBulkIngestOpen}
        onClose={() => setIsBulkIngestOpen(false)}
        category={effectiveEoidCategory}
        customModule={customModule}
        onComplete={() => {
          loadRecords();
          setToast({ type: 'create', message: `Bulk ingestion and OCR indexing complete!` });
        }}
      />

    </div>
  );
}
