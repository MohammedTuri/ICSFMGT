import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import * as XLSX from 'xlsx';
import {
  BarChart2, Download, Printer, Filter, Search, X,
  CheckCircle, AlertTriangle, FileText, Fingerprint, Award,
  FileWarning, IdCard, Globe, CreditCard, RefreshCw, ChevronDown,
  ChevronUp, Calendar, Users, FileDown, ArrowRight, Layers
} from 'lucide-react';
import { getAllRecords } from '../utils/db';

/* ─────────────────────────────────────────────────────
   Division config
───────────────────────────────────────────────────── */
const DIVISIONS = [
  { key: 'visa',          label: 'VISA Files',             store: 'visa',          color: '#059669', bg: 'rgba(5,150,105,0.08)'  },
  { key: 'eoid-normal',   label: 'Ethiopian Origin ID — Normal File', store: 'eoid_normal',   color: '#b45309', bg: 'rgba(180,83,9,0.08)'   },
  { key: 'eoid-underage', label: 'Ethiopian Origin ID — Under-Age File', store: 'eoid_underage', color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
  { key: 'residence-id',  label: 'Residence ID File',              store: 'residence_id',  color: '#1d4ed8', bg: 'rgba(29,78,216,0.08)'  },
  { key: 'etd',           label: 'Emergency Travel Document File', store: 'etd',          color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
  { key: 'eritrean-id',   label: 'Eritrean ID File',               store: 'eritrean_id',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
  { key: 'alien-passport',label: 'Alien Passport File',            store: 'alien_passport',color: '#0ea5e9', bg: 'rgba(14,165,233,0.08)' },
  { key: 'yellow-card',   label: 'Yellow Card File',               store: 'yellow_card',   color: '#ca8a04', bg: 'rgba(202,138,4,0.08)'  },
];

const getDivisionConfig = (key) => DIVISIONS.find(d => d.key === key) || {};

const CITIZENSHIPS = [
  '', 'ETHIOPIAN', 'ERITREAN', 'SOMALI', 'KENYAN', 'SUDANESE', 'SOUTH SUDANESE',
  'DJIBOUTIAN', 'UGANDAN', 'TANZANIAN', 'RWANDAN', 'CONGOLESE', 'NIGERIAN',
  'GHANAIAN', 'EGYPTIAN', 'CHINESE', 'INDIAN', 'AMERICAN', 'BRITISH', 'FRENCH',
  'GERMAN', 'ITALIAN', 'DUTCH', 'SWEDISH', 'OTHER'
];

/* ─────────────────────────────────────────────────────
   Print styles injected once
───────────────────────────────────────────────────── */
const PRINT_STYLES = `
@media print {
  body * { visibility: hidden !important; }
  #ics-report-printable, #ics-report-printable * { visibility: visible !important; }
  #ics-report-printable {
    position: fixed !important;
    top: 0; left: 0;
    width: 100%;
    background: white !important;
    color: black !important;
    font-family: Arial, sans-serif;
    font-size: 11px;
    padding: 20px;
  }
  .no-print { display: none !important; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
  th { background: #f0f0f0 !important; font-weight: bold; }
  .print-badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: bold; }
}
`;

export default function Reports() {
  /* ── Auth ── */
  const [currentUser, setCurrentUser] = useState(null);
  const [allowedDivisions, setAllowedDivisions] = useState([]);

  /* ── Data ── */
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  /* ── Filters ── */
  const [filters, setFilters] = useState({
    divisions: [],
    dateFrom: '',
    dateTo: '',
    sex: '',
    citizenship: '',
    attachmentStatus: '',
    serviceKeyword: '',
    keyword: '',
  });

  /* ── Per-dropdown position state: null = closed, {top,left,width} = open ── */
  const [divDropPos,         setDivDropPos]         = useState(null);
  const [sexDropPos,         setSexDropPos]         = useState(null);
  const [citizenshipDropPos, setCitizenshipDropPos] = useState(null);
  const [attachDropPos,      setAttachDropPos]      = useState(null);
  const divDropdownRef         = useRef(null);
  const sexDropdownRef         = useRef(null);
  const attachDropdownRef      = useRef(null);
  const citizenshipDropdownRef = useRef(null);

  /* Helper: open one dropdown, close the rest, compute fixed position from element rect */
  const toggleDrop = (ref, setter, others) => {
    others.forEach(s => s(null)); // close all siblings
    const rect = ref.current?.getBoundingClientRect();
    setter(prev => {
      if (prev) return null; // toggle off if already open
      return rect ? { top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 200) } : null;
    });
  };

  /* ── UI ── */
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [summaryStats, setSummaryStats] = useState({});
  const PAGE_SIZE = 50;

  const printStyleRef = useRef(null);

  /* ── Close dropdowns on outside click and scroll ── */
  useEffect(() => {
    const handler = (e) => {
      if (e.target.closest('.rpt-fixed-dropdown')) return;
      if (divDropdownRef.current         && !divDropdownRef.current.contains(e.target))         setDivDropPos(null);
      if (sexDropdownRef.current         && !sexDropdownRef.current.contains(e.target))         setSexDropPos(null);
      if (attachDropdownRef.current      && !attachDropdownRef.current.contains(e.target))      setAttachDropPos(null);
      if (citizenshipDropdownRef.current && !citizenshipDropdownRef.current.contains(e.target)) setCitizenshipDropPos(null);
    };
    const handleScroll = (e) => {
      if (e.target.closest && e.target.closest('.rpt-fixed-dropdown')) return;
      setDivDropPos(null);
      setSexDropPos(null);
      setCitizenshipDropPos(null);
      setAttachDropPos(null);
    };
    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  /* ── Inject print styles once ── */
  useEffect(() => {
    if (!printStyleRef.current) {
      const el = document.createElement('style');
      el.textContent = PRINT_STYLES;
      document.head.appendChild(el);
      printStyleRef.current = el;
    }
    return () => {
      if (printStyleRef.current) {
        printStyleRef.current.remove();
        printStyleRef.current = null;
      }
    };
  }, []);

  /* ── Load auth ── */
  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('ics_auth_user')) || {};
    setCurrentUser(session);
    const isRestricted = session.role === 'OFFICER' || session.role === 'VIEWER';
    if (isRestricted) {
      // Backward compat: expand old 'eoid' key to new split keys
      let divs = session.allowedDivisions || [];
      if (divs.includes('eoid')) {
        divs = divs.filter(d => d !== 'eoid').concat('eoid-normal', 'eoid-underage');
      }
      setAllowedDivisions(divs);
    } else {
      setAllowedDivisions(DIVISIONS.map(d => d.key));
    }
  }, []);

  /* ── Load all accessible data ── */
  const loadAllData = async () => {
    setLoading(true);
    try {
      const session = JSON.parse(localStorage.getItem('ics_auth_user')) || {};
      const isRestricted = session.role === 'OFFICER' || session.role === 'VIEWER';
      const allowed = isRestricted ? (session.allowedDivisions || []) : DIVISIONS.map(d => d.key);

      const all = [];
      for (const div of DIVISIONS) {
        if (!allowed.includes(div.key)) continue;
        const records = await getAllRecords(div.store);
        records.forEach(r => all.push({ ...r, _division: div.key, _divisionLabel: div.label }));
      }
      setAllData(all);
      setDataLoaded(true);
      applyFilters(all, filters);
    } catch (err) {
      console.error('Report load error:', err);
    } finally {
      setLoading(false);
    }
  };

  /* ── Apply filters ── */
  const applyFilters = (data, f) => {
    let result = [...data];

    if (f.divisions.length > 0) {
      result = result.filter(r => f.divisions.includes(r._division));
    }
    if (f.dateFrom) {
      result = result.filter(r => r.date && r.date >= f.dateFrom);
    }
    if (f.dateTo) {
      result = result.filter(r => r.date && r.date <= f.dateTo);
    }
    if (f.sex) {
      result = result.filter(r => r.sex && r.sex.toUpperCase() === f.sex.toUpperCase());
    }
    if (f.citizenship.trim()) {
      const term = f.citizenship.trim().toUpperCase();
      result = result.filter(r => r.citizenship && r.citizenship.toUpperCase().includes(term));
    }
    if (f.attachmentStatus === 'has') {
      result = result.filter(r => r.attachments && r.attachments.length > 0);
    } else if (f.attachmentStatus === 'missing') {
      result = result.filter(r => !r.attachments || r.attachments.length === 0);
    }
    if (f.serviceKeyword.trim()) {
      const term = f.serviceKeyword.trim().toUpperCase();
      result = result.filter(r => r.serviceProvided && r.serviceProvided.toUpperCase().includes(term));
    }
    if (f.keyword.trim()) {
      const term = f.keyword.trim().toUpperCase();
      result = result.filter(r =>
        (r.fullName && r.fullName.toUpperCase().includes(term)) ||
        (r.passportNumber && r.passportNumber.toUpperCase().includes(term)) ||
        (r.boxNumber && r.boxNumber.toUpperCase().includes(term)) ||
        (r.requestNumber && r.requestNumber.toUpperCase().includes(term)) ||
        (r.eoidNumber && r.eoidNumber.toUpperCase().includes(term)) ||
        (r.residenceIdNumber && r.residenceIdNumber.toUpperCase().includes(term)) ||
        (r.etdNumber && r.etdNumber.toUpperCase().includes(term)) ||
        (r.shelfNumber && r.shelfNumber.toUpperCase().includes(term)) ||
        (r.cabinetNumber && r.cabinetNumber.toUpperCase().includes(term))
      );
    }

    result.sort((a, b) => {
      if (a.date && b.date) return b.date.localeCompare(a.date);
      return (a.fullName || '').localeCompare(b.fullName || '');
    });

    setResults(result);
    setPage(1);

    const stats = {};
    DIVISIONS.forEach(div => {
      const divRecords = result.filter(r => r._division === div.key);
      if (divRecords.length > 0) {
        stats[div.key] = {
          label: div.label,
          total: divRecords.length,
          withScans: divRecords.filter(r => r.attachments && r.attachments.length > 0).length,
          color: div.color,
          bg: div.bg,
        };
      }
    });
    setSummaryStats(stats);
  };

  const handleGenerateReport = () => {
    if (!dataLoaded) {
      loadAllData();
    } else {
      applyFilters(allData, filters);
    }
  };

  const handleReset = () => {
    const fresh = {
      divisions: [], dateFrom: '', dateTo: '', sex: '',
      citizenship: '', attachmentStatus: '', serviceKeyword: '', keyword: '',
    };
    setFilters(fresh);
    if (dataLoaded) applyFilters(allData, fresh);
    else { setResults([]); setSummaryStats({}); }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleDivisionFilter = (key) => {
    setFilters(prev => ({
      ...prev,
      divisions: prev.divisions.includes(key)
        ? prev.divisions.filter(d => d !== key)
        : [...prev.divisions, key]
    }));
  };

  /* ── Excel Export ── */
  const handleExportExcel = () => {
    if (results.length === 0) { alert('No records to export.'); return; }
    const headers = [
      'Division', 'Shelf No.', 'Cabinet/Kent No.', 'BOX Number', 'Full Name', 'Sex', 'Citizenship',
      'Passport Number', 'Request Number', 'Date', 'Service Provided',
      'EOID Number', 'Residence ID No.', 'ETD Number',
      'Eritrean ID No.', 'Alien Passport No.', 'Yellow Card No.',
      'Attachment Count'
    ];

    const data = results.map(r => {
      return {
        'Division': r._divisionLabel || '',
        'Shelf No.': r.shelfNumber || '',
        'Cabinet/Kent No.': r.cabinetNumber || '',
        'BOX Number': r.boxNumber || '',
        'Full Name': r.fullName || '',
        'Sex': r.sex || '',
        'Citizenship': r.citizenship || '',
        'Passport Number': r.passportNumber || '',
        'Request Number': r.requestNumber || '',
        'Date': r.date || '',
        'Service Provided': r.serviceProvided || '',
        'EOID Number': r.eoidNumber || '',
        'Residence ID No.': r.residenceIdNumber || '',
        'ETD Number': r.etdNumber || '',
        'Eritrean ID No.': r.eritreanIdNumber || '',
        'Alien Passport No.': r.alienPassportNumber || '',
        'Yellow Card No.': r.yellowCardNumber || '',
        'Attachment Count': r.attachments ? r.attachments.length : 0
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `ICS_Report_${today}.xlsx`);
  };

  /* ── Print ── */
  const handlePrint = () => window.print();

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const paginatedResults = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const divisionOptions = DIVISIONS.filter(d => allowedDivisions.includes(d.key));

  /* ── Helpers ── */
  const getDivisionIcon = (key) => {
    if (key === 'visa') return <FileText size={15} />;
    if (key.startsWith('eoid')) return <Fingerprint size={15} />;
    if (key === 'residence-id') return <Award size={15} />;
    if (key === 'etd') return <FileWarning size={15} />;
    if (key === 'eritrean-id') return <IdCard size={15} />;
    if (key === 'alien-passport') return <Globe size={15} />;
    if (key === 'yellow-card') return <CreditCard size={15} />;
    return <BarChart2 size={15} />;
  };

  const divLabel = filters.divisions.length === 0
    ? 'All File Modules'
    : filters.divisions.length === 1
      ? DIVISIONS.find(d => d.key === filters.divisions[0])?.label || 'Selected'
      : `${filters.divisions.length} Modules`;

  const sexLabel = filters.sex === '' ? 'All' : filters.sex === 'MALE' ? 'Male' : 'Female';
  const attachLabel = filters.attachmentStatus === '' ? 'All' : filters.attachmentStatus === 'has' ? 'Has Scans' : 'Missing';

  /* ─────────────────────────────────────────────────────
     Render
  ───────────────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ══════════════════════════════════════════════════
          PAGE HEADER
      ══════════════════════════════════════════════════ */}
      <div className="no-print" style={{
        background: 'linear-gradient(135deg, #0f2b5c 0%, #1a3a6e 40%, #1d4ed8 100%)',
        borderRadius: '20px',
        padding: '32px 36px 28px',
        position: 'relative',
        overflow: 'hidden',
        color: '#ffffff',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: '-40px', right: '-30px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: '-60px', right: '100px', width: '220px', height: '220px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)' }} />
        <div style={{ position: 'absolute', top: '20px', left: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <BarChart2 size={22} />
              </div>
              <h2 style={{ margin: 0, fontWeight: 700, fontSize: '1.6rem', letterSpacing: '0.5px' }}>
                Reports & Analytics
              </h2>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.65)', margin: '0 0 0 54px', fontSize: '0.88rem', fontWeight: 400 }}>
              Generate customized reports across all immigration file modules
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {results.length > 0 && (
              <>
                <button onClick={handleExportExcel} style={{
                  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)',
                  color: '#fff', padding: '10px 20px', borderRadius: '10px',
                  display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                  fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s',
                  backdropFilter: 'blur(8px)',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                >
                  <Download size={16} /> Export Excel
                </button>
                <button onClick={handlePrint} style={{
                  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)',
                  color: '#fff', padding: '10px 20px', borderRadius: '10px',
                  display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                  fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s',
                  backdropFilter: 'blur(8px)',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                >
                  <Printer size={16} /> Print
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          AIRLINE-STYLE HORIZONTAL FILTER BAR
      ══════════════════════════════════════════════════ */}
      <div className="no-print rpt-filter-bar animate-fade-in">

        {/* Row 1: Radio-style type selector (like Round Trip / One-Way) */}
        <div className="rpt-type-row">
          <label className="rpt-radio-label">
            <input type="radio" name="rptScope" checked={filters.divisions.length === 0}
              onChange={() => handleFilterChange('divisions', [])} />
            <span className="rpt-radio-dot" />
            All Files
          </label>
          <label className="rpt-radio-label">
            <input type="radio" name="rptScope" checked={filters.divisions.length > 0}
              onChange={() => { if (filters.divisions.length === 0) handleFilterChange('divisions', [divisionOptions[0]?.key].filter(Boolean)); }} />
            <span className="rpt-radio-dot" />
            Specific Modules
          </label>
          {filters.keyword && (
            <span style={{
              marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--accent-blue)',
              background: 'rgba(29,78,216,0.06)', padding: '4px 12px', borderRadius: '20px',
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px'
            }}>
              <Search size={12} /> Searching: "{filters.keyword}"
            </span>
          )}
        </div>

        {/* Row 2: Main horizontal filter cells — airline booking style */}
        <div className="rpt-cells-row">

          {/* Cell: File Module Selector */}
          <div className="rpt-cell rpt-cell-module" ref={divDropdownRef} style={{ flex: '1.5' }}>
            <div className="rpt-cell-inner" onClick={() => toggleDrop(divDropdownRef, setDivDropPos, [setSexDropPos, setCitizenshipDropPos, setAttachDropPos])}>
              <span className="rpt-cell-icon"><Layers size={16} /></span>
              <div className="rpt-cell-content">
                <span className="rpt-cell-label">File Module</span>
                <span className="rpt-cell-value">{divLabel}</span>
              </div>
              <ChevronDown size={14} className="rpt-cell-chevron" style={{
                transform: divDropPos ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s'
              }} />
            </div>
          </div>

          {/* Swap icon separator */}
          <div className="rpt-cell-separator">
            <ArrowRight size={14} />
          </div>

          {/* Cell: Date From */}
          <div className="rpt-cell" style={{ flex: '1' }}>
            <div className="rpt-cell-inner">
              <span className="rpt-cell-icon"><Calendar size={16} /></span>
              <div className="rpt-cell-content">
                <span className="rpt-cell-label">From Date</span>
                <input type="date" className="rpt-cell-date-input"
                  value={filters.dateFrom} onChange={e => handleFilterChange('dateFrom', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Cell: Date To */}
          <div className="rpt-cell" style={{ flex: '1' }}>
            <div className="rpt-cell-inner">
              <span className="rpt-cell-icon"><Calendar size={16} /></span>
              <div className="rpt-cell-content">
                <span className="rpt-cell-label">To Date</span>
                <input type="date" className="rpt-cell-date-input"
                  value={filters.dateTo} onChange={e => handleFilterChange('dateTo', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Cell: Sex */}
          <div className="rpt-cell" ref={sexDropdownRef} style={{ flex: '0.7' }}>
            <div className="rpt-cell-inner" onClick={() => toggleDrop(sexDropdownRef, setSexDropPos, [setDivDropPos, setCitizenshipDropPos, setAttachDropPos])}>
              <span className="rpt-cell-icon"><Users size={16} /></span>
              <div className="rpt-cell-content">
                <span className="rpt-cell-label">Sex</span>
                <span className="rpt-cell-value">{sexLabel}</span>
              </div>
              <ChevronDown size={14} className="rpt-cell-chevron" style={{
                transform: sexDropPos ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s'
              }} />
            </div>
          </div>

          {/* Cell: Citizenship */}
          <div className="rpt-cell" ref={citizenshipDropdownRef} style={{ flex: '1' }}>
            <div className="rpt-cell-inner" onClick={() => toggleDrop(citizenshipDropdownRef, setCitizenshipDropPos, [setDivDropPos, setSexDropPos, setAttachDropPos])}>
              <span className="rpt-cell-icon"><Globe size={16} /></span>
              <div className="rpt-cell-content">
                <span className="rpt-cell-label">Citizenship</span>
                <span className="rpt-cell-value">{filters.citizenship || 'All'}</span>
              </div>
              <ChevronDown size={14} className="rpt-cell-chevron" style={{
                transform: citizenshipDropPos ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s'
              }} />
            </div>
          </div>

          {/* Cell: Attachment Status */}
          <div className="rpt-cell" ref={attachDropdownRef} style={{ flex: '0.8' }}>
            <div className="rpt-cell-inner" onClick={() => toggleDrop(attachDropdownRef, setAttachDropPos, [setDivDropPos, setSexDropPos, setCitizenshipDropPos])}>
              <span className="rpt-cell-icon"><FileDown size={16} /></span>
              <div className="rpt-cell-content">
                <span className="rpt-cell-label">Scans</span>
                <span className="rpt-cell-value">{attachLabel}</span>
              </div>
              <ChevronDown size={14} className="rpt-cell-chevron" style={{
                transform: attachDropPos ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s'
              }} />
            </div>
          </div>

          {/* GENERATE BUTTON — Ethiopian Airlines style golden CTA */}
          <button className="rpt-generate-btn" onClick={handleGenerateReport} disabled={loading}>
            {loading ? <RefreshCw size={18} className="rpt-spin" /> : <Search size={18} />}
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>

        {/* Row 3: Secondary inline filters */}
        <div className="rpt-secondary-row">
          <div className="rpt-secondary-field">
            <FileText size={13} className="rpt-secondary-icon" />
            <input type="text" placeholder="Service Provided (e.g. VISA EXTENSION)"
              value={filters.serviceKeyword} onChange={e => handleFilterChange('serviceKeyword', e.target.value)}
              className="rpt-secondary-input" />
          </div>
          <div className="rpt-secondary-field" style={{ flex: '1.5' }}>
            <Search size={13} className="rpt-secondary-icon" />
            <input type="text" placeholder="Search Name, Passport #, Box #, Request # ..."
              value={filters.keyword} onChange={e => handleFilterChange('keyword', e.target.value)}
              className="rpt-secondary-input" />
          </div>
          <button className="rpt-reset-btn" onClick={handleReset} title="Reset all filters">
            <RefreshCw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          RESULTS SECTION
      ══════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>

        {/* Empty/Initial state */}
        {!dataLoaded && results.length === 0 && !loading && (
          <div className="rpt-empty-state animate-fade-in">
            <div className="rpt-empty-icon-ring">
              <BarChart2 size={40} />
            </div>
            <h3 style={{ fontWeight: 700, fontSize: '1.35rem', color: 'var(--text-primary)', margin: 0 }}>
              Ready to Generate Your Report
            </h3>
            <p style={{
              color: 'var(--text-secondary)', maxWidth: '480px', lineHeight: 1.7,
              fontSize: '0.92rem', margin: 0, textAlign: 'center'
            }}>
              Configure your filters above — select file modules, set date ranges, filter by demographics — then click <strong style={{ color: '#b45309' }}>Generate Report</strong> to compile results.
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="rpt-loading-state animate-fade-in">
            <RefreshCw size={36} className="rpt-spin" style={{ color: 'var(--accent-blue)' }} />
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>Compiling report data...</p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading records from all database stores</p>
          </div>
        )}

        {/* Report content */}
        {!loading && dataLoaded && (
          <div id="ics-report-printable">

            {/* Print header (hidden on screen) */}
            <div style={{ display: 'none' }} className="print-only-block" id="print-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', paddingBottom: '12px', borderBottom: '2px solid #333' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '18px' }}>ICS FILE MANAGEMENT SYSTEM</h1>
                  <h2 style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: 'normal' }}>Immigration & Citizenship Service — Report</h2>
                </div>
                <div style={{ textAlign: 'right', fontSize: '11px' }}>
                  <div><strong>Generated:</strong> {new Date().toLocaleString()}</div>
                  <div><strong>Total Records:</strong> {results.length}</div>
                  {filters.dateFrom && <div><strong>From:</strong> {filters.dateFrom}</div>}
                  {filters.dateTo && <div><strong>To:</strong> {filters.dateTo}</div>}
                </div>
              </div>
            </div>

            {/* Summary Stats Cards */}
            {Object.keys(summaryStats).length > 0 && (
              <div className="no-print animate-fade-in" style={{ marginBottom: '8px' }}>
                <div className="rpt-stats-grid">
                  {/* Total card */}
                  <div className="rpt-stat-card rpt-stat-total">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <p className="rpt-stat-label">Total Records</p>
                      <div className="rpt-stat-icon-wrap" style={{ background: 'rgba(29,78,216,0.1)' }}>
                        <BarChart2 size={16} style={{ color: 'var(--accent-blue)' }} />
                      </div>
                    </div>
                    <p className="rpt-stat-number">{results.length}</p>
                    <div className="rpt-stat-meta">
                      <span style={{ color: 'var(--accent-emerald)' }}>✓ {results.filter(r => r.attachments && r.attachments.length > 0).length} scanned</span>
                      <span className="rpt-stat-dot">·</span>
                      <span style={{ color: 'var(--accent-danger)' }}>⚠ {results.filter(r => !r.attachments || r.attachments.length === 0).length} missing</span>
                    </div>
                  </div>

                  {/* Per-division cards */}
                  {Object.entries(summaryStats).map(([key, s]) => (
                    <div key={key} className="rpt-stat-card" style={{ borderTopColor: s.color }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <p className="rpt-stat-label" style={{ lineHeight: 1.3 }}>{s.label}</p>
                        <div className="rpt-stat-icon-wrap" style={{ background: s.bg }}>
                          <span style={{ color: s.color }}>{getDivisionIcon(key)}</span>
                        </div>
                      </div>
                      <p className="rpt-stat-number">{s.total}</p>
                      <div className="rpt-stat-meta">
                        <span style={{ color: 'var(--accent-emerald)' }}>✓ {s.withScans}</span>
                        <span className="rpt-stat-dot">·</span>
                        <span style={{ color: 'var(--accent-danger)' }}>⚠ {s.total - s.withScans}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No results */}
            {results.length === 0 && (
              <div className="rpt-no-results no-print animate-fade-in">
                <AlertTriangle size={40} style={{ color: '#f97316' }} />
                <h3 style={{ fontWeight: 500, margin: 0, fontSize: '1.1rem' }}>No records match your criteria</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Try adjusting the filters or resetting to see all records.</p>
                <button className="rpt-reset-btn" onClick={handleReset} style={{ marginTop: '4px' }}>
                  <RefreshCw size={14} /> Reset Filters
                </button>
              </div>
            )}

            {/* Results Table */}
            {results.length > 0 && (
              <div className="rpt-table-card animate-fade-in" style={{ marginTop: '4px' }}>

                {/* Table toolbar */}
                <div className="rpt-table-toolbar no-print">
                  <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    Compiled Report Records
                    <span className="rpt-table-badge">{results.length}</span>
                  </span>
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rpt-pg-btn">‹ Prev</button>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 500, padding: '0 4px' }}>Page {page} / {totalPages}</span>
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rpt-pg-btn">Next ›</button>
                    </div>
                  )}
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="rpt-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>File Category</th>
                        <th>Shelf No.</th>
                        <th>Cabinet No.</th>
                        <th>BOX No.</th>
                        <th>Full Name</th>
                        <th>Sex</th>
                        <th>Citizenship</th>
                        <th>Passport No.</th>
                        <th>Request No.</th>
                        <th>Date</th>
                        <th>Service</th>
                        <th>Scans</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedResults.map((r, idx) => {
                        const divCfg = getDivisionConfig(r._division);
                        const hasScans = r.attachments && r.attachments.length > 0;
                        const globalIdx = (page - 1) * PAGE_SIZE + idx + 1;
                        return (
                          <tr key={`${r._division}-${r.id}`}>
                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', minWidth: '40px', fontWeight: 600 }}>{globalIdx}</td>
                            <td>
                              <span className="rpt-div-badge" style={{
                                background: divCfg.bg, color: divCfg.color,
                                border: `1px solid ${divCfg.color}20`
                              }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: divCfg.color, flexShrink: 0 }} />
                                {r._divisionLabel}
                              </span>
                            </td>
                            <td>{r.shelfNumber || '—'}</td>
                            <td>{r.cabinetNumber || '—'}</td>
                            <td style={{ fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{r.boxNumber}</td>
                            <td style={{ fontWeight: 600, whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{r.fullName}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>{r.sex}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>{r.citizenship || '—'}</td>
                            <td style={{ fontFamily: 'monospace', whiteSpace: 'nowrap', fontWeight: 500 }}>{r.passportNumber}</td>
                            <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.requestNumber || '—'}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>{r.date || '—'}</td>
                            <td>{r.serviceProvided || '—'}</td>
                            <td>
                              {hasScans ? (
                                <span className="rpt-scan-badge rpt-scan-yes">
                                  <CheckCircle size={12} /> {r.attachments.length}
                                </span>
                              ) : (
                                <span className="rpt-scan-badge rpt-scan-no">
                                  <AlertTriangle size={12} /> None
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Bottom pagination */}
                {totalPages > 1 && (
                  <div className="rpt-table-footer no-print">
                    <button onClick={() => setPage(1)} disabled={page === 1} className="rpt-pg-btn">«</button>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rpt-pg-btn">‹ Prev</button>
                    <span style={{ color: 'var(--text-secondary)', padding: '0 8px', fontWeight: 500, fontSize: '0.85rem' }}>
                      Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({results.length} records)
                    </span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rpt-pg-btn">Next ›</button>
                    <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="rpt-pg-btn">»</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          FIXED-POSITION DROPDOWNS (escape overflow:auto)
      ══════════════════════════════════════════════════ */}

      {/* ══════════════════════════════════════════════════
          FIXED-POSITION DROPDOWNS (rendered in body portal)
      ══════════════════════════════════════════════════ */}

      {divDropPos && ReactDOM.createPortal(
        <div className="rpt-fixed-dropdown" style={{ top: divDropPos.top, left: divDropPos.left, minWidth: Math.max(divDropPos.width, 320) }}>
          <div className="rpt-dropdown-header">
            <span>Select File Modules</span>
            <button className="rpt-dropdown-clear" onClick={() => handleFilterChange('divisions', [])}>Clear All</button>
          </div>
          {divisionOptions.map(div => {
            const isActive = filters.divisions.includes(div.key);
            return (
              <div key={div.key} className={`rpt-dropdown-item ${isActive ? 'active' : ''}`} onClick={() => toggleDivisionFilter(div.key)}>
                <div className="rpt-dropdown-check" style={{ borderColor: isActive ? div.color : undefined, background: isActive ? div.color : undefined }}>
                  {isActive && <CheckCircle size={10} color="#fff" />}
                </div>
                <span style={{ color: isActive ? div.color : undefined, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {getDivisionIcon(div.key)} {div.label}
                </span>
              </div>
            );
          })}
        </div>,
        document.body
      )}

      {sexDropPos && ReactDOM.createPortal(
        <div className="rpt-fixed-dropdown" style={{ top: sexDropPos.top, left: sexDropPos.left, minWidth: sexDropPos.width }}>
          {[{ v: '', l: 'All' }, { v: 'MALE', l: 'Male' }, { v: 'FEMALE', l: 'Female' }].map(o => (
            <div key={o.v} className={`rpt-dropdown-item ${filters.sex === o.v ? 'active' : ''}`}
              onClick={() => { handleFilterChange('sex', o.v); setSexDropPos(null); }}>
              {filters.sex === o.v && <CheckCircle size={12} style={{ color: 'var(--accent-emerald)' }} />}
              {o.l}
            </div>
          ))}
        </div>,
        document.body
      )}

      {citizenshipDropPos && ReactDOM.createPortal(
        <div className="rpt-fixed-dropdown" style={{ top: citizenshipDropPos.top, left: citizenshipDropPos.left, minWidth: Math.max(citizenshipDropPos.width, 220) }}>
          <div className="rpt-dropdown-header"><span>Select Citizenship</span></div>
          {CITIZENSHIPS.map(c => (
            <div key={c} className={`rpt-dropdown-item ${filters.citizenship === c ? 'active' : ''}`}
              onClick={() => { handleFilterChange('citizenship', c); setCitizenshipDropPos(null); }}>
              {filters.citizenship === c && <CheckCircle size={12} style={{ color: 'var(--accent-emerald)' }} />}
              {c === '' ? 'All' : c}
            </div>
          ))}
        </div>,
        document.body
      )}

      {attachDropPos && ReactDOM.createPortal(
        <div className="rpt-fixed-dropdown" style={{ top: attachDropPos.top, left: attachDropPos.left, minWidth: attachDropPos.width }}>
          {[{ v: '', l: 'All' }, { v: 'has', l: 'Has Scans' }, { v: 'missing', l: 'Missing' }].map(o => (
            <div key={o.v} className={`rpt-dropdown-item ${filters.attachmentStatus === o.v ? 'active' : ''}`}
              onClick={() => { handleFilterChange('attachmentStatus', o.v); setAttachDropPos(null); }}>
              {filters.attachmentStatus === o.v && <CheckCircle size={12} style={{ color: 'var(--accent-emerald)' }} />}
              {o.l}
            </div>
          ))}
        </div>,
        document.body
      )}

      {/* ══════════════════════════════════════════════════
          SCOPED STYLES
      ══════════════════════════════════════════════════ */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .rpt-spin { animation: spin 1s linear infinite; }

        @media print {
          #print-header { display: block !important; }
          .print-only-block { display: block !important; }
          .no-print { display: none !important; }
        }

        /* ═══ FILTER BAR ═══ */
        .rpt-filter-bar {
          background: #ffffff;
          border: 1px solid var(--border-glass);
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(15, 43, 92, 0.06);
          overflow: visible;
        }

        /* Row 1: Radio selectors */
        .rpt-type-row {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 14px 24px;
          border-bottom: 1px solid rgba(15, 43, 92, 0.06);
          background: rgba(15, 43, 92, 0.015);
          border-radius: 16px 16px 0 0;
        }
        .rpt-radio-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text-secondary);
          transition: color 0.2s;
          user-select: none;
        }
        .rpt-radio-label:has(input:checked) {
          color: var(--text-primary);
        }
        .rpt-radio-label input { display: none; }
        .rpt-radio-dot {
          width: 16px; height: 16px;
          border-radius: 50%;
          border: 2px solid #94a3b8;
          position: relative;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .rpt-radio-label input:checked + .rpt-radio-dot {
          border-color: #059669;
        }
        .rpt-radio-label input:checked + .rpt-radio-dot::after {
          content: '';
          width: 8px; height: 8px;
          background: #059669;
          border-radius: 50%;
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
        }

        /* Row 2: Main horizontal filter cells */
        .rpt-cells-row {
          display: flex;
          align-items: stretch;
          padding: 0;
          border-bottom: 1px solid rgba(15, 43, 92, 0.06);
          overflow: visible;
          position: relative;
          z-index: 10;
        }

        .rpt-cell {
          position: relative;
          border-right: 1px solid rgba(15, 43, 92, 0.08);
          min-width: 0;
        }
        .rpt-cell:last-of-type { border-right: none; }

        .rpt-cell-inner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 18px;
          cursor: pointer;
          transition: background 0.15s;
          height: 100%;
        }
        .rpt-cell-inner:hover {
          background: rgba(15, 43, 92, 0.02);
        }

        .rpt-cell-icon {
          color: var(--text-secondary);
          opacity: 0.5;
          display: flex;
          flex-shrink: 0;
        }

        .rpt-cell-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          flex: 1;
        }
        .rpt-cell-label {
          font-size: 0.68rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .rpt-cell-value {
          font-size: 0.92rem;
          font-weight: 700;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .rpt-cell-chevron {
          color: var(--text-secondary);
          opacity: 0.5;
          flex-shrink: 0;
        }

        .rpt-cell-date-input {
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text-primary);
          background: transparent;
          border: none;
          outline: none;
          font-family: inherit;
          cursor: pointer;
          padding: 0;
          width: 100%;
        }
        .rpt-cell-date-input::-webkit-calendar-picker-indicator {
          opacity: 0.4;
          cursor: pointer;
        }

        .rpt-cell-text-input {
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text-primary);
          background: transparent;
          border: none;
          outline: none;
          font-family: inherit;
          padding: 0;
          width: 100%;
        }
        .rpt-cell-text-input::placeholder {
          color: #94a3b8;
          font-weight: 500;
        }

        .rpt-cell-separator {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          flex-shrink: 0;
          color: var(--text-secondary);
          opacity: 0.3;
          border-right: 1px solid rgba(15, 43, 92, 0.08);
        }

        /* Dropdown */
        .rpt-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          background: #ffffff;
          border: 1px solid var(--border-glass);
          border-radius: 12px;
          box-shadow: 0 16px 48px rgba(15, 43, 92, 0.16);
          z-index: 9999;
          min-width: 200px;
          padding: 6px;
          animation: rptDropIn 0.15s ease-out;
          max-height: 320px;
          overflow-y: auto;
        }
        .rpt-dropdown-wide { min-width: 320px; }
        .rpt-dropdown-citizenship { min-width: 220px; }

        /* Fixed-position dropdown — escapes overflow:auto containers */
        .rpt-fixed-dropdown {
          position: fixed;
          background: #ffffff;
          border: 1px solid var(--border-glass);
          border-radius: 12px;
          box-shadow: 0 16px 48px rgba(15, 43, 92, 0.18);
          z-index: 99999;
          padding: 6px;
          animation: rptDropIn 0.15s ease-out;
          max-height: 340px;
          overflow-y: auto;
        }
        @keyframes rptDropIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .rpt-dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 10px 6px;
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid rgba(15,43,92,0.06);
          margin-bottom: 4px;
        }
        .rpt-dropdown-clear {
          background: none; border: none; font-size: 0.72rem;
          color: var(--accent-blue); cursor: pointer; font-weight: 600;
        }
        .rpt-dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-secondary);
          transition: all 0.15s;
        }
        .rpt-dropdown-item:hover {
          background: rgba(15,43,92,0.03);
          color: var(--text-primary);
        }
        .rpt-dropdown-item.active {
          background: rgba(5,150,105,0.04);
          color: var(--text-primary);
          font-weight: 600;
        }
        .rpt-dropdown-check {
          width: 16px; height: 16px;
          border-radius: 4px;
          border: 1.5px solid #94a3b8;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        /* Generate CTA */
        .rpt-generate-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px 28px;
          background: linear-gradient(135deg, #d4950a, #f5a623, #e89a0c);
          color: #ffffff;
          border: none;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.25s;
          letter-spacing: 0.3px;
          min-width: 180px;
          border-radius: 0 16px 0 0;
          text-shadow: 0 1px 2px rgba(0,0,0,0.15);
        }
        .rpt-generate-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #c78a08, #e89a0c, #d4950a);
          box-shadow: 0 6px 20px rgba(213, 149, 10, 0.35);
          transform: translateY(-1px);
        }
        .rpt-generate-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* Row 3: Secondary filters */
        .rpt-secondary-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          background: rgba(15,43,92,0.015);
          border-radius: 0 0 16px 16px;
        }
        .rpt-secondary-field {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          background: #ffffff;
          border: 1px solid rgba(15,43,92,0.08);
          border-radius: 8px;
          padding: 0 10px;
          transition: all 0.2s;
        }
        .rpt-secondary-field:focus-within {
          border-color: var(--accent-blue);
          box-shadow: 0 0 0 3px rgba(29,78,216,0.08);
        }
        .rpt-secondary-icon {
          color: var(--text-secondary);
          opacity: 0.4;
          flex-shrink: 0;
        }
        .rpt-secondary-input {
          width: 100%;
          border: none;
          outline: none;
          padding: 9px 0;
          font-size: 0.82rem;
          font-family: inherit;
          color: var(--text-primary);
          background: transparent;
        }
        .rpt-secondary-input::placeholder {
          color: #94a3b8;
        }
        .rpt-reset-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 9px 16px;
          background: #ffffff;
          border: 1px solid rgba(15,43,92,0.1);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .rpt-reset-btn:hover {
          border-color: var(--accent-danger);
          color: var(--accent-danger);
          background: rgba(220,38,38,0.03);
        }

        /* ═══ EMPTY & LOADING ═══ */
        .rpt-empty-state {
          padding: 80px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          background: #ffffff;
          border: 1px solid var(--border-glass);
          border-radius: 20px;
          position: relative;
          overflow: hidden;
        }
        .rpt-empty-state::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #d4950a, #f5a623, var(--accent-blue), #d4950a);
          background-size: 200% 100%;
          animation: gradient-flow 4s linear infinite;
        }
        @keyframes gradient-flow {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .rpt-empty-icon-ring {
          width: 88px; height: 88px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(29,78,216,0.08), rgba(213,149,10,0.06));
          display: flex; align-items: center; justify-content: center;
          color: var(--accent-blue);
          animation: pulse-slow 3s infinite alternate;
        }
        @keyframes pulse-slow {
          0% { transform: scale(1); box-shadow: 0 8px 32px rgba(29,78,216,0.06); }
          100% { transform: scale(1.05); box-shadow: 0 12px 40px rgba(29,78,216,0.12); }
        }

        .rpt-loading-state {
          padding: 60px 40px;
          text-align: center;
          display: flex; flex-direction: column; align-items: center; gap: 14px;
          background: #ffffff;
          border: 1px solid var(--border-glass);
          border-radius: 16px;
        }

        .rpt-no-results {
          padding: 48px;
          text-align: center;
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          background: #ffffff;
          border: 1px solid var(--border-glass);
          border-radius: 16px;
        }

        /* ═══ STATS GRID ═══ */
        .rpt-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 14px;
        }
        .rpt-stat-card {
          background: #ffffff;
          border: 1px solid var(--border-glass);
          border-radius: 14px;
          padding: 18px 20px;
          border-top: 3px solid transparent;
          transition: all 0.2s;
        }
        .rpt-stat-card:hover {
          box-shadow: 0 6px 20px rgba(15,43,92,0.06);
          transform: translateY(-2px);
        }
        .rpt-stat-total {
          border-top-color: var(--accent-blue);
          background: linear-gradient(135deg, rgba(29,78,216,0.015), transparent);
        }
        .rpt-stat-label {
          margin: 0;
          font-size: 0.7rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          font-weight: 700;
        }
        .rpt-stat-icon-wrap {
          width: 32px; height: 32px;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .rpt-stat-number {
          margin: 6px 0 0 0;
          font-size: 2rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1;
        }
        .rpt-stat-meta {
          margin-top: 10px;
          display: flex;
          gap: 6px;
          font-size: 0.73rem;
          font-weight: 600;
        }
        .rpt-stat-dot { color: var(--text-secondary); opacity: 0.4; }

        /* ═══ TABLE ═══ */
        .rpt-table-card {
          background: #ffffff;
          border: 1px solid var(--border-glass);
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(15,43,92,0.04);
          overflow: hidden;
        }
        .rpt-table-toolbar {
          padding: 14px 20px;
          border-bottom: 1px solid var(--border-glass);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .rpt-table-badge {
          background: rgba(29,78,216,0.08);
          color: var(--accent-blue);
          border-radius: 12px;
          padding: 2px 10px;
          font-size: 0.8rem;
          font-weight: 700;
        }
        .rpt-table-footer {
          padding: 14px 20px;
          border-top: 1px solid var(--border-glass);
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 6px;
        }
        .rpt-pg-btn {
          background: #ffffff;
          border: 1px solid var(--border-glass);
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s;
        }
        .rpt-pg-btn:hover:not(:disabled) {
          border-color: var(--accent-blue);
          color: var(--accent-blue);
          background: rgba(29,78,216,0.03);
        }
        .rpt-pg-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .rpt-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.88rem;
        }
        .rpt-table th {
          background: rgba(15,43,92,0.025);
          color: var(--text-primary);
          font-weight: 700;
          padding: 13px 16px;
          text-align: left;
          border-bottom: 1px solid var(--border-glass);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          white-space: nowrap;
        }
        .rpt-table td {
          padding: 13px 16px;
          border-bottom: 1px solid rgba(15,43,92,0.04);
          color: var(--text-secondary);
          font-size: 0.85rem;
          white-space: nowrap;
          vertical-align: middle;
        }
        .rpt-table tbody tr {
          transition: all 0.15s;
        }
        .rpt-table tbody tr:hover {
          background: rgba(29,78,216,0.012) !important;
          box-shadow: inset 3px 0 0 var(--accent-blue);
        }
        .rpt-table tbody tr:hover td {
          color: var(--text-primary);
        }

        .rpt-div-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.73rem;
          font-weight: 700;
          white-space: nowrap;
        }
        .rpt-scan-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .rpt-scan-yes {
          background: rgba(5,150,105,0.07);
          color: #059669;
          border: 1px solid rgba(5,150,105,0.12);
        }
        .rpt-scan-no {
          background: rgba(220,38,38,0.05);
          color: #dc2626;
          border: 1px solid rgba(220,38,38,0.08);
        }

        /* ═══ RESPONSIVE ═══ */
        @media (max-width: 1024px) {
          .rpt-cells-row {
            flex-wrap: wrap;
          }
          .rpt-cell { flex: 1 1 200px !important; }
          .rpt-cell-separator { display: none; }
          .rpt-generate-btn {
            border-radius: 0;
            flex: 1 1 100%;
          }
          .rpt-secondary-row {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}
