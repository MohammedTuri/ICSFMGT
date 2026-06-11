import { useState, useEffect } from 'react';
import { Download, Search } from 'lucide-react';

export default function History() {
  const [crossings, setCrossings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('ics_crossings')) || [];
    setCrossings(saved);
  }, []);

  const filtered = crossings.filter(c => 
    c.passport.includes(searchTerm.toUpperCase()) ||
    c.lastName.includes(searchTerm.toUpperCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontWeight: 300, fontSize: '2rem', letterSpacing: '1px' }}>Crossing History</h2>
        
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={20} style={{ position: 'absolute', top: '12px', left: '16px', color: 'var(--text-secondary)' }} />
            <input 
              className="glass-input" 
              placeholder="Search Passports/Names..." 
              style={{ paddingLeft: '48px', width: '300px' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="glass-button">
            <Download size={20} /> Export CSV
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <table className="glass-table">
          <thead>
            <tr>
              <th>Traveler</th>
              <th>Direction</th>
              <th>Location</th>
              <th>Nationality</th>
              <th>Passport Num</th>
              <th>Processed At</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, idx) => (
              <tr key={idx}>
                <td style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {c.photoDataURL ? (
                    <img src={c.photoDataURL} alt="thumbnail" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-glass)' }} />
                  ) : (
                    <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}></div>
                  )}
                  <div>
                    <span style={{ fontWeight: 600, display: 'block' }}>{c.lastName}, {c.firstName}</span>
                  </div>
                </td>
                <td>
                  <span style={{ background: c.type === 'ENTRY' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)', color: c.type === 'ENTRY' ? 'var(--accent-emerald)' : 'var(--accent-blue)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    {c.type}
                  </span>
                </td>
                <td>{c.port}</td>
                <td>{c.nationality}</td>
                <td style={{ fontFamily: 'monospace' }}>{c.passport}</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{new Date(c.timestamp).toLocaleString()}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                  No historical records found. Submit crossings via Processing module.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
