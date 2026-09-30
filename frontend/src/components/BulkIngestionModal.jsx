import { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText, CheckCircle, AlertTriangle, Loader2, Sparkles, Trash2, ChevronDown, ChevronUp, ArrowRight, MapPin } from 'lucide-react';
import { extractTextFromAttachment, extractEntitiesFromText } from '../utils/ocrService';
import { addRecord, getAllRecords, logAuditEntry } from '../utils/db';

function normalizeOcrDate(value) {
  if (!value) return '';
  const parts = value.replace(/\//g, '-').split('-');
  if (parts.length !== 3) return '';
  if (parts[0].length === 4) return parts.join('-');
  if (parts[2].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return '';
}

function splitFullName(value) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    middleName: parts.length > 2 ? parts.slice(1, -1).join(' ') : '',
    lastName: parts.length > 1 ? parts[parts.length - 1] : '',
  };
}

function composeFullName(item) {
  return [item?.firstName, item?.middleName, item?.lastName].filter(Boolean).join(' ').trim();
}

function deriveApplicantNameFromFilename(filename, index = 1) {
  if (!filename) return { firstName: '', middleName: '', lastName: '' };
  let clean = filename.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
  
  // Check if filename is a machine/camera/generic file title (e.g. "images (1)", "scan01", "IMG_2024", "passport")
  const genericPattern = /^(images?|imgs?|photos?|pictures?|scans?|scanned|docs?|documents?|files?|attachments?|pages?|untitled|screenshots?|downloads?|whatsapp|camera|dsc|pxl|passports?|visas?|eoids?|etds?|residence)(\s*[\(_\-\[]\s*\d+\s*[\)_\-\]]|\s*\d+)*$/i;
  if (genericPattern.test(clean)) {
    return { firstName: '', middleName: '', lastName: '' };
  }

  // Remove leading generic descriptor words if followed by real names (e.g. "Passport John Doe" -> "John Doe")
  clean = clean.replace(/^(new|scan|scanned|photo|image|images|img|document|doc|thumb|passport|visa|eoid)\s+/i, '').trim();
  
  // Remove trailing numbers or parentheses like (1), (2), _01
  clean = clean.replace(/\s*[\(_\-\[]\s*\d+\s*[\)_\-\]]\s*$/, '').trim();

  const tokens = clean.split(/\s+/).filter(Boolean);
  if (!tokens.length || (tokens.length === 1 && /^\d+$/.test(tokens[0])) || genericPattern.test(clean)) {
    return { firstName: '', middleName: '', lastName: '' };
  }
  if (tokens.length === 1) {
    return { firstName: tokens[0].toUpperCase(), middleName: '', lastName: '' };
  }
  return {
    firstName: tokens[0].toUpperCase(),
    middleName: tokens.length > 2 ? tokens.slice(1, -1).join(' ').toUpperCase() : '',
    lastName: tokens[tokens.length - 1].toUpperCase()
  };
}

const BULK_DOCUMENT_TYPES = {
  visa: [
    { key: 'passportCopy', label: 'PASSPORT COPY' },
    { key: 'applicantLetter', label: 'APPLICANT LETTER' },
    { key: 'applicationForm', label: 'APPLICATION FORM' },
    { key: 'entryVisa', label: 'ENTRY VISA' },
  ],
  eoid: [
    { key: 'passportCopy', label: 'PASSPORT COPY' },
    { key: 'applicationForm', label: 'APPLICATION FORM' },
    { key: 'birthCertificate', label: 'BIRTH CERTIFICATE' },
    { key: 'familyOrCourtDoc', label: 'FAMILY DOCUMENT OR COURT LETTER' },
  ],
  'eoid-normal': [
    { key: 'passportCopy', label: 'PASSPORT COPY' },
    { key: 'applicationForm', label: 'APPLICATION FORM' },
    { key: 'birthCertificate', label: 'BIRTH CERTIFICATE' },
    { key: 'familyOrCourtDoc', label: 'FAMILY DOCUMENT OR COURT LETTER' },
  ],
  'eoid-underage': [
    { key: 'passportCopy', label: 'PASSPORT COPY' },
    { key: 'applicationForm', label: 'APPLICATION FORM' },
    { key: 'birthCertificate', label: 'BIRTH CERTIFICATE' },
    { key: 'familyOrCourtDoc', label: 'FAMILY DOCUMENT OR COURT LETTER' },
  ],
  'residence-id': [
    { key: 'passportCopy', label: 'PASSPORT COPY' },
    { key: 'applicationForm', label: 'APPLICATION FORM' },
    { key: 'authorizedBodyDecision', label: 'AUTHORIZED BODY DECISION' },
    { key: 'validityPeriod', label: 'VALIDITY PERIOD' },
  ],
  'residence-id-cancellation': [
    { key: 'passport', label: 'PASSPORT' },
    { key: 'applicationForm', label: 'APPLICATION FORM' },
    { key: 'applicationLetter', label: 'APPLICATION LETTER' },
    { key: 'previousId', label: 'PREVIOUS ID' },
  ],
  'eritrean-id': [
    { key: 'applicationForm', label: 'APPLICATION FORM' },
    { key: 'applicationLetter', label: 'APPLICATION LETTER' },
    { key: 'previousId', label: 'PREVIOUS ID' },
  ],
  'alien-passport': [
    { key: 'eritreanId', label: 'ERITREAN ID' },
    { key: 'applicationForm', label: 'APPLICATION FORM' },
    { key: 'applicationLetter', label: 'APPLICATION LETTER' },
  ],
  etd: [
    { key: 'applicationLetter', label: 'APPLICATION LETTER' },
    { key: 'applicationForm', label: 'APPLICATION FORM' },
    { key: 'supportingDocument', label: 'SUPPORTING DOCUMENT' },
  ],
};

function classifyBulkDocument(category, file, ocrText, extracted) {
  const filename = (file?.name || '').toUpperCase().replace(/[_-]+/g, ' ');
  const text = (ocrText || '').toUpperCase();
  const source = `${filename} ${text}`;
  if (category === 'visa') return classifyVisaDocument(file, ocrText, extracted);

  if (category === 'eoid' || category === 'eoid-normal' || category === 'eoid-underage') {
    if (/PASSPORT|PASSEPORT|MRZ/.test(source) || extracted?.passportNumber) return 'passportCopy';
    if (/BIRTH CERTIFICATE|BIRTH|NASCIMENTO|ACTE DE NAISSANCE/.test(source)) return 'birthCertificate';
    if (/COURT|FAMILY|MARRIAGE|GUARDIAN|LEGAL|DIVORCE/.test(source)) return 'familyOrCourtDoc';
    if (/APPLICATION FORM|APPLICATION|DEMANDE/.test(source)) return 'applicationForm';
    return null;
  }

  if (category === 'residence-id') {
    if (/PASSPORT|PASSEPORT|MRZ/.test(source) || extracted?.passportNumber) return 'passportCopy';
    if (/AUTHORIZED BODY|AUTHORITY DECISION|APPROVAL|DECISION/.test(source)) return 'authorizedBodyDecision';
    if (/VALIDITY PERIOD|VALIDITY|EXPIRY|EXPIRATION/.test(source)) return 'validityPeriod';
    if (/APPLICATION FORM|APPLICATION/.test(source)) return 'applicationForm';
    return null;
  }

  if (category === 'residence-id-cancellation') {
    if (/PASSPORT|PASSEPORT|MRZ/.test(source) || extracted?.passportNumber) return 'passport';
    if (/APPLICATION LETTER|INVITATION LETTER|COVER LETTER/.test(source)) return 'applicationLetter';
    if (/APPLICATION FORM|APPLICATION/.test(source)) return 'applicationForm';
    if (/PREVIOUS ID|OLD ID|OLD CARD/.test(source)) return 'previousId';
    return null;
  }

  if (category === 'eritrean-id') {
    if (/APPLICATION LETTER|INVITATION LETTER|COVER LETTER/.test(source)) return 'applicationLetter';
    if (/APPLICATION FORM|APPLICATION/.test(source)) return 'applicationForm';
    if (/PREVIOUS ID|OLD ID|OLD CARD/.test(source)) return 'previousId';
    return null;
  }

  if (category === 'alien-passport') {
    if (/ERITREAN ID|ERITREA ID|NATIONAL ID/.test(source)) return 'eritreanId';
    if (/APPLICATION LETTER|INVITATION LETTER|COVER LETTER/.test(source)) return 'applicationLetter';
    if (/APPLICATION FORM|APPLICATION/.test(source)) return 'applicationForm';
    if (/ERITREAN|ERITREA/.test(source)) return 'eritreanId';
    return null;
  }

  if (category === 'etd') {
    if (/APPLICATION LETTER|INVITATION LETTER|COVER LETTER/.test(source)) return 'applicationLetter';
    if (/APPLICATION FORM|APPLICATION/.test(source)) return 'applicationForm';
    if (/SUPPORTING|SUPPORT DOCUMENT/.test(source)) return 'supportingDocument';
    return null;
  }

  if (BULK_DOCUMENT_TYPES[category]) {
    if (/PASSPORT|PASSEPORT|MRZ/.test(source) || extracted?.passportNumber) return 'passportCopy';
    if (/PREVIOUS ID|OLD ID|OLD CARD/.test(source)) return 'previousId';
    if (/APPLICATION LETTER|INVITATION LETTER|COVER LETTER/.test(source)) return 'applicationLetter';
    if (/APPLICATION FORM|APPLICATION/.test(source)) return 'applicationForm';
    if (/SUPPORTING|SUPPORT DOCUMENT/.test(source)) return 'supportingDocument';
  }
  return null;
}

function classifyVisaDocument(file, ocrText, extracted) {
  const filename = (file?.name || '').toUpperCase().replace(/[_-]+/g, ' ');
  const text = (ocrText || '').toUpperCase();
  const source = `${filename} ${text}`;
  if (/APPLICANT LETTER|APPLICATION LETTER|INVITATION LETTER|COVER LETTER/.test(source)) {
    return 'applicantLetter';
  }
  if (/APPLICATION FORM/.test(source) || /APPLICATION\s+(?:FORM|FORMS)/.test(filename)) {
    return 'applicationForm';
  }
  if (/ENTRY VISA|VISA STICKER/.test(source)) {
    return 'entryVisa';
  }
  if (/PASSPORT|PASSEPORT|MRZ/.test(source) || extracted?.passportNumber && /CANADA|NATIONALITY|DATE OF BIRTH/.test(text)) {
    return 'passportCopy';
  }
  if (/APPLICATION/.test(source)) {
    return 'applicationForm';
  }
  if (/VISA/.test(source)) {
    return 'entryVisa';
  }
  return null;
}

function visaDossierKey(item) {
  const passport = item.passportNumber?.trim().toUpperCase();
  if (passport) return `passport:${passport}`;
  const name = composeFullName(item).trim().toUpperCase();
  if (name) return `name:${name}`;
  return `file:${(item.file?.name || item.id).replace(/[^A-Z0-9]/gi, '').toUpperCase()}`;
}

function mergeDossiers(items) {
  const dossiers = new Map();
  items.forEach(item => {
    const key = visaDossierKey(item);
    const existing = dossiers.get(key);
    if (!existing) {
      dossiers.set(key, {
        ...item,
        attachments: [{ ...item.attachment, docType: item.bulkDocumentType || 'other' }],
        sourceFiles: [item.file?.name].filter(Boolean),
      });
      return;
    }
    const merged = { ...existing };
    ['fullName', 'firstName', 'middleName', 'lastName', 'passportNumber', 'personalId', 'citizenship', 'sex', 'birthdate'].forEach(field => {
      if (!merged[field] && item[field]) merged[field] = item[field];
    });
    merged.attachments = [...existing.attachments, { ...item.attachment, docType: item.bulkDocumentType || 'other' }];
    merged.sourceFiles = [...existing.sourceFiles, item.file?.name].filter(Boolean);
    merged.ocrText = [existing.ocrText, item.ocrText].filter(Boolean).join('\n\n');
    merged.ocrWordCount = merged.ocrText.split(/\s+/).filter(Boolean).length;
    dossiers.set(key, merged);
  });
  return [...dossiers.values()];
}

function getBoxPrefix(category) {
  const prefixes = {
    visa: 'VISA-B1',
    eoid: 'EOID-B1',
    'eoid-normal': 'EOID-B1',
    'eoid-underage': 'EOID-B1',
    'residence-id': 'RES-B1',
    'residence-id-cancellation': 'RESCAN-B1',
    etd: 'ETD-B1',
    'eritrean-id': 'ERID-B1',
    'alien-passport': 'ALIEN-B1'
  };
  return prefixes[category] || `${(category || 'FILE').toUpperCase().replace(/-/g, '').slice(0, 6)}-B1`;
}

export default function BulkIngestionModal({ isOpen, onClose, category, customModule, onComplete }) {
  const [queue, setQueue] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState({ percent: 0, text: '' });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedOcrText, setSelectedOcrText] = useState(null);
  const [batchLocation, setBatchLocation] = useState({
    building: 'Archive Block A',
    room: 'Room 101',
    shelfNumber: 'SHELF 01',
    boxPrefix: getBoxPrefix(category),
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setBatchLocation(prev => ({ ...prev, boxPrefix: getBoxPrefix(category) }));
    }
  }, [isOpen, category]);

  if (!isOpen) return null;

  const divTitle = (customModule?.title || (category || '').replace(/-/g, ' ')).replace(/\b\w/g, c => c.toUpperCase());

  const handleClose = () => {
    if (saving || processing) return;
    setQueue([]);
    setExpandedId(null);
    setSelectedOcrText(null);
    setCurrentProgress({ percent: 0, text: '' });
    setBatchLocation({
      building: 'Archive Block A',
      room: 'Room 101',
      shelfNumber: 'SHELF 01',
      boxPrefix: getBoxPrefix(category),
    });
    onClose();
  };

  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setProcessing(true);
    const newItems = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setCurrentProgress({ percent: Math.round((i / files.length) * 100), text: `Reading ${file.name} (${i + 1}/${files.length})...` });

      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.readAsDataURL(file);
      });

      const attachment = {
        name: file.name,
        type: file.type || 'application/pdf',
        size: file.size,
        dataUrl,
        uploadedAt: new Date().toISOString(),
        docType: file.type.includes('pdf') ? 'Dossier PDF' : 'Document Scan'
      };

      setCurrentProgress({ percent: Math.round(((i + 0.1) / files.length) * 100), text: `Running OCR on ${file.name}...` });
      let ocrResult = { fullText: '', pages: [] };
      try {
        const timeout = new Promise(resolve => setTimeout(() => resolve({ fullText: '', pages: [], error: 'OCR timed out' }), 45000));
        ocrResult = await Promise.race([
          extractTextFromAttachment(attachment, (progress, message) => {
            setCurrentProgress({
              percent: Math.round(((i + (progress / 100 * 0.8)) / files.length) * 100),
              text: message || `Running OCR on ${file.name}...`
            });
          }),
          timeout
        ]);
      } catch (err) {
        console.warn('OCR error:', file.name, err);
      }

      const extracted = extractEntitiesFromText(ocrResult.fullText || '');
      attachment.ocrText = ocrResult.fullText || '';
      const bulkDocumentType = classifyBulkDocument(category, file, attachment.ocrText, extracted);
      const qLen = queue.length;
      let nameParts = extracted.firstName || extracted.lastName
        ? {
            firstName: extracted.firstName || '',
            middleName: extracted.middleName || '',
            lastName: extracted.lastName || '',
          }
        : splitFullName(extracted.fullName || '');

      if (!nameParts.firstName?.trim() && !nameParts.lastName?.trim()) {
        nameParts = deriveApplicantNameFromFilename(file.name, qLen + i + 1);
      }

      newItems.push({
        id: `queue-${Date.now()}-${i}`,
        file,
        attachment,
        bulkDocumentType,
        fullName: composeFullName(nameParts) || extracted.fullName || '',
        ...nameParts,
        passportNumber: extracted.passportNumber || '',
        personalId: extracted.personalId || `ID-${Date.now().toString().slice(-6)}-${String(qLen + i + 1).padStart(2, '0')}`,
        citizenship: extracted.citizenship || '',
        sex: extracted.sex || 'FEMALE',
        date: normalizeOcrDate(extracted.date) || new Date().toISOString().split('T')[0],
        birthdate: normalizeOcrDate(extracted.birthdate) || '1990-01-01',
        serviceProvided: 'LEGACY ARCHIVE INGESTION',
        building: batchLocation.building,
        room: batchLocation.room,
        shelfNumber: extracted.shelfNumber || batchLocation.shelfNumber,
        boxNumber: extracted.boxNumber || `${batchLocation.boxPrefix}-${String(qLen + i + 1).padStart(2, '0')}`,
        folderNumber: `FOLDER ${String(qLen + i + 1).padStart(2, '0')}`,
        ocrWordCount: (ocrResult.fullText || '').split(/\s+/).filter(Boolean).length,
        ocrText: ocrResult.fullText || '',
        status: ocrResult.fullText ? 'ready' : 'no-ocr',
      });
    }

    const preparedItems = BULK_DOCUMENT_TYPES[category] ? mergeDossiers(newItems) : newItems;
    setQueue(prev => BULK_DOCUMENT_TYPES[category] ? mergeDossiers([...prev, ...preparedItems]) : [...prev, ...preparedItems]);
    setProcessing(false);
    setCurrentProgress({ percent: 100, text: 'Done' });
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (newItems.length > 0) setExpandedId(newItems[0].id);
  };

  const handleUpdateItem = (id, field, value) =>
    setQueue(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (['firstName', 'middleName', 'lastName'].includes(field)) {
        updated.fullName = composeFullName(updated).toUpperCase();
      }
      if (field === 'fullName') Object.assign(updated, splitFullName(value));
      return updated;
    }));

  const handleRemoveItem = (id) =>
    setQueue(prev => prev.filter(item => item.id !== id));

  const handleAttachmentUpload = (itemId, documentType) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.onchange = async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      const dataUrl = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = loadEvent => resolve(loadEvent.target.result);
        reader.readAsDataURL(file);
      });
      const attachment = {
        id: `bulk-att-${Date.now()}`,
        name: file.name,
        type: file.type || 'application/pdf',
        size: file.size,
        dataUrl,
        docType: documentType,
        uploadedAt: new Date().toISOString(),
      };
      try {
        const ocrResult = await extractTextFromAttachment(attachment);
        attachment.ocrText = ocrResult?.fullText || '';
        attachment.ocrPages = ocrResult?.pages || [];
      } catch (err) {
        console.warn('Additional attachment OCR notice:', err);
      }
      setQueue(prev => prev.map(item => {
        if (item.id !== itemId) return item;
        const attachments = (item.attachments || []).filter(att => att.docType !== documentType);
        const updatedOcrText = [item.ocrText, attachment.ocrText].filter(Boolean).join('\n\n');
        return {
          ...item,
          attachments: [...attachments, attachment],
          ocrText: updatedOcrText,
          ocrWordCount: updatedOcrText.split(/\s+/).filter(Boolean).length,
        };
      }));
    };
    input.click();
  };

  const handleApplyBatchLocation = () =>
    setQueue(prev => prev.map((item, idx) => ({
      ...item,
      building: batchLocation.building,
      room: batchLocation.room,
      shelfNumber: batchLocation.shelfNumber,
      boxNumber: `${batchLocation.boxPrefix}-${String(idx + 1).padStart(2, '0')}`,
      folderNumber: `FOLDER ${String(idx + 1).padStart(2, '0')}`
    })));

  const handleAutoFillNames = () => {
    setQueue(prev => prev.map((item, idx) => {
      const hasName = item.firstName?.trim() && item.lastName?.trim();
      if (hasName) return item;
      const derived = deriveApplicantNameFromFilename(item.file?.name, idx + 1);
      const updated = {
        ...item,
        firstName: item.firstName?.trim() || derived.firstName,
        middleName: item.middleName?.trim() || derived.middleName,
        lastName: item.lastName?.trim() || derived.lastName,
      };
      updated.fullName = composeFullName(updated);
      return updated;
    }));
  };

  const handleIngestAll = async () => {
    if (!queue.length) return;

    // Gracefully auto-populate any missing required fields
    const itemsToProcess = queue.map((item, idx) => {
      let first = item.firstName?.trim();
      let mid = item.middleName?.trim();
      let last = item.lastName?.trim();
      if (!first && !last) {
        const derived = deriveApplicantNameFromFilename(item.file?.name, idx + 1);
        first = derived.firstName;
        mid = derived.middleName;
        last = derived.lastName;
      } else if (!first) {
        first = 'APPLICANT';
      } else if (!last) {
        last = 'DOSSIER';
      }

      return {
        ...item,
        firstName: first,
        middleName: mid || '',
        lastName: last,
        fullName: composeFullName({ firstName: first, middleName: mid, lastName: last }),
        personalId: item.personalId?.trim() || `ID-${Date.now().toString().slice(-6)}-${String(idx + 1).padStart(2, '0')}`,
        boxNumber: item.boxNumber?.trim() || `${batchLocation.boxPrefix}-${String(idx + 1).padStart(2, '0')}`,
        date: item.date || new Date().toISOString().split('T')[0],
        birthdate: item.birthdate || '1990-01-01',
      };
    });
    setQueue(itemsToProcess);

    const normalizePassport = value => String(value ?? '').trim().toUpperCase();
    const normalizedPassports = queue
      .map(item => normalizePassport(item.passportNumber))
      .filter(Boolean);
    const duplicateInQueue = normalizedPassports.find((passport, index) => normalizedPassports.indexOf(passport) !== index);
    if (duplicateInQueue) {
      alert(`Duplicate record blocked: Passport Number "${duplicateInQueue}" appears more than once in this batch.`);
      return;
    }

    try {
      const existingRecords = await getAllRecords(category);
      const existingPassports = new Set(
        existingRecords.map(record => normalizePassport(record.passportNumber)).filter(Boolean)
      );
      const duplicateExisting = normalizedPassports.find(passport => existingPassports.has(passport));
      if (duplicateExisting) {
        alert(`Duplicate record blocked: Passport Number "${duplicateExisting}" already exists in this module.`);
        return;
      }
    } catch (err) {
      console.error('Duplicate check failed:', err);
      alert('Unable to verify duplicates. The batch was not ingested. Please try again.');
      return;
    }

    setSaving(true);
    try {
      const user = JSON.parse(localStorage.getItem('ics_auth_user') || '{}');
      let successCount = 0;
      for (let i = 0; i < itemsToProcess.length; i++) {
        const item = itemsToProcess[i];
        const attachments = BULK_DOCUMENT_TYPES[category]
          ? item.attachments
          : [{ ...item.attachment, ocrText: item.ocrText || '' }];
        const isUnderage = category === 'eoid-underage';
        const isEoid = category === 'eoid' || category === 'eoid-normal' || category === 'eoid-underage';
        const record = {
          fullName: composeFullName(item).toUpperCase(),
          firstName: item.firstName?.trim().toUpperCase() || '',
          middleName: item.middleName?.trim().toUpperCase() || '',
          lastName: item.lastName?.trim().toUpperCase() || '',
          personalId: item.personalId?.trim() || '',
          passportNumber: item.passportNumber?.trim().toUpperCase() || '',
          citizenship: item.citizenship?.trim().toUpperCase() || '',
          sex: item.sex || '',
          date: item.date,
          birthdate: item.birthdate,
          serviceProvided: item.serviceProvided?.trim() || 'LEGACY ARCHIVE INGESTION',
          building: item.building,
          room: item.room,
          shelfNumber: item.shelfNumber,
          boxNumber: item.boxNumber,
          folderNumber: item.folderNumber,
          branch: user?.branch || 'Head Office (Addis Ababa)',
          attachments,
          attachmentStatus: category === 'visa' ? 'LEGACY_ARCHIVE_PENDING' : 'UPLOADED',
          ocrText: item.ocrText || '',
          createdBy: user?.username || 'admin',
          createdAt: new Date().toISOString(),
          ...(isEoid ? { eoidType: isUnderage ? 'EOID-UNDER-AGE' : 'EOID-NORMAL' } : {})
        };
        await addRecord(category, record);
        successCount++;
      }

      await logAuditEntry({
        action: 'BULK_INGESTION',
        storeName: category || 'files',
        details: `Bulk ingested ${successCount} records with OCR into ${divTitle}`,
        performedBy: user?.fullName || user?.username || 'admin',
        recordData: { count: successCount, division: divTitle }
      }).catch(() => {});
      setQueue([]);
      if (onComplete) onComplete();
      onClose();
    } catch (err) {
      console.error('Bulk ingestion error:', err);
      alert('Error during bulk ingestion: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const inp = (extra = {}) => ({
    width: '100%', padding: '8px 12px', borderRadius: '7px', border: '1px solid #cbd5e1',
    fontSize: '0.88rem', background: '#ffffff', color: '#0f172a', boxSizing: 'border-box', ...extra
  });
  const lbl = { fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 3000, padding: '20px', overflowY: 'auto'
    }}>
      <div style={{
        width: 'min(980px, 98vw)', background: '#ffffff', borderRadius: '20px',
        border: '1px solid rgba(15,43,92,0.12)', boxShadow: '0 25px 60px rgba(15,43,92,0.25)',
        display: 'flex', flexDirection: 'column', marginTop: '12px', marginBottom: '20px'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 26px', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
          color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderRadius: '20px 20px 0 0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <Sparkles size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Legacy Archive Digitization Suite</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>Bulk Document Ingestion &amp; Fast OCR Indexer</div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                Target Division: <strong style={{ color: '#10b981' }}>{divTitle}</strong> · Automated OCR &amp; Physical Shelf Tagging
              </div>
            </div>
          </div>
          <button onClick={handleClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{ border: '2.5px dashed #cbd5e1', borderRadius: '14px', padding: '32px 20px', textAlign: 'center', cursor: 'pointer', background: '#f8fafc', transition: 'all 0.2s' }}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.background = '#f0fdf4'; }}
            onDragLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
            onDrop={e => {
              e.preventDefault(); e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc';
              if (e.dataTransfer.files.length) handleFilesSelected({ target: { files: e.dataTransfer.files, value: '' } });
            }}
          >
            <Upload size={36} style={{ color: '#94a3b8', marginBottom: '10px' }} />
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#334155' }}>Drop Scanned PDF Dossiers or Legacy Image Files Here</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px' }}>Upload 10, 20, or 50 files simultaneously · OCR extracts and pre-fills applicant data</div>
            <div style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 20px', borderRadius: '8px', background: '#0f172a', color: '#fff', fontSize: '0.85rem', fontWeight: 700 }}>
              <Upload size={15} /> Browse Files
            </div>
            <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFilesSelected} />
          </div>

          {/* Progress Bar */}
          {processing && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: '#10b981' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>{currentProgress.text}</span>
              </div>
              <div style={{ background: '#e2e8f0', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg, #10b981, #059669)', borderRadius: '999px', width: `${currentProgress.percent}%`, transition: 'width 0.3s' }} />
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', textAlign: 'right' }}>{currentProgress.percent}%</div>
            </div>
          )}

          {/* Batch Location */}
          {queue.length > 0 && (
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.82rem', color: '#0369a1', textTransform: 'uppercase' }}>
                  <MapPin size={15} /> Fast Batch Archive Location Applicator
                </div>
                <button type="button" onClick={handleApplyBatchLocation} style={{ padding: '6px 14px', borderRadius: '6px', background: '#0f172a', color: '#fff', border: 'none', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ArrowRight size={14} /> Apply to All ({queue.length}) Files
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                {[{ key: 'building', label: 'Building' }, { key: 'room', label: 'Room / Vault' }, { key: 'shelfNumber', label: 'Shelf Number' }, { key: 'boxPrefix', label: 'Box Prefix' }].map(f => (
                  <div key={f.key}>
                    <label style={lbl}>{f.label}</label>
                    <input value={batchLocation[f.key]} onChange={e => setBatchLocation({ ...batchLocation, [f.key]: e.target.value.toUpperCase() })} style={inp()} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Record Cards */}
          {queue.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a' }}>Queued Ingestion Records ({queue.length})</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleAutoFillNames}
                    style={{
                      padding: '4px 10px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      color: '#059669',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    ⚡ Auto-fill Names from Filenames
                  </button>
                  <button type="button" onClick={() => setQueue([])} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>Clear Queue</button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {queue.map((item, idx) => {
                  const isExpanded = expandedId === item.id;
                  const isMissingName = !item.firstName?.trim() || !item.lastName?.trim();
                  const isMissingBox = !item.boxNumber?.trim();
                  const hasError = isMissingName || isMissingBox;
                  return (
                    <div key={item.id} style={{ border: hasError ? '1.5px solid #fca5a5' : '1px solid #e2e8f0', borderRadius: '12px', background: hasError ? '#fff5f5' : '#ffffff', overflow: 'hidden' }}>
                      {/* Summary row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', background: hasError ? '#fff1f1' : '#f8fafc' }} onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', minWidth: '22px' }}>{idx + 1}.</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isMissingName ? '#dc2626' : '#0f172a' }}>
                              {composeFullName(item) || item.fullName?.trim() || '⚠ Applicant name required — click to fill'}
                            </span>
                            {item.passportNumber && <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', background: '#eff6ff', color: '#1d4ed8', padding: '1px 7px', borderRadius: '4px', fontWeight: 700 }}>{item.passportNumber}</span>}
                            {item.personalId && <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', background: '#f0fdf4', color: '#15803d', padding: '1px 7px', borderRadius: '4px', fontWeight: 700 }}>ID: {item.personalId}</span>}
                            {item.boxNumber && <span style={{ fontSize: '0.75rem', background: '#faf5ff', color: '#7c3aed', padding: '1px 7px', borderRadius: '4px', fontWeight: 700 }}>📦 {item.boxNumber}</span>}
                            {item.ocrWordCount > 0 && <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '1px 7px', borderRadius: '4px', fontWeight: 700 }}>📄 {item.ocrWordCount} OCR words</span>}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>{item.file.name} · {Math.round(item.file.size / 1024)} KB</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <button type="button" onClick={e => { e.stopPropagation(); handleRemoveItem(item.id); }} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trash2 size={13} />
                          </button>
                          {isExpanded ? <ChevronUp size={16} style={{ color: '#64748b' }} /> : <ChevronDown size={16} style={{ color: '#64748b' }} />}
                        </div>
                      </div>

                      {/* Expanded form */}
                      {isExpanded && (
                        <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                          {/* Applicant Info */}
                          <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px solid #e2e8f0' }}>👤 Applicant Information</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                              <div>
                                <label style={{ ...lbl, color: isMissingName ? '#dc2626' : '#475569' }}>First Name * {isMissingName && '← Required'}</label>
                                <input value={item.firstName} onChange={e => handleUpdateItem(item.id, 'firstName', e.target.value.toUpperCase())} style={inp({ borderColor: isMissingName ? '#fca5a5' : '#cbd5e1', fontWeight: 700 })} placeholder="e.g. SARAH" />
                              </div>
                              <div>
                                <label style={lbl}>Middle Name</label>
                                <input value={item.middleName} onChange={e => handleUpdateItem(item.id, 'middleName', e.target.value.toUpperCase())} style={inp()} placeholder="e.g. MARIA" />
                              </div>
                              <div>
                                <label style={{ ...lbl, color: isMissingName ? '#dc2626' : '#475569' }}>Last Name * {isMissingName && '← Required'}</label>
                                <input value={item.lastName} onChange={e => handleUpdateItem(item.id, 'lastName', e.target.value.toUpperCase())} style={inp({ borderColor: isMissingName ? '#fca5a5' : '#cbd5e1', fontWeight: 700 })} placeholder="e.g. MARTIN" />
                              </div>
                              <div>
                                <label style={lbl}>Passport Number</label>
                                <input value={item.passportNumber} onChange={e => handleUpdateItem(item.id, 'passportNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} style={inp({ fontFamily: 'monospace' })} placeholder="e.g. EP1234567" />
                              </div>
                              <div>
                                <label style={lbl}>Personal ID</label>
                                <input value={item.personalId} onChange={e => handleUpdateItem(item.id, 'personalId', e.target.value)} style={inp({ fontFamily: 'monospace' })} placeholder="e.g. 100245" />
                              </div>
                              <div>
                                <label style={lbl}>Citizenship / Nationality</label>
                                <input value={item.citizenship} onChange={e => handleUpdateItem(item.id, 'citizenship', e.target.value.toUpperCase())} style={inp()} placeholder="e.g. ETHIOPIAN" />
                              </div>
                              <div>
                                <label style={lbl}>Sex</label>
                                <select value={item.sex} onChange={e => handleUpdateItem(item.id, 'sex', e.target.value)} style={inp()}>
                                  <option value="MALE">Male</option>
                                  <option value="FEMALE">Female</option>
                                </select>
                              </div>
                              <div>
                                <label style={lbl}>Date of Record *</label>
                                <input type="date" value={item.date} onChange={e => handleUpdateItem(item.id, 'date', e.target.value)} style={inp()} required />
                              </div>
                              <div>
                                <label style={lbl}>Birthdate *</label>
                                <input type="date" value={item.birthdate} onChange={e => handleUpdateItem(item.id, 'birthdate', e.target.value)} style={inp()} required />
                              </div>
                              <div style={{ gridColumn: 'span 2' }}>
                                <label style={lbl}>Service Provided</label>
                                <input value={item.serviceProvided} onChange={e => handleUpdateItem(item.id, 'serviceProvided', e.target.value.toUpperCase())} style={inp()} placeholder="e.g. VISA ISSUANCE" />
                              </div>
                            </div>
                          </div>

                          {/* Physical Location */}
                          <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px solid #e2e8f0' }}>📦 Physical Archive Location</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '12px' }}>
                              <div>
                                <label style={lbl}>Building</label>
                                <input value={item.building} onChange={e => handleUpdateItem(item.id, 'building', e.target.value)} style={inp()} />
                              </div>
                              <div>
                                <label style={lbl}>Room / Vault</label>
                                <input value={item.room} onChange={e => handleUpdateItem(item.id, 'room', e.target.value)} style={inp()} />
                              </div>
                              <div>
                                <label style={lbl}>Shelf No.</label>
                                <input value={item.shelfNumber} onChange={e => handleUpdateItem(item.id, 'shelfNumber', e.target.value.toUpperCase())} style={inp({ fontFamily: 'monospace' })} />
                              </div>
                              <div>
                                <label style={{ ...lbl, color: isMissingBox ? '#dc2626' : '#475569' }}>Box No. * {isMissingBox && '← Required'}</label>
                                <input value={item.boxNumber} onChange={e => handleUpdateItem(item.id, 'boxNumber', e.target.value.toUpperCase())} style={inp({ fontFamily: 'monospace', fontWeight: 700, borderColor: isMissingBox ? '#fca5a5' : '#cbd5e1' })} />
                              </div>
                              <div>
                                <label style={lbl}>Folder No.</label>
                                <input value={item.folderNumber} onChange={e => handleUpdateItem(item.id, 'folderNumber', e.target.value.toUpperCase())} style={inp({ fontFamily: 'monospace' })} />
                              </div>
                            </div>
                          </div>

                          {/* OCR Preview */}
                          {item.ocrText ? (
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <label style={{ ...lbl, color: '#15803d' }}>📄 Extracted OCR Text ({item.ocrWordCount} words)</label>
                                <button type="button" onClick={() => setSelectedOcrText({ name: item.file.name, text: item.ocrText })} style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>View Full Text</button>
                              </div>
                              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.76rem', color: '#166534', lineHeight: 1.5, maxHeight: '80px', overflow: 'hidden' }}>
                                {item.ocrText.slice(0, 400)}{item.ocrText.length > 400 ? '…' : ''}
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#f59e0b', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '8px 12px' }}>
                              <AlertTriangle size={14} /> No OCR text extracted from this file. Fill in applicant details manually above.
                            </div>
                          )}

                          {BULK_DOCUMENT_TYPES[category] && (
                            <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden', background: '#f8fafc' }}>
                              <div style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>
                                Attachments for this record
                              </div>
                              <div style={{ padding: '10px 12px', display: 'grid', gap: '8px' }}>
                                {BULK_DOCUMENT_TYPES[category].map(documentType => {
                                  const attachment = (item.attachments || []).find(att => att.docType === documentType.key);
                                  return (
                                    <div key={documentType.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '8px 10px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '7px' }}>
                                      <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>{documentType.label}</div>
                                        <div style={{ fontSize: '0.68rem', color: attachment ? '#15803d' : '#dc2626', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {attachment ? `Uploaded: ${attachment.name}` : 'Not uploaded'}
                                        </div>
                                      </div>
                                      <button type="button" onClick={() => handleAttachmentUpload(item.id, documentType.key)} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0, padding: '6px 10px', borderRadius: '6px', border: '1px solid #86efac', background: '#f0fdf4', color: '#15803d', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                                        <Upload size={13} /> {attachment ? 'Replace' : 'Upload'}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!processing && queue.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.85rem' }}>
              No files queued yet. Drop PDFs or images above to begin.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 26px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '0 0 20px 20px' }}>
          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
            {queue.length > 0 ? `${queue.length} file(s) ready for instant archiving` : 'No files queued'}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={handleClose} disabled={saving || processing} style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: 700, cursor: saving || processing ? 'not-allowed' : 'pointer' }}>Cancel</button>
            <button
              type="button"
              disabled={!queue.length || saving || processing}
              onClick={handleIngestAll}
              style={{ padding: '9px 24px', borderRadius: '8px', border: 'none', background: !queue.length || saving || processing ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', fontWeight: 700, cursor: !queue.length || saving || processing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
            >
              {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={16} />}
              Ingest &amp; Index All ({queue.length} Records)
            </button>
          </div>
        </div>
      </div>

      {/* OCR Text Overlay */}
      {selectedOcrText && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setSelectedOcrText(null)}>
          <div style={{ width: 'min(700px, 95vw)', maxHeight: '80vh', background: '#fff', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>OCR Full Text — {selectedOcrText.name}</h3>
              <button onClick={() => setSelectedOcrText(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <textarea readOnly value={selectedOcrText.text || 'No text extracted.'} style={{ width: '100%', flex: 1, minHeight: '300px', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.82rem', lineHeight: 1.5, resize: 'vertical' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => { navigator.clipboard.writeText(selectedOcrText.text || ''); alert('Copied!'); }} style={{ padding: '8px 16px', borderRadius: '8px', background: '#0f172a', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Copy OCR Text</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
