import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart2, FileText, Fingerprint, Award, FileWarning, IdCard, Globe, CreditCard, Users, ClipboardList, Search, ArrowRight, Command } from 'lucide-react';

const ALL_COMMANDS = [
  { label: 'Dashboard', description: 'Overview & statistics', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Reports & Analytics', description: 'Charts and data insights', to: '/reports', icon: BarChart2 },
  { label: 'Audit Log', description: 'System activity tracking', to: '/audit-log', icon: ClipboardList },
  { label: 'VISA Files', description: 'Manage visa records', to: '/visa', icon: FileText },
  { label: 'Ethiopian Origin ID — Normal', description: 'EOID normal file records', to: '/eoid/normal', icon: Fingerprint },
  { label: 'Ethiopian Origin ID — Underage', description: 'EOID underage file records', to: '/eoid/underage', icon: Fingerprint },
  { label: 'Residence ID', description: 'Residence ID file records', to: '/residence-id', icon: Award },
  { label: 'Emergency Travel Document', description: 'ETD file records', to: '/etd', icon: FileWarning },
  { label: 'Eritrean ID', description: 'Eritrean ID file records', to: '/eritrean-id', icon: IdCard },
  { label: 'Alien Passport', description: 'Alien passport file records', to: '/alien-passport', icon: Globe },
  { label: 'Yellow Card', description: 'Yellow card file records', to: '/yellow-card', icon: CreditCard },
  { label: 'User Directory', description: 'Manage system users (Admin)', to: '/user-management', icon: Users },
];

export default function CommandPalette({ onClose }) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filtered = ALL_COMMANDS.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.description.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[activeIdx];
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  const handleSelect = (cmd) => {
    navigate(cmd.to);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { if (filtered[activeIdx]) handleSelect(filtered[activeIdx]); }
    else if (e.key === 'Escape') { onClose(); }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15,23,42,0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '14vh'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '580px',
          background: '#fff',
          borderRadius: '18px',
          boxShadow: '0 32px 100px rgba(0,0,0,0.35), 0 0 0 1px rgba(15,43,92,0.08)',
          overflow: 'hidden',
          animation: 'paletteIn 0.18s cubic-bezier(0.34,1.56,0.64,1)'
        }}
      >
        {/* Search bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '18px 22px',
          borderBottom: '1px solid var(--border-glass)'
        }}>
          <Search size={20} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, modules, divisions..."
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: '1.02rem', color: 'var(--text-primary)',
              fontFamily: 'inherit', background: 'transparent'
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <kbd style={{
              background: 'rgba(15,43,92,0.06)', color: 'var(--text-secondary)',
              padding: '3px 7px', borderRadius: '5px',
              fontSize: '0.7rem', fontWeight: 600,
              border: '1px solid var(--border-glass)'
            }}>ESC</kbd>
          </div>
        </div>

        {/* Results list */}
        <div ref={listRef} style={{ maxHeight: '400px', overflowY: 'auto', padding: '6px 0' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '36px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Search size={28} style={{ opacity: 0.2, display: 'block', margin: '0 auto 10px' }} />
              No results for <strong style={{ color: 'var(--text-primary)' }}>"{query}"</strong>
            </div>
          ) : filtered.map((cmd, idx) => {
            const Icon = cmd.icon;
            const isActive = idx === activeIdx;
            return (
              <div
                key={cmd.to}
                onClick={() => handleSelect(cmd)}
                onMouseEnter={() => setActiveIdx(idx)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '11px 22px', cursor: 'pointer',
                  background: isActive ? 'rgba(29,78,216,0.05)' : 'transparent',
                  borderLeft: `3px solid ${isActive ? 'var(--accent-blue)' : 'transparent'}`,
                  transition: 'background 0.1s'
                }}
              >
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                  background: isActive ? 'rgba(29,78,216,0.1)' : 'rgba(15,43,92,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  transition: 'all 0.1s'
                }}>
                  <Icon size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{cmd.label}</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '1px' }}>{cmd.description}</div>
                </div>
                {isActive && <ArrowRight size={16} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 22px',
          borderTop: '1px solid var(--border-glass)',
          display: 'flex', alignItems: 'center', gap: '16px',
          fontSize: '0.72rem', color: 'var(--text-secondary)'
        }}>
          <span><kbd style={{ background: 'rgba(15,43,92,0.06)', padding: '1px 5px', borderRadius: '3px', border: '1px solid var(--border-glass)', fontSize: '0.68rem' }}>↑↓</kbd> navigate</span>
          <span><kbd style={{ background: 'rgba(15,43,92,0.06)', padding: '1px 5px', borderRadius: '3px', border: '1px solid var(--border-glass)', fontSize: '0.68rem' }}>↵</kbd> select</span>
          <span><kbd style={{ background: 'rgba(15,43,92,0.06)', padding: '1px 5px', borderRadius: '3px', border: '1px solid var(--border-glass)', fontSize: '0.68rem' }}>ESC</kbd> close</span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Command size={11} /> + K to open
          </span>
        </div>
      </div>
    </div>
  );
}
