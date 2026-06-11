import { useState, useEffect, useRef } from 'react';
import { Camera, X, Upload, FileText, Check, AlertCircle } from 'lucide-react';

const ALL_COUNTRIES = [
  "AFGHAN", "ALBANIAN", "ALGERIAN", "AMERICAN", "ANDORRAN", "ANGOLAN", "ANTIGUAN", "ARGENTINE", "ARMENIAN", "AUSTRALIAN", "AUSTRIAN", "AZERBAIJANI",
  "BAHAMIAN", "BAHRAINI", "BANGLADESHI", "BARBADIAN", "BELARUSIAN", "BELGIAN", "BELIZEAN", "BENINESE", "BHUTANESE", "BOLIVIAN", "BOSNIAN", "BOTSWANAN", "BRAZILIAN", "BRITISH", "BRUNEIAN", "BULGARIAN", "BURKINABE", "BURMESE", "BURUNDIAN",
  "CABO VERDEAN", "CAMBODIAN", "CAMEROONIAN", "CANADIAN", "CENTRAL AFRICAN", "CHADIAN", "CHILEAN", "CHINESE", "COLOMBIAN", "COMORAN", "CONGOLESE", "COSTA RICAN", "CROATIAN", "CUBAN", "CYPRIOT", "CZECH",
  "DANISH", "DJIBOUTIAN", "DOMINICAN", "DUTCH",
  "ECUADORIAN", "EGYPTIAN", "EMIRATI", "EQUATORIAL GUINEAN", "ERITREAN", "ESTONIAN", "ESWATINI", "ETHIOPIAN",
  "FIJIAN", "FILIPINO", "FINNISH", "FRENCH",
  "GABONESE", "GAMBIAN", "GEORGIAN", "GERMAN", "GHANAIAN", "GREEK", "GRENADIAN", "GUATEMALAN", "GUINEAN", "GUYANESE",
  "HAITIAN", "HONDURAN", "HUNGARIAN",
  "ICELANDIC", "INDIAN", "INDONESIAN", "IRANIAN", "IRAQI", "IRISH", "ISRAELI", "ITALIAN", "IVORIAN",
  "JAMAICAN", "JAPANESE", "JORDANIAN",
  "KAZAKHSTANI", "KENYAN", "KIRIBATI", "KOREAN", "KUWAITI", "KYRGYZ",
  "LAOTIAN", "LATVIAN", "LEBANESE", "LESOTHO", "LIBERIAN", "LIBYAN", "LIECHTENSTEIN", "LITHUANIAN", "LUXEMBOURGER",
  "MALAGASY", "MALAWIAN", "MALAYSIAN", "MALDIVIAN", "MALIAN", "MALTESE", "MARSHALLESE", "MAURITANIAN", "MAURITIAN", "MEXICAN", "MICRONESIAN", "MOLDOVAN", "MONACAN", "MONGOLIAN", "MONTENEGRIN", "MOROCCAN", "MOZAMBICAN",
  "NAMIBIAN", "NAURUAN", "NEPALESE", "NEW ZEALANDER", "NICARAGUAN", "NIGERIEN", "NIGERIAN", "NORWEGIAN",
  "OMANI",
  "PAKISTANI", "PALAUAN", "PALESTINIAN", "PANAMANIAN", "PAPUA NEW GUINEAN", "PARAGUAYAN", "PERUVIAN", "POLISH", "PORTUGUESE",
  "QATARI",
  "ROMANIAN", "RUSSIAN", "RWANDAN",
  "SAINT LUCIAN", "SALVADORAN", "SAMOAN", "SAN MARINESE", "SAUDI", "SENEGALESE", "SERBIAN", "SEYCHELLOIS", "SIERRA LEONEAN", "SINGAPOREAN", "SLOVAK", "SLOVENIAN", "SOLOMON ISLANDER", "SOMALI", "SOUTH AFRICAN", "SOUTH SUDANESE", "SPANISH", "SRI LANKAN", "SUDANESE", "SURINAMESE", "SWEDISH", "SWISS", "SYRIAN",
  "TAIWANESE", "TAJIK", "TANZANIAN", "THAI", "TOGOLESE", "TONGAN", "TRINIDADIAN", "TUNISIAN", "TURKISH", "TURKMEN", "TUVALUAN",
  "UGANDAN", "UKRAINIAN", "URUGUAYAN", "UZBEK",
  "VANUATUAN", "VENEZUELAN", "VIETNAMESE",
  "YEMENI",
  "ZAMBIAN", "ZIMBABWEAN"
];

export default function RecordFormModal({ isOpen, onClose, onSave, activeTab, initialRecord = null }) {
  const [formData, setFormData] = useState({
    boxNumber: '',
    fullName: '',
    sex: 'MALE',
    citizenship: '',
    passportNumber: '',
    requestNumber: '',
    date: new Date().toISOString().split('T')[0],
    serviceProvided: '',
    // Category-specific
    eoidNumber: '',
    residenceIdNumber: '',
    companyName: '',
    etdNumber: '',
    eritreanIdNumber: '',
    alienPassportNumber: '',
    yellowCardNumber: ''
  });

  const [attachments, setAttachments] = useState([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);

  // Initialize form when modal opens or initialRecord changes
  useEffect(() => {
    if (isOpen) {
      if (initialRecord) {
        setFormData({
          boxNumber: initialRecord.boxNumber || '',
          fullName: initialRecord.fullName || '',
          sex: initialRecord.sex || 'MALE',
          citizenship: initialRecord.citizenship || '',
          passportNumber: initialRecord.passportNumber || '',
          requestNumber: initialRecord.requestNumber || '',
          date: initialRecord.date || new Date().toISOString().split('T')[0],
          serviceProvided: initialRecord.serviceProvided || '',
          eoidNumber: initialRecord.eoidNumber || '',
          residenceIdNumber: initialRecord.residenceIdNumber || '',
          companyName: initialRecord.companyName || '',
          etdNumber: initialRecord.etdNumber || '',
          eritreanIdNumber: initialRecord.eritreanIdNumber || '',
          alienPassportNumber: initialRecord.alienPassportNumber || '',
          yellowCardNumber: initialRecord.yellowCardNumber || ''
        });
        setAttachments(initialRecord.attachments || []);
      } else {
        // Reset to default
        setFormData({
          boxNumber: '',
          fullName: '',
          sex: 'MALE',
          citizenship: '',
          passportNumber: '',
          requestNumber: '',
          date: new Date().toISOString().split('T')[0],
          serviceProvided: '',
          eoidNumber: '',
          residenceIdNumber: '',
          companyName: '',
          etdNumber: '',
          eritreanIdNumber: '',
          alienPassportNumber: '',
          yellowCardNumber: ''
        });
        setAttachments([]);
      }
      setIsCameraActive(false);
      setCameraError(null);
    }
  }, [isOpen, initialRecord, activeTab]);

  // Clean up camera stream on close
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (!isOpen) return null;

  // Handle webcam operations
  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Could not access camera. Please check permissions.');
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    // Draw the current video frame on canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to compressed jpeg image base64
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    
    const newAttachment = {
      id: 'scan_' + Date.now(),
      name: `Scan_${activeTab.toUpperCase()}_${attachments.length + 1}.jpg`,
      type: 'image/jpeg',
      size: Math.round((dataUrl.length * 3) / 4), // Approximate bytes
      dataUrl,
      uploadedAt: new Date().toISOString()
    };

    setAttachments(prev => [...prev, newAttachment]);
    stopCamera();
  }

  // Handle file uploads
  function handleFileUpload(e) {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const newAttachment = {
          id: 'file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: ev.target.result,
          uploadedAt: new Date().toISOString()
        };
        setAttachments(prev => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });
  }

  function deleteAttachment(id) {
    setAttachments(prev => prev.filter(att => att.id !== id));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!formData.boxNumber || !formData.fullName || !formData.passportNumber) {
      alert('Box Number, Full Name, and Passport Number are required.');
      return;
    }

    const savedRecord = {
      ...formData,
      // Keep ID if in Edit Mode
      ...(initialRecord && { id: initialRecord.id }),
      attachments
    };

    onSave(savedRecord);
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 10, 21, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px 32px',
          borderBottom: '1px solid var(--border-glass)'
        }}>
          <h3 style={{ margin: 0, fontWeight: 300, fontSize: '1.5rem', letterSpacing: '1px' }}>
            {initialRecord ? 'Edit Record' : 'Add New Record'} — <span className="neon-text-emerald" style={{ fontWeight: 600 }}>{activeTab.toUpperCase()}</span>
          </h3>
          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Scrollable Container */}
          <div style={{ padding: '32px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Biographical Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>BOX Number *</label>
              <input 
                className="glass-input" 
                value={formData.boxNumber} 
                onChange={e => setFormData({ ...formData, boxNumber: e.target.value.toUpperCase() })} 
                placeholder="e.g. BOX 12" 
                required 
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Full Name *</label>
              <input 
                className="glass-input" 
                value={formData.fullName} 
                onChange={e => setFormData({ ...formData, fullName: e.target.value.toUpperCase() })} 
                placeholder="e.g. JOHN DOE" 
                required 
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sex</label>
              <select 
                className="glass-input" 
                value={formData.sex} 
                onChange={e => setFormData({ ...formData, sex: e.target.value })}
              >
                <option value="MALE">MALE</option>
                <option value="FEMALE">FEMALE</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Citizenship</label>
              <select 
                className="glass-input" 
                value={formData.citizenship && !ALL_COUNTRIES.includes(formData.citizenship) ? 'OTHER' : formData.citizenship} 
                onChange={e => {
                  const val = e.target.value;
                  if (val === 'OTHER') {
                    setFormData({ ...formData, citizenship: 'CUSTOM' });
                  } else {
                    setFormData({ ...formData, citizenship: val });
                  }
                }}
                style={{ marginBottom: formData.citizenship && !ALL_COUNTRIES.includes(formData.citizenship) ? '10px' : '0' }}
              >
                <option value="">SELECT CITIZENSHIP</option>
                {ALL_COUNTRIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="OTHER">OTHER (TYPE CUSTOM)</option>
              </select>
              
              {formData.citizenship && !ALL_COUNTRIES.includes(formData.citizenship) && (
                <input 
                  className="glass-input" 
                  value={formData.citizenship === 'CUSTOM' ? '' : formData.citizenship} 
                  onChange={e => setFormData({ ...formData, citizenship: e.target.value.toUpperCase() })} 
                  placeholder="Enter custom citizenship..." 
                  autoFocus
                />
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Passport Number *</label>
              <input 
                className="glass-input" 
                value={formData.passportNumber} 
                onChange={e => setFormData({ ...formData, passportNumber: e.target.value.toUpperCase() })} 
                placeholder="e.g. EP0123456" 
                required 
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Request Number</label>
              <input 
                className="glass-input" 
                value={formData.requestNumber} 
                onChange={e => setFormData({ ...formData, requestNumber: e.target.value.toUpperCase() })} 
                placeholder="e.g. REQ-98765" 
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Date</label>
              <input 
                type="date"
                className="glass-input" 
                value={formData.date} 
                onChange={e => setFormData({ ...formData, date: e.target.value })} 
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Service Provided</label>
              <input 
                className="glass-input" 
                value={formData.serviceProvided} 
                onChange={e => setFormData({ ...formData, serviceProvided: e.target.value.toUpperCase() })} 
                placeholder="e.g. VISA EXTENSION" 
              />
            </div>

            {/* Category Specific Fields */}
            {(activeTab === 'eoid' || activeTab === 'eoid-normal') && (
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--accent-gold)' }}>EOID Number *</label>
                <input 
                  className="glass-input" 
                  style={{ borderColor: 'rgba(251, 191, 36, 0.4)' }}
                  value={formData.eoidNumber} 
                  onChange={e => setFormData({ ...formData, eoidNumber: e.target.value.toUpperCase() })} 
                  placeholder="e.g. EOID-772182" 
                  required
                />
              </div>
            )}

            {activeTab === 'eoid-underage' && (
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#f97316' }}>EOID Number * (Under-Age)</label>
                <input 
                  className="glass-input" 
                  style={{ borderColor: 'rgba(249, 115, 22, 0.4)' }}
                  value={formData.eoidNumber} 
                  onChange={e => setFormData({ ...formData, eoidNumber: e.target.value.toUpperCase() })} 
                  placeholder="e.g. EOID-UA-00123" 
                  required
                />
              </div>
            )}

            {(activeTab === 'residence id' || activeTab === 'residence-id') && (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--accent-blue)' }}>Residence ID No. *</label>
                  <input 
                    className="glass-input" 
                    style={{ borderColor: 'rgba(59, 130, 246, 0.4)' }}
                    value={formData.residenceIdNumber} 
                    onChange={e => setFormData({ ...formData, residenceIdNumber: e.target.value.toUpperCase() })} 
                    placeholder="e.g. RES-110022" 
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--accent-blue)' }}>Company Name</label>
                  <input 
                    className="glass-input" 
                    style={{ borderColor: 'rgba(59, 130, 246, 0.4)' }}
                    value={formData.companyName} 
                    onChange={e => setFormData({ ...formData, companyName: e.target.value.toUpperCase() })} 
                    placeholder="e.g. GLOBAL TECH LTD" 
                  />
                </div>
              </>
            )}

            {activeTab === 'etd' && (
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'rgba(165, 180, 252, 1)' }}>ETD Number *</label>
                <input 
                  className="glass-input" 
                  style={{ borderColor: 'rgba(165, 180, 252, 0.4)' }}
                  value={formData.etdNumber} 
                  onChange={e => setFormData({ ...formData, etdNumber: e.target.value.toUpperCase() })} 
                  placeholder="e.g. ETD-88219" 
                  required
                />
              </div>
            )}

            {activeTab === 'eritrean-id' && (
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#8b5cf6' }}>Eritrean ID Number *</label>
                <input 
                  className="glass-input" 
                  style={{ borderColor: 'rgba(139, 92, 246, 0.4)' }}
                  value={formData.eritreanIdNumber} 
                  onChange={e => setFormData({ ...formData, eritreanIdNumber: e.target.value.toUpperCase() })} 
                  placeholder="e.g. ER-ID-123456" 
                  required
                />
              </div>
            )}

            {activeTab === 'alien-passport' && (
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#0ea5e9' }}>Alien Passport Number *</label>
                <input 
                  className="glass-input" 
                  style={{ borderColor: 'rgba(14, 165, 233, 0.4)' }}
                  value={formData.alienPassportNumber} 
                  onChange={e => setFormData({ ...formData, alienPassportNumber: e.target.value.toUpperCase() })} 
                  placeholder="e.g. AP-987654" 
                  required
                />
              </div>
            )}

            {activeTab === 'yellow-card' && (
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#ca8a04' }}>Yellow Card Number *</label>
                <input 
                  className="glass-input" 
                  style={{ borderColor: 'rgba(202, 138, 4, 0.4)' }}
                  value={formData.yellowCardNumber} 
                  onChange={e => setFormData({ ...formData, yellowCardNumber: e.target.value.toUpperCase() })} 
                  placeholder="e.g. YC-554433" 
                  required
                />
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-glass)', margin: '10px 0' }} />

          {/* Attachments Section */}
          <div>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Attached Documents ({attachments.length})
            </h4>

            {/* Document upload options */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
              <button 
                type="button" 
                className="glass-button" 
                style={{ flex: 1 }}
                onClick={() => fileInputRef.current.click()}
              >
                <Upload size={18} /> Upload Files
              </button>
              
              <button 
                type="button" 
                className="glass-button" 
                style={{ flex: 1, background: isCameraActive ? 'var(--accent-danger)' : 'var(--accent-blue)', color: '#fff', boxShadow: isCameraActive ? 'none' : '0 0 10px rgba(59, 130, 246, 0.2)' }}
                onClick={isCameraActive ? stopCamera : startCamera}
              >
                <Camera size={18} /> {isCameraActive ? 'Close Camera' : 'Scan via Camera'}
              </button>
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              multiple 
              accept="image/*,application/pdf" 
              onChange={handleFileUpload} 
            />

            {/* Camera Viewport */}
            {isCameraActive && (
              <div className="glass-panel" style={{ 
                padding: '16px', 
                marginBottom: '20px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid var(--accent-blue)'
              }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '640px', height: '360px', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {/* Camera overlay box target for scan */}
                  <div style={{
                    position: 'absolute',
                    top: '15%',
                    left: '10%',
                    right: '10%',
                    bottom: '15%',
                    border: '2px dashed var(--accent-emerald)',
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                    borderRadius: '8px',
                    pointerEvents: 'none'
                  }}>
                    <div style={{ color: 'var(--accent-emerald)', fontSize: '0.8rem', textAlign: 'center', background: 'rgba(5, 10, 21, 0.7)', padding: '4px', width: 'fit-content', margin: '8px auto', borderRadius: '4px' }}>
                      ALIGN DOCUMENT HERE
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <button type="button" className="glass-button" onClick={capturePhoto} style={{ padding: '10px 32px' }}>
                    <Check size={18} /> Snap Document
                  </button>
                  <button type="button" className="glass-button danger" onClick={stopCamera}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {cameraError && (
              <div style={{ color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
                <AlertCircle size={16} />
                <span>{cameraError}</span>
              </div>
            )}

            {/* List of Attachments */}
            {attachments.length === 0 ? (
              <div style={{ 
                border: '2px dashed var(--border-glass)', 
                borderRadius: '8px', 
                padding: '32px', 
                textAlign: 'center', 
                color: 'var(--text-secondary)' 
              }}>
                <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>No scanned files attached yet. Upload or scan above.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {attachments.map((att) => {
                  const isImage = att.type.startsWith('image/');
                  return (
                    <div key={att.id} className="glass-panel" style={{ 
                      padding: '12px', 
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      background: 'rgba(0,0,0,0.2)'
                    }}>
                      {/* Delete button */}
                      <button 
                        type="button"
                        onClick={() => deleteAttachment(att.id)}
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'rgba(239, 68, 68, 0.8)',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 10
                        }}
                      >
                        <X size={14} />
                      </button>

                      {/* Preview */}
                      <div style={{ 
                        width: '100%', 
                        height: '110px', 
                        borderRadius: '4px', 
                        overflow: 'hidden',
                        background: 'rgba(255,255,255,0.03)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {isImage ? (
                          <img 
                            src={att.dataUrl} 
                            alt={att.name} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        ) : (
                          <FileText size={48} style={{ color: 'var(--accent-blue)', opacity: 0.8 }} />
                        )}
                      </div>

                      {/* File Details */}
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {att.name}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>
                          {Math.round(att.size / 1024)} KB
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          </div> {/* End Scrollable Container */}

          {/* Sticky Action Footer */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '16px', 
            padding: '20px 32px', 
            borderTop: '1px solid var(--border-glass)',
            background: 'rgba(5, 10, 21, 0.4)',
            backdropFilter: 'blur(8px)'
          }}>
            <button 
              type="button" 
              className="glass-button" 
              style={{ background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', boxShadow: 'none' }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="glass-button"
            >
              Save Record
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
