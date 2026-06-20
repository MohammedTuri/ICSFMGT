import { useState, useEffect } from 'react';
import { X, Upload, FileText, CheckCircle, AlertTriangle, Trash2, Eye, Download } from 'lucide-react';

const DOC_TYPES_CONFIG = {
  'eoid-normal': [
    { key: 'passportCopy', category: 'APPLICANT', label: 'PASSPORT COPY' },
    { key: 'applicationForm', category: 'APPLICANT', label: 'APPLICATION FORM' },
    { key: 'birthCertificate', category: 'APPLICANT', label: 'BIRTH CERTIFICATE' },
    { key: 'familyOrCourtDoc', category: 'APPLICANT', label: 'FAMILY DOCUMENT OR COURT LETTER' }
  ],
  'eoid-underage': [
    { key: 'passportCopy', category: 'APPLICANT', label: 'PASSPORT COPY' },
    { key: 'applicationForm', category: 'APPLICANT', label: 'APPLICATION FORM' },
    { key: 'birthCertificate', category: 'APPLICANT', label: 'BIRTH CERTIFICATE' },
    { key: 'familyOrCourtDoc', category: 'APPLICANT', label: 'FAMILY DOCUMENT OR COURT LETTER' }
  ],
  'residence-id-temporary': [
    { key: 'passportCopy', category: 'APPLICANT', label: 'PASSPORT COPY' },
    { key: 'applicationLetter', category: 'APPLICANT', label: 'APPLICATION LETTER' },
    { key: 'applicationForm', category: 'APPLICANT', label: 'APPLICATION FORM' },
    { key: 'businessLicense', category: 'APPLICANT', label: 'BUSINESS LICENCE' },
    { key: 'workPermit', category: 'APPLICANT', label: 'WORK PERMIT' }
  ],
  'residence-id-permanent': [
    { key: 'applicationForm', category: 'APPLICANT', label: 'APPLICATION FORM' },
    { key: 'authorizedBodyDecision', category: 'APPLICANT', label: 'AUTHORIZED BODY DECISION' },
    { key: 'passportCopy', category: 'APPLICANT', label: 'PASSPORT COPY' },
    { key: 'validityPeriod', category: 'APPLICANT', label: 'VALIDITY PERIOD' }
  ],
  'eritrean-id': [
    { key: 'applicationForm', category: 'APPLICANT', label: 'APPLICATION FORM' },
    { key: 'applicationLetter', category: 'APPLICANT', label: 'APPLICATION LETTER' },
    { key: 'previousId', category: 'APPLICANT', label: 'PREVIOUS ID' }
  ],
  'alien-passport': [
    { key: 'eritreanId', category: 'APPLICANT', label: 'ERITREAN ID' },
    { key: 'applicationForm', category: 'APPLICANT', label: 'APPLICATION FORM' },
    { key: 'applicationLetter', category: 'APPLICANT', label: 'APPLICATION LETTER' }
  ],
  'visa': [
    { key: 'passportCopy', category: 'APPLICANT', label: 'PASSPORT COPY' },
    { key: 'applicantLetter', category: 'APPLICANT', label: 'APPLICANT LETTER' },
    { key: 'entryVisa', category: 'APPLICANT', label: 'ENTRY VISA' }
  ],
  'etd': [
    { key: 'applicationForm', category: 'APPLICANT', label: 'APPLICATION FORM' },
    { key: 'araLetter', category: 'APPLICANT', label: 'ARA LETTER' },
    { key: 'hilawinet', category: 'APPLICANT', label: 'HILAWINET' }
  ]
};

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
    personalId: '',
    shelfNumber: '',
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
    residenceIdType: '',
    permanentId: '',
    temporaryId: '',
    companyName: '',
    etdNumber: '',
    eritreanIdNumber: '',
    alienPassportNumber: '',
    yellowCardNumber: '',
    yellowCardType: '',
    visaNumber: '',
    visaType: ''
  });

  const [attachments, setAttachments] = useState([]);

  const handlePredefinedUploadClick = (docKey, docLabel, category) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const newAttachment = {
          id: 'pre_' + docKey + '_' + Date.now(),
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: ev.target.result,
          docType: docKey,
          label: docLabel,
          category: category,
          uploadedAt: new Date().toISOString()
        };
        setAttachments(prev => {
          const filtered = prev.filter(att => att.docType !== docKey);
          return [...filtered, newAttachment];
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleOtherUploadClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const newAttachment = {
            id: 'other_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
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
    };
    input.click();
  };

  // Initialize form when modal opens or initialRecord changes
  useEffect(() => {
    if (isOpen) {
      if (initialRecord) {
        setFormData({
          personalId: initialRecord.personalId || '',
          shelfNumber: initialRecord.shelfNumber || '',
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
          residenceIdType: initialRecord.residenceIdType || '',
          permanentId: initialRecord.permanentId || '',
          temporaryId: initialRecord.temporaryId || '',
          companyName: initialRecord.companyName || '',
          etdNumber: initialRecord.etdNumber || '',
          eritreanIdNumber: initialRecord.eritreanIdNumber || '',
          alienPassportNumber: initialRecord.alienPassportNumber || '',
          yellowCardNumber: initialRecord.yellowCardNumber || '',
          yellowCardType: initialRecord.yellowCardType || '',
          visaNumber: initialRecord.visaNumber || '',
          visaType: initialRecord.visaType || ''
        });
        setAttachments(initialRecord.attachments || []);
      } else {
        // Reset to default
        setFormData({
          personalId: '',
          shelfNumber: '',
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
          residenceIdType: '',
          permanentId: '',
          temporaryId: '',
          companyName: '',
          etdNumber: '',
          eritreanIdNumber: '',
          alienPassportNumber: '',
          yellowCardNumber: '',
          yellowCardType: '',
          visaNumber: '',
          visaType: ''
        });
        setAttachments([]);
      }
    }
  }, [isOpen, initialRecord, activeTab]);

  let activeConfigKey = activeTab;
  if (activeTab === 'residence-id') {
    if (formData.residenceIdType === 'TEMPORARY') {
      activeConfigKey = 'residence-id-temporary';
    } else if (formData.residenceIdType === 'PERMANENT') {
      activeConfigKey = 'residence-id-permanent';
    } else {
      activeConfigKey = null;
    }
  }
  const currentDocTypes = activeConfigKey ? DOC_TYPES_CONFIG[activeConfigKey] : null;

  if (!isOpen) return null;



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
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Shelf Number</label>
              <input 
                className="glass-input" 
                value={formData.shelfNumber} 
                onChange={e => setFormData({ ...formData, shelfNumber: e.target.value.toUpperCase() })} 
                placeholder="e.g. SHELF 3" 
              />
            </div>



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
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#1054a8', fontWeight: 600 }}>PER ID</label>
              <input 
                className="glass-input" 
                style={{ borderColor: 'rgba(16, 84, 168, 0.3)', fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.5px' }}
                value={formData.personalId} 
                onChange={e => setFormData({ ...formData, personalId: e.target.value.toUpperCase() })} 
                placeholder="e.g. ICS-2024-001234" 
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
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--accent-blue)' }}>Residence ID Type *</label>
                  <select className="glass-input" style={{ borderColor: 'rgba(59, 130, 246, 0.4)' }} value={formData.residenceIdType} onChange={e => setFormData({ ...formData, residenceIdType: e.target.value })}>
                    <option value="">SELECT ID TYPE</option>
                    <option value="PERMANENT">Permanent ID</option>
                    <option value="TEMPORARY">Temporary ID</option>
                  </select>
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
                <div style={{ marginTop: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#ca8a04' }}>Yellow Card Type</label>
                  <select className="glass-input" value={formData.yellowCardType} onChange={e => setFormData({ ...formData, yellowCardType: e.target.value })}>
                    <option value="">SELECT TYPE</option>
                    <option value="BY_BIRTH_DESCENT">By Birth / Descent</option>
                    <option value="BY_MARRIAGE">By Marriage</option>
                    <option value="BY_LEGAL_ADOPTION">By Legal Adoption</option>
                    <option value="BY_SPECIAL_STATUS">By Special Status / Judicial Restitution</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'visa' && (
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#34d399' }}>Visa Number *</label>
                <input 
                  className="glass-input" 
                  style={{ borderColor: 'rgba(52, 211, 153, 0.4)' }}
                  value={formData.visaNumber} 
                  onChange={e => setFormData({ ...formData, visaNumber: e.target.value.toUpperCase() })} 
                  placeholder="e.g. V-123456" 
                  required
                />
                <div style={{ marginTop: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#34d399' }}>Visa Type *</label>
                  <select className="glass-input" style={{ borderColor: 'rgba(52, 211, 153, 0.4)' }} value={formData.visaType} onChange={e => setFormData({ ...formData, visaType: e.target.value })}>
                    <option value="">SELECT VISA TYPE</option>
                    <option value="TOURIST">Tourist Visa</option>
                    <option value="BUSINESS">Business Visa</option>
                    <option value="CONFERENCE">Conference Visa</option>
                    <option value="TRANSIT">Transit Visa</option>
                    <option value="STUDENT">Student Visa</option>
                    <option value="DIPLOMATIC">Diplomatic Visa</option>
                    <option value="OFFICIAL">Official Visa</option>
                    <option value="COURTESY">Courtesy Visa</option>
                    <option value="INVESTMENT">Investment Visa</option>
                    <option value="WORK">Work Visa</option>
                    <option value="GOVERNMENT_EMPLOYMENT">Government Employment Visa</option>
                    <option value="NGO">NGO / Humanitarian Visa</option>
                    <option value="JOURNALIST">Journalist / Media Visa</option>
                    <option value="RESEARCH">Research Visa</option>
                    <option value="MEDICAL">Medical Visa</option>
                    <option value="RELIGIOUS">Religious Visa</option>
                    <option value="CREW">Crew Visa</option>
                    <option value="REFUGEE_TRAVEL">Refugee Travel Document</option>
                    <option value="ON_ARRIVAL">Visa on Arrival</option>
                    <option value="E_VISA">e-Visa</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Structured Document Attachments */}
          {(DOC_TYPES_CONFIG[activeTab] || activeTab === 'residence-id') && (
            <div style={{ marginTop: '24px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📎 Structured Document Attachments
              </h4>
              <div style={{ borderRadius: '12px', overflow: 'hidden', border: `1px solid ${activeTab === 'eritrean-id' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(59, 130, 246, 0.2)'}` }}>
                
                {/* Predefined Document Rows */}
                {currentDocTypes ? (
                  <>
                    {/* Header */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: '120px 1fr 160px 120px',
                      background: 'linear-gradient(135deg, #1e293b, #334155)',
                      padding: '12px 16px',
                      fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px',
                      color: '#94a3b8'
                    }}>
                      <span>Category</span>
                      <span>Document Type</span>
                      <span style={{ textAlign: 'center' }}>Upload Status</span>
                      <span style={{ textAlign: 'center' }}>Actions</span>
                    </div>

                    {currentDocTypes.map((doc) => {
                      const docAttachment = attachments.find(att => att.docType === doc.key);
                      return (
                        <div key={doc.key} style={{
                          display: 'grid', gridTemplateColumns: '120px 1fr 160px 120px',
                          padding: '14px 16px', alignItems: 'center',
                          borderTop: '1px solid rgba(255,255,255,0.06)',
                          background: 'rgba(0,0,0,0.15)'
                        }}>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>{doc.category}</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0' }}>{doc.label}</span>
                          <span style={{
                            textAlign: 'center', fontSize: '0.78rem', fontStyle: 'italic',
                            color: docAttachment ? '#34d399' : '#94a3b8',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 8px'
                          }}>
                            {docAttachment ? docAttachment.name : 'NOT PROVIDED'}
                          </span>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            {docAttachment && (
                              <button type="button" onClick={() => {
                                const a = document.createElement('a');
                                a.href = docAttachment.dataUrl;
                                a.download = docAttachment.name;
                                a.click();
                              }} title="Download" style={{
                                width: '30px', height: '30px', borderRadius: '6px',
                                background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)',
                                color: '#a78bfa', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem'
                              }}>
                                <Download size={14} />
                              </button>
                            )}
                            <button type="button" onClick={() => handlePredefinedUploadClick(doc.key, doc.label, doc.category)} title="Upload" style={{
                              width: '30px', height: '30px', borderRadius: '6px',
                              background: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.3)',
                              color: '#34d399', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem'
                            }}>
                              <Upload size={14} />
                            </button>
                            {docAttachment && (
                              <button type="button" onClick={() => setAttachments(prev => prev.filter(att => att.docType !== doc.key))} title="Remove" style={{
                                width: '30px', height: '30px', borderRadius: '6px',
                                background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#f87171', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem'
                              }}>
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div style={{ 
                    padding: '24px', 
                    textAlign: 'center', 
                    color: 'var(--text-secondary)',
                    background: 'rgba(0,0,0,0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <AlertTriangle size={24} style={{ color: 'var(--accent-gold)' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Please select Residence ID Type (Permanent / Temporary) to load required document slots.</span>
                  </div>
                )}

                {/* Other Documents Section */}
                <div style={{
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, #1e293b, #334155)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderTop: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8' }}>📎 Other Documents</span>
                  <button type="button" onClick={handleOtherUploadClick} style={{
                    padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700,
                    background: 'rgba(255,255,255,0.9)', color: '#0f172a', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}>+ ADD</button>
                </div>

                {/* Other Documents Header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '120px 1fr 160px 120px',
                  padding: '8px 16px', fontSize: '0.68rem', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b',
                  borderTop: '1px solid rgba(255,255,255,0.04)'
                }}>
                  <span>Category</span>
                  <span>Document Type</span>
                  <span style={{ textAlign: 'center' }}>Upload Status</span>
                  <span style={{ textAlign: 'center' }}>Actions</span>
                </div>

                {attachments.filter(att => !att.docType).length === 0 ? (
                  <div style={{ padding: '20px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    NO ADDITIONAL DOCUMENTS ADDED
                  </div>
                ) : (
                  attachments.filter(att => !att.docType).map(doc => (
                    <div key={doc.id} style={{
                      display: 'grid', gridTemplateColumns: '120px 1fr 160px 120px',
                      padding: '10px 16px', alignItems: 'center',
                      borderTop: '1px solid rgba(255,255,255,0.04)',
                      background: 'rgba(0,0,0,0.1)'
                    }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>OTHER</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                      <span style={{ textAlign: 'center', fontSize: '0.78rem', color: '#34d399' }}>UPLOADED</span>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button type="button" onClick={() => {
                          const a = document.createElement('a'); a.href = doc.dataUrl; a.download = doc.name; a.click();
                        }} title="Download" style={{
                          width: '30px', height: '30px', borderRadius: '6px',
                          background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)',
                          color: '#a78bfa', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem'
                        }}>
                          <Download size={14} />
                        </button>
                        <button type="button" onClick={() => setAttachments(prev => prev.filter(d => d.id !== doc.id))} title="Remove" style={{
                          width: '30px', height: '30px', borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#f87171', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem'
                        }}>
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

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
