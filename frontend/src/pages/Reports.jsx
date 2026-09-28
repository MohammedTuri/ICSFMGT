import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import * as XLSX from 'xlsx';
import {
  BarChart2, Download, Printer, Filter, Search, X,
  CheckCircle, AlertTriangle, FileText, Fingerprint, Award,
  FileWarning, IdCard, Globe, CreditCard, RefreshCw, ChevronDown,
  ChevronUp, Calendar, Users, FileDown, ArrowRight, Layers,
  Edit, Trash2, TrendingUp, Eye, Building2, Package, Check, ChevronRight
} from 'lucide-react';
import { getAllRecords, addRecord, updateRecord, deleteRecord, getAuditLogs, getAllUsers, logAuditEntry, getSystemModules } from '../utils/db';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell, PieChart, Pie } from 'recharts';
import { useBranch } from '../context/BranchContext';
import RecordFormModal from '../components/RecordFormModal';
import RecordViewModal from '../components/RecordViewModal';
import { extractEntitiesFromText } from '../utils/ocrService';
/* ─────────────────────────────────────────────────────
   Division config
───────────────────────────────────────────────────── */
const STATIC_DIVISIONS = [
  { key: 'visa',          label: 'VISA Files',             store: 'visa',          color: '#059669', bg: 'rgba(5,150,105,0.08)'  },
  { key: 'eoid-normal',   label: 'Ethiopian Origin ID — Normal File', store: 'eoid',   color: '#b45309', bg: 'rgba(180,83,9,0.08)'   },
  { key: 'eoid-underage', label: 'Ethiopian Origin ID — Under-Age File', store: 'eoid', color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
  { key: 'residence-id',  label: 'Residence ID File',              store: 'residence_id',  color: '#1d4ed8', bg: 'rgba(29,78,216,0.08)'  },
  { key: 'residence-id-cancellation', label: 'Residence ID Cancellation', store: 'residence_id_cancellation', color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
  { key: 'etd',           label: 'Emergency Travel Document File', store: 'etd',          color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
  { key: 'eritrean-id',   label: 'Eritrean ID File',               store: 'eritrean_id',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
  { key: 'alien-passport',label: 'Alien Passport File',            store: 'alien_passport',color: '#0ea5e9', bg: 'rgba(14,165,233,0.08)' },
];

const DIVISIONS = STATIC_DIVISIONS;

const getDivisionConfig = (key, customDivs = []) => {
  const all = [...STATIC_DIVISIONS, ...customDivs];
  return all.find(d => d.key === key || d.key.replace(/-/g, '_') === key || d.key.replace(/_/g, '-') === key) || {};
};

const CITIZENSHIPS = [
  '', 'AFGHAN', 'ALBANIAN', 'ALGERIAN', 'AMERICAN', 'ANDORRAN', 'ANGOLAN', 'ANTIGUAN', 'ARGENTINE', 'ARMENIAN', 'AUSTRALIAN', 'AUSTRIAN', 'AZERBAIJANI', 'BAHAMIAN', 'BAHRAINI', 'BANGLADESHI', 'BARBADIAN', 'BELARUSIAN', 'BELGIAN', 'BELIZEAN', 'BENINESE', 'BHUTANESE', 'BOLIVIAN', 'BOSNIAN', 'BOTSWANAN', 'BRAZILIAN', 'BRITISH', 'BRUNEIAN', 'BULGARIAN', 'BURKINABE', 'BURMESE', 'BURUNDIAN', 'CAMBODIAN', 'CAMEROONIAN', 'CANADIAN', 'CAPE VERDEAN', 'CENTRAL AFRICAN', 'CHADIAN', 'CHILEAN', 'CHINESE', 'COLOMBIAN', 'COMORAN', 'CONGOLESE', 'COSTA RICAN', 'CROATIAN', 'CUBAN', 'CYPRIOT', 'CZECH', 'DANISH', 'DJIBOUTIAN', 'DOMINICAN', 'DUTCH', 'EAST TIMORESE', 'ECUADORIAN', 'EGYPTIAN', 'EMIRATI', 'EQUATORIAL GUINEAN', 'ERITREAN', 'ESTONIAN', 'ESWATINI', 'ETHIOPIAN', 'FIJIAN', 'FINNISH', 'FRENCH', 'GABONESE', 'GAMBIAN', 'GEORGIAN', 'GERMAN', 'GHANAIAN', 'GREEK', 'GRENADIAN', 'GUATEMALAN', 'GUINEAN', 'GUINEA-BISSAUAN', 'GUYANESE', 'HAITIAN', 'HONDURAN', 'HUNGARIAN', 'ICELANDIC', 'INDIAN', 'INDONESIAN', 'IRANIAN', 'IRAQI', 'IRISH', 'ISRAELI', 'ITALIAN', 'IVORIAN', 'JAMAICAN', 'JAPANESE', 'JORDANIAN', 'KAZAKH', 'KENYAN', 'KIRIBATI', 'KOREAN (NORTH)', 'KOREAN (SOUTH)', 'KUWAITI', 'KYRGYZ', 'LAOTIAN', 'LATVIAN', 'LEBANESE', 'LIBERIAN', 'LIBYAN', 'LIECHTENSTEINER', 'LITHUANIAN', 'LUXEMBOURGER', 'MACEDONIAN', 'MALAGASY', 'MALAWIAN', 'MALAYSIAN', 'MALDIVIAN', 'MALIAN', 'MALTESE', 'MARSHALLESE', 'MAURITANIAN', 'MAURITIAN', 'MEXICAN', 'MICRONESIAN', 'MOLDOVAN', 'MONACAN', 'MONGOLIAN', 'MONTENEGRIN', 'MOROCCAN', 'MOZAMBICAN', 'NAMIBIAN', 'NAURUAN', 'NEPALESE', 'NEW ZEALANDER', 'NICARAGUAN', 'NIGERIEN', 'NIGERIAN', 'NORWEGIAN', 'OMANI', 'PAKISTANI', 'PALAUAN', 'PALESTINIAN', 'PANAMANIAN', 'PAPUA NEW GUINEAN', 'PARAGUAYAN', 'PERUVIAN', 'PHILIPPINE', 'POLISH', 'PORTUGUESE', 'QATARI', 'ROMANIAN', 'RUSSIAN', 'RWANDAN', 'SAINT LUCIAN', 'SALVADORAN', 'SAMOAN', 'SAN MARINESE', 'SAO TOMEAN', 'SAUDI', 'SENEGALESE', 'SERBIAN', 'SEYCHELLOIS', 'SIERRA LEONEAN', 'SINGAPOREAN', 'SLOVAK', 'SLOVENIAN', 'SOLOMON ISLANDER', 'SOMALI', 'SOUTH AFRICAN', 'SOUTH SUDANESE', 'SPANISH', 'SRI LANKAN', 'SUDANESE', 'SURINAMESE', 'SWAZI', 'SWEDISH', 'SWISS', 'SYRIAN', 'TAIWANESE', 'TAJIK', 'TANZANIAN', 'THAI', 'TOGOLESE', 'TONGAN', 'TRINIDADIAN', 'TUNISIAN', 'TURKISH', 'TURKMEN', 'TUVALUAN', 'UGANDAN', 'UKRAINIAN', 'URUGUAYAN', 'UZBEK', 'VANUATUAN', 'VATICAN', 'VENEZUELAN', 'VIETNAMESE', 'YEMENI', 'ZAMBIAN', 'ZIMBABWEAN', 'OTHER'
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
  const { selectedBranch, userBranch, isAdmin, filterByBranch } = useBranch();

  /* ── Auth ── */
  const [currentUser, setCurrentUser] = useState(null);
  const [allowedDivisions, setAllowedDivisions] = useState([]);
  const [allDivisionsList, setAllDivisionsList] = useState(STATIC_DIVISIONS);
  const [customModulesList, setCustomModulesList] = useState([]);

  /* ── Tabs / Views ── */
  const [activeTab, setActiveTab] = useState('data');
  const [officerPerformance, setOfficerPerformance] = useState([]);
  /* ── Performance Filter Criteria (Draft vs Applied) ── */
  const [perfOfficerDraft, setPerfOfficerDraft] = useState('');
  const [perfActionDraft, setPerfActionDraft] = useState('');
  const [perfOfficerApplied, setPerfOfficerApplied] = useState('');
  const [perfActionApplied, setPerfActionApplied] = useState('');
  const [perfViewMode, setPerfViewMode] = useState('summary');
  const [rawAuditLogs, setRawAuditLogs] = useState([]);

  /* ── Summary Report State ── */
  const [summaryPeriod, setSummaryPeriod] = useState('ALL');
  const [summaryDateFrom, setSummaryDateFrom] = useState('');
  const [summaryDateTo, setSummaryDateTo] = useState('');
  const [summaryDivision, setSummaryDivision] = useState('ALL');

  /* ── Data ── */
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showGeneratedReport, setShowGeneratedReport] = useState(false);

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
    officer: ''
  });

  /* ── Per-dropdown position state: null = closed, {top,left,width} = open ── */
  const [divDropPos,         setDivDropPos]         = useState(null);
  const [sexDropPos,         setSexDropPos]         = useState(null);
  const [citizenshipDropPos, setCitizenshipDropPos] = useState(null);
  const [attachDropPos,      setAttachDropPos]      = useState(null);
  const [officerDropPos,     setOfficerDropPos]     = useState(null);
  const [officerOptions,     setOfficerOptions]     = useState([]);

  const divDropdownRef         = useRef(null);
  const sexDropdownRef         = useRef(null);
  const attachDropdownRef      = useRef(null);
  const citizenshipDropdownRef = useRef(null);
  const officerDropdownRef     = useRef(null);

  /* Helper: open one dropdown, close the rest, compute fixed position from element rect */
  const toggleDrop = (ref, setter, others) => {
    others.forEach(s => s(null)); // close all siblings
    const rect = ref.current?.getBoundingClientRect();
    setter(prev => {
      if (prev) return null; // toggle off if already open
      return rect ? { top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 200) } : null;
    });
  };

  /* ── Division options (derived from allowedDivisions — must be above all handlers) ── */
  const divisionOptions = allDivisionsList.filter(d => {
    const key = d.key;
    return allowedDivisions.includes(key) || 
           allowedDivisions.includes(key.replace(/-/g, '_')) || 
           allowedDivisions.includes(key.replace(/_/g, '-')) ||
           (key.startsWith('eoid') && allowedDivisions.includes('eoid'));
  });

  /* ── UI ── */
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [summaryStats, setSummaryStats] = useState({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [modalActiveTab, setModalActiveTab] = useState('');
  const PAGE_SIZE = 10;
  const reportGenerated = activeTab === 'data' && showGeneratedReport && dataLoaded && !loading;

  const printStyleRef = useRef(null);

  /* ── Close dropdowns on outside click and scroll ── */
  useEffect(() => {
    const handler = (e) => {
      if (e.target.closest('.rpt-fixed-dropdown')) return;
      if (divDropdownRef.current         && !divDropdownRef.current.contains(e.target))         setDivDropPos(null);
      if (sexDropdownRef.current         && !sexDropdownRef.current.contains(e.target))         setSexDropPos(null);
      if (attachDropdownRef.current      && !attachDropdownRef.current.contains(e.target))      setAttachDropPos(null);
      if (citizenshipDropdownRef.current && !citizenshipDropdownRef.current.contains(e.target)) setCitizenshipDropPos(null);
      if (officerDropdownRef.current     && !officerDropdownRef.current.contains(e.target))     setOfficerDropPos(null);
    };
    const handleScroll = (e) => {
      if (e.target.closest && e.target.closest('.rpt-fixed-dropdown')) return;
      setDivDropPos(null);
      setSexDropPos(null);
      setCitizenshipDropPos(null);
      setAttachDropPos(null);
      setOfficerDropPos(null);
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

  /* ── Auto-load data when Summary tab is opened ── */
  useEffect(() => {
    if (activeTab === 'summary' && !dataLoaded && !loading) {
      loadAllData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  /* ── Load auth & Preload Users ── */
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
      setAllowedDivisions(allDivisionsList.map(d => d.key));
    }

    // Preload users for the filter dropdown so it's available before they generate the report
    getAllUsers().then(users => {
      const allUserNames = users.filter(u => u.role !== 'SUPERADMIN').map(u => u.fullName || u.email || u.username);
      setOfficerOptions(allUserNames.sort());
    }).catch(console.error);
  }, []);

  /* ── Load all accessible data ── */
  const loadAllData = async () => {
    setLoading(true);
    try {
      const session = JSON.parse(localStorage.getItem('ics_auth_user')) || {};
      const isRestricted = session.role === 'OFFICER' || session.role === 'VIEWER';

      // Load custom modules dynamically
      const customMods = await getSystemModules().catch(() => []);
      const activeCustomMods = (customMods || []).filter(m => m.isActive);
      setCustomModulesList(activeCustomMods);

      const dynamicDivisions = [
        ...STATIC_DIVISIONS,
        ...activeCustomMods.map(m => ({
          key: m.key,
          label: m.title,
          store: m.key.replace(/-/g, '_'),
          color: m.color || '#10b981',
          bg: `${m.color || '#10b981'}18`,
          isCustom: true
        }))
      ];
      setAllDivisionsList(dynamicDivisions);

      const allowed = isRestricted ? (session.allowedDivisions || []) : dynamicDivisions.map(d => d.key);

      const all = [];
      const unifiedEoidRecords = await getAllRecords('eoid').catch(() => []);
      for (const div of dynamicDivisions) {
        const divKey = div.key;
        const normKey = divKey.replace(/-/g, '_');
        const isDivAllowed = !isRestricted || 
          allowed.includes(divKey) || 
          allowed.includes(normKey) || 
          allowed.includes(divKey.replace(/_/g, '-')) ||
          (divKey.startsWith('eoid') && allowed.includes('eoid'));

        if (!isDivAllowed) continue;

        const records = div.key === 'eoid-normal'
          ? unifiedEoidRecords.filter(r => !r.eoidType || r.eoidType === 'EOID-NORMAL')
          : div.key === 'eoid-underage'
            ? unifiedEoidRecords.filter(r => r.eoidType === 'EOID-UNDER-AGE')
            : await getAllRecords(div.store).catch(() => []);
        records.forEach(r => {
          const normalized = { ...r, _division: div.key, _divisionLabel: div.label };
          const isLegacyRecord = normalized.serviceProvided === 'LEGACY ARCHIVE INGESTION'
            || /^BULK-/i.test(String(normalized.personalId || ''));
          const attachmentOcr = Array.isArray(normalized.attachments)
            ? normalized.attachments.map(att => att?.ocrText || '').filter(Boolean).join('\n')
            : '';
          const legacyOcr = [normalized.ocrText, attachmentOcr].filter(Boolean).join('\n');
          if (isLegacyRecord && legacyOcr) {
            const extracted = extractEntitiesFromText(legacyOcr);
            normalized.firstName = extracted.firstName || normalized.firstName;
            normalized.middleName = extracted.middleName || normalized.middleName;
            normalized.lastName = extracted.lastName || normalized.lastName;
            normalized.fullName = [normalized.firstName, normalized.middleName, normalized.lastName].filter(Boolean).join(' ') || normalized.fullName;
            normalized.citizenship = extracted.citizenship || normalized.citizenship;
            normalized.sex = extracted.sex || normalized.sex;
            normalized.birthdate = extracted.birthdate || normalized.birthdate;
          }
          if (/^BULK-/i.test(String(normalized.personalId || ''))) normalized.personalId = '';
          all.push(normalized);
        });
      }
      
      // Load Officer Performance
      try {
        const users = await getAllUsers();
        const userMap = {};
        const allUserNames = users.filter(u => u.role !== 'SUPERADMIN').map(u => u.fullName || u.email || u.username);
        
        users.forEach(u => {
          userMap[u.username] = u.fullName || u.email || u.username;
        });

        // Set initial options so it always lists users
        setOfficerOptions(allUserNames.sort());

        const logs = await getAuditLogs();
        setRawAuditLogs(logs || []);
        const performanceMap = {};
        const recordOfficerMap = {};
        logs.forEach(log => {
          const officerId = log.userName || 'Unknown Officer';
          const officerName = userMap[officerId] || officerId;
          if (!recordOfficerMap[log.recordId]) {
            recordOfficerMap[log.recordId] = officerName;
          }
          if (!performanceMap[officerName]) {
            performanceMap[officerName] = { name: officerName, added: 0, edited: 0, imported: 0, deleted: 0, lastActive: log.timestamp || null };
          }
          if (log.action === 'CREATE') performanceMap[officerName].added += 1;
          else if (log.action === 'UPDATE') performanceMap[officerName].edited += 1;
          else if (log.action === 'IMPORT') performanceMap[officerName].imported += 1;
          else if (log.action === 'DELETE') performanceMap[officerName].deleted += 1;

          if (log.timestamp && (!performanceMap[officerName].lastActive || new Date(log.timestamp) > new Date(performanceMap[officerName].lastActive))) {
            performanceMap[officerName].lastActive = log.timestamp;
          }
        });
        setOfficerPerformance(Object.values(performanceMap));
        
        // Include any that might be in logs but not active users anymore
        Object.keys(performanceMap).forEach(name => {
          if (!allUserNames.includes(name) && name !== 'Unknown Officer') allUserNames.push(name);
        });
        setOfficerOptions(allUserNames.sort());

        all.forEach(r => {
          r._officer = recordOfficerMap[r.id] || 'System/Admin';
        });
      } catch (err) {
        console.error('Audit/User load error:', err);
      }

      const scopedAll = filterByBranch(all);
      setAllData(scopedAll);
      setDataLoaded(true);
      applyFilters(scopedAll, filters);
      setShowGeneratedReport(true);
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
        (r.personalId && r.personalId.toUpperCase().includes(term)) ||
        (r.passportNumber && r.passportNumber.toUpperCase().includes(term)) ||
        (r.boxNumber && r.boxNumber.toUpperCase().includes(term)) ||
        (r.requestNumber && r.requestNumber.toUpperCase().includes(term)) ||
        (r.eoidNumber && r.eoidNumber.toUpperCase().includes(term)) ||
        (r.residenceIdNumber && r.residenceIdNumber.toUpperCase().includes(term)) ||
        (r.etdNumber && r.etdNumber.toUpperCase().includes(term)) ||
        (r.shelfNumber && r.shelfNumber.toUpperCase().includes(term))
      );
    }
    if (f.officer) {
      result = result.filter(r => r._officer === f.officer);
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
      citizenship: '', attachmentStatus: '', serviceKeyword: '', keyword: '', officer: ''
    };
    setFilters(fresh);
    setShowGeneratedReport(false);
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

  const handleOpenEdit = (record) => {
    setEditingRecord(record);
    setModalActiveTab(record._division || '');
    setIsEditModalOpen(true);
  };

  const handleOpenAdd = (divisionKey) => {
    setEditingRecord(null);
    setModalActiveTab(divisionKey || divisionOptions[0]?.key || '');
    setIsEditModalOpen(true);
  };

  useEffect(() => {
    if (!modalActiveTab && divisionOptions.length > 0) {
      setModalActiveTab(divisionOptions[0].key);
    }
  }, [divisionOptions]);

  const handleCloseEdit = () => {
    setIsEditModalOpen(false);
    setEditingRecord(null);
    setModalActiveTab('');
  };

  const handleSaveEditedRecord = async (savedRecord) => {
    try {
      // Determine whether this is an edit or add
      if (editingRecord && editingRecord.id) {
        const storeName = getDivisionConfig(editingRecord._division).store;
        await updateRecord(storeName, savedRecord);
      } else {
        // Add mode: use modalActiveTab as target division
        const targetDiv = modalActiveTab || savedRecord._division || '';
        const storeName = getDivisionConfig(targetDiv).store;
        await addRecord(storeName, savedRecord);
      }
      handleCloseEdit();
      setModalActiveTab('');
      await loadAllData();
    } catch (err) {
      console.error('Failed to save edited/added record:', err);
      alert('Unable to save changes. Please try again.');
    }
  };

  const handleDeleteRecord = async (record) => {
    if (!record?.id) return;
    const name = record.fullName || record.personalId || 'this record';
    if (!window.confirm(`Are you sure you want to delete ${name}? It will be moved to the Recycle Bin.`)) return;

    try {
      const storeName = getDivisionConfig(record._division).store;
      
      // Clean record details (strip division-specific helper fields added by reports compile)
      const cleanRecord = { ...record };
      delete cleanRecord._division;
      delete cleanRecord._divisionLabel;
      delete cleanRecord._officer;

      // Move to Recycle Bin before deleting
      await addRecord('recycle_bin', {
        originalStore: storeName,
        deletedBy: currentUser?.fullName || currentUser?.username || 'Unknown User',
        deletedAt: new Date().toISOString(),
        recordData: cleanRecord
      });

      await deleteRecord(storeName, record.id);

      // Log the deletion in audit logs
      await logAuditEntry(
        'DELETE',
        storeName,
        currentUser?.id || 'unknown',
        currentUser?.fullName || currentUser?.username || 'Unknown User',
        record.id,
        cleanRecord || { id: record.id }
      );

      await loadAllData();
    } catch (err) {
      console.error('Failed to delete record:', err);
      alert('Unable to delete record. Please try again.');
    }
  };

  /* ── Excel Export ── */
  const handleExportExcel = () => {
    if (results.length === 0) { alert('No records to export.'); return; }
    const headers = [
      'Division', 'Shelf No.', 'BOX Number', 'Personal ID', 'Full Name', 'Sex', 'Citizenship',
      'Passport Number', 'Request Number', 'Date', 'Service Provided',
      'EOID Number', 'Residence ID No.', 'ETD Number',
      'Eritrean ID No.', 'Alien Passport No.',
      'Attachment Count'
    ];

    const data = results.map(r => {
      return {
        'Division': r._divisionLabel || '',
        'Shelf No.': r.shelfNumber || '',
        'BOX Number': r.boxNumber || '',
        'Personal ID': r.personalId || '',
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
        'Attachment Count': r.attachments ? r.attachments.length : 0
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `ICS_Report_${today}.xlsx`);
  };

  /* ── Export Executive Summary to Excel ── */
  const handleExportSummaryExcel = (summaryData) => {
    if (!summaryData || !summaryData.records || summaryData.records.length === 0) {
      alert('No summary records available to export.');
      return;
    }
    const wb = XLSX.utils.book_new();

    // 1. Overview Sheet
    const overviewRows = [
      { 'Metric': 'Report Title', 'Value': 'Immigration & Clearance Executive Summary Report' },
      { 'Metric': 'Generated At', 'Value': new Date().toLocaleString() },
      { 'Metric': 'Selected Period', 'Value': summaryData.periodLabel },
      { 'Metric': 'Branch Filter', 'Value': selectedBranch || 'All Branches' },
      { 'Metric': 'Total Dossiers', 'Value': summaryData.total },
      { 'Metric': 'Total Scanned / Digitized', 'Value': summaryData.scanned },
      { 'Metric': 'Digitization Rate', 'Value': `${summaryData.coverage}%` },
      { 'Metric': 'Missing Scans', 'Value': summaryData.missing },
      { 'Metric': 'Distinct Nationalities', 'Value': summaryData.nationalities.length },
      { 'Metric': 'Male Applicants', 'Value': summaryData.maleCount },
      { 'Metric': 'Female Applicants', 'Value': summaryData.femaleCount }
    ];
    const wsOverview = XLSX.utils.json_to_sheet(overviewRows);
    XLSX.utils.book_append_sheet(wb, wsOverview, 'Executive_Overview');

    // 2. Division Breakdown Sheet
    const divisionRows = summaryData.divisionStats.map(d => ({
      'Module / Division': d.label,
      'Total Dossiers': d.total,
      'Scanned Records': d.scanned,
      'Missing Scans': d.missing,
      'Digitization Compliance %': `${d.coverage}%`,
      'Male': d.male,
      'Female': d.female,
      'Share of Total %': `${d.share}%`
    }));
    const wsDivisions = XLSX.utils.json_to_sheet(divisionRows);
    XLSX.utils.book_append_sheet(wb, wsDivisions, 'Module_Breakdown');

    // 3. Nationalities Breakdown Sheet
    const nationalityRows = summaryData.nationalities.map((n, i) => ({
      'Rank': i + 1,
      'Citizenship / Country': n.country,
      'Total Dossiers': n.count,
      'Share %': `${n.percent}%`
    }));
    const wsNationalities = XLSX.utils.json_to_sheet(nationalityRows);
    XLSX.utils.book_append_sheet(wb, wsNationalities, 'Top_Nationalities');

    // 4. Visa Types Breakdown Sheet
    const visaRows = summaryData.visaTypeStats.map(v => ({
      'Visa Category': v.type,
      'Total Registered': v.count,
      'Share of Visa %': `${v.percent}%`
    }));
    const wsVisa = XLSX.utils.json_to_sheet(visaRows);
    XLSX.utils.book_append_sheet(wb, wsVisa, 'Visa_Classifications');

    // 5. Branch Breakdown Sheet
    const branchRows = summaryData.branchStats.map(b => ({
      'Branch Station': b.branch,
      'Total Records': b.total,
      'Scanned': b.scanned,
      'Missing': b.missing,
      'Compliance %': `${b.coverage}%`
    }));
    const wsBranches = XLSX.utils.json_to_sheet(branchRows);
    XLSX.utils.book_append_sheet(wb, wsBranches, 'Branch_Distribution');

    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `ICS_Executive_Summary_${today}.xlsx`);
  };

  /* ── Excel Import ── */
  const handleImportExcel = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls';
    input.onchange = async (e) => {
      try {
        const file = e.target.files[0];
        if (!file) return;
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          alert('No records found in the Excel file.');
          return;
        }

        // Map Excel columns to record fields and import records
        let importCount = 0;
        for (const row of jsonData) {
          try {
            const record = {
              boxNumber: row['BOX Number'] || '',
              shelfNumber: row['Shelf No.'] || '',
              personalId: row['Personal ID'] || '',
              fullName: row['Full Name'] || '',
              sex: row['Sex'] || '',
              citizenship: row['Citizenship'] || '',
              passportNumber: row['Passport Number'] || '',
              requestNumber: row['Request Number'] || '',
              date: row['Date'] || new Date().toISOString().split('T')[0],
              serviceProvided: row['Service Provided'] || '',
              eoidNumber: row['EOID Number'] || '',
              residenceIdNumber: row['Residence ID No.'] || '',
              etdNumber: row['ETD Number'] || '',
              eritreanIdNumber: row['Eritrean ID No.'] || '',
              alienPassportNumber: row['Alien Passport No.'] || '',
              attachments: []
            };
            importCount++;
          } catch (err) {
            console.error('Error importing row:', err);
          }
        }
        alert(`Successfully imported ${importCount} records from Excel file!`);
        handleGenerateReport();
      } catch (err) {
        alert('Error importing Excel file: ' + err.message);
      }
    };
    input.click();
  };

  /* ── Print ── */
  const handlePrint = () => window.print();

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const paginatedResults = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ── Helpers ── */
  const getDivisionIcon = (key) => {
    if (key === 'visa') return <FileText size={15} />;
    if (key.startsWith('eoid')) return <Fingerprint size={15} />;
    if (key === 'residence-id') return <Award size={15} />;
    if (key === 'etd') return <FileWarning size={15} />;
    if (key === 'eritrean-id') return <IdCard size={15} />;
    if (key === 'alien-passport') return <Globe size={15} />;
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
        display: reportGenerated ? 'none' : 'block',
        background: 'linear-gradient(135deg, #0f2b5c 0%, #1a3a6e 40%, #1d4ed8 100%)',
        borderRadius: '20px',
        padding: '32px 36px 28px',
        position: 'relative',
        overflow: 'hidden',
        color: '#ffffff',
        backdropFilter: 'blur(18px)',
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
            <div style={{ display: 'flex', gap: '8px', margin: '20px 0 0 54px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setActiveTab('summary')}
                style={{
                  background: activeTab === 'summary' ? 'rgba(255,255,255,0.2)' : 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                  fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px'
                }}><BarChart2 size={16} /> Summary Report</button>
              <button 
                onClick={() => setActiveTab('data')}
                style={{
                  background: activeTab === 'data' ? 'rgba(255,255,255,0.2)' : 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                  fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s'
                }}>Data Records</button>
              <button 
                onClick={() => setActiveTab('performance')}
                style={{
                  background: activeTab === 'performance' ? 'rgba(255,255,255,0.2)' : 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                  fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px'
                }}><TrendingUp size={16} /> Officer Performance</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
              {}
              <>
                <button onClick={handleExportExcel} style={{
                  background: '#ef4444', border: '1px solid #dc2626',
                  color: '#fff', padding: '10px 20px', borderRadius: '10px',
                  display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                  fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#ef4444'; }}
                >
                  <Download size={16} /> Export Excel
                </button>
                {results.length > 0 && (
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
                )}
              </>
          </div>
        </div>
      </div>

      {activeTab === 'data' && (
        <>
          {/* ══════════════════════════════════════════════════
              AIRLINE-STYLE HORIZONTAL FILTER BAR
          ══════════════════════════════════════════════════ */}
          <div className="no-print rpt-filter-bar animate-fade-in" style={{ display: reportGenerated ? 'none' : 'block' }}>

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
        </div>

        {/* Row 2: Scans and Officer */}
        <div className="rpt-cells-row">

          {/* Cell: Attachment Status */}
          <div className="rpt-cell" ref={attachDropdownRef} style={{ flex: '0.8' }}>
            <div className="rpt-cell-inner" onClick={() => toggleDrop(attachDropdownRef, setAttachDropPos, [setDivDropPos, setSexDropPos, setCitizenshipDropPos, setOfficerDropPos])}>
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

          {/* Cell: Officer */}
          <div className="rpt-cell" ref={officerDropdownRef} style={{ flex: '1' }}>
            <div className="rpt-cell-inner" onClick={() => toggleDrop(officerDropdownRef, setOfficerDropPos, [setDivDropPos, setSexDropPos, setCitizenshipDropPos, setAttachDropPos])}>
              <span className="rpt-cell-icon"><Award size={16} /></span>
              <div className="rpt-cell-content">
                <span className="rpt-cell-label">Officer</span>
                <span className="rpt-cell-value">{filters.officer || 'All Users'}</span>
              </div>
              <ChevronDown size={14} className="rpt-cell-chevron" style={{
                transform: officerDropPos ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s'
              }} />
            </div>
          </div>
        </div>

        {/* Row 2: GENERATE BUTTON — Ethiopian Airlines style golden CTA */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 0', gap: '16px' }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      Compiled Report Records
                      <span className="rpt-table-badge">{results.length}</span>
                    </span>
                    <span style={{
                      fontSize: '0.78rem',
                      color: '#0284c7',
                      background: 'rgba(2, 132, 199, 0.08)',
                      border: '1px solid rgba(2, 132, 199, 0.25)',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      ↔ Scroll right to view Passport #, Date & Scans
                    </span>
                  </div>
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rpt-pg-btn">‹ Prev</button>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 500, padding: '0 4px' }}>Page {page} / {totalPages}</span>
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rpt-pg-btn">Next ›</button>
                    </div>
                  )}
                </div>

                <div className="rpt-table-scroll-container">
                  <table className="rpt-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>File Category</th>
                        <th>Shelf No.</th>
                        <th>BOX No.</th>
                        <th style={{ color: '#1054a8', fontWeight: 700 }}>🪪 Personal ID</th>
                        <th>Full Name</th>
                        <th>Sex</th>
                        <th>Citizenship</th>
                        <th>Passport No.</th>
                        <th>Request No.</th>
                        <th>Date</th>
                        <th>Service</th>
                        <th>Officer</th>
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
                            <td style={{ fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{r.boxNumber}</td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1054a8', whiteSpace: 'nowrap' }}>{r.personalId || '—'}</td>
                            <td style={{ fontWeight: 600, whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{r.fullName}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>{r.sex}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>{r.citizenship || '—'}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {r.passportNumber ? (
                                <span style={{
                                  fontFamily: 'monospace',
                                  fontWeight: 700,
                                  fontSize: '0.86rem',
                                  color: '#0369a1',
                                  background: '#f0f9ff',
                                  border: '1px solid #bae6fd',
                                  padding: '3px 9px',
                                  borderRadius: '6px',
                                  letterSpacing: '0.5px'
                                }}>
                                  {r.passportNumber}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-secondary)' }}>—</span>
                              )}
                            </td>
                            <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.requestNumber || '—'}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>{r.date || '—'}</td>
                            <td>{r.serviceProvided || '—'}</td>
                            <td style={{ whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--accent-blue)' }}>{r._officer}</td>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {Array.from({ length: totalPages }, (_, index) => index + 1).map(pageNumber => (
                        <button
                          key={pageNumber}
                          onClick={() => setPage(pageNumber)}
                          aria-label={`Go to page ${pageNumber}`}
                          aria-current={page === pageNumber ? 'page' : undefined}
                          className="rpt-pg-btn"
                          style={{
                            minWidth: '34px',
                            background: page === pageNumber ? '#1d4ed8' : '#ffffff',
                            color: page === pageNumber ? '#ffffff' : 'var(--text-primary)',
                            borderColor: page === pageNumber ? '#1d4ed8' : undefined,
                            fontWeight: page === pageNumber ? 700 : 500
                          }}
                        >
                          {pageNumber}
                        </button>
                      ))}
                    </div>
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

      {reportGenerated && (
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="rpt-reset-btn" onClick={() => setDataLoaded(false)}>
            <Filter size={14} /> Change Filters
          </button>
          <button className="rpt-reset-btn" onClick={handleExportExcel}>
            <Download size={14} /> Export Excel
          </button>
          {results.length > 0 && (
            <button className="rpt-reset-btn" onClick={handlePrint}>
              <Printer size={14} /> Print
            </button>
          )}
        </div>
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

      {isEditModalOpen && (
        <RecordFormModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEdit}
          onSave={handleSaveEditedRecord}
          activeTab={modalActiveTab || editingRecord?._division || ''}
          initialRecord={editingRecord}
        />
      )}

      {viewingRecord && (
        <RecordViewModal
          isOpen={!!viewingRecord}
          onClose={() => setViewingRecord(null)}
          record={viewingRecord}
          category={viewingRecord._division}
          onEdit={(rec) => handleOpenEdit(rec)}
        />
      )}

      {officerDropPos && ReactDOM.createPortal(
        <div className="rpt-fixed-dropdown" style={{ top: officerDropPos.top, left: officerDropPos.left, minWidth: Math.max(officerDropPos.width, 160) }}>
          <div className="rpt-dropdown-item" onClick={() => { handleFilterChange('officer', ''); setOfficerDropPos(null); }}>
            {!filters.officer && <CheckCircle size={12} style={{ color: 'var(--accent-emerald)' }} />}
            <span style={{ marginLeft: !filters.officer ? '0' : '16px' }}>All Users</span>
          </div>
          {officerOptions.map(o => (
            <div key={o} className={`rpt-dropdown-item ${filters.officer === o ? 'active' : ''}`}
              onClick={() => { handleFilterChange('officer', o); setOfficerDropPos(null); }}>
              {filters.officer === o && <CheckCircle size={12} style={{ color: 'var(--accent-emerald)' }} />}
              <span style={{ marginLeft: filters.officer === o ? '0' : '16px' }}>{o}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
        </>
      )}

      {activeTab === 'summary' && (() => {
        // Filter data based on selected Summary Period, Custom Dates, and Division
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        let sumData = [...allData];

        // 1. Division filter
        if (summaryDivision !== 'ALL') {
          sumData = sumData.filter(r => r._division === summaryDivision);
        }

        // 2. Period filter
        if (summaryPeriod === 'TODAY') {
          sumData = sumData.filter(r => r.date === todayStr);
        } else if (summaryPeriod === 'WEEK') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          sumData = sumData.filter(r => r.date && r.date >= sevenDaysAgo);
        } else if (summaryPeriod === 'MONTH') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          sumData = sumData.filter(r => r.date && r.date >= thirtyDaysAgo);
        } else if (summaryPeriod === 'YEAR') {
          const currentYear = todayStr.substring(0, 4);
          sumData = sumData.filter(r => r.date && r.date.startsWith(currentYear));
        } else if (summaryPeriod === 'CUSTOM') {
          if (summaryDateFrom) sumData = sumData.filter(r => r.date && r.date >= summaryDateFrom);
          if (summaryDateTo) sumData = sumData.filter(r => r.date && r.date <= summaryDateTo);
        }

        // Core Summary Metrics
        const grandTotal = sumData.length;
        const grandScanned = sumData.filter(r => r.attachments && r.attachments.length > 0).length;
        const grandMissing = grandTotal - grandScanned;
        const grandCoverage = grandTotal > 0 ? Math.round((grandScanned / grandTotal) * 100) : 0;
        const maleCount = sumData.filter(r => (r.sex || '').toUpperCase() === 'MALE').length;
        const femaleCount = sumData.filter(r => (r.sex || '').toUpperCase() === 'FEMALE').length;

        // Division Breakdown Statistics
        const accessibleDivisions = allDivisionsList.filter(d => {
          const key = d.key;
          return allowedDivisions.includes(key) || 
                 allowedDivisions.includes(key.replace(/-/g, '_')) || 
                 allowedDivisions.includes(key.replace(/_/g, '-')) ||
                 (key.startsWith('eoid') && allowedDivisions.includes('eoid'));
        });

        const divisionStats = accessibleDivisions.map(div => {
          const divRecords = sumData.filter(r => r._division === div.key);
          const total = divRecords.length;
          const scanned = divRecords.filter(r => r.attachments && r.attachments.length > 0).length;
          const missing = total - scanned;
          const coverage = total > 0 ? Math.round((scanned / total) * 100) : 0;
          const male = divRecords.filter(r => (r.sex || '').toUpperCase() === 'MALE').length;
          const female = divRecords.filter(r => (r.sex || '').toUpperCase() === 'FEMALE').length;
          const share = grandTotal > 0 ? ((total / grandTotal) * 100).toFixed(1) : '0.0';
          return {
            key: div.key,
            label: div.label,
            color: div.color,
            bg: div.bg,
            total,
            scanned,
            missing,
            coverage,
            male,
            female,
            share
          };
        });

        // Top Nationalities
        const natMap = {};
        sumData.forEach(r => {
          const c = (r.citizenship || 'UNKNOWN').trim().toUpperCase();
          if (c) natMap[c] = (natMap[c] || 0) + 1;
        });
        const nationalities = Object.entries(natMap)
          .map(([country, count]) => ({
            country,
            count,
            percent: grandTotal > 0 ? ((count / grandTotal) * 100).toFixed(1) : '0.0'
          }))
          .sort((a, b) => b.count - a.count);

        const top10Nationalities = nationalities.slice(0, 10);

        // Official 13 Visa Types Breakdown
        const OFFICIAL_VISA_TYPES = [
          'Medical Treatment Visa',
          'Sports Competition and Training Visa',
          'Residence Visa',
          'Religion Visa',
          'Student Visa',
          'Entertainment Industry Visa',
          'Private Work Visa',
          'NGO Visa-NV',
          'Government Work Visa',
          'Investment Visa',
          'Tourist Visa',
          'Workshop/Conference Visa',
          'Journalist Visa'
        ];

        const visaRecords = sumData.filter(r => r._division === 'visa');
        const visaTypeMap = {};
        visaRecords.forEach(r => {
          const vt = r.visaType || 'Unspecified Visa';
          visaTypeMap[vt] = (visaTypeMap[vt] || 0) + 1;
        });

        const visaTypeStats = OFFICIAL_VISA_TYPES.map(vt => {
          const count = visaTypeMap[vt] || 0;
          const percent = visaRecords.length > 0 ? ((count / visaRecords.length) * 100).toFixed(1) : '0.0';
          return { type: vt, count, percent };
        });

        // Other non-standard visa types if any existing in historical data
        Object.keys(visaTypeMap).forEach(vt => {
          if (!OFFICIAL_VISA_TYPES.includes(vt) && vt !== 'Unspecified Visa') {
            const count = visaTypeMap[vt];
            const percent = visaRecords.length > 0 ? ((count / visaRecords.length) * 100).toFixed(1) : '0.0';
            visaTypeStats.push({ type: `${vt} (Legacy)`, count, percent });
          }
        });

        // Branch Distribution
        const branchMap = {};
        sumData.forEach(r => {
          const b = r.branch || 'Head Office (Addis Ababa)';
          if (!branchMap[b]) branchMap[b] = { branch: b, total: 0, scanned: 0 };
          branchMap[b].total += 1;
          if (r.attachments && r.attachments.length > 0) branchMap[b].scanned += 1;
        });

        const branchStats = Object.values(branchMap).map(b => ({
          ...b,
          missing: b.total - b.scanned,
          coverage: b.total > 0 ? Math.round((b.scanned / b.total) * 100) : 0
        })).sort((a, b) => b.total - a.total);

        // Timeline Monthly Trend (last 12 months)
        const monthMap = {};
        sumData.forEach(r => {
          if (r.date && r.date.length >= 7) {
            const m = r.date.substring(0, 7); // YYYY-MM
            monthMap[m] = (monthMap[m] || 0) + 1;
          }
        });
        const timelineStats = Object.entries(monthMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-12)
          .map(([month, count]) => ({ month, count }));

        const periodLabel = 
          summaryPeriod === 'TODAY' ? `Today (${todayStr})` :
          summaryPeriod === 'WEEK' ? 'Last 7 Days' :
          summaryPeriod === 'MONTH' ? 'Last 30 Days' :
          summaryPeriod === 'YEAR' ? `Year ${todayStr.substring(0, 4)}` :
          summaryPeriod === 'CUSTOM' ? `Custom Range (${summaryDateFrom || 'Start'} to ${summaryDateTo || 'Now'})` :
          'All Time Cumulative';

        const exportSummaryPayload = {
          records: sumData,
          periodLabel,
          total: grandTotal,
          scanned: grandScanned,
          missing: grandMissing,
          coverage: grandCoverage,
          maleCount,
          femaleCount,
          divisionStats,
          nationalities,
          visaTypeStats,
          branchStats
        };

        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px', padding: '4px 0' }}>
            
            {/* ══════════════════════════════════════════════════
                EXECUTIVE ANALYTICS CONTROL BAR (Period & Module)
            ══════════════════════════════════════════════════ */}
            <div className="no-print" style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '20px 24px',
              border: '1px solid var(--border-glass)',
              boxShadow: '0 4px 20px rgba(15,43,92,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Executive Analytics & Summary Scope
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    Reporting Period: <span style={{ color: '#059669' }}>{periodLabel}</span>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => handleExportSummaryExcel(exportSummaryPayload)}
                    style={{
                      background: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      padding: '9px 18px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Download size={15} /> Export Summary Excel
                  </button>
                  <button
                    onClick={handlePrint}
                    style={{
                      background: 'linear-gradient(135deg, #0f2b5c, #1d4ed8)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '9px 18px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 8px rgba(15,43,92,0.2)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Printer size={15} /> Print Executive Summary
                  </button>
                  <button
                    onClick={loadAllData}
                    disabled={loading}
                    title="Refresh Data"
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      color: '#475569',
                      padding: '9px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <RefreshCw size={16} className={loading ? 'rpt-spin' : ''} />
                  </button>
                </div>
              </div>

              {/* Filter Pills / Selectors */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                {/* Period Pills */}
                <div style={{ display: 'flex', background: '#f8fafc', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  {[
                    { id: 'ALL', label: 'All Time' },
                    { id: 'TODAY', label: 'Today' },
                    { id: 'WEEK', label: 'This Week' },
                    { id: 'MONTH', label: 'This Month' },
                    { id: 'YEAR', label: 'This Year' },
                    { id: 'CUSTOM', label: 'Custom Range' },
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSummaryPeriod(p.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: summaryPeriod === p.id ? '#ffffff' : 'transparent',
                        color: summaryPeriod === p.id ? '#0f2b5c' : '#64748b',
                        boxShadow: summaryPeriod === p.id ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Custom Date Pickers */}
                {summaryPeriod === 'CUSTOM' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '4px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <Calendar size={14} style={{ color: '#64748b' }} />
                    <input
                      type="date"
                      value={summaryDateFrom}
                      onChange={e => setSummaryDateFrom(e.target.value)}
                      style={{ border: 'none', background: 'transparent', fontSize: '0.82rem', fontWeight: 600, color: '#0f2b5c', outline: 'none' }}
                      placeholder="From"
                    />
                    <span style={{ color: '#94a3b8' }}>→</span>
                    <input
                      type="date"
                      value={summaryDateTo}
                      onChange={e => setSummaryDateTo(e.target.value)}
                      style={{ border: 'none', background: 'transparent', fontSize: '0.82rem', fontWeight: 600, color: '#0f2b5c', outline: 'none' }}
                      placeholder="To"
                    />
                  </div>
                )}

                {/* Division Filter Dropdown */}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Scope:</span>
                  <select
                    value={summaryDivision}
                    onChange={e => setSummaryDivision(e.target.value)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      color: '#0f2b5c',
                      outline: 'none'
                    }}
                  >
                    <option value="ALL">All File Modules ({accessibleDivisions.length})</option>
                    {accessibleDivisions.map(d => (
                      <option key={d.key} value={d.key}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════
                EXECUTIVE KPI SCORECARD CARDS
            ══════════════════════════════════════════════════ */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px'
            }}>
              {/* Card 1: Total Dossiers */}
              <div style={{
                background: 'linear-gradient(135deg, #0f2b5c 0%, #1e3a5f 100%)',
                borderRadius: '16px', padding: '22px 24px', color: '#ffffff',
                boxShadow: '0 8px 24px rgba(15,43,92,0.18)', position: 'relative', overflow: 'hidden'
              }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
                  Total Registered Dossiers
                </div>
                <div style={{ fontSize: '2.4rem', fontWeight: 800, lineHeight: 1, marginBottom: '10px' }}>
                  {grandTotal.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{accessibleDivisions.length} Active System Modules</span>
                </div>
              </div>

              {/* Card 2: Digitized / Scanned */}
              <div style={{
                background: '#ffffff',
                borderRadius: '16px', padding: '22px 24px',
                border: '1px solid var(--border-glass)',
                borderTop: '4px solid #059669',
                boxShadow: '0 4px 20px rgba(15,43,92,0.06)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#64748b' }}>
                    Digitized / Scanned
                  </span>
                  <span style={{ background: 'rgba(16,185,129,0.1)', color: '#059669', padding: '2px 8px', borderRadius: '12px', fontSize: '0.74rem', fontWeight: 800 }}>
                    {grandCoverage}% Rate
                  </span>
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#059669', lineHeight: 1, marginBottom: '10px' }}>
                  {grandScanned.toLocaleString()}
                </div>
                {/* Progress bar */}
                <div style={{ background: '#e2e8f0', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${grandCoverage}%`, background: '#059669', borderRadius: '99px' }} />
                </div>
              </div>

              {/* Card 3: Missing / Physical-Only */}
              <div style={{
                background: '#ffffff',
                borderRadius: '16px', padding: '22px 24px',
                border: '1px solid var(--border-glass)',
                borderTop: '4px solid #dc2626',
                boxShadow: '0 4px 20px rgba(15,43,92,0.06)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#64748b' }}>
                    Pending / Missing Scans
                  </span>
                  <span style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626', padding: '2px 8px', borderRadius: '12px', fontSize: '0.74rem', fontWeight: 800 }}>
                    {grandTotal > 0 ? Math.round((grandMissing / grandTotal) * 100) : 0}% Pending
                  </span>
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#dc2626', lineHeight: 1, marginBottom: '10px' }}>
                  {grandMissing.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Physical paper archive only
                </div>
              </div>

              {/* Card 4: Nationalities & Gender */}
              <div style={{
                background: '#ffffff',
                borderRadius: '16px', padding: '22px 24px',
                border: '1px solid var(--border-glass)',
                borderTop: '4px solid #1d4ed8',
                boxShadow: '0 4px 20px rgba(15,43,92,0.06)'
              }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#64748b', marginBottom: '8px' }}>
                  Nationalities & Gender
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#1d4ed8', lineHeight: 1, marginBottom: '10px' }}>
                  {nationalities.length} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b' }}>Countries</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', gap: '12px', fontWeight: 600 }}>
                  <span>👨 Male: {maleCount}</span>
                  <span>👩 Female: {femaleCount}</span>
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════
                SECTION 1: COMPREHENSIVE MODULE BREAKDOWN MATRIX (TABLE)
            ══════════════════════════════════════════════════ */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid var(--border-glass)',
              boxShadow: '0 4px 24px rgba(15,43,92,0.06)',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '20px 24px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f2b5c' }}>
                    Module-by-Module Comparative Breakdown
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    Dossier volume distribution, digitization status, and applicant gender ratios
                  </p>
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f2b5c', background: '#e2e8f0', padding: '4px 12px', borderRadius: '20px' }}>
                  {divisionStats.length} Modules Analyzed
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#0f2b5c', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                      <th style={{ padding: '12px 18px', textAlign: 'left' }}>File Module / Division</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Total Dossiers</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Scanned (Digital)</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Missing (Physical)</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', minWidth: '160px' }}>Digitization Rate</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Male</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>Female</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Share of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {divisionStats.map(stat => (
                      <tr key={stat.key} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                        <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0f2b5c' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: stat.color, flexShrink: 0 }} />
                            <span>{stat.label}</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 14px', textAlign: 'center', fontWeight: 800, color: '#0f2b5c', fontSize: '0.95rem' }}>
                          {stat.total.toLocaleString()}
                        </td>
                        <td style={{ padding: '14px 14px', textAlign: 'center', fontWeight: 700, color: '#059669' }}>
                          {stat.scanned.toLocaleString()}
                        </td>
                        <td style={{ padding: '14px 14px', textAlign: 'center', fontWeight: 700, color: stat.missing > 0 ? '#dc2626' : '#94a3b8' }}>
                          {stat.missing.toLocaleString()}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, background: '#e2e8f0', borderRadius: '99px', height: '7px', overflow: 'hidden' }}>
                              <div style={{ width: `${stat.coverage}%`, height: '100%', background: stat.color, borderRadius: '99px' }} />
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f2b5c', minWidth: '35px' }}>
                              {stat.coverage}%
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 14px', textAlign: 'center', color: '#475569' }}>{stat.male}</td>
                        <td style={{ padding: '14px 14px', textAlign: 'center', color: '#475569' }}>{stat.female}</td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#1d4ed8' }}>
                          {stat.share}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 800, color: '#0f2b5c', fontSize: '0.9rem' }}>
                      <td style={{ padding: '16px 18px' }}>GRAND TOTAL (SUMMARY)</td>
                      <td style={{ padding: '16px 14px', textAlign: 'center', color: '#0f2b5c' }}>{grandTotal.toLocaleString()}</td>
                      <td style={{ padding: '16px 14px', textAlign: 'center', color: '#059669' }}>{grandScanned.toLocaleString()}</td>
                      <td style={{ padding: '16px 14px', textAlign: 'center', color: '#dc2626' }}>{grandMissing.toLocaleString()}</td>
                      <td style={{ padding: '16px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, background: '#e2e8f0', borderRadius: '99px', height: '8px', overflow: 'hidden' }}>
                            <div style={{ width: `${grandCoverage}%`, height: '100%', background: '#059669', borderRadius: '99px' }} />
                          </div>
                          <span style={{ fontWeight: 800, color: '#059669' }}>{grandCoverage}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 14px', textAlign: 'center' }}>{maleCount}</td>
                      <td style={{ padding: '16px 14px', textAlign: 'center' }}>{femaleCount}</td>
                      <td style={{ padding: '16px 16px', textAlign: 'right', color: '#059669' }}>100.0%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════
                SECTION 2: TOP NATIONALITIES & DEMOGRAPHICS (2 COLUMNS)
            ══════════════════════════════════════════════════ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
              
              {/* Left Column: Top 10 Nationalities Table */}
              <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid var(--border-glass)',
                boxShadow: '0 4px 24px rgba(15,43,92,0.06)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ padding: '18px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f2b5c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Globe size={18} style={{ color: '#0ea5e9' }} /> Top 10 Registered Nationalities
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>{nationalities.length} Total</span>
                </div>
                <div style={{ padding: '12px 20px', flex: 1, overflowY: 'auto', maxHeight: '380px' }}>
                  {top10Nationalities.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>No citizenship records available.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {top10Nationalities.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ width: '22px', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', textAlign: 'center' }}>
                            #{idx + 1}
                          </span>
                          <span style={{ flex: '1.2', fontSize: '0.84rem', fontWeight: 700, color: '#0f2b5c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.country}
                          </span>
                          <div style={{ flex: '1.5', background: '#f1f5f9', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
                            <div style={{ width: `${item.percent}%`, height: '100%', background: '#0ea5e9', borderRadius: '99px' }} />
                          </div>
                          <span style={{ minWidth: '45px', textAlign: 'right', fontSize: '0.84rem', fontWeight: 800, color: '#0f2b5c' }}>
                            {item.count}
                          </span>
                          <span style={{ minWidth: '45px', textAlign: 'right', fontSize: '0.76rem', fontWeight: 600, color: '#64748b' }}>
                            {item.percent}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Top Nationalities Chart */}
              <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid var(--border-glass)',
                boxShadow: '0 4px 24px rgba(15,43,92,0.06)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ padding: '18px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: '0.95rem', color: '#0f2b5c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart2 size={18} style={{ color: '#10b981' }} /> Nationalities Volume Distribution
                </div>
                <div style={{ padding: '16px', flex: 1, minHeight: '320px' }}>
                  {top10Nationalities.length === 0 ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>No data for chart.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={top10Nationalities.slice(0, 7)} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="country" tick={{ fontSize: 11, fontWeight: 600, fill: '#0f2b5c' }} width={85} />
                        <Tooltip contentStyle={{ background: '#0f2b5c', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.82rem' }} />
                        <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]}>
                          {top10Nationalities.map((_, i) => (
                            <Cell key={`cell-${i}`} fill={['#059669', '#0ea5e9', '#1d4ed8', '#7c3aed', '#f59e0b', '#dc2626', '#10b981'][i % 7]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

            </div>

            {/* ══════════════════════════════════════════════════
                SECTION 3: ETHIOPIAN VISA CLASSIFICATIONS BREAKDOWN (OFFICIAL 13 TYPES)
            ══════════════════════════════════════════════════ */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid var(--border-glass)',
              boxShadow: '0 4px 24px rgba(15,43,92,0.06)',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '20px 24px',
                background: 'linear-gradient(135deg, rgba(5,150,105,0.05), rgba(5,150,105,0.01))',
                borderBottom: '1px solid rgba(5,150,105,0.15)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={18} /> Official Ethiopian Visa Classifications
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    Breakdown of issued visas strictly classified under Ethiopia's 13 official visa categories
                  </p>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#059669', background: 'rgba(5,150,105,0.12)', padding: '4px 12px', borderRadius: '20px' }}>
                  {visaRecords.length} Total Visa Files
                </span>
              </div>

              <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                  {visaTypeStats.map((v, i) => (
                    <div key={i} style={{
                      padding: '12px 16px',
                      background: v.count > 0 ? 'rgba(5,150,105,0.03)' : '#f8fafc',
                      borderRadius: '10px',
                      border: v.count > 0 ? '1px solid rgba(5,150,105,0.25)' : '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: v.count > 0 ? '#0f2b5c' : '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {v.type}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                          {v.percent}% of all Visas
                        </div>
                      </div>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        background: v.count > 0 ? '#059669' : '#e2e8f0',
                        color: v.count > 0 ? '#ffffff' : '#64748b'
                      }}>
                        {v.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════
                SECTION 4: BRANCH STATIONS & REGISTRATION TIMELINE
            ══════════════════════════════════════════════════ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
              
              {/* Branch Stations Breakdown */}
              <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid var(--border-glass)',
                boxShadow: '0 4px 24px rgba(15,43,92,0.06)',
                overflow: 'hidden'
              }}>
                <div style={{ padding: '18px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: '0.95rem', color: '#0f2b5c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={18} style={{ color: '#1d4ed8' }} /> Branch Stations Operations
                </div>
                <div style={{ padding: '12px 20px', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                        <th style={{ padding: '8px 6px', textAlign: 'left' }}>Branch Station</th>
                        <th style={{ padding: '8px 6px', textAlign: 'center' }}>Total</th>
                        <th style={{ padding: '8px 6px', textAlign: 'center' }}>Scanned</th>
                        <th style={{ padding: '8px 6px', textAlign: 'right' }}>Compliance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branchStats.map((b, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 6px', fontWeight: 700, color: '#0f2b5c' }}>{b.branch}</td>
                          <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 800 }}>{b.total}</td>
                          <td style={{ padding: '10px 6px', textAlign: 'center', color: '#059669', fontWeight: 700 }}>{b.scanned}</td>
                          <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: '#1d4ed8' }}>{b.coverage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Monthly Volume Trend Chart */}
              <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid var(--border-glass)',
                boxShadow: '0 4px 24px rgba(15,43,92,0.06)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ padding: '18px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: '0.95rem', color: '#0f2b5c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={18} style={{ color: '#7c3aed' }} /> Registration Volume Timeline (Monthly)
                </div>
                <div style={{ padding: '16px', flex: 1, minHeight: '260px' }}>
                  {timelineStats.length === 0 ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>No timeline data available.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={timelineStats} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: '#0f2b5c', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.82rem' }} />
                        <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

            </div>

          </div>
        );
      })()}

      {activeTab === 'performance' && (() => {
        // Filter Officer Summary list based on APPLIED filters
        const filteredOfficerList = officerPerformance.filter(officer => {
          if (perfOfficerApplied && officer.name.toLowerCase() !== perfOfficerApplied.toLowerCase()) return false;
          if (perfActionApplied === 'CREATE' && officer.added === 0) return false;
          if (perfActionApplied === 'UPDATE' && officer.edited === 0) return false;
          if (perfActionApplied === 'IMPORT' && officer.imported === 0) return false;
          if (perfActionApplied === 'DELETE' && officer.deleted === 0) return false;
          return true;
        });

        // Filter Detailed Activity Logs based on APPLIED filters
        const filteredActivityLogs = rawAuditLogs.filter(log => {
          const officerName = log.userName || 'Unknown Officer';
          if (perfOfficerApplied && officerName.toLowerCase() !== perfOfficerApplied.toLowerCase()) return false;
          if (perfActionApplied && log.action !== perfActionApplied) return false;
          return true;
        });

        const getActionBadgeStyle = (action) => {
          switch (action) {
            case 'CREATE': return { background: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.3)' };
            case 'UPDATE': return { background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.3)' };
            case 'IMPORT': return { background: 'rgba(168, 85, 247, 0.12)', color: '#9333ea', border: '1px solid rgba(168, 85, 247, 0.3)' };
            case 'DELETE': return { background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.3)' };
            default: return { background: 'rgba(148, 163, 184, 0.12)', color: '#64748b', border: '1px solid rgba(148, 163, 184, 0.3)' };
          }
        };

        return (
          <div className="animate-fade-in" style={{ background: '#fff', borderRadius: '16px', padding: '32px', border: '1px solid var(--border-glass)', boxShadow: '0 4px 24px rgba(15, 43, 92, 0.06)' }}>
            
            {/* Header & Criteria Control Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '0.3px' }}>Officer Performance Metrics</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tabular evaluation of staff engagements and record action history</p>
              </div>

              {/* View Switcher Tabs */}
              <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '10px', border: '1px solid rgba(15,43,92,0.06)' }}>
                <button
                  type="button"
                  onClick={() => setPerfViewMode('summary')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: perfViewMode === 'summary' ? '#ffffff' : 'transparent',
                    color: perfViewMode === 'summary' ? '#0f2b5c' : '#64748b',
                    boxShadow: perfViewMode === 'summary' ? '0 2px 8px rgba(15,43,92,0.08)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  📊 Summary Table
                </button>
                <button
                  type="button"
                  onClick={() => setPerfViewMode('activity')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: perfViewMode === 'activity' ? '#ffffff' : 'transparent',
                    color: perfViewMode === 'activity' ? '#0f2b5c' : '#64748b',
                    boxShadow: perfViewMode === 'activity' ? '0 2px 8px rgba(15,43,92,0.08)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  📋 Detailed Activity Log ({filteredActivityLogs.length})
                </button>
              </div>
            </div>

            {/* Filter Criteria Panel */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '20px',
              alignItems: 'center',
              background: '#f8fafc',
              border: '1px solid rgba(15, 43, 92, 0.08)',
              borderRadius: '12px',
              padding: '18px 24px',
              marginBottom: '28px'
            }}>
              {/* Criteria 1: Officer Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Select Officer Name
                </label>
                <select
                  value={perfOfficerDraft}
                  onChange={e => setPerfOfficerDraft(e.target.value)}
                  style={{
                    padding: '9px 14px',
                    fontSize: '0.88rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(15, 43, 92, 0.15)',
                    background: '#ffffff',
                    color: '#0f2b5c',
                    fontWeight: 600,
                    minWidth: '220px',
                    outline: 'none'
                  }}
                >
                  <option value="">All Officers ({officerPerformance.length})</option>
                  {officerOptions.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Criteria 2: Action Type */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Select Action Criteria
                </label>
                <select
                  value={perfActionDraft}
                  onChange={e => setPerfActionDraft(e.target.value)}
                  style={{
                    padding: '9px 14px',
                    fontSize: '0.88rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(15, 43, 92, 0.15)',
                    background: '#ffffff',
                    color: '#0f2b5c',
                    fontWeight: 600,
                    minWidth: '200px',
                    outline: 'none'
                  }}
                >
                  <option value="">All Actions (Added, Modified, Imported, Deleted)</option>
                  <option value="CREATE">Added Records (CREATE)</option>
                  <option value="UPDATE">Modified Records (UPDATE)</option>
                  <option value="IMPORT">Bulk Imported (IMPORT)</option>
                  <option value="DELETE">Deleted Records (DELETE)</option>
                </select>
              </div>

              {/* Generate Report Button (Applies the draft filters) */}
              <button
                type="button"
                onClick={() => {
                  setPerfOfficerApplied(perfOfficerDraft);
                  setPerfActionApplied(perfActionDraft);
                  setLoading(true);
                  setTimeout(() => setLoading(false), 200);
                }}
                style={{
                  marginTop: '20px',
                  background: 'linear-gradient(135deg, #1054a8 0%, #0b3c78 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 20px',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(16, 84, 168, 0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(16, 84, 168, 0.4)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 84, 168, 0.3)';
                }}
              >
                <FileText size={16} /> Generate Report
              </button>

              {/* Clear Selection Criteria */}
              {(perfOfficerDraft || perfActionDraft || perfOfficerApplied || perfActionApplied) && (
                <button
                  type="button"
                  onClick={() => {
                    setPerfOfficerDraft('');
                    setPerfActionDraft('');
                    setPerfOfficerApplied('');
                    setPerfActionApplied('');
                  }}
                  style={{
                    marginTop: '20px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    color: 'var(--accent-danger)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Clear Criteria
                </button>
              )}
            </div>

            {/* View Mode: SUMMARY TABLE */}
            {perfViewMode === 'summary' ? (
              filteredOfficerList.length === 0 ? (
                <div className="rpt-empty-state">
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No officer performance records match the selected criteria.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(15, 43, 92, 0.1)' }}>
                  <table className="glass-table" style={{ width: '100%', margin: 0 }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', color: '#0f2b5c' }}>
                        <th style={{ padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Officer Name</th>
                        <th style={{ padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px', textAlign: 'center' }}>Records Added</th>
                        <th style={{ padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px', textAlign: 'center' }}>Records Modified</th>
                        <th style={{ padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px', textAlign: 'center' }}>Records Imported</th>
                        <th style={{ padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px', textAlign: 'center' }}>Records Deleted</th>
                        <th style={{ padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px', textAlign: 'center' }}>Total Engagements</th>
                        <th style={{ padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px', textAlign: 'right' }}>Last Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOfficerList.map((officer, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(15, 43, 92, 0.06)' }}>
                          <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f2b5c' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(16, 84, 168, 0.1)', color: '#1054a8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800 }}>
                                {officer.name ? officer.name[0].toUpperCase() : 'U'}
                              </div>
                              <span>{officer.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', fontWeight: 700, fontSize: '0.88rem' }}>
                              {officer.added || 0}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', fontWeight: 700, fontSize: '0.88rem' }}>
                              {officer.edited || 0}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(168, 85, 247, 0.1)', color: '#9333ea', fontWeight: 700, fontSize: '0.88rem' }}>
                              {officer.imported || 0}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', fontWeight: 700, fontSize: '0.88rem' }}>
                              {officer.deleted || 0}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 800, fontSize: '1.05rem', color: '#0f2b5c' }}>
                            {(officer.added || 0) + (officer.edited || 0) + (officer.imported || 0) + (officer.deleted || 0)}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', color: '#64748b', fontSize: '0.82rem', fontWeight: 500 }}>
                            {officer.lastActive ? new Date(officer.lastActive).toLocaleString() : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              /* View Mode: DETAILED ACTIVITY TABLE */
              filteredActivityLogs.length === 0 ? (
                <div className="rpt-empty-state">
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No detailed activity logs match the selected officer and action criteria.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(15, 43, 92, 0.1)' }}>
                  <table className="glass-table" style={{ width: '100%', margin: 0 }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', color: '#0f2b5c' }}>
                        <th style={{ padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Officer Name</th>
                        <th style={{ padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Action Criteria</th>
                        <th style={{ padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Division / Category</th>
                        <th style={{ padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>Dossier Record Subject</th>
                        <th style={{ padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px', textAlign: 'right' }}>Date & Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredActivityLogs.map((log, i) => {
                        const badgeStyle = getActionBadgeStyle(log.action);
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(15, 43, 92, 0.06)' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f2b5c' }}>
                              {log.userName || 'System/Admin'}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                ...badgeStyle
                              }}>
                                {log.action === 'CREATE' ? 'Added' : log.action === 'UPDATE' ? 'Modified' : log.action === 'IMPORT' ? 'Imported' : log.action === 'DELETE' ? 'Deleted' : log.action}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                              {(log.storeName || 'General').replace(/_/g, ' ').toUpperCase()}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#0f2b5c' }}>
                              {log.recordData?.fullName || log.recordData?.personalId || log.recordData?.passportNumber ? (
                                <span>
                                  <strong>{log.recordData?.fullName || 'Record'}</strong>
                                  {log.recordData?.passportNumber && <span style={{ color: '#64748b', marginLeft: '6px' }}>({log.recordData.passportNumber})</span>}
                                  {log.recordData?.boxNumber && <span style={{ color: '#0ea5e9', marginLeft: '6px', fontWeight: 700 }}>[{log.recordData.boxNumber}]</span>}
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>Dossier ID: #{log.recordId || log.id}</span>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b', fontSize: '0.82rem', fontWeight: 500 }}>
                              {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* Print performance summary button */}
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }} className="no-print">
              <button
                type="button"
                onClick={handlePrint}
                style={{
                  background: '#1054a8',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 22px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(16, 84, 168, 0.25)'
                }}
              >
                <Printer size={16} /> Print Performance Report
              </button>
            </div>

          </div>
        );
      })()}

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
          overflow-x: auto;
          overflow-y: hidden;
          position: relative;
          z-index: 10;
        }
        /* Custom scrollbar for cells row */
        .rpt-cells-row::-webkit-scrollbar {
          height: 6px;
        }
        .rpt-cells-row::-webkit-scrollbar-track {
          background: rgba(15, 43, 92, 0.02);
        }
        .rpt-cells-row::-webkit-scrollbar-thumb {
          background: rgba(15, 43, 92, 0.15);
          border-radius: 4px;
        }

        .rpt-cell {
          position: relative;
          border-right: 1px solid rgba(15, 43, 92, 0.08);
          min-width: 140px;
          flex: 1 0 auto !important;
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
        .rpt-summary-card {
          background: #fff;
          border-radius: 14px;
          padding: 24px;
          border: 1px solid rgba(15,43,92,0.08);
          box-shadow: 0 2px 12px rgba(15,43,92,0.05);
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .rpt-summary-card:hover {
          box-shadow: 0 8px 28px rgba(15,43,92,0.12);
          transform: translateY(-2px);
        }
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
        .rpt-action-cell {
          display: flex;
          gap: 6px;
          justify-content: flex-start;
          align-items: center;
        }
        .rpt-action-btn {
          border: 1px solid transparent;
          border-radius: 8px;
          background: #f8fafc;
          color: var(--text-primary);
          font-size: 0.82rem;
          font-weight: 600;
          padding: 6px 10px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
        }
        .rpt-action-btn:hover {
          background: #eef2ff;
        }
        .rpt-action-view {
          border-color: rgba(59, 130, 246, 0.25);
          color: #2563eb;
        }
        .rpt-action-edit {
          border-color: rgba(37, 99, 235, 0.2);
          color: #1d4ed8;
        }
        .rpt-action-delete {
          border-color: rgba(239, 68, 68, 0.2);
          color: #dc2626;
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

        .rpt-table-scroll-container {
          overflow: auto;
          max-height: calc(100vh - 280px);
          min-height: 420px;
          width: 100%;
          padding-bottom: 8px;
          -webkit-overflow-scrolling: touch;
        }
        .rpt-table-scroll-container::-webkit-scrollbar {
          height: 12px;
          width: 10px;
        }
        .rpt-table-scroll-container::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 8px;
        }
        .rpt-table-scroll-container::-webkit-scrollbar-thumb {
          background: linear-gradient(90deg, #2563eb, #1d4ed8);
          border-radius: 8px;
          border: 2px solid #f1f5f9;
        }
        .rpt-table-scroll-container::-webkit-scrollbar-thumb:hover {
          background: #1e40af;
        }

        .rpt-table {
          width: 100%;
          min-width: 1350px;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 0.88rem;
        }
        .rpt-table th {
          position: sticky;
          top: 0;
          z-index: 10;
          background: #f1f5f9;
          color: #0f172a;
          font-weight: 700;
          padding: 14px 16px;
          text-align: left;
          border-bottom: 2px solid #cbd5e1;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.06);
        }
        .rpt-table td {
          padding: 13px 16px;
          border-bottom: 1px solid rgba(15,43,92,0.06);
          color: var(--text-secondary);
          font-size: 0.85rem;
          white-space: nowrap;
          vertical-align: middle;
        }
        .rpt-table tbody tr {
          transition: all 0.15s;
        }
        .rpt-table tbody tr:nth-child(even) {
          background: #f8fafc;
        }
        .rpt-table tbody tr:hover {
          background: #f0f9ff !important;
          box-shadow: inset 4px 0 0 #0284c7;
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
