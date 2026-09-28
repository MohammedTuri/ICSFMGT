import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, AlertTriangle, FileText, Fingerprint, Award, FileWarning, Search, Eye, FileDown, CheckCircle, IdCard, Globe, CreditCard, Clock, Plus, Edit2, Trash2, Download, Package, Building2, MapPin } from 'lucide-react';
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
  const [recentRecords, setRecentRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [dashboardViewMode, setDashboardViewMode] = useState('cards');
  const [customModules, setCustomModules] = useState([]);
  const [customStats, setCustomStats] = useState({});
  const [customRecordsMap, setCustomRecordsMap] = useState({});

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

        // Calculate missing attachments
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

        // Assemble recent records
        const allRecords = [
          ...visa.map(r => ({ ...r, category: 'VISA Files', storeName: 'visa' })),
          ...eoid.map(r => ({ ...r, category: 'Ethiopian Origin ID File', storeName: 'eoid' })),
          ...residence.map(r => ({ ...r, category: 'Residence ID File', storeName: 'residence_id' })),
          ...residenceCancellation.map(r => ({ ...r, category: 'Residence ID Cancellation', storeName: 'residence_id_cancellation' })),
          ...etd.map(r => ({ ...r, category: 'Emergency Travel Document File', storeName: 'etd' })),
          ...eritreanId.map(r => ({ ...r, category: 'Eritrean ID File', storeName: 'eritrean_id' })),
          ...alienPassport.map(r => ({ ...r, category: 'Alien Passport File', storeName: 'alien_passport' }))
        ];

        // Sort by updatedAt or createdAt descending
        allRecords.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
        setRecentRecords(allRecords.slice(0, 5));

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

    setSearchResults(results.slice(0, 10)); // Cap at 10 results
  };

  const session = JSON.parse(localStorage.getItem('ics_auth_user')) || {};
  const isRestricted = session.role === 'OFFICER' || session.role === 'VIEWER';
  const allowed = session.allowedDivisions || [];

  const customChartItems = customModules.map(m => ({
    name: m.title,
    count: customStats[m.key] || 0,
    color: m.color || '#10b981',
    key: m.key
  })).filter(d => !isRestricted || allowed.includes(d.key));

  const chartData = [
    { name: 'VISA Files', count: stats.visa, color: 'var(--accent-emerald)', key: 'visa' },
    { name: 'Ethiopian Origin ID File', count: stats.eoid, color: 'var(--accent-gold)', key: 'eoid' },
    { name: 'Residence ID File', count: stats.residence, color: 'var(--accent-blue)', key: 'residence-id' },
    { name: 'Residence ID Cancellation', count: stats.residenceCancellation, color: '#dc2626', key: 'residence-id-cancellation' },
    { name: 'Emergency Travel Document File', count: stats.etd, color: 'rgba(165, 180, 252, 1)', key: 'etd' },
    { name: 'Eritrean ID File', count: stats.eritreanId, color: '#8b5cf6', key: 'eritrean-id' },
    { name: 'Alien Passport File', count: stats.alienPassport, color: '#0ea5e9', key: 'alien-passport' }
  ].filter(d => !isRestricted || allowed.includes(d.key) || (d.key === 'eoid' && (allowed.includes('eoid-normal') || allowed.includes('eoid-underage')))).concat(customChartItems);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Title Header */}
      <div>
        <h2 style={{ margin: 0, fontWeight: 300, fontSize: '2rem', letterSpacing: '1px' }}>Immigration Overview</h2>
      </div>

      {/* Global Search Bar */}
      <div className="glass-panel" style={{ padding: '20px', position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <Search size={22} style={{ position: 'absolute', top: '13px', left: '16px', color: 'var(--text-secondary)' }} />
          <input 
            className="glass-input" 
            placeholder="Global search across all divisions by Passport, Name, Request #, or Box #..." 
            style={{ paddingLeft: '54px', fontSize: '1.05rem' }}
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>

        {/* Search Results dropdown */}
        {searchQuery.trim() && (
          <div style={{
            position: 'absolute',
            top: '80px',
            left: '20px',
            right: '20px',
            background: 'rgba(13, 22, 43, 0.95)',
            border: '1px solid var(--border-glass)',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
            zIndex: 99,
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {searchResults.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No records match your query.
              </div>
            ) : (
              searchResults.map((rec) => (
                <div 
                  key={`${rec.storeName}_${rec.id}`}
                  onClick={() => setSelectedRecord(rec)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--border-glass)',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  className="search-row-hover"
                >
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{rec.fullName}</span>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <span>Passport: <strong style={{ fontFamily: 'monospace' }}>{rec.passportNumber}</strong></span>
                      {rec.shelfNumber && <span>Shelf: <strong>{rec.shelfNumber}</strong></span>}
                      <span>Box: <strong>{rec.boxNumber}</strong></span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 'bold', 
                      padding: '4px 8px', 
                      borderRadius: '4px',
                      background: rec.category === 'VISA Files' ? 'rgba(16, 185, 129, 0.15)' : 
                                  rec.category === 'Ethiopian Origin ID — Normal File' ? 'rgba(251, 191, 36, 0.15)' : 
                                  rec.category === 'Ethiopian Origin ID — Under-Age File' ? 'rgba(249, 115, 22, 0.15)' :
                                  rec.category === 'Residence ID File' ? 'rgba(59, 130, 246, 0.15)' : 
                                  rec.category === 'Eritrean ID File' ? 'rgba(139, 92, 246, 0.15)' :
                                  rec.category === 'Alien Passport File' ? 'rgba(14, 165, 233, 0.15)' :
                                  'rgba(165, 180, 252, 0.15)',
                      color: rec.category === 'VISA Files' ? 'var(--accent-emerald)' : 
                             rec.category === 'Ethiopian Origin ID — Normal File' ? 'var(--accent-gold)' : 
                             rec.category === 'Ethiopian Origin ID — Under-Age File' ? '#f97316' :
                             rec.category === 'Residence ID File' ? 'var(--accent-blue)' : 
                             rec.category === 'Eritrean ID File' ? '#8b5cf6' :
                             rec.category === 'Alien Passport File' ? '#0ea5e9' :
                             'rgba(165, 180, 252, 1)',
                      border: '1px solid currentColor'
                    }}>
                      {rec.category}
                    </span>
                    <Eye size={18} style={{ color: 'var(--text-secondary)' }} />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          TOP SCAN AUDIT BANNER (Matches Official Portal Banner)
      ══════════════════════════════════════════════════ */}
      {(() => {
        const countScanned = (records) => records.filter(r => r.attachments && r.attachments.length > 0).length;
        const totalScanned = countScanned(dbData.visa) + countScanned(dbData.eoid) + countScanned(dbData.residence) + countScanned(dbData.residenceCancellation) + countScanned(dbData.etd) + countScanned(dbData.eritreanId) + countScanned(dbData.alienPassport);
        const scanCoveragePct = stats.total > 0 ? Math.round((totalScanned / stats.total) * 100) : 0;

        return (
          <div style={{
            background: 'linear-gradient(135deg, #0b1e3d 0%, #0f2b5c 100%)',
            borderRadius: '20px',
            padding: '24px 32px',
            color: '#ffffff',
            boxShadow: '0 12px 30px rgba(11, 30, 61, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '24px'
          }}>
            {/* Stat 1: Total Records */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '140px' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                TOTAL RECORDS
              </span>
              <span style={{ fontSize: '2.4rem', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>
                {stats.total}
              </span>
            </div>

            <div style={{ width: '1px', height: '44px', background: 'rgba(255,255,255,0.12)' }} />

            {/* Stat 2: Scanned */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                SCANNED
              </span>
              <span style={{ fontSize: '2.4rem', fontWeight: 900, color: '#34d399', lineHeight: 1 }}>
                {totalScanned}
              </span>
            </div>

            <div style={{ width: '1px', height: '44px', background: 'rgba(255,255,255,0.12)' }} />

            {/* Stat 3: Missing Scans */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '140px' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                MISSING SCANS
              </span>
              <span style={{ fontSize: '2.4rem', fontWeight: 900, color: '#f87171', lineHeight: 1 }}>
                {stats.missingAttachments}
              </span>
            </div>

            <div style={{ width: '1px', height: '44px', background: 'rgba(255,255,255,0.12)' }} />

            {/* Stat 4: Scan Coverage Progress */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '220px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  SCAN COVERAGE
                </span>
                <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#34d399' }}>
                  {scanCoveragePct}%
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ width: `${scanCoveragePct}%`, height: '100%', background: 'linear-gradient(90deg, #34d399 0%, #10b981 100%)', borderRadius: '10px', transition: 'width 0.6s ease' }} />
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════
          DIVISION CARDS GRID (Matching Official Portal Layout)
      ══════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
        {[
          { key: 'visa', name: 'VISA FILES', store: dbData.visa, color: '#059669', path: '/visa', icon: FileText },
          { key: 'eoid', name: 'ETHIOPIAN ORIGIN ID FILE', store: dbData.eoid, color: '#b45309', path: '/eoid', icon: Fingerprint },
          { key: 'residence-id', name: 'RESIDENCE ID FILE', store: dbData.residence, color: '#2563eb', path: '/residence-id', icon: Award },
          { key: 'residence-id-cancellation', name: 'RESIDENCE ID CANCELLATION FILE', store: dbData.residenceCancellation, color: '#dc2626', path: '/residence-id-cancellation', icon: FileWarning },
          { key: 'etd', name: 'EMERGENCY TRAVEL DOCUMENT FILE', store: dbData.etd, color: '#7c3aed', path: '/etd', icon: FileWarning },
          { key: 'eritrean-id', name: 'ERITREAN ID FILE', store: dbData.eritreanId, color: '#6d28d9', path: '/eritrean-id', icon: IdCard },
          { key: 'alien-passport', name: 'ALIEN PASSPORT FILE', store: dbData.alienPassport, color: '#0284c7', path: '/alien-passport', icon: Globe },
          ...customModules.map(m => ({
            key: m.key,
            name: m.title.toUpperCase(),
            store: customRecordsMap[m.key] || [],
            color: m.color || '#10b981',
            path: `/modules/${m.key}`,
            icon: Package
          })),
          ...((isAdmin || userBranch?.role === 'SUPERVISOR' || JSON.parse(localStorage.getItem('ics_auth_user') || '{}').role === 'SUPERVISOR' || JSON.parse(localStorage.getItem('ics_auth_user') || '{}').role === 'ADMIN') ? [{
            key: 'user-management',
            name: 'USER MODULE & STAFF DIRECTORY',
            store: new Array(stats.usersCount).fill(null),
            color: '#059669',
            path: '/user-management',
            icon: Users,
            isUserModule: true
          }] : [])
        ].filter(d => {
          const overrides = getModuleOverrides();
          if (overrides[d.key]?.isActive === false) return false;
          return d.isUserModule || !isRestricted || allowed.includes(d.key) || (d.key === 'eoid' && (allowed.includes('eoid-normal') || allowed.includes('eoid-underage')));
        }).map((div, i) => {
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
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(15, 43, 92, 0.08)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(15, 43, 92, 0.04)';
              }}
            >
              {/* Card Header: Icon + Name + Badge Count */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '8px',
                    background: `${div.color}15`, color: div.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${div.color}30`, flexShrink: 0
                  }}>
                    <IconComponent size={18} />
                  </div>
                  <h4 style={{ margin: 0, fontSize: '0.84rem', fontWeight: 800, color: '#0f2b5c', letterSpacing: '0.4px', textTransform: 'uppercase', lineHeight: 1.3 }}>
                    {div.name}
                  </h4>
                </div>
                <span style={{
                  background: `${div.color}12`,
                  color: div.color,
                  border: `1px solid ${div.color}30`,
                  borderRadius: '12px',
                  padding: '2px 10px',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  flexShrink: 0
                }}>
                  {total}
                </span>
              </div>

              {/* Card Main Big Count */}
              <div>
                <span style={{ fontSize: '2.6rem', fontWeight: 900, color: '#0f2b5c', lineHeight: 1 }}>
                  {total}
                </span>
              </div>

              {/* Scanned vs Missing Indicators */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.86rem', fontWeight: 700 }}>
                {div.isUserModule ? (
                  <>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#059669' }}>
                      ✓ {stats.activeUsers} active
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b' }}>
                      ⚙️ Access Control
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#059669' }}>
                      ✓ {scanned} scanned
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: missing > 0 ? '#dc2626' : '#64748b' }}>
                      ⚠ {missing} missing
                    </span>
                  </>
                )}
              </div>

              {/* Progress Bar & Subtitle */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${div.isUserModule ? 100 : coverage}%`, height: '100%', background: div.color, borderRadius: '10px', transition: 'width 0.6s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>
                    {div.isUserModule ? 'Staff Accounts & Privileges' : `${coverage}% scan coverage`}
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: div.color }}>
                    Open Division →
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart & Recent Activity Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '32px' }}>
        
        {/* Chart View */}
        <div className="glass-panel" style={{ padding: '24px', height: '420px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 24px 0', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem' }}>
            Division Distribution
          </h3>
          <div style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-deep)', borderColor: 'var(--border-glass)', borderRadius: '8px' }}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Audit Activity Feed */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '420px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}>
              Live Activity Feed
            </h3>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-emerald)', display: 'inline-block', animation: 'pulse 2s infinite' }}></span>
              LIVE
            </span>
          </div>
          <AuditFeed />
        </div>

      </div>

      {/* Detailed View Modal (Search / Timeline Overlay) */}
      {selectedRecord && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 10, 21, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          padding: '20px'
        }}>
          <div className="glass-panel animate-fade-in" style={{
            width: '100%',
            maxWidth: '650px',
            padding: '28px',
            border: '1px solid rgba(255,255,255,0.12)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontWeight: 300 }}>
                Record Details — <span style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>{selectedRecord.category}</span>
              </h3>
              <button 
                onClick={() => setSelectedRecord(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Biographical Card */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.9rem', marginBottom: '24px' }}>
              <div><strong style={{ color: 'var(--text-secondary)' }}>Full Name:</strong> {selectedRecord.fullName}</div>
              <div><strong style={{ color: 'var(--text-secondary)' }}>Shelf Number:</strong> {selectedRecord.shelfNumber || '—'}</div>
              <div><strong style={{ color: 'var(--text-secondary)' }}>BOX Number:</strong> {selectedRecord.boxNumber}</div>
              <div><strong style={{ color: '#1054a8' }}>PER ID:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{selectedRecord.personalId || '—'}</span></div>
              <div><strong style={{ color: 'var(--text-secondary)' }}>Passport Number:</strong> <span style={{ fontFamily: 'monospace' }}>{selectedRecord.passportNumber}</span></div>
              <div><strong style={{ color: 'var(--text-secondary)' }}>Sex:</strong> {selectedRecord.sex}</div>
              <div><strong style={{ color: 'var(--text-secondary)' }}>Citizenship:</strong> {selectedRecord.citizenship || 'N/A'}</div>
              <div><strong style={{ color: 'var(--text-secondary)' }}>Request Number:</strong> {selectedRecord.requestNumber || 'N/A'}</div>
              <div><strong style={{ color: 'var(--text-secondary)' }}>Service Provided:</strong> {selectedRecord.serviceProvided || 'N/A'}</div>
              <div><strong style={{ color: 'var(--text-secondary)' }}>Date Processed:</strong> {selectedRecord.date}</div>

              {/* Specifics */}
              {selectedRecord.eoidNumber && <div><strong style={{ color: 'var(--accent-gold)' }}>EOID Number:</strong> {selectedRecord.eoidNumber}</div>}
              {selectedRecord.residenceIdNumber && <div><strong style={{ color: 'var(--accent-blue)' }}>Residence ID:</strong> {selectedRecord.residenceIdNumber}</div>}
              {selectedRecord.companyName && <div><strong style={{ color: 'var(--accent-blue)' }}>Company:</strong> {selectedRecord.companyName}</div>}
              {selectedRecord.etdNumber && <div><strong style={{ color: 'rgba(165, 180, 252, 1)' }}>ETD Number:</strong> {selectedRecord.etdNumber}</div>}
              {selectedRecord.eritreanIdNumber && <div><strong style={{ color: '#8b5cf6' }}>Eritrean ID:</strong> {selectedRecord.eritreanIdNumber}</div>}
              {selectedRecord.alienPassportNumber && <div><strong style={{ color: '#0ea5e9' }}>Alien Passport:</strong> {selectedRecord.alienPassportNumber}</div>}
            </div>

            {/* Scanned Documents */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Scanned Evidence ({selectedRecord.attachments?.length || 0})
              </h4>
              {(!selectedRecord.attachments || selectedRecord.attachments.length === 0) ? (
                <div style={{ border: '1px dashed var(--accent-danger)', color: 'var(--accent-danger)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} />
                  <span>No documents attached. Officer must scan passport and visa!</span>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
                  {selectedRecord.attachments.map(att => (
                    <div key={att.id} style={{ 
                      background: 'rgba(0,0,0,0.3)', 
                      border: '1px solid var(--border-glass)', 
                      borderRadius: '6px', 
                      padding: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '4px', background: '#000' }}>
                        {att.type.startsWith('image/') ? (
                          <img src={att.dataUrl} alt={att.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <FileText size={32} style={{ color: 'var(--accent-blue)' }} />
                        )}
                      </div>
                      <span style={{ fontSize: '0.7rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                      <a 
                        href={att.dataUrl} 
                        download={att.name}
                        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--accent-emerald)', fontWeight: 'bold' }}
                      >
                        <FileDown size={12} /> Download
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button 
                className="glass-button" 
                onClick={() => {
                  setSelectedRecord(null);
                  // Redirect to division page
                  navigate(selectedRecord.storeName === 'residence_id' ? '/residence-id' : `/${selectedRecord.storeName}`);
                }}
              >
                Go to Division Explorer
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
  };

  const timeAgo = (iso) => {
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
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading activity...</div>;

  if (feed.length === 0) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', gap: '8px' }}>
      <Clock size={28} style={{ opacity: 0.25 }} />
      <p style={{ margin: 0, fontSize: '0.85rem' }}>No activity yet</p>
      <p style={{ margin: 0, fontSize: '0.76rem', opacity: 0.6 }}>Actions will appear here in real time.</p>
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {feed.map((entry, idx) => {
        const meta = ACTION_META[entry.action] || ACTION_META.CREATE;
        const Icon = meta.Icon;
        const name = entry.recordData?.fullName || entry.previousData?.fullName || '—';
        return (
          <div key={idx} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 12px', borderRadius: '10px',
            transition: 'background 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(15,43,92,0.025)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{
              width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
              background: meta.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: meta.color
            }}>
              <Icon size={15} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
              </div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                <span style={{ padding: '1px 6px', borderRadius: '4px', background: meta.bg, color: meta.color, fontWeight: 700, fontSize: '0.67rem', marginRight: '6px' }}>{meta.label}</span>
                {entry.storeName} · {entry.userName || 'Unknown'}
              </div>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{timeAgo(entry.timestamp)}</span>
          </div>
        );
      })}
    </div>
  );
}

// Simple close icon component inside same file for speed
function X({ size, color }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}
