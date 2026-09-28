import { useState, useEffect, useRef } from 'react';
import { getAllRecords, getSystemClassifications, DEFAULT_CLASSIFICATIONS } from '../utils/db';
import { useBranch } from '../context/BranchContext';
import { X, Upload, FileText, CheckCircle, AlertTriangle, Trash2, Eye, Download, Building2, MapPin, Lock, Sparkles } from 'lucide-react';
import { extractTextFromAttachment, extractEntitiesFromText } from '../utils/ocrService';

const DOC_TYPES_CONFIG = {
  'eoid': [
    { key: 'passportCopy', category: 'APPLICANT', label: 'PASSPORT COPY' },
    { key: 'applicationForm', category: 'APPLICANT', label: 'APPLICATION FORM' },
    { key: 'birthCertificate', category: 'APPLICANT', label: 'BIRTH CERTIFICATE' },
    { key: 'familyOrCourtDoc', category: 'APPLICANT', label: 'FAMILY DOCUMENT OR COURT LETTER' }
  ],
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
    { key: 'applicationForm', category: 'APPLICANT', label: 'APPLICATION FORM' },
    { key: 'entryVisa', category: 'APPLICANT', label: 'ENTRY VISA' }
  ],
  'etd-RRS': [
    { key: 'rrsId', category: 'RRS', label: 'RRS ID' },
    { key: 'rrsList', category: 'RRS', label: 'LIST OF RRS' },
    { key: 'applicationLetter', category: 'RRS', label: 'APPLICATION LETTER' }
  ],
  'etd-UNHCR': [
    { key: 'unhcrLetter', category: 'UNHCR', label: 'UNHCR LETTER' },
    { key: 'unhcrForm', category: 'UNHCR', label: 'UNHCR FORM' },
    { key: 'passportCopy', category: 'UNHCR', label: 'PASSPORT COPY' }
  ],
  'etd-IOM': [
    { key: 'iomList', category: 'IOM', label: 'IOM LIST' },
    { key: 'iomForm', category: 'IOM', label: 'IOM FORM' }
  ],
  'residence-id-cancellation': [
    { key: 'passport', category: 'APPLICANT', label: 'PASSPORT' },
    { key: 'applicationForm', category: 'APPLICANT', label: 'APPLICATION FORM' },
    { key: 'applicationLetter', category: 'APPLICANT', label: 'APPLICATION LETTER' },
    { key: 'previousId', category: 'APPLICANT', label: 'PREVIOUS ID' }
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

export default function RecordFormModal({ isOpen, onClose, onSave, activeTab, initialRecord = null, customModule = null }) {
  const scrollContainerRef = useRef(null);
  const { branches, userBranch, selectedBranch, isAdmin } = useBranch();
  const [eoidCategory, setEoidCategory] = useState(activeTab === 'eoid-underage' ? 'eoid-underage' : 'eoid-normal');
  const [classifications, setClassifications] = useState(DEFAULT_CLASSIFICATIONS);

  useEffect(() => {
    getSystemClassifications().then(data => {
      if (data) setClassifications(data);
    }).catch(() => {});
  }, [isOpen]);

  const defaultBranchVal = initialRecord?.branch || (isAdmin && selectedBranch !== 'ALL' ? selectedBranch : userBranch) || 'Head Office (Addis Ababa)';

  const [formData, setFormData] = useState({
    personalId: '',
    shelfNumber: '',
    boxNumber: '',
    firstName: '',
    middleName: '',
    lastName: '',
    sex: 'MALE',
    citizenship: '',
    passportNumber: '',
    requestNumber: '',
    date: new Date().toISOString().split('T')[0],
    serviceProvided: '',
    branch: defaultBranchVal,
    // Category-specific
    type: '',
    eoidType: 'EOID-NORMAL',
    eoidNumber: '',
    guardianFullName: '',
    guardianPassportId: '',
    guardianRelationship: 'Father',
    residenceIdNumber: '',
    residenceIdType: '',
    permanentId: '',
    temporaryId: '',
    companyName: '',
    etdNumber: '',
    etdType: '',
    eritreanIdNumber: '',
    alienPassportNumber: '',
    visaNumber: '',
    visaType: ''
  });

  const [attachments, setAttachments] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});

  const isEoidModule = activeTab === 'eoid' || activeTab === 'eoid-normal' || activeTab === 'eoid-underage';

  const handlePredefinedUploadClick = (docKey, docLabel, category) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
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

        // Asynchronously run OCR recognition
        extractTextFromAttachment(newAttachment).then(ocrResult => {
          if (ocrResult?.fullText) {
            newAttachment.ocrText = ocrResult.fullText;
            newAttachment.ocrPages = ocrResult.pages || [];
            const entities = extractEntitiesFromText(ocrResult.fullText);
            setFormData(prev => ({
              ...prev,
              passportNumber: prev.passportNumber || entities.passportNumber || '',
              personalId: prev.personalId || '',
              firstName: prev.firstName || entities.firstName || (entities.fullName ? entities.fullName.split(' ')[0] : ''),
              lastName: prev.lastName || entities.lastName || (entities.fullName ? entities.fullName.split(' ').slice(1).join(' ') : ''),
              sex: entities.sex || prev.sex,
            }));
          }
        }).catch(err => console.warn('Form upload OCR notice:', err));

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
        reader.onload = async (ev) => {
          const newAttachment = {
            id: 'other_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl: ev.target.result,
            uploadedAt: new Date().toISOString()
          };

          // Asynchronously run OCR recognition
          extractTextFromAttachment(newAttachment).then(ocrResult => {
            if (ocrResult?.fullText) {
              newAttachment.ocrText = ocrResult.fullText;
              newAttachment.ocrPages = ocrResult.pages || [];
            }
          }).catch(err => console.warn('Other upload OCR notice:', err));

          setAttachments(prev => [...prev, newAttachment]);
        };
        reader.readAsDataURL(file);
      });
    };
    input.click();
  };

  // ─────────────────────────────────────────────────
  //  AUTO BOX-NUMBER GENERATOR for ALL MODULES
  //  Pattern: {PREFIX}-B1-01 → {PREFIX}-B1-50, then {PREFIX}-B2-01 → {PREFIX}-B2-50 …
  //  50 slots per box, sequential allocation
  // ─────────────────────────────────────────────────
  const SLOTS_PER_BOX = 50;

  const BOX_CONFIG = {
    'visa':           { prefix: 'VS',   store: 'visa' },
    'eoid':           { prefix: 'EOID', store: 'eoid' },
    'eoid-normal':    { prefix: 'EOID', store: 'eoid' },
    'eoid-underage':  { prefix: 'EOID', store: 'eoid' },
    'residence-id':   { prefix: 'RES',  store: 'residence_id' },
    'residence-id-cancellation': { prefix: 'RC', store: 'residence_id_cancellation' },
    'etd':            { prefix: 'ETD',  store: 'etd' },
    'eritrean-id':    { prefix: 'ERID', store: 'eritrean_id' },
    'alien-passport': { prefix: 'AP',   store: 'alien_passport' },
  };

  async function generateNextBoxNumber(tab) {
    const config = BOX_CONFIG[tab] || (customModule ? {
      prefix: customModule.prefix || customModule.title.substring(0, 3).toUpperCase(),
      store: (customModule.key || tab).replace(/-/g, '_')
    } : null);
    if (!config) return '';
    const { prefix, store } = config;
    try {
      const allExisting = await getAllRecords(store);
      const targetBranch = (isAdmin && selectedBranch !== 'ALL') ? selectedBranch : userBranch;
      const existing = targetBranch ? allExisting.filter(r => !r.branch || r.branch === targetBranch) : allExisting;
      const pattern = new RegExp(`^${prefix}-B(\\d+)-(\\d+)$`, 'i');
      let maxBox = 1;
      let maxSlot = 0;
      existing.forEach(r => {
        if (!r.boxNumber) return;
        const match = r.boxNumber.match(pattern);
        if (match) {
          const b = parseInt(match[1], 10);
          const s = parseInt(match[2], 10);
          if (b > maxBox || (b === maxBox && s > maxSlot)) {
            maxBox = b;
            maxSlot = s;
          }
        }
      });
      let nextBox = maxBox;
      let nextSlot = maxSlot + 1;
      if (nextSlot > SLOTS_PER_BOX) {
        nextBox += 1;
        nextSlot = 1;
      }
      const slotStr = String(nextSlot).padStart(2, '0');
      return `${prefix}-B${nextBox}-${slotStr}`;
    } catch (err) {
      console.error(`generateNextBoxNumber(${tab}) error:`, err);
      return `${prefix}-B1-01`;
    }
  }

  // Initialize form when modal opens or initialRecord changes
  useEffect(() => {
    if (isOpen) {
      if (initialRecord) {
        // Split fullName into firstName, middleName, lastName
        const fullName = initialRecord.fullName || '';
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts[nameParts.length - 1] || '';
        const middleName = nameParts.slice(1, nameParts.length - 1).join(' ') || '';

        setFormData({
          personalId: initialRecord.personalId || '',
          building: initialRecord.building || '',
          room: initialRecord.room || '',
          shelfNumber: initialRecord.shelfNumber || '',
          boxNumber: initialRecord.boxNumber || '',
          folderNumber: initialRecord.folderNumber || '',
          firstName,
          middleName,
          lastName,
          sex: initialRecord.sex || 'MALE',
          citizenship: initialRecord.citizenship || '',
          passportNumber: initialRecord.passportNumber || '',
          requestNumber: initialRecord.requestNumber || '',
          date: initialRecord.date || new Date().toISOString().split('T')[0],
          serviceProvided: initialRecord.serviceProvided || '',
          branch: initialRecord.branch || (isAdmin && selectedBranch !== 'ALL' ? selectedBranch : userBranch) || 'Head Office (Addis Ababa)',
          eoidType: initialRecord.eoidType || (activeTab === 'eoid-underage' ? 'EOID-UNDER-AGE' : 'EOID-NORMAL'),
          eoidNumber: initialRecord.eoidNumber || '',
          guardianFullName: initialRecord.guardianFullName || '',
          guardianPassportId: initialRecord.guardianPassportId || '',
          guardianRelationship: initialRecord.guardianRelationship || 'Father',
          residenceIdNumber: initialRecord.residenceIdNumber || '',
          residenceIdType: initialRecord.residenceIdType || '',
          permanentId: initialRecord.permanentId || '',
          temporaryId: initialRecord.temporaryId || '',
          companyName: initialRecord.companyName || '',
          etdNumber: initialRecord.etdNumber || '',
          etdType: initialRecord.etdType || '',
          eritreanIdNumber: initialRecord.eritreanIdNumber || '',
          alienPassportNumber: initialRecord.alienPassportNumber || '',
          visaNumber: initialRecord.visaNumber || '',
          visaType: initialRecord.visaType || ''
        });
        setAttachments(initialRecord.attachments || []);
        if (isEoidModule) {
          const isUnder = initialRecord.eoidType === 'EOID-UNDER-AGE' || !!initialRecord.guardianFullName || activeTab === 'eoid-underage';
          setEoidCategory(isUnder ? 'eoid-underage' : 'eoid-normal');
        }
      } else {
        // Reset to default, then auto-assign box number for all modules
        const defaultForm = {
          personalId: '',
          building: 'Archive Block A',
          room: 'Room 101',
          shelfNumber: '',
          boxNumber: '',
          folderNumber: '',
          firstName: '',
          middleName: '',
          lastName: '',
          sex: 'MALE',
          citizenship: '',
          passportNumber: '',
          requestNumber: '',
          date: new Date().toISOString().split('T')[0],
          serviceProvided: '',
          branch: (isAdmin && selectedBranch !== 'ALL' ? selectedBranch : userBranch) || 'Head Office (Addis Ababa)',
          eoidType: activeTab === 'eoid-underage' ? 'EOID-UNDER-AGE' : 'EOID-NORMAL',
          eoidNumber: '',
          guardianFullName: '',
          guardianPassportId: '',
          guardianRelationship: 'Father',
          residenceIdNumber: '',
          residenceIdType: '',
          permanentId: '',
          temporaryId: '',
          companyName: '',
          etdNumber: '',
          etdType: '',
          eritreanIdNumber: '',
          alienPassportNumber: '',
          visaNumber: '',
          visaType: ''
        };
        setFormData(defaultForm);
        setAttachments([]);

        // Auto-generate box number for the active module
        const targetTab = isEoidModule ? (activeTab === 'eoid-underage' ? 'eoid-underage' : 'eoid-normal') : activeTab;
        if (BOX_CONFIG[targetTab]) {
          generateNextBoxNumber(targetTab).then(nextBox => {
            setFormData(prev => ({ ...prev, boxNumber: nextBox }));
          });
        }
        if (isEoidModule) {
          setEoidCategory(activeTab === 'eoid-underage' ? 'eoid-underage' : 'eoid-normal');
        }
      }
    }
  }, [isOpen, initialRecord, activeTab]);

  let activeConfigKey = isEoidModule ? eoidCategory : activeTab;
  if (activeTab === 'residence-id') {
    if (formData.residenceIdType === 'TEMPORARY') {
      activeConfigKey = 'residence-id-temporary';
    } else if (formData.residenceIdType === 'PERMANENT') {
      activeConfigKey = 'residence-id-permanent';
    } else {
      activeConfigKey = null;
    }
  } else if (activeTab === 'etd') {
    if (formData.etdType === 'RRS') {
      activeConfigKey = 'etd-RRS';
    } else if (formData.etdType === 'UNHCR') {
      activeConfigKey = 'etd-UNHCR';
    } else if (formData.etdType === 'IOM') {
      activeConfigKey = 'etd-IOM';
    } else {
      activeConfigKey = null; // No type selected yet — hide attachment table
    }
  }
  let currentDocTypes = activeConfigKey ? DOC_TYPES_CONFIG[activeConfigKey] : null;
  if (!currentDocTypes && customModule && customModule.docTypes && customModule.docTypes.length > 0) {
    currentDocTypes = customModule.docTypes.map(dt => ({
      key: dt.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
      category: customModule.title.toUpperCase(),
      label: dt.toUpperCase()
    }));
  }

  if (!isOpen) return null;

  function validateForm() {
    const errors = {};

    // ── PER ID: required, must be a positive integer ──
    if (!formData.personalId?.trim()) {
      errors.personalId = 'PER ID is required';
    } else if (!/^\d+$/.test(formData.personalId.trim())) {
      errors.personalId = 'PER ID must be an integer number (digits only)';
    }

    // ── Box Number ──
    if (!formData.boxNumber?.trim()) errors.boxNumber = 'Box Number is required';

    // ── Name fields ──
    if (!formData.firstName?.trim()) errors.firstName = 'First Name is required';
    else if (!/^[A-Za-z\s\-']+$/.test(formData.firstName.trim())) errors.firstName = 'First Name must contain letters only';
    if (!formData.lastName?.trim()) errors.lastName = 'Last Name is required';
    else if (!/^[A-Za-z\s\-']+$/.test(formData.lastName.trim())) errors.lastName = 'Last Name must contain letters only';

    // ── Citizenship ──
    if (!formData.citizenship?.trim() || formData.citizenship === 'CUSTOM') errors.citizenship = 'Citizenship is required';

    // ── Passport Number: ICAO Doc 9303 standard ──
    // MRZ passport field: up to 9 uppercase alphanumeric chars (A-Z, 0-9)
    // Optional for etd and eritrean-id modules
    if (activeTab !== 'etd' && activeTab !== 'eritrean-id' && !formData.passportNumber?.trim()) {
      errors.passportNumber = 'Passport Number is required';
    } else if (formData.passportNumber?.trim() && !/^[A-Z0-9]{6,9}$/.test(formData.passportNumber.trim())) {
      errors.passportNumber = 'Passport must be 6–9 uppercase alphanumeric characters (ICAO Doc 9303 standard)';
    }

    // ── Service Provided — optional ──
    // (no required validation)

    // ── Date ──
    if (!formData.date) {
      errors.date = 'Date is required';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.date)) {
      errors.date = 'Date must be in YYYY-MM-DD format';
    }

    // ── Category-specific required fields ──
    if (activeTab === 'visa') {
      if (!formData.visaType) errors.visaType = 'Visa Type is required';
    }
    if (activeTab === 'eoid-normal' || activeTab === 'eoid-underage' || activeTab === 'eoid') {
      if (!formData.eoidType) errors.eoidType = 'EOID Type is required';
      // EOID Number is optional

      const isUnderage = eoidCategory === 'eoid-underage' || formData.eoidType === 'EOID-UNDER-AGE' || activeTab === 'eoid-underage';
      if (isUnderage) {
        if (!formData.guardianFullName?.trim()) {
          errors.guardianFullName = 'Guardian Full Name is required';
        }
        if (!formData.guardianPassportId?.trim()) {
          errors.guardianPassportId = 'Guardian Passport / ID is required';
        }
        if (!formData.guardianRelationship?.trim()) {
          errors.guardianRelationship = 'Guardian Relationship is required';
        }
      }
    }
    if (activeTab === 'residence-id') {
      if (!formData.residenceIdType) errors.residenceIdType = 'Residence ID Type is required';
      // Company Name is optional for residence-id
      // Permanent ID and Temporary ID are optional
    }
    if (activeTab === 'etd') {
      if (!formData.etdType) errors.etdType = 'ETD Document Type is required';
      // ETD Number is optional
    }
    // Eritrean ID Number is optional
    // Alien Passport Number is optional

    // ── Document attachments: ALL predefined documents are mandatory ──
    if (currentDocTypes && currentDocTypes.length > 0) {
      const missingDocs = currentDocTypes.filter(
        doc => !attachments.find(att => att.docType === doc.key)
      );
      if (missingDocs.length > 0) {
        const missingLabels = missingDocs.map(d => d.label).join(', ');
        errors.attachments = `All documents are required. Missing: ${missingLabels}`;
      }
    } else if (attachments.length === 0) {
      errors.attachments = 'At least one document attachment is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    
    if (!validateForm()) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    // Construct full name from parts
    const fullName = [formData.firstName, formData.middleName, formData.lastName]
      .filter(part => part && part.trim())
      .join(' ')
      .toUpperCase();

    const savedRecord = {
      ...formData,
      fullName, // Reconstruct for backward compatibility
      // Keep ID if in Edit Mode
      ...(initialRecord && { id: initialRecord.id }),
      attachments
    };
    
    // Remove individual name parts to prevent backend schema errors
    delete savedRecord.firstName;
    delete savedRecord.middleName;
    delete savedRecord.lastName;

    // Module-specific field cleanup: remove cross-module fields that don't belong to this table
    if (!isEoidModule) {
      delete savedRecord.eoidType;
      delete savedRecord.eoidNumber;
      delete savedRecord.guardianFullName;
      delete savedRecord.guardianPassportId;
      delete savedRecord.guardianRelationship;
    }
    if (activeTab !== 'residence-id' && activeTab !== 'residence id') {
      delete savedRecord.residenceIdType;
      delete savedRecord.permanentId;
      delete savedRecord.temporaryId;
      delete savedRecord.residenceIdNumber;
      delete savedRecord.companyName;
    }
    if (activeTab !== 'etd') {
      delete savedRecord.etdType;
      delete savedRecord.etdNumber;
    }
    if (activeTab !== 'eritrean-id') {
      delete savedRecord.eritreanIdNumber;
    }
    if (activeTab !== 'alien-passport') {
      delete savedRecord.alienPassportNumber;
    }
    if (activeTab !== 'visa') {
      delete savedRecord.visaType;
      delete savedRecord.visaNumber;
    }

    // Remove empty string, null, and undefined fields so we don't send columns that don't exist in the target table
    Object.keys(savedRecord).forEach(key => {
      if (savedRecord[key] === '' || savedRecord[key] === null || savedRecord[key] === undefined) {
        delete savedRecord[key];
      }
    });

    onSave(savedRecord, isEoidModule ? eoidCategory : activeTab);
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
          <div ref={scrollContainerRef} style={{ padding: '32px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* ══════════════════════════════════════════════════════
              PROMINENT EXACT VALIDATION ERROR BANNER IN RED
          ══════════════════════════════════════════════════════ */}
          {Object.values(validationErrors).filter(Boolean).length > 0 && (
            <div style={{
              background: 'rgba(220, 38, 38, 0.12)',
              border: '2px solid #ef4444',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.18)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.3px' }}>
                <AlertTriangle size={18} />
                <span>Please fix the following validation error{Object.values(validationErrors).filter(Boolean).length > 1 ? 's' : ''}:</span>
              </div>
              <ul style={{ margin: '4px 0 0 20px', padding: 0, fontSize: '0.85rem', color: '#f87171', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {Object.entries(validationErrors).filter(([, msg]) => !!msg).map(([key, msg]) => (
                  <li key={key} style={{ fontWeight: 600, color: '#f87171' }}>
                    <span style={{ color: '#ffffff' }}>{msg}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Biographical Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>

            {/* ══════════════════════════════════════════════════════
                PRIMARY TYPE FIELDS — MUST COME FIRST FOR ALL MODULES
            ══════════════════════════════════════════════════════ */}

            {/* EOID Module: Type and Number */}
            {(activeTab === 'eoid-normal' || activeTab === 'eoid-underage' || activeTab === 'eoid') && (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: validationErrors.eoidType ? 'var(--accent-danger)' : '#b45309', fontWeight: 700 }}>EOID Type *</label>
                  <select 
                    className="glass-input" 
                    style={{ borderColor: validationErrors.eoidType ? 'rgba(220, 38, 38, 0.5)' : 'rgba(180, 83, 9, 0.4)', fontWeight: 600 }}
                    value={formData.eoidType || 'EOID-NORMAL'}
                    onChange={e => {
                      const val = e.target.value;
                      setFormData({ ...formData, eoidType: val });
                      setValidationErrors(prev => ({ ...prev, eoidType: '' }));
                      if (val === 'EOID-UNDER-AGE') {
                        setEoidCategory('eoid-underage');
                      } else {
                        setEoidCategory('eoid-normal');
                      }
                    }}
                  >
                    <option value="EOID-NORMAL">EOID-NORMAL</option>
                    <option value="EOID-UNDER-AGE">EOID-UNDER-AGE</option>
                  </select>
                  {validationErrors.eoidType && <span style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', marginTop: '4px', display: 'block' }}>{validationErrors.eoidType}</span>}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: validationErrors.eoidNumber ? 'var(--accent-danger)' : '#1d4ed8', fontWeight: 700 }}>EOID Number</label>
                  <input
                    className="glass-input"
                    style={{ borderColor: validationErrors.eoidNumber ? 'rgba(220, 38, 38, 0.5)' : 'rgba(29, 78, 216, 0.4)', fontFamily: 'monospace', fontWeight: 600 }}
                    value={formData.eoidNumber}
                    onChange={e => { setFormData({ ...formData, eoidNumber: e.target.value.toUpperCase() }); setValidationErrors(prev => ({ ...prev, eoidNumber: '' })); }}
                    placeholder="e.g. EOID-2024-00123"
                  />
                  {validationErrors.eoidNumber && <span style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', marginTop: '4px', display: 'block' }}>{validationErrors.eoidNumber}</span>}
                </div>

                {/* GUARDIAN / PARENT DETAILS (MINOR DEPENDENT) Card */}
                {(formData.eoidType === 'EOID-UNDER-AGE' || eoidCategory === 'eoid-underage' || activeTab === 'eoid-underage') && (
                  <div style={{
                    gridColumn: 'span 2',
                    background: '#fffdf5',
                    border: '1.5px solid #fde68a',
                    borderRadius: '16px',
                    padding: '20px 24px',
                    boxShadow: '0 4px 20px rgba(245, 158, 11, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #fef3c7',
                      paddingBottom: '12px'
                    }}>
                      <span style={{
                        fontWeight: 800,
                        fontSize: '0.92rem',
                        color: '#78350f',
                        letterSpacing: '0.6px',
                        textTransform: 'uppercase'
                      }}>
                        GUARDIAN / PARENT DETAILS (MINOR DEPENDENT)
                      </span>
                      <span style={{
                        background: '#fef3c7',
                        color: '#b45309',
                        border: '1px solid #fde68a',
                        borderRadius: '8px',
                        padding: '3px 10px',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        letterSpacing: '0.4px'
                      }}>
                        Underage EOID
                      </span>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '16px'
                    }}>
                      <div>
                        <label style={{
                          display: 'block',
                          marginBottom: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          color: validationErrors.guardianFullName ? 'var(--accent-danger)' : '#78350f',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase'
                        }}>
                          GUARDIAN FULL NAME *
                        </label>
                        <input
                          className="glass-input"
                          style={{
                            borderColor: validationErrors.guardianFullName ? 'rgba(220, 38, 38, 0.5)' : '#fde68a',
                            background: '#ffffff',
                            color: '#1e293b',
                            fontWeight: 600,
                            borderRadius: '12px',
                            padding: '10px 14px'
                          }}
                          value={formData.guardianFullName}
                          onChange={e => {
                            setFormData({ ...formData, guardianFullName: e.target.value.toUpperCase() });
                            setValidationErrors(prev => ({ ...prev, guardianFullName: '' }));
                          }}
                          placeholder="E.G. ASTER KEBEDE"
                        />
                        {validationErrors.guardianFullName && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', marginTop: '4px', display: 'block' }}>
                            {validationErrors.guardianFullName}
                          </span>
                        )}
                      </div>

                      <div>
                        <label style={{
                          display: 'block',
                          marginBottom: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          color: validationErrors.guardianPassportId ? 'var(--accent-danger)' : '#78350f',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase'
                        }}>
                          GUARDIAN PASSPORT / ID *
                        </label>
                        <input
                          className="glass-input"
                          style={{
                            borderColor: validationErrors.guardianPassportId ? 'rgba(220, 38, 38, 0.5)' : '#fde68a',
                            background: '#ffffff',
                            color: '#1e293b',
                            fontWeight: 600,
                            fontFamily: 'monospace',
                            borderRadius: '12px',
                            padding: '10px 14px'
                          }}
                          value={formData.guardianPassportId}
                          onChange={e => {
                            setFormData({ ...formData, guardianPassportId: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') });
                            setValidationErrors(prev => ({ ...prev, guardianPassportId: '' }));
                          }}
                          placeholder="E.G.  EP9928172"
                        />
                        {validationErrors.guardianPassportId && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', marginTop: '4px', display: 'block' }}>
                            {validationErrors.guardianPassportId}
                          </span>
                        )}
                      </div>

                      <div>
                        <label style={{
                          display: 'block',
                          marginBottom: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          color: validationErrors.guardianRelationship ? 'var(--accent-danger)' : '#78350f',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase'
                        }}>
                          GUARDIAN RELATIONSHIP *
                        </label>
                        <select
                          className="glass-input"
                          style={{
                            borderColor: validationErrors.guardianRelationship ? 'rgba(220, 38, 38, 0.5)' : '#fde68a',
                            background: '#ffffff',
                            color: '#1e293b',
                            fontWeight: 600,
                            borderRadius: '12px',
                            padding: '10px 14px'
                          }}
                          value={formData.guardianRelationship || 'Father'}
                          onChange={e => {
                            setFormData({ ...formData, guardianRelationship: e.target.value });
                            setValidationErrors(prev => ({ ...prev, guardianRelationship: '' }));
                          }}
                        >
                          <option value="Father">Father</option>
                          <option value="Mother">Mother</option>
                          <option value="Legal Guardian">Legal Guardian</option>
                          <option value="Brother">Brother</option>
                          <option value="Sister">Sister</option>
                          <option value="Grandparent">Grandparent</option>
                          <option value="Uncle">Uncle</option>
                          <option value="Aunt">Aunt</option>
                          <option value="Other">Other</option>
                        </select>
                        {validationErrors.guardianRelationship && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', marginTop: '4px', display: 'block' }}>
                            {validationErrors.guardianRelationship}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Residence ID Module: Type, Company, Permanent/Temporary ID */}
            {(activeTab === 'residence id' || activeTab === 'residence-id') && (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: validationErrors.residenceIdType ? 'var(--accent-danger)' : 'var(--accent-blue)', fontWeight: 700 }}>Residence ID Type *</label>
                  <select className="glass-input" style={{ borderColor: validationErrors.residenceIdType ? 'rgba(220, 38, 38, 0.5)' : 'rgba(59, 130, 246, 0.4)', fontWeight: 600 }} value={formData.residenceIdType} onChange={e => { setFormData({ ...formData, residenceIdType: e.target.value }); setValidationErrors(prev => ({ ...prev, residenceIdType: '' })); }}>
                    <option value="">SELECT ID TYPE</option>
                    {(classifications.residenceTypes || []).map(rt => (
                      <option key={rt.key} value={rt.key}>{rt.label}</option>
                    ))}
                  </select>
                  {validationErrors.residenceIdType && <span style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', marginTop: '4px', display: 'block' }}>{validationErrors.residenceIdType}</span>}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: validationErrors.companyName ? 'var(--accent-danger)' : 'var(--accent-blue)', fontWeight: 700 }}>Company Name</label>
                  <input 
                    className="glass-input" 
                    style={{ borderColor: validationErrors.companyName ? 'rgba(220, 38, 38, 0.5)' : 'rgba(59, 130, 246, 0.4)' }}
                    value={formData.companyName} 
                    onChange={e => { setFormData({ ...formData, companyName: e.target.value.toUpperCase() }); setValidationErrors(prev => ({ ...prev, companyName: '' })); }}
                    placeholder="e.g. GLOBAL TECH LTD" 
                  />
                  {validationErrors.companyName && <span style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', marginTop: '4px', display: 'block' }}>{validationErrors.companyName}</span>}
                </div>
                {formData.residenceIdType === 'PERMANENT' && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: validationErrors.permanentId ? 'var(--accent-danger)' : 'var(--accent-blue)', fontWeight: 700 }}>Permanent ID</label>
                    <input className="glass-input" style={{ borderColor: validationErrors.permanentId ? 'rgba(220, 38, 38, 0.5)' : 'rgba(59, 130, 246, 0.4)', fontFamily: 'monospace' }} value={formData.permanentId} onChange={e => { setFormData({ ...formData, permanentId: e.target.value.toUpperCase() }); setValidationErrors(prev => ({ ...prev, permanentId: '' })); }} placeholder="e.g. PERM-001" />
                    {validationErrors.permanentId && <span style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', marginTop: '4px', display: 'block' }}>{validationErrors.permanentId}</span>}
                  </div>
                )}
                {formData.residenceIdType === 'TEMPORARY' && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: validationErrors.temporaryId ? 'var(--accent-danger)' : 'var(--accent-blue)', fontWeight: 700 }}>Temporary ID</label>
                    <input className="glass-input" style={{ borderColor: validationErrors.temporaryId ? 'rgba(220, 38, 38, 0.5)' : 'rgba(59, 130, 246, 0.4)', fontFamily: 'monospace' }} value={formData.temporaryId} onChange={e => { setFormData({ ...formData, temporaryId: e.target.value.toUpperCase() }); setValidationErrors(prev => ({ ...prev, temporaryId: '' })); }} placeholder="e.g. TEMP-001" />
                    {validationErrors.temporaryId && <span style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', marginTop: '4px', display: 'block' }}>{validationErrors.temporaryId}</span>}
                  </div>
                )}
              </>
            )}

            {/* ETD Module: Type and Number */}
            {activeTab === 'etd' && (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: validationErrors.etdType ? 'var(--accent-danger)' : '#f97316', fontWeight: 700 }}>ETD Document Type *</label>
                  <select
                    className="glass-input"
                    style={{ borderColor: validationErrors.etdType ? 'rgba(220, 38, 38, 0.5)' : 'rgba(249, 115, 22, 0.4)', fontWeight: 600 }}
                    value={formData.etdType}
                    onChange={e => { setFormData({ ...formData, etdType: e.target.value }); setValidationErrors(prev => ({ ...prev, etdType: '' })); }}
                  >
                    <option value="">SELECT DOCUMENT TYPE</option>
                    {(classifications.etdTypes || []).map(et => (
                      <option key={et.key} value={et.key}>{et.label}</option>
                    ))}
                  </select>
                  {validationErrors.etdType && <span style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', marginTop: '4px', display: 'block' }}>{validationErrors.etdType}</span>}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: validationErrors.etdNumber ? 'var(--accent-danger)' : '#f97316', fontWeight: 700 }}>ETD Number</label>
                  <input
                    className="glass-input"
                    style={{ borderColor: validationErrors.etdNumber ? 'rgba(220, 38, 38, 0.5)' : 'rgba(249, 115, 22, 0.4)', fontFamily: 'monospace' }}
                    value={formData.etdNumber}
                    onChange={e => { setFormData({ ...formData, etdNumber: e.target.value.toUpperCase() }); setValidationErrors(prev => ({ ...prev, etdNumber: '' })); }}
                    placeholder="e.g. ETD-2024-00456"
                  />
                  {validationErrors.etdNumber && <span style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', marginTop: '4px', display: 'block' }}>{validationErrors.etdNumber}</span>}
                </div>
              </>
            )}

            {/* Visa Module: Type */}
            {activeTab === 'visa' && (
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: validationErrors.visaType ? 'var(--accent-danger)' : '#34d399', fontWeight: 700 }}>Visa Type *</label>
                <select className="glass-input" style={{ borderColor: validationErrors.visaType ? 'rgba(220, 38, 38, 0.5)' : 'rgba(52, 211, 153, 0.4)', fontWeight: 600 }} value={formData.visaType} onChange={e => { setFormData({ ...formData, visaType: e.target.value }); setValidationErrors(prev => ({ ...prev, visaType: '' })); }}>
                  <option value="">SELECT VISA TYPE</option>
                  {(classifications.visaTypes || []).map(vt => (
                    <option key={vt} value={vt}>{vt}</option>
                  ))}
                  {formData.visaType && !(classifications.visaTypes || []).includes(formData.visaType) && (
                    <option value={formData.visaType}>{formData.visaType} (Custom)</option>
                  )}
                </select>
                {validationErrors.visaType && <span style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', marginTop: '4px', display: 'block' }}>{validationErrors.visaType}</span>}
              </div>
            )}

            {/* Eritrean ID Module: ID Number */}
            {activeTab === 'eritrean-id' && (
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: validationErrors.eritreanIdNumber ? 'var(--accent-danger)' : '#dc2626', fontWeight: 700 }}>Eritrean ID Number</label>
                <input
                  className="glass-input"
                  style={{ borderColor: validationErrors.eritreanIdNumber ? 'rgba(220, 38, 38, 0.5)' : 'rgba(220, 38, 38, 0.4)', fontFamily: 'monospace' }}
                  value={formData.eritreanIdNumber}
                  onChange={e => { setFormData({ ...formData, eritreanIdNumber: e.target.value.toUpperCase() }); setValidationErrors(prev => ({ ...prev, eritreanIdNumber: '' })); }}
                  placeholder="e.g. ERID-00789"
                />
                {validationErrors.eritreanIdNumber && <span style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', marginTop: '4px', display: 'block' }}>{validationErrors.eritreanIdNumber}</span>}
              </div>
            )}

            {/* Alien Passport Module: Passport Number */}
            {activeTab === 'alien-passport' && (
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: validationErrors.alienPassportNumber ? 'var(--accent-danger)' : '#7c3aed', fontWeight: 700 }}>Alien Passport Number</label>
                <input
                  className="glass-input"
                  style={{ borderColor: validationErrors.alienPassportNumber ? 'rgba(220, 38, 38, 0.5)' : 'rgba(124, 58, 237, 0.4)', fontFamily: 'monospace' }}
                  value={formData.alienPassportNumber}
                  onChange={e => { setFormData({ ...formData, alienPassportNumber: e.target.value.toUpperCase() }); setValidationErrors(prev => ({ ...prev, alienPassportNumber: '' })); }}
                  placeholder="e.g. AP-2024-00321"
                />
                {validationErrors.alienPassportNumber && <span style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', marginTop: '4px', display: 'block' }}>{validationErrors.alienPassportNumber}</span>}
              </div>
            )}

            {/* Custom Dynamic Module: Type / Sub-classification */}
            {customModule && customModule.types && customModule.types.length > 0 && (
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: customModule.color || '#10b981', fontWeight: 700 }}>
                  {customModule.title} Type *
                </label>
                <select
                  className="glass-input"
                  style={{ borderColor: customModule.color || '#10b981', fontWeight: 600 }}
                  value={formData.type || customModule.types[0]}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                >
                  {customModule.types.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom Dynamic Module: Custom Metadata Fields */}
            {customModule && customModule.customFields && customModule.customFields.length > 0 && (
              <div style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: customModule.color || '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Custom Fields ({customModule.title})
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  {customModule.customFields.map(field => (
                    <div key={field.key}>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{field.label}</label>
                      <input
                        className="glass-input"
                        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                        value={formData[field.key] || ''}
                        onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                        placeholder={`Enter ${field.label}...`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════
                🏛️ PHYSICAL ARCHIVE & SHELF LOCATION MAPPING (5 TIERS)
            ══════════════════════════════════════════════════════ */}
            <div style={{
              gridColumn: 'span 2',
              background: 'linear-gradient(135deg, rgba(15, 43, 92, 0.04) 0%, rgba(16, 185, 129, 0.04) 100%)',
              border: '1.5px solid rgba(15, 43, 92, 0.15)',
              borderRadius: '14px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.1rem' }}>🏛️</span>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Physical Archive &amp; Shelf Location Mapping
                  </h4>
                </div>
                <span style={{ fontSize: '0.72rem', background: '#dbeafe', color: '#1d4ed8', padding: '2px 10px', borderRadius: '12px', fontWeight: 700 }}>
                  Building → Room → Shelf → Box # → Folder #
                </span>
              </div>

              {/* Visual Breadcrumb Location Tag */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '6px'
              }}>
                <span style={{ color: '#64748b' }}>Location:</span>
                <span style={{ color: '#1d4ed8', background: '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>🏢 {formData.building || 'Building ...'}</span>
                <span style={{ color: '#94a3b8' }}>➔</span>
                <span style={{ color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '4px' }}>🚪 {formData.room || 'Room ...'}</span>
                <span style={{ color: '#94a3b8' }}>➔</span>
                <span style={{ color: '#d97706', background: '#fffbeb', padding: '2px 8px', borderRadius: '4px' }}>📚 {formData.shelfNumber || 'Shelf ...'}</span>
                <span style={{ color: '#94a3b8' }}>➔</span>
                <span style={{ color: '#7c3aed', background: '#f5f3ff', padding: '2px 8px', borderRadius: '4px' }}>📦 {formData.boxNumber || 'Box ...'}</span>
                <span style={{ color: '#94a3b8' }}>➔</span>
                <span style={{ color: '#dc2626', background: '#fef2f2', padding: '2px 8px', borderRadius: '4px' }}>📁 {formData.folderNumber || 'Folder ...'}</span>
              </div>

              {/* 5-tier location input grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                    1. Building / Archive Block
                  </label>
                  <input
                    className="glass-input"
                    value={formData.building}
                    onChange={e => setFormData({ ...formData, building: e.target.value })}
                    placeholder="e.g. Building A"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                    2. Room / Vault Number
                  </label>
                  <input
                    className="glass-input"
                    value={formData.room}
                    onChange={e => setFormData({ ...formData, room: e.target.value })}
                    placeholder="e.g. Room 101"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                    3. Shelf / Rack Number
                  </label>
                  <input 
                    className="glass-input" 
                    value={formData.shelfNumber} 
                    onChange={e => setFormData({ ...formData, shelfNumber: e.target.value.toUpperCase() })} 
                    placeholder="e.g. SHELF 04" 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.78rem', color: validationErrors.boxNumber ? 'var(--accent-danger)' : 'var(--text-secondary)', fontWeight: 700 }}>
                    4. Storage Box Number *
                  </label>
                  <input 
                    className="glass-input" 
                    style={{ borderColor: validationErrors.boxNumber ? 'rgba(220, 38, 38, 0.5)' : '' }}
                    value={formData.boxNumber} 
                    onChange={e => { setFormData({ ...formData, boxNumber: e.target.value.toUpperCase() }); setValidationErrors(prev => ({ ...prev, boxNumber: '' })); }} 
                    placeholder="e.g. VISA-B1-02" 
                    required 
                  />
                  {validationErrors.boxNumber && <span style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', marginTop: '4px', display: 'block' }}>{validationErrors.boxNumber}</span>}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                    5. Folder / Slot Number
                  </label>
                  <input
                    className="glass-input"
                    value={formData.folderNumber}
                    onChange={e => setFormData({ ...formData, folderNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. FOLDER 14"
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: validationErrors.personalId ? 'var(--accent-danger)' : '#1054a8', fontWeight: 600 }}>PER ID *</label>
              <input 
                className="glass-input" 
                style={{ borderColor: validationErrors.personalId ? 'rgba(220, 38, 38, 0.5)' : 'rgba(16, 84, 168, 0.3)', fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.5px' }}
                value={formData.personalId}
                inputMode="numeric"
                onChange={e => { const val = e.target.value.replace(/\D/g, ''); setFormData({ ...formData, personalId: val }); setValidationErrors(prev => ({ ...prev, personalId: '' })); }}
                placeholder="e.g. 100245" 
              />
              {validationErrors.personalId && <span style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', marginTop: '4px', display: 'block' }}>{validationErrors.personalId}</span>}
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: validationErrors.firstName ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>First Name *</label>
              <input 
                className="glass-input" 
                style={{ borderColor: validationErrors.firstName ? 'rgba(220, 38, 38, 0.5)' : '' }}
                value={formData.firstName} 
                onChange={e => { setFormData({ ...formData, firstName: e.target.value.toUpperCase() }); setValidationErrors(prev => ({ ...prev, firstName: '' })); }} 
                placeholder="e.g. JOHN" 
                required 
              />
              {validationErrors.firstName && <span style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', marginTop: '4px' }}>{validationErrors.firstName}</span>}
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Middle Name</label>
              <input 
                className="glass-input" 
                value={formData.middleName} 
                onChange={e => setFormData({ ...formData, middleName: e.target.value.toUpperCase() })} 
                placeholder="e.g. MICHAEL" 
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: validationErrors.lastName ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>Last Name *</label>
              <input 
                className="glass-input" 
                style={{ borderColor: validationErrors.lastName ? 'rgba(220, 38, 38, 0.5)' : '' }}
                value={formData.lastName} 
                onChange={e => { setFormData({ ...formData, lastName: e.target.value.toUpperCase() }); setValidationErrors(prev => ({ ...prev, lastName: '' })); }} 
                placeholder="e.g. DOE" 
                required 
              />
              {validationErrors.lastName && <span style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', marginTop: '4px' }}>{validationErrors.lastName}</span>}
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
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: validationErrors.citizenship ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>Citizenship *</label>
              <select 
                className="glass-input" 
                style={{ borderColor: validationErrors.citizenship ? 'rgba(220, 38, 38, 0.5)' : '', marginBottom: formData.citizenship && !ALL_COUNTRIES.includes(formData.citizenship) ? '10px' : '0' }}
                value={formData.citizenship && !ALL_COUNTRIES.includes(formData.citizenship) ? 'OTHER' : formData.citizenship} 
                onChange={e => {
                  const val = e.target.value;
                  if (val === 'OTHER') {
                    setFormData({ ...formData, citizenship: 'CUSTOM' });
                  } else {
                    setFormData({ ...formData, citizenship: val });
                  }
                  setValidationErrors(prev => ({ ...prev, citizenship: '' }));
                }}
              >
                <option value="">SELECT CITIZENSHIP</option>
                {ALL_COUNTRIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="OTHER">OTHER (TYPE CUSTOM)</option>
              </select>
              {validationErrors.citizenship && <span style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', marginTop: '4px', display: 'block' }}>{validationErrors.citizenship}</span>}
              
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
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: validationErrors.passportNumber ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>Passport Number {(activeTab !== 'etd' && activeTab !== 'eritrean-id') ? '*' : ''}</label>
              <input 
                className="glass-input" 
                style={{ borderColor: validationErrors.passportNumber ? 'rgba(220, 38, 38, 0.5)' : '' }}
                value={formData.passportNumber} 
                maxLength={9}
                onChange={e => { setFormData({ ...formData, passportNumber: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }); setValidationErrors(prev => ({ ...prev, passportNumber: '' })); }} 
                placeholder="e.g. EP0123456 (ICAO: 6-9 chars)" 
                required={activeTab !== 'etd'}
              />
              {validationErrors.passportNumber && <span style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', marginTop: '4px' }}>{validationErrors.passportNumber}</span>}
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
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: validationErrors.date ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>Date of Record *</label>
              <input 
                type="date"
                className="glass-input"
                style={{ borderColor: validationErrors.date ? 'rgba(220, 38, 38, 0.5)' : '' }}
                value={formData.date} 
                onChange={e => { setFormData({ ...formData, date: e.target.value }); setValidationErrors(prev => ({ ...prev, date: '' })); }}
              />
              {validationErrors.date && <span style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', marginTop: '4px', display: 'block' }}>{validationErrors.date}</span>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: validationErrors.birthdate ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>Birthdate *</label>
              <input 
                type="date"
                className="glass-input"
                style={{ borderColor: validationErrors.birthdate ? 'rgba(220, 38, 38, 0.5)' : '' }}
                value={formData.birthdate || '1990-01-01'} 
                onChange={e => { setFormData({ ...formData, birthdate: e.target.value }); setValidationErrors(prev => ({ ...prev, birthdate: '' })); }}
              />
              {validationErrors.birthdate && <span style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', marginTop: '4px', display: 'block' }}>{validationErrors.birthdate}</span>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: validationErrors.serviceProvided ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>Service Provided</label>
              <input 
                className="glass-input"
                style={{ borderColor: validationErrors.serviceProvided ? 'rgba(220, 38, 38, 0.5)' : '' }}
                value={formData.serviceProvided} 
                onChange={e => { setFormData({ ...formData, serviceProvided: e.target.value.toUpperCase() }); setValidationErrors(prev => ({ ...prev, serviceProvided: '' })); }}
                placeholder="e.g. VISA EXTENSION" 
              />
              {validationErrors.serviceProvided && <span style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', marginTop: '4px', display: 'block' }}>{validationErrors.serviceProvided}</span>}
            </div>

            </div>

          {/* Structured Document Attachments */}
          {(currentDocTypes || activeTab === 'residence-id') && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', color: validationErrors.attachments ? 'var(--accent-danger)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📎 Structured Document Attachments *
                </h4>
              </div>
              {validationErrors.attachments && <span style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', marginBottom: '12px', display: 'block' }}>{validationErrors.attachments}</span>}
              <div style={{ borderRadius: '12px', overflow: 'hidden', border: validationErrors.attachments ? '1px solid rgba(220, 38, 38, 0.5)' : '1px solid var(--border-glass)' }}>
                
                {/* Predefined Document Rows */}
                {currentDocTypes ? (
                  <>
                    {/* Header */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: '120px 1fr 180px 120px',
                      background: 'rgba(15, 43, 92, 0.05)',
                      borderBottom: '1px solid var(--border-glass)',
                      padding: '12px 16px',
                      fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px',
                      color: 'var(--text-primary)'
                    }}>
                      <span>Category</span>
                      <span>Document Type</span>
                      <span style={{ textAlign: 'center' }}>Upload Status</span>
                      <span style={{ textAlign: 'center' }}>Actions</span>
                    </div>

                    {currentDocTypes.map((doc, index) => {
                      const docAttachment = attachments.find(att => att.docType === doc.key);
                      const isMissingAndInvalid = !docAttachment && !!validationErrors.attachments;
                      return (
                        <div key={doc.key} style={{
                          display: 'grid', gridTemplateColumns: '120px 1fr 180px 120px',
                          padding: '14px 16px', alignItems: 'center',
                          borderTop: isMissingAndInvalid ? '1px solid rgba(220, 38, 38, 0.4)' : '1px solid var(--border-glass)',
                          background: isMissingAndInvalid
                            ? 'rgba(220, 38, 38, 0.04)'
                            : index % 2 === 0 ? '#ffffff' : 'rgba(15, 43, 92, 0.01)'
                        }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{doc.category}</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isMissingAndInvalid ? 'var(--accent-danger)' : 'var(--text-primary)' }}>
                            {doc.label} <span style={{ color: 'var(--accent-danger)', fontSize: '0.7rem' }}>★</span>
                          </span>
                          <span style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 'bold',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              textTransform: 'uppercase',
                              border: docAttachment ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.2)',
                              background: docAttachment ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.05)',
                              color: docAttachment ? 'var(--accent-emerald)' : 'var(--accent-danger)',
                              maxWidth: '160px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }} title={docAttachment ? docAttachment.name : 'Not Provided'}>
                              {docAttachment ? docAttachment.name : 'NOT PROVIDED'}
                            </span>
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
                                background: 'rgba(29, 78, 216, 0.1)', border: '1px solid rgba(29, 78, 216, 0.25)',
                                color: 'var(--accent-blue)', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem'
                              }}>
                                <Download size={14} />
                              </button>
                            )}
                            <button type="button" onClick={() => handlePredefinedUploadClick(doc.key, doc.label, doc.category)} title="Upload" style={{
                              width: '30px', height: '30px', borderRadius: '6px',
                              background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)',
                              color: 'var(--accent-emerald)', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem'
                            }}>
                              <Upload size={14} />
                            </button>
                            {docAttachment && (
                              <button type="button" onClick={() => setAttachments(prev => prev.filter(att => att.docType !== doc.key))} title="Remove" style={{
                                width: '30px', height: '30px', borderRadius: '6px',
                                background: 'rgba(220, 38, 38, 0.08)', border: '1px solid rgba(220, 38, 38, 0.2)',
                                color: 'var(--accent-danger)', cursor: 'pointer',
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
                    background: 'rgba(0,0,0,0.02)',
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
                  padding: '12px 16px',
                  background: 'rgba(15, 43, 92, 0.05)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderTop: '1px solid var(--border-glass)',
                  borderBottom: '1px solid var(--border-glass)'
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-primary)' }}>📎 Other Documents</span>
                  <button type="button" onClick={handleOtherUploadClick} style={{
                    padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700,
                    background: 'var(--accent-blue)', color: '#ffffff', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(29, 78, 216, 0.2)'
                  }}>+ ADD</button>
                </div>

                {/* Other Documents Header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '120px 1fr 180px 120px',
                  padding: '10px 16px', fontSize: '0.72rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)',
                  borderBottom: '1px solid var(--border-glass)',
                  background: 'rgba(15, 43, 92, 0.02)'
                }}>
                  <span>Category</span>
                  <span>Document Type</span>
                  <span style={{ textAlign: 'center' }}>Upload Status</span>
                  <span style={{ textAlign: 'center' }}>Actions</span>
                </div>

                {attachments.filter(att => !att.docType).length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', background: '#ffffff' }}>
                    NO ADDITIONAL DOCUMENTS ADDED
                  </div>
                ) : (
                  attachments.filter(att => !att.docType).map((doc, index) => (
                    <div key={doc.id} style={{
                      display: 'grid', gridTemplateColumns: '120px 1fr 180px 120px',
                      padding: '12px 16px', alignItems: 'center',
                      borderTop: '1px solid var(--border-glass)',
                      background: index % 2 === 0 ? '#ffffff' : 'rgba(15, 43, 92, 0.01)'
                    }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>OTHER</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                      <span style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 'bold',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          color: 'var(--accent-emerald)',
                          textTransform: 'uppercase'
                        }}>
                          Uploaded
                        </span>
                      </span>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button type="button" onClick={() => {
                          const a = document.createElement('a'); a.href = doc.dataUrl; a.download = doc.name; a.click();
                        }} title="Download" style={{
                          width: '30px', height: '30px', borderRadius: '6px',
                          background: 'rgba(29, 78, 216, 0.1)', border: '1px solid rgba(29, 78, 216, 0.25)',
                          color: 'var(--accent-blue)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem'
                        }}>
                          <Download size={14} />
                        </button>
                        <button type="button" onClick={() => setAttachments(prev => prev.filter(d => d.id !== doc.id))} title="Remove" style={{
                          width: '30px', height: '30px', borderRadius: '6px',
                          background: 'rgba(220, 38, 38, 0.08)', border: '1px solid rgba(220, 38, 38, 0.2)',
                          color: 'var(--accent-danger)', cursor: 'pointer',
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
            justifyContent: 'space-between', 
            alignItems: 'center',
            gap: '16px', 
            padding: '18px 32px', 
            borderTop: '1px solid var(--border-glass)',
            background: 'rgba(5, 10, 21, 0.6)',
            backdropFilter: 'blur(8px)'
          }}>
            <div>
              {Object.values(validationErrors).filter(Boolean).length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontSize: '0.86rem', fontWeight: 700 }}>
                  <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
                  <span>{Object.values(validationErrors).filter(Boolean).length} required field error{Object.values(validationErrors).filter(Boolean).length > 1 ? 's' : ''} shown above in red</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <button 
                type="button" 
                className="glass-button danger" 
                style={{ 
                  background: 'rgba(239, 68, 68, 0.12)', 
                  border: '1.5px solid #ef4444', 
                  color: '#ef4444', 
                  fontWeight: 700,
                  boxShadow: 'none',
                  padding: '10px 22px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#ef4444';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                  e.currentTarget.style.color = '#ef4444';
                }}
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
          </div>

        </form>
      </div>
    </div>
  );
}
