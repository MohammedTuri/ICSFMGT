import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  Users, AlertTriangle, FileText, Fingerprint, Award, FileWarning,
  Search, Eye, FileDown, CheckCircle, IdCard, Globe, Clock,
  Plus, Edit2, Trash2, Download, Package, Building2, Shield,
  ArrowUpRight, Sparkles, Filter, ChevronRight, Calendar, UserCheck
} from 'lucide-react';
import { getAllRecords, getAuditLogs, getSystemModules, getModuleOverrides } from '../utils/db';
import { useBranch } from '../context/BranchContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { selectedBranch, userBranch, isAdmin, filterByBranch } = useBranch();

  const [stats, setStats] = useState({
    total: 0,
    visa: 0,
    eoid: 0,
    residence: 0,
    etd: 0,
    eritreanId: 0,
    alienPassport: 0,
    residenceCancellation: 0,
    missingAttachments: 0,
    usersCount: 0,
    activeUsers: 0
  });

  const [dbData, setDbData] = useState({
    visa: [],
    eoid: [],
    residence: [],
    residenceCancellation: [],
    etd: [],
    eritreanId: [],
    alienPassport: []
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [customModules, setCustomModules] = useState([]);
  const [customStats, setCustomStats] = useState({});
  const [customRecordsMap, setCustomRecordsMap] = useState({});
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load Data
  useEffect(() => {
    async function loadStats() {
      try {
        const session = JSON.parse(localStorage.getItem('ics_auth_user')) || {};
        const isRestricted = session.role === 'OFFICER' || session.role === 'VIEWER';
        const allowed = session.allowedDivisions || [];
        const isDivAllowed = (key) => !isRestricted || allowed.includes(key) || (key === 'eoid' && (allowed.includes('eoid-normal') || allowed.includes('eoid-underage')));

        const rawVisa = isDivAllowed('visa') ? await getAllRecords('visa').catch(() => []) : [];
        const rawEoidPrimary = isDivAllowed('eoid') ? await getAllRecords('eoid').catch(() => []) : [];
        const rawEoid = rawEoidPrimary;

        const rawResidence = isDivAllowed('residence-id') ? await getAllRecords('residence_id').catch(() => []) : [];
        const rawResidenceCancellation = isDivAllowed('residence-id-cancellation') ? await getAllRecords('residence_id_cancellation').catch(() => []) : [];
        const rawEtd = isDivAllowed('etd') ? await getAllRecords('etd').catch(() => []) : [];
        const rawEritreanId = isDivAllowed('eritrean-id') ? await getAllRecords('eritrean_id').catch(() => []) : [];
        const rawAlienPassport = isDivAllowed('alien-passport') ? await getAllRecords('alien_passport').catch(() => []) : [];
        const rawUsers = (session.role === 'ADMIN' || session.role === 'SUPERVISOR') ? await getAllRecords('users').catch(() => []) : [];

        // Apply Branch Filtering
        const visa = filterByBranch(rawVisa);
        const eoid = filterByBranch(rawEoid);
        const residence = filterByBranch(rawResidence);
        const residenceCancellation = filterByBranch(rawResidenceCancellation);
        const etd = filterByBranch(rawEtd);
        const eritreanId = filterByBranch(rawEritreanId);
        const alienPassport = filterByBranch(rawAlienPassport);

        const vCount = visa.length;
        const eoidCount = eoid.length;
        const rCount = residence.length;
        const rcCount = residenceCancellation.length;
        const etdCount = etd.length;
        const eIdCount = eritreanId.length;
        const aPassCount = alienPassport.length;

        const countMissing = (records) => {
          return records.filter(r => !r.attachments || r.attachments.length === 0).length;
        };

        const totalMissing = countMissing(visa) + countMissing(eoid) + countMissing(residence) + countMissing(residenceCancellation) + countMissing(etd) + countMissing(eritreanId) + countMissing(alienPassport);

        setStats({
          total: vCount + eoidCount + rCount + rcCount + etdCount + eIdCount + aPassCount,
          visa: vCount,
          eoid: eoidCount,
          residence: rCount,
          residenceCancellation: rcCount,
          etd: etdCount,
          eritreanId: eIdCount,
          alienPassport: aPassCount,
          missingAttachments: totalMissing,
          usersCount: rawUsers.length,
          activeUsers: rawUsers.filter(u => u.isActive !== false).length
        });

        setDbData({
          visa,
          eoid,
          residence,
          residenceCancellation,
          etd,
          eritreanId,
          alienPassport
        });

        // Load custom modules
        const mods = await getSystemModules().catch(() => []);
        if (mods && mods.length > 0) {
          const activeMods = mods.filter(m => m.isActive);
          setCustomModules(activeMods);
          const cStats = {};
          const cRecords = {};
          for (const mod of activeMods) {
            const tableKey = mod.key.replace(/-/g, '_');
            const rawRecords = await getAllRecords(tableKey).catch(() => []);
            const records = filterByBranch(rawRecords);
            cStats[mod.key] = records.length;
            cRecords[mod.key] = records;
          }
          setCustomStats(cStats);
          setCustomRecordsMap(cRecords);
        }

      } catch (err) {
        console.error('Error loading stats:', err);
      }
    }

    loadStats();
    const handleModulesChanged = () => loadStats();
    window.addEventListener('ics_modules_changed', handleModulesChanged);
    window.addEventListener('storage', handleModulesChanged);
    return () => {
      window.removeEventListener('ics_modules_changed', handleModulesChanged);
      window.removeEventListener('storage', handleModulesChanged);
    };
  }, [selectedBranch]);

  // Handle global search
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const session = JSON.parse(localStorage.getItem('ics_auth_user')) || {};
    const isRestricted = session.role === 'OFFICER' || session.role === 'VIEWER';
    const allowed = session.allowedDivisions || [];
    const isDivAllowed = (key) => !isRestricted || allowed.includes(key);

    const term = query.toUpperCase();
    const results = [];

    const searchInList = (list, category, storeName) => {
      list.forEach(item => {
        if (
          (item.fullName && item.fullName.toUpperCase().includes(term)) ||
          (item.passportNumber && item.passportNumber.toUpperCase().includes(term)) ||
          (item.requestNumber && item.requestNumber.toUpperCase().includes(term)) ||
          (item.boxNumber && item.boxNumber.toUpperCase().includes(term)) ||
          (item.personalId && item.personalId.toUpperCase().includes(term)) ||
          (item.shelfNumber && item.shelfNumber.toUpperCase().includes(term))
        ) {
          results.push({ ...item, category, storeName });
        }
      });
    };

    if (isDivAllowed('visa')) searchInList(dbData.visa, 'VISA Files', 'visa');
    if (isDivAllowed('eoid') || isDivAllowed('eoid-normal') || isDivAllowed('eoid-underage')) searchInList(dbData.eoid, 'Ethiopian Origin ID File', 'eoid');
    if (isDivAllowed('residence-id')) searchInList(dbData.residence, 'Residence ID File', 'residence_id');
    if (isDivAllowed('residence-id-cancellation')) searchInList(dbData.residenceCancellation, 'Residence ID Cancellation', 'residence_id_cancellation');
    if (isDivAllowed('etd')) searchInList(dbData.etd, 'Emergency Travel Document File', 'etd');
    if (isDivAllowed('eritrean-id')) searchInList(dbData.eritreanId, 'Eritrean ID File', 'eritrean_id');
    if (isDivAllowed('alien-passport')) searchInList(dbData.alienPassport, 'Alien Passport File', 'alien_passport');

    setSearchResults(results.slice(0, 10));
  };

  const session = JSON.parse(localStorage.getItem('ics_auth_user')) || {};
  const isRestricted = session.role === 'OFFICER' || session.role === 'VIEWER';
  const allowed = session.allowedDivisions || [];

  const countScanned = (records) => records.filter(r => r && r.attachments && r.attachments.length > 0).length;
  const totalScanned = countScanned(dbData.visa) + countScanned(dbData.eoid) + countScanned(dbData.residence) + countScanned(dbData.residenceCancellation) + countScanned(dbData.etd) + countScanned(dbData.eritreanId) + countScanned(dbData.alienPassport);
  const scanCoveragePct = stats.total > 0 ? Math.round((totalScanned / stats.total) * 100) : 0;

  const customChartItems = customModules.map(m => ({
    name: m.title,
    count: customStats[m.key] || 0,
    color: m.color || '#10b981',
    key: m.key
  })).filter(d => !isRestricted || allowed.includes(d.key));

  const chartData = [
    { name: 'VISA Files', count: stats.visa, color: '#10b981', key: 'visa' },
    { name: 'Origin ID (EOID)', count: stats.eoid, color: '#f59e0b', key: 'eoid' },
    { name: 'Residence ID', count: stats.residence, color: '#3b82f6', key: 'residence-id' },
    { name: 'Residence Canc.', count: stats.residenceCancellation, color: '#ef4444', key: 'residence-id-cancellation' },
    { name: 'Travel Doc (ETD)', count: stats.etd, color: '#8b5cf6', key: 'etd' },
    { name: 'Eritrean ID', count: stats.eritreanId, color: '#ec4899', key: 'eritrean-id' },
    { name: 'Alien Passport', count: stats.alienPassport, color: '#06b6d4', key: 'alien-passport' }
  ].filter(d => !isRestricted || allowed.includes(d.key) || (d.key === 'eoid' && (allowed.includes('eoid-normal') || allowed.includes('eoid-underage')))).concat(customChartItems);

  // Division Definitions
  const divisionCards = [
    { key: 'visa', name: 'VISA FILES', store: dbData.visa, color: '#10b981', bgGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', path: '/visa', icon: FileText, desc: 'Entry visas, stickers & foreign passports' },
    { key: 'eoid', name: 'ETHIOPIAN ORIGIN ID FILE', store: dbData.eoid, color: '#f59e0b', bgGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', path: '/eoid', icon: Fingerprint, desc: 'Normal & Under-age yellow card archives' },
    { key: 'residence-id', name: 'RESIDENCE ID FILE', store: dbData.residence, color: '#3b82f6', bgGradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', path: '/residence-id', icon: Award, desc: 'Temporary & permanent resident permits' },
    { key: 'residence-id-cancellation', name: 'RESIDENCE ID CANCELLATION', store: dbData.residenceCancellation, color: '#ef4444', bgGradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', path: '/residence-id-cancellation', icon: FileWarning, desc: 'Cancelled & revoked residency dossiers' },
    { key: 'etd', name: 'EMERGENCY TRAVEL DOC (ETD)', store: dbData.etd, color: '#8b5cf6', bgGradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', path: '/etd', icon: FileWarning, desc: 'Emergency repatriation & travel documents' },
    { key: 'eritrean-id', name: 'ERITREAN ID FILE', store: dbData.eritreanId, color: '#ec4899', bgGradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', path: '/eritrean-id', icon: IdCard, desc: 'Special community identification records' },
    { key: 'alien-passport', name: 'ALIEN PASSPORT FILE', store: dbData.alienPassport, color: '#06b6d4', bgGradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', path: '/alien-passport', icon: Globe, desc: 'Stateless & foreign national passport registry' },
    ...customModules.map(m => ({
      key: m.key,
      name: m.title.toUpperCase(),
      store: customRecordsMap[m.key] || [],
      color: m.color || '#10b981',
      bgGradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
      path: `/modules/${m.key}`,
      icon: Package,
      desc: m.description || 'Custom administrative division'
    })),
    ...((isAdmin || userBranch?.role === 'SUPERVISOR' || JSON.parse(localStorage.getItem('ics_auth_user') || '{}').role === 'SUPERVISOR' || JSON.parse(localStorage.getItem('ics_auth_user') || '{}').role === 'ADMIN') ? [{
      key: 'user-management',
      name: 'USER MODULE & STAFF DIRECTORY',
      store: new Array(stats.usersCount).fill(null),
      color: '#059669',
      bgGradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      path: '/user-management',
      icon: Users,
      isUserModule: true,
      desc: 'Officer access control, roles & permissions'
    }] : [])
  ].filter(d => {
    const overrides = getModuleOverrides();
    if (overrides[d.key]?.isActive === false) return false;
    return d.isUserModule || !isRestricted || allowed.includes(d.key) || (d.key === 'eoid' && (allowed.includes('eoid-normal') || allowed.includes('eoid-underage')));
  });

  const filteredCards = divisionCards.filter(card => {
    if (selectedFilter === 'ALL') return true;
    return card.key === selectedFilter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1600px', margin: '0 auto', width: '100%' }}>

      {/* ══════════════════════════════════════════════════
          1. EXECUTIVE HERO BANNER
      ══════════════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(135deg, #091a36 0%, #0f2b5c 55%, #13397d 100%)',
        borderRadius: '20px',
        padding: '28px 36px',
        color: '#ffffff',
        boxShadow: '0 10px 30px rgba(9, 26, 54, 0.25)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Decorative subtle background circles */}
        <div style={{ position: 'absolute', right: '-40px', top: '-40px', width: '220px', height: '220px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: '180px', bottom: '-60px', width: '180px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#93c5fd',
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '1px',
                padding: '3px 10px',
                borderRadius: '20px',
                textTransform: 'uppercase'
              }}>
                Ethiopian Immigration &amp; Citizenship Service
              </span>
              <span style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }} />
                Online
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.3px', color: '#ffffff' }}>
              National Physical &amp; Digital Dossier Archive
            </h1>
            <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span>Welcome back, <strong style={{ color: '#ffffff' }}>{session.fullName || session.username || 'Officer'}</strong></span>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.8rem', color: '#e2e8f0' }}>
                {session.role || 'ADMIN'}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8' }}>
                <Building2 size={14} />
                {userBranch?.name || selectedBranch || 'Head Office (Addis Ababa)'}
              </span>
            </p>
          </div>

          {/* Quick Date and Time display */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.85rem' }}>
              <Calendar size={18} style={{ color: '#38bdf8' }} />
              <span style={{ color: '#ffffff', fontWeight: 600 }}>
                {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.15)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.85rem' }}>
              <Clock size={18} style={{ color: '#34d399' }} />
              <span style={{ color: '#ffffff', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.95rem' }}>
                {currentTime.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          2. 4 EXECUTIVE KPI METRIC CARDS
      ══════════════════════════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px'
      }}>
        {/* KPI 1: Total Records */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '22px 24px',
          border: '1px solid rgba(15, 43, 92, 0.08)',
          boxShadow: '0 4px 20px rgba(15, 43, 92, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '14px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              TOTAL ARCHIVE DOSSIERS
            </span>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FileText size={20} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f2b5c', lineHeight: 1, letterSpacing: '-0.5px' }}>
              {stats.total.toLocaleString()}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '0.8rem', color: '#64748b' }}>
              <span style={{ background: '#dbeafe', color: '#1d4ed8', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem' }}>
                Active Database
              </span>
              <span>Across all divisions</span>
            </div>
          </div>
          <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)' }} />
          </div>
        </div>

        {/* KPI 2: Scanned & Digitized */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '22px 24px',
          border: '1px solid rgba(15, 43, 92, 0.08)',
          boxShadow: '0 4px 20px rgba(15, 43, 92, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '14px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              DIGITIZED &amp; SCANNED
            </span>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.1)', color: '#059669',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <CheckCircle size={20} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#059669', lineHeight: 1, letterSpacing: '-0.5px' }}>
              {totalScanned.toLocaleString()}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '0.8rem', color: '#64748b' }}>
              <span style={{ background: '#d1fae5', color: '#065f46', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem' }}>
                {scanCoveragePct}% Coverage
              </span>
              <span>Scanned evidence online</span>
            </div>
          </div>
          <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${scanCoveragePct}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #059669)', transition: 'width 0.6s ease' }} />
          </div>
        </div>

        {/* KPI 3: Missing Scans */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '22px 24px',
          border: '1px solid rgba(15, 43, 92, 0.08)',
          boxShadow: '0 4px 20px rgba(15, 43, 92, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '14px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              PENDING OFFICER SCANS
            </span>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: stats.missingAttachments > 0 ? '#dc2626' : '#64748b', lineHeight: 1, letterSpacing: '-0.5px' }}>
              {stats.missingAttachments.toLocaleString()}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '0.8rem', color: '#64748b' }}>
              <span style={{ background: stats.missingAttachments > 0 ? '#fee2e2' : '#f1f5f9', color: stats.missingAttachments > 0 ? '#991b1b' : '#64748b', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem' }}>
                {stats.missingAttachments > 0 ? 'Action Needed' : 'All Clear'}
              </span>
              <span>Dossiers without scans</span>
            </div>
          </div>
          <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: stats.total > 0 ? `${Math.round((stats.missingAttachments / stats.total) * 100)}%` : '0%', height: '100%', background: '#dc2626' }} />
          </div>
        </div>

        {/* KPI 4: Staff & Personnel */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '22px 24px',
          border: '1px solid rgba(15, 43, 92, 0.08)',
          boxShadow: '0 4px 20px rgba(15, 43, 92, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '14px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              AUTHORIZED PERSONNEL
            </span>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'rgba(139, 92, 246, 0.1)', color: '#7c3aed',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Users size={20} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#7c3aed', lineHeight: 1, letterSpacing: '-0.5px' }}>
              {stats.usersCount > 0 ? stats.usersCount : '—'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '0.8rem', color: '#64748b' }}>
              <span style={{ background: '#f3e8ff', color: '#6b21a8', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem' }}>
                {stats.activeUsers} Active
              </span>
              <span>Role-based access active</span>
            </div>
          </div>
          <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #7c3aed)' }} />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          3. GLOBAL SEARCH & QUICK DIVISION FILTERS
      ══════════════════════════════════════════════════ */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '20px 24px',
        border: '1px solid rgba(15, 43, 92, 0.08)',
        boxShadow: '0 4px 20px rgba(15, 43, 92, 0.03)',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search size={20} style={{ position: 'absolute', top: '13px', left: '16px', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search by Applicant Full Name, Passport #, Personal ID, Shelf #, or Box #..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px 12px 46px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.94rem',
                outline: 'none',
                background: '#f8fafc',
                color: '#0f172a',
                transition: 'border-color 0.2s, background 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.background = '#ffffff'; }}
              onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.background = '#f8fafc'; }}
            />
            {searchQuery && (
              <button
                onClick={() => handleSearch('')}
                style={{
                  position: 'absolute', right: '12px', top: '12px', background: '#e2e8f0',
                  border: 'none', borderRadius: '50%', width: '22px', height: '22px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#475569', fontSize: '0.75rem', fontWeight: 'bold'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Division Filter Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
            {[
              { key: 'ALL', label: 'All Divisions' },
              { key: 'visa', label: 'Visa' },
              { key: 'eoid', label: 'EOID' },
              { key: 'residence-id', label: 'Residence ID' },
              { key: 'etd', label: 'ETD' }
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setSelectedFilter(f.key)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: selectedFilter === f.key ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  background: selectedFilter === f.key ? '#eff6ff' : '#ffffff',
                  color: selectedFilter === f.key ? '#1d4ed8' : '#64748b',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Global Search Results Dropdown */}
        {searchQuery.trim() && (
          <div style={{
            position: 'absolute',
            top: '78px',
            left: '24px',
            right: '24px',
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 15px 35px rgba(15, 23, 42, 0.15)',
            zIndex: 100,
            maxHeight: '380px',
            overflowY: 'auto'
          }}>
            {searchResults.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                No records found matching "{searchQuery}".
              </div>
            ) : (
              searchResults.map((rec, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedRecord(rec)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 18px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f2b5c', fontSize: '0.92rem' }}>
                      {rec.fullName || 'Unnamed Record'}
                    </div>
                    <div style={{ display: 'flex', gap: '14px', marginTop: '3px', fontSize: '0.78rem', color: '#64748b' }}>
                      <span>Passport: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{rec.passportNumber || '—'}</strong></span>
                      <span>Box: <strong style={{ color: '#0f172a' }}>{rec.boxNumber || '—'}</strong></span>
                      {rec.shelfNumber && <span>Shelf: <strong>{rec.shelfNumber}</strong></span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: '#f1f5f9',
                      color: '#0f2b5c',
                      border: '1px solid #e2e8f0'
                    }}>
                      {rec.category}
                    </span>
                    <Eye size={16} style={{ color: '#64748b' }} />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          4. IMMIGRATION ARCHIVE DIVISIONS GRID
      ══════════════════════════════════════════════════ */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f2b5c' }}>
              Archive Divisions &amp; Registers
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.84rem', color: '#64748b' }}>
              Select any division to view file tables, perform automated OCR ingest, and export records.
            </p>
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '8px' }}>
            {filteredCards.length} Active Modules
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
          gap: '20px'
        }}>
          {filteredCards.map((div, i) => {
            const total = div.store.length;
            const scanned = div.isUserModule ? stats.activeUsers : div.store.filter(r => r && r.attachments && r.attachments.length > 0).length;
            const missing = div.isUserModule ? (total - stats.activeUsers) : (total - scanned);
            const coverage = total > 0 ? Math.round((scanned / total) * 100) : 0;
            const IconComponent = div.icon || Package;

            return (
              <div
                key={i}
                onClick={() => navigate(div.path)}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(15, 43, 92, 0.08)',
                  borderTop: `4px solid ${div.color}`,
                  boxShadow: '0 4px 20px rgba(15, 43, 92, 0.04)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  transition: 'all 0.25s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(15, 43, 92, 0.09)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(15, 43, 92, 0.04)';
                }}
              >
                {/* Header: Icon + Name + Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '10px',
                      background: `${div.color}15`, color: div.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `1px solid ${div.color}30`, flexShrink: 0
                    }}>
                      <IconComponent size={22} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f2b5c', textTransform: 'uppercase', letterSpacing: '0.3px', lineHeight: 1.3 }}>
                        {div.name}
                      </h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                        {div.desc}
                      </p>
                    </div>
                  </div>
                  <span style={{
                    background: `${div.color}14`,
                    color: div.color,
                    border: `1px solid ${div.color}35`,
                    borderRadius: '12px',
                    padding: '3px 10px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    flexShrink: 0
                  }}>
                    {total}
                  </span>
                </div>

                {/* Main Big Count */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0f2b5c', lineHeight: 1 }}>
                    {total.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                    {div.isUserModule ? 'registered accounts' : 'registered dossiers'}
                  </span>
                </div>

                {/* Scanned vs Missing badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {div.isUserModule ? (
                    <>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ecfdf5', color: '#059669', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                        <CheckCircle size={13} /> {stats.activeUsers} active
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                        <Shield size={13} /> Access Control
                      </span>
                    </>
                  ) : (
                    <>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ecfdf5', color: '#059669', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                        <CheckCircle size={13} /> {scanned} scanned
                      </span>
                      {missing > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef2f2', color: '#dc2626', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                          <AlertTriangle size={13} /> {missing} missing
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Scan Coverage Progress Bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b' }}>
                      {div.isUserModule ? 'Staff Accounts & Privileges' : 'Digital Scan Coverage'}
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: div.color }}>
                      {div.isUserModule ? '100%' : `${coverage}%`}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '7px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ width: `${div.isUserModule ? 100 : coverage}%`, height: '100%', background: div.color, borderRadius: '10px', transition: 'width 0.6s ease' }} />
                  </div>
                </div>

                {/* Card Action Link */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: div.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Open Division <ArrowUpRight size={14} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          5. CHARTS & LIVE AUDIT FEED
      ══════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 0.9fr)', gap: '24px' }}>

        {/* Division Distribution BarChart (Light Theme) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid rgba(15, 43, 92, 0.08)',
          boxShadow: '0 4px 20px rgba(15, 43, 92, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          height: '420px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0f2b5c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Division Distribution
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                Total recorded dossiers per immigration category
              </p>
            </div>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '3px 8px', borderRadius: '6px' }}>
              Live Count
            </span>
          </div>

          <div style={{ flex: 1, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={11}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  tick={{ fill: '#64748b' }}
                />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} tick={{ fill: '#64748b' }} />
                <Tooltip
                  cursor={{ fill: 'rgba(15, 43, 92, 0.03)' }}
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.1)',
                    fontSize: '0.85rem'
                  }}
                  labelStyle={{ fontWeight: 800, color: '#0f2b5c', marginBottom: '4px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Activity Feed (Light Theme) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid rgba(15, 43, 92, 0.08)',
          boxShadow: '0 4px 20px rgba(15, 43, 92, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          height: '420px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0f2b5c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Live Activity Feed
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                Real-time registry additions and updates
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                fontSize: '0.72rem', color: '#059669', background: '#ecfdf5',
                padding: '3px 8px', borderRadius: '20px', fontWeight: 800
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />
                LIVE
              </span>
              <button
                onClick={() => navigate('/audit-log')}
                style={{
                  background: 'none', border: 'none', color: '#2563eb',
                  fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                  padding: 0
                }}
              >
                Full Log →
              </button>
            </div>
          </div>

          <AuditFeed />
        </div>

      </div>

      {/* ══════════════════════════════════════════════════
          6. DETAILED RECORD VIEW MODAL (FROM SEARCH)
      ══════════════════════════════════════════════════ */}
      {selectedRecord && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '650px',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
            border: '1px solid rgba(15, 43, 92, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {selectedRecord.category}
                </span>
                <h3 style={{ margin: '2px 0 0 0', fontWeight: 800, fontSize: '1.25rem', color: '#0f2b5c' }}>
                  {selectedRecord.fullName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                style={{
                  background: '#f1f5f9', border: 'none', borderRadius: '50%',
                  width: '32px', height: '32px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer', color: '#64748b'
                }}
              >
                ✕
              </button>
            </div>

            {/* Biographical Card */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.88rem', marginBottom: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Passport Number</span>
                <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{selectedRecord.passportNumber || '—'}</strong>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Box &amp; Shelf Location</span>
                <strong style={{ color: '#0f172a' }}>{selectedRecord.boxNumber || '—'} {selectedRecord.shelfNumber ? `(${selectedRecord.shelfNumber})` : ''}</strong>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Personal ID</span>
                <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{selectedRecord.personalId || '—'}</strong>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Citizenship</span>
                <strong style={{ color: '#0f172a' }}>{selectedRecord.citizenship || '—'}</strong>
              </div>
            </div>

            {/* Scanned Attachments */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.82rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Scanned Evidence ({selectedRecord.attachments?.length || 0})
              </h4>
              {(!selectedRecord.attachments || selectedRecord.attachments.length === 0) ? (
                <div style={{
                  border: '1px dashed #fca5a5', background: '#fef2f2',
                  color: '#dc2626', padding: '12px', borderRadius: '8px',
                  fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  <AlertTriangle size={18} />
                  <span>No documents attached. Officer must scan passport and required records!</span>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                  {selectedRecord.attachments.map(att => (
                    <div key={att.id || att.name} style={{
                      background: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: '8px', padding: '8px', display: 'flex',
                      flexDirection: 'column', gap: '6px'
                    }}>
                      <div style={{ height: '65px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '6px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
                        {att.type && att.type.startsWith('image/') ? (
                          <img src={att.dataUrl} alt={att.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <FileText size={28} style={{ color: '#2563eb' }} />
                        )}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#0f172a', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {att.name}
                      </span>
                      <a
                        href={att.dataUrl}
                        download={att.name}
                        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#059669', fontWeight: 700 }}
                      >
                        <FileDown size={12} /> Download
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setSelectedRecord(null)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedRecord(null);
                  navigate(selectedRecord.storeName === 'residence_id' ? '/residence-id' : `/${selectedRecord.storeName}`);
                }}
                style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#0f2b5c', color: '#ffffff', fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Go to Division Explorer →
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function AuditFeed() {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  const ACTION_META = {
    CREATE: { label: 'Added', color: '#059669', bg: '#d1fae5', Icon: Plus },
    UPDATE: { label: 'Modified', color: '#1d4ed8', bg: '#dbeafe', Icon: Edit2 },
    DELETE: { label: 'Deleted', color: '#dc2626', bg: '#fee2e2', Icon: Trash2 },
    IMPORT: { label: 'Imported', color: '#a855f7', bg: '#f3e8ff', Icon: Download },
    BULK_INGESTION: { label: 'Bulk Ingest', color: '#059669', bg: '#d1fae5', Icon: Sparkles }
  };

  const timeAgo = (iso) => {
    if (!iso) return 'recently';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(iso).toLocaleDateString();
  };

  useEffect(() => {
    const load = async () => {
      try {
        const logs = await getAuditLogs({});
        setFeed(logs.slice(0, 8));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 25000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.85rem' }}>Loading activity...</div>;

  if (feed.length === 0) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: '8px' }}>
      <Clock size={28} style={{ opacity: 0.3 }} />
      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>No activity logged yet</p>
      <p style={{ margin: 0, fontSize: '0.76rem', color: '#94a3b8' }}>Dossier operations will appear here in real time.</p>
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {feed.map((entry, idx) => {
        const meta = ACTION_META[entry.action] || ACTION_META.CREATE;
        let name = entry.recordData?.fullName || entry.previousData?.fullName;
        if (!name) {
          if (entry.action === 'BULK_INGESTION') {
            name = entry.recordData?.count ? `${entry.recordData.count} Dossiers Ingested` : (entry.details || 'Bulk Document Ingestion');
          } else {
            name = entry.details || 'Archive Operation';
          }
        }
        return (
          <div key={idx} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '8px 10px', borderRadius: '10px',
            transition: 'background 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
              background: meta.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: meta.color
            }}>
              <Icon size={14} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>
                <span style={{ padding: '1px 6px', borderRadius: '4px', background: meta.bg, color: meta.color, fontWeight: 700, fontSize: '0.67rem', marginRight: '6px' }}>{meta.label}</span>
                {entry.storeName} · {entry.userName || 'Officer'}
              </div>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', flexShrink: 0 }}>{timeAgo(entry.timestamp)}</span>
          </div>
        );
      })}
    </div>
  );
}
