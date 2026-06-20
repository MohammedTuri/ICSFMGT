import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, AlertTriangle, FileText, Fingerprint, Award, FileWarning, Search, Eye, FileDown, CheckCircle, IdCard, Globe, CreditCard } from 'lucide-react';
import { getAllRecords } from '../utils/db';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    visa: 0,
    eoidNormal: 0,
    eoidUnderage: 0,
    residence: 0,
    etd: 0,
    eritreanId: 0,
    alienPassport: 0,
    yellowCard: 0,
    missingAttachments: 0
  });
  const [dbData, setDbData] = useState({
    visa: [],
    eoidNormal: [],
    eoidUnderage: [],
    residence: [],
    etd: [],
    eritreanId: [],
    alienPassport: [],
    yellowCard: []
  });
  const [recentRecords, setRecentRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const session = JSON.parse(localStorage.getItem('ics_auth_user')) || {};
        const isRestricted = session.role === 'OFFICER' || session.role === 'VIEWER';
        const allowed = session.allowedDivisions || [];
        const isDivAllowed = (key) => !isRestricted || allowed.includes(key);

        const visa = isDivAllowed('visa') ? await getAllRecords('visa') : [];
        const eoidNormal = isDivAllowed('eoid-normal') ? await getAllRecords('eoid_normal') : [];
        const eoidUnderage = isDivAllowed('eoid-underage') ? await getAllRecords('eoid_underage') : [];
        const residence = isDivAllowed('residence-id') ? await getAllRecords('residence_id') : [];
        const etd = isDivAllowed('etd') ? await getAllRecords('etd') : [];
        const eritreanId = isDivAllowed('eritrean-id') ? await getAllRecords('eritrean_id') : [];
        const alienPassport = isDivAllowed('alien-passport') ? await getAllRecords('alien_passport') : [];
        const yellowCard = isDivAllowed('yellow-card') ? await getAllRecords('yellow_card') : [];

        const vCount = visa.length;
        const enCount = eoidNormal.length;
        const euCount = eoidUnderage.length;
        const rCount = residence.length;
        const etdCount = etd.length;
        const eIdCount = eritreanId.length;
        const aPassCount = alienPassport.length;
        const yCardCount = yellowCard.length;

        // Calculate missing attachments
        const countMissing = (records) => {
          return records.filter(r => !r.attachments || r.attachments.length === 0).length;
        };

        const totalMissing = countMissing(visa) + countMissing(eoidNormal) + countMissing(eoidUnderage) + countMissing(residence) + countMissing(etd) + countMissing(eritreanId) + countMissing(alienPassport) + countMissing(yellowCard);

        setStats({
          total: vCount + enCount + euCount + rCount + etdCount + eIdCount + aPassCount + yCardCount,
          visa: vCount,
          eoidNormal: enCount,
          eoidUnderage: euCount,
          residence: rCount,
          etd: etdCount,
          eritreanId: eIdCount,
          alienPassport: aPassCount,
          yellowCard: yCardCount,
          missingAttachments: totalMissing
        });

        setDbData({
          visa,
          eoidNormal,
          eoidUnderage,
          residence,
          etd,
          eritreanId,
          alienPassport,
          yellowCard
        });

        // Assemble recent records
        const allRecords = [
          ...visa.map(r => ({ ...r, category: 'VISA Files', storeName: 'visa' })),
          ...eoidNormal.map(r => ({ ...r, category: 'Ethiopian Origin ID — Normal File', storeName: 'eoid_normal' })),
          ...eoidUnderage.map(r => ({ ...r, category: 'Ethiopian Origin ID — Under-Age File', storeName: 'eoid_underage' })),
          ...residence.map(r => ({ ...r, category: 'Residence ID File', storeName: 'residence_id' })),
          ...etd.map(r => ({ ...r, category: 'Emergency Travel Document File', storeName: 'etd' })),
          ...eritreanId.map(r => ({ ...r, category: 'Eritrean ID File', storeName: 'eritrean_id' })),
          ...alienPassport.map(r => ({ ...r, category: 'Alien Passport File', storeName: 'alien_passport' })),
          ...yellowCard.map(r => ({ ...r, category: 'Yellow Card File', storeName: 'yellow_card' }))
        ];

        // Sort by updatedAt or createdAt descending
        allRecords.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
        setRecentRecords(allRecords.slice(0, 5));

      } catch (err) {
        console.error('Error loading stats from IndexedDB:', err);
      }
    }

    loadStats();
  }, []);

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
    if (isDivAllowed('eoid-normal')) searchInList(dbData.eoidNormal, 'Ethiopian Origin ID — Normal File', 'eoid_normal');
    if (isDivAllowed('eoid-underage')) searchInList(dbData.eoidUnderage, 'Ethiopian Origin ID — Under-Age File', 'eoid_underage');
    if (isDivAllowed('residence-id')) searchInList(dbData.residence, 'Residence ID File', 'residence_id');
    if (isDivAllowed('etd')) searchInList(dbData.etd, 'Emergency Travel Document File', 'etd');
    if (isDivAllowed('eritrean-id')) searchInList(dbData.eritreanId, 'Eritrean ID File', 'eritrean_id');
    if (isDivAllowed('alien-passport')) searchInList(dbData.alienPassport, 'Alien Passport File', 'alien_passport');
    if (isDivAllowed('yellow-card')) searchInList(dbData.yellowCard, 'Yellow Card File', 'yellow_card');

    setSearchResults(results.slice(0, 10)); // Cap at 10 results
  };

  const session = JSON.parse(localStorage.getItem('ics_auth_user')) || {};
  const isRestricted = session.role === 'OFFICER' || session.role === 'VIEWER';
  const allowed = session.allowedDivisions || [];

  const chartData = [
    { name: 'VISA Files', count: stats.visa, color: 'var(--accent-emerald)', key: 'visa' },
    { name: 'Ethiopian Origin ID — Normal File', count: stats.eoidNormal, color: 'var(--accent-gold)', key: 'eoid-normal' },
    { name: 'Ethiopian Origin ID — Under-Age File', count: stats.eoidUnderage, color: '#f97316', key: 'eoid-underage' },
    { name: 'Residence ID File', count: stats.residence, color: 'var(--accent-blue)', key: 'residence-id' },
    { name: 'Emergency Travel Document File', count: stats.etd, color: 'rgba(165, 180, 252, 1)', key: 'etd' },
    { name: 'Eritrean ID File', count: stats.eritreanId, color: '#8b5cf6', key: 'eritrean-id' },
    { name: 'Alien Passport File', count: stats.alienPassport, color: '#0ea5e9', key: 'alien-passport' },
    { name: 'Yellow Card File', count: stats.yellowCard, color: '#ca8a04', key: 'yellow-card' }
  ].filter(d => !isRestricted || allowed.includes(d.key));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 300, fontSize: '2rem', letterSpacing: '1px' }}>Immigration Overview</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '0.9rem' }}>FSD Division Evidence structuring</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)', padding: '8px 16px', borderRadius: '4px', border: '1px solid rgba(16,185,129,0.3)', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '1px' }}>
            DATABASE SECURED
          </div>
        </div>
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
                    <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>{rec.fullName}</span>
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
                                  rec.category === 'Yellow Card File' ? 'rgba(202, 138, 4, 0.15)' :
                                  'rgba(165, 180, 252, 0.15)',
                      color: rec.category === 'VISA Files' ? 'var(--accent-emerald)' : 
                             rec.category === 'Ethiopian Origin ID — Normal File' ? 'var(--accent-gold)' : 
                             rec.category === 'Ethiopian Origin ID — Under-Age File' ? '#f97316' :
                             rec.category === 'Residence ID File' ? 'var(--accent-blue)' : 
                             rec.category === 'Eritrean ID File' ? '#8b5cf6' :
                             rec.category === 'Alien Passport File' ? '#0ea5e9' :
                             rec.category === 'Yellow Card File' ? '#ca8a04' :
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

      {/* Analytics Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
        {[
          { icon: <Users size={28} />, label: 'Total Records', value: stats.total, color: '#38bdf8', path: null },
          { icon: <FileText size={28} />, label: 'VISA Files', value: stats.visa, color: 'var(--accent-emerald)', path: '/visa', key: 'visa' },
          { icon: <Fingerprint size={28} />, label: 'Ethiopian Origin ID — Normal File', value: stats.eoidNormal, color: 'var(--accent-gold)', path: '/eoid/normal', key: 'eoid-normal' },
          { icon: <Fingerprint size={28} />, label: 'Ethiopian Origin ID — Under-Age File', value: stats.eoidUnderage, color: '#f97316', path: '/eoid/underage', key: 'eoid-underage' },
          { icon: <Award size={28} />, label: 'Residence ID File', value: stats.residence, color: 'var(--accent-blue)', path: '/residence-id', key: 'residence-id' },
          { icon: <FileWarning size={28} />, label: 'Emergency Travel Document File', value: stats.etd, color: 'rgba(165, 180, 252, 1)', path: '/etd', key: 'etd' },
          { icon: <IdCard size={28} />, label: 'Eritrean ID File', value: stats.eritreanId, color: '#8b5cf6', path: '/eritrean-id', key: 'eritrean-id' },
          { icon: <Globe size={28} />, label: 'Alien Passport File', value: stats.alienPassport, color: '#0ea5e9', path: '/alien-passport', key: 'alien-passport' },
          { icon: <CreditCard size={28} />, label: 'Yellow Card File', value: stats.yellowCard, color: '#ca8a04', path: '/yellow-card', key: 'yellow-card' },
          { 
            icon: <AlertTriangle size={28} />, 
            label: 'Missing Scans', 
            value: stats.missingAttachments, 
            color: 'var(--accent-danger)', 
            subText: 'Requires Visa/Passport attachments',
            isAlert: true 
          }
        ].filter(card => {
          if (!card.key) return true;
          return !isRestricted || allowed.includes(card.key);
        }).map((stat, i) => (
          <div 
            key={i} 
            className="glass-panel" 
            onClick={() => stat.path && navigate(stat.path)}
            style={{ 
              padding: '20px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px',
              cursor: stat.path ? 'pointer' : 'default',
              border: stat.isAlert && stat.value > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-glass)',
              background: stat.isAlert && stat.value > 0 ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-card)'
            }}
          >
            <div style={{ 
              color: stat.color, 
              background: `rgba(255,255,255,0.03)`, 
              width: '54px', 
              height: '54px', 
              borderRadius: '10px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              boxShadow: `0 0 12px ${stat.color}25` 
            }}>
              {stat.icon}
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</p>
              <h3 style={{ margin: 0, fontSize: '2rem', color: '#fff', fontWeight: 700 }}>{stat.value}</h3>
              {stat.subText && (
                <span style={{ fontSize: '0.7rem', color: stat.value > 0 ? 'var(--accent-danger)' : 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                  {stat.subText}
                </span>
              )}
            </div>
          </div>
        ))}
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

        {/* Recent Activity */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ margin: 0, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem' }}>
            Recent Activity
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
            {recentRecords.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: 'auto 0' }}>No records recorded yet.</p>
            ) : (
              recentRecords.map((rec) => (
                <div 
                  key={`${rec.storeName}_${rec.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid var(--border-glass)'
                  }}
                >
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: rec.attachments.length > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: rec.attachments.length > 0 ? 'var(--accent-emerald)' : 'var(--accent-danger)'
                  }}>
                    {rec.attachments.length > 0 ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                  </div>

                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block' }}>{rec.fullName}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>
                      {rec.category} • Box {rec.boxNumber} • {new Date(rec.updatedAt || rec.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <button 
                    className="glass-button" 
                    style={{ padding: '4px 8px', fontSize: '0.7rem', height: 'fit-content' }}
                    onClick={() => setSelectedRecord(rec)}
                  >
                    View
                  </button>
                </div>
              ))
            )}
          </div>
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
              {selectedRecord.yellowCardNumber && <div><strong style={{ color: '#ca8a04' }}>Yellow Card:</strong> {selectedRecord.yellowCardNumber}</div>}
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

// Simple close icon component inside same file for speed
function X({ size, color }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}
