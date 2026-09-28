import { useState, useRef } from 'react';
import { Camera, Upload, AlertCircle, CheckCircle, Fingerprint } from 'lucide-react';

const MOCK_WATCHLIST = ['E1234567', 'Z9876543'];

export default function Processing() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    passport: '',
    nationality: '',
    type: 'ENTRY',
    port: 'Moyale'
  });
  const [photo, setPhoto] = useState(null);
  const [status, setStatus] = useState(null); // 'idle', 'alert', 'success'
  const fileInputRef = useRef(null);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhoto(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const submitForm = (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.passport) {
      alert('Missing required fields.');
      return;
    }

    if (MOCK_WATCHLIST.includes(formData.passport)) {
      setStatus('alert');
      return;
    }

    const payload = { ...formData, photoDataURL: photo, timestamp: new Date().toISOString() };
    const saved = JSON.parse(localStorage.getItem('ics_crossings')) || [];
    localStorage.setItem('ics_crossings', JSON.stringify([payload, ...saved]));

    setStatus('success');
    setTimeout(() => {
      setStatus('idle');
      setFormData({ firstName: '', lastName: '', passport: '', nationality: '', type: 'ENTRY', port: 'Moyale' });
      setPhoto(null);
    }, 3000);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 32px 0', fontWeight: 300, fontSize: '2rem' }}>Traveler Processing</h2>

      {status === 'alert' && (
        <div className="glass-panel animate-fade-in" style={{ background: 'rgba(239, 68, 68, 0.2)', borderColor: 'var(--accent-danger)', padding: '24px', marginBottom: '32px', display: 'flex', gap: '24px', alignItems: 'center', boxShadow: '0 0 30px rgba(239,68,68,0.4)' }}>
          <AlertCircle size={48} className="neon-text-danger" color="var(--accent-danger)" />
          <div>
            <h3 style={{ margin: 0, color: 'var(--accent-danger)', fontSize: '1.5rem', textTransform: 'uppercase' }}>INTERCEPT DIRECTIVE: WATCHLIST MATCH</h3>
            <p style={{ margin: '8px 0 0 0', color: '#fff' }}>Subject passport ({formData.passport}) is flagged. Do not proceed. Contact shift supervisor immediately.</p>
          </div>
          <button className="glass-button" style={{ marginLeft: 'auto', background: 'var(--text-secondary)' }} onClick={() => setStatus('idle')}>Acknowledge</button>
        </div>
      )}

      {status === 'success' && (
        <div className="glass-panel animate-fade-in" style={{ background: 'rgba(16, 185, 129, 0.2)', borderColor: 'var(--accent-emerald)', padding: '24px', marginBottom: '32px', display: 'flex', gap: '24px', alignItems: 'center' }}>
          <CheckCircle size={48} className="neon-text-emerald" color="var(--accent-emerald)" />
          <div>
            <h3 style={{ margin: 0, color: 'var(--accent-emerald)', fontSize: '1.5rem' }}>CLEARANCE GRANTED</h3>
            <p style={{ margin: '8px 0 0 0', color: '#fff' }}>Traveler has been processed and logged successfully.</p>
          </div>
        </div>
      )}

      <form onSubmit={submitForm} style={{ display: 'flex', gap: '32px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h3 style={{ margin: 0, borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}><Fingerprint size={18} style={{ display:'inline', verticalAlign:'text-bottom', marginRight:'8px' }}/> Biographical Data</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>First Name</label>
                <input className="glass-input" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value.toUpperCase()})} placeholder="e.g. ABEBE" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Last Name</label>
                <input className="glass-input" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value.toUpperCase()})} placeholder="e.g. KEBEDE" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Passport Number</label>
                <input className="glass-input" value={formData.passport} onChange={e => setFormData({...formData, passport: e.target.value.toUpperCase()})} placeholder="e.g. EP123456" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Nationality</label>
                <input className="glass-input" value={formData.nationality} onChange={e => setFormData({...formData, nationality: e.target.value.toUpperCase()})} placeholder="e.g. ETHIOPIAN" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Direction</label>
                <select className="glass-input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option value="ENTRY">ENTRY (INBOUND)</option>
                  <option value="EXIT">EXIT (OUTBOUND)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Port of Clearing</label>
                <select className="glass-input" value={formData.port} onChange={e => setFormData({...formData, port: e.target.value})}>
                  <option value="Moyale">Moyale Land Border</option>
                  <option value="Metema">Metema Land Border</option>
                  <option value="Galafi">Galafi Land Border</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
             <h3 style={{ margin: 0, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.9rem' }}>Traveler Photograph</h3>
             <div 
               onClick={() => fileInputRef.current.click()}
               style={{ 
                 width: '100%', 
                 height: '250px', 
                 background: 'rgba(0,0,0,0.5)', 
                 border: photo ? '2px solid var(--accent-emerald)' : '2px dashed var(--border-glass)', 
                 borderRadius: '8px',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 cursor: 'pointer',
                 overflow: 'hidden',
                 position: 'relative'
               }}
             >
               {photo ? (
                 <img src={photo} alt="Traveler" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
               ) : (
                 <div style={{ opacity: 0.5 }}>
                   <Camera size={48} style={{ marginBottom: '8px' }} />
                   <p style={{ margin: 0, fontSize: '0.8rem' }}>Click to Capture or Drop Photo</p>
                 </div>
               )}
             </div>
             <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handlePhotoUpload} />
          </div>

          <button type="submit" className="glass-button" style={{ width: '100%', padding: '16px', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
            <Upload size={20} /> Submit Record
          </button>
        </div>
      </form>
    </div>
  );
}
