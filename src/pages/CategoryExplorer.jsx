import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Upload, Search, Plus, Edit, Trash2, Eye, FileText, CheckCircle, AlertTriangle, FileDown, ArrowUpDown, X, BarChart2, Fingerprint, Award, FileWarning, IdCard, Globe, CreditCard } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getAllRecords, addRecord, updateRecord, deleteRecord, importRecords } from '../utils/db';
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

          {currentUser && currentUser.role !== 'VIEWER' && (
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
                title: 'VISA Files Division',
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
                title: 'Residence ID File Division',
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
                title: 'Eritrean ID File Division',
                desc: 'A specialized verification registry for individuals of Eritrean origin. This module coordinates registry archives, identity folders, family heritage, background verification dossiers, and immigration status credentials for Eritrean origin identification.',
                color: '#8b5cf6',
                icon: <IdCard size={24} />
              },
              'alien-passport': {
                title: 'Alien Passport File Division',
                desc: 'An Alien Passport is a travel document issued to stateless persons or foreign residents who are unable to obtain a passport from their country of nationality. This module tracks foreign passport registrations, stateless resident dossiers, alien identification folders, and entry-exit histories.',
                color: '#0ea5e9',
                icon: <Globe size={24} />
              },
              'yellow-card': {
                title: 'Yellow Card File Division',
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
              padding: '40px 32px', 
              display: 'flex', 
              gap: '28px',
              alignItems: 'center', 
              background: 'rgba(15, 23, 42, 0.4)',
              border: '1px solid var(--border-glass)',
              borderRadius: '16px',
            }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '16px',
                background: `${currentConfig.color}15`,
                border: `1px solid ${currentConfig.color}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: currentConfig.color,
                boxShadow: `0 0 20px ${currentConfig.color}20`,
                flexShrink: 0
              }}>
                {currentConfig.icon}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 8px 0', fontWeight: 600, fontSize: '1.45rem', color: '#fff', letterSpacing: '0.5px' }}>
                  {currentConfig.title}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.6', margin: 0 }}>
                  {currentConfig.desc}
                </p>
              </div>
            </div>
          );
        })()}
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
