import { useState } from 'react';
import { X, Printer, Edit, FileText, Download, Eye, Calendar, User, CreditCard, Box, MapPin, Tag, Globe, ShieldCheck, QrCode, Sparkles, Loader2, Copy } from 'lucide-react';
import BarcodeQRModal from './BarcodeQRModal';
import { extractTextFromAttachment } from '../utils/ocrService';

export default function RecordViewModal({ isOpen, onClose, record, category, onEdit, onPrint }) {
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [selectedOcrText, setSelectedOcrText] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);

  if (!isOpen || !record) return null;

  const titleCategory = (category || record._division || '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  // Build all fields for display — filter out empty ones
  const coreFields = [
    { label: 'Full Name',           value: record.fullName,          icon: User,        bold: true },
    { label: 'Personal ID',         value: record.personalId,        icon: CreditCard,  highlight: true },
    { label: 'Passport Number',     value: record.passportNumber,    icon: ShieldCheck },
    { label: 'Sex',                 value: record.sex,               icon: User },
    { label: 'Citizenship',         value: record.citizenship,       icon: Globe },
    { label: 'Date of Record',      value: record.date,              icon: Calendar },
    { label: 'Birthdate',           value: record.birthdate,         icon: Calendar },
    { label: 'Building',            value: record.building,          icon: Box },
    { label: 'Room / Vault',        value: record.room,              icon: Box },
    { label: 'Shelf Number',        value: record.shelfNumber,       icon: MapPin },
    { label: 'Box Number',          value: record.boxNumber,         icon: Box,         bold: true },
    { label: 'Folder Number',       value: record.folderNumber,      icon: Tag },
    { label: 'Service Provided',    value: record.serviceProvided,   icon: Tag },
    { label: 'Request Number',      value: record.requestNumber,     icon: FileText },
  ].filter(f => f.value !== undefined && f.value !== null && f.value !== '');

  const categoryFields = [
    { label: 'EOID Type',              value: record.eoidType },
    { label: 'EOID Number',            value: record.eoidNumber },
    { label: 'Guardian Full Name',     value: record.guardianFullName },
    { label: 'Guardian Passport / ID', value: record.guardianPassportId },
    { label: 'Guardian Relationship',  value: record.guardianRelationship },
    { label: 'Residence ID Number',    value: record.residenceIdNumber },
    { label: 'Residence ID Type',      value: record.residenceIdType },
    { label: 'Permanent ID',           value: record.permanentId },
    { label: 'Temporary ID',           value: record.temporaryId },
    { label: 'Company Name',           value: record.companyName },
    { label: 'ETD Number',             value: record.etdNumber },
    { label: 'Eritrean ID Number',     value: record.eritreanIdNumber },
    { label: 'Alien Passport Number',  value: record.alienPassportNumber },
    { label: 'Visa Number',            value: record.visaNumber },
    { label: 'Visa Type',              value: record.visaType },
  ].filter(f => f.value !== undefined && f.value !== null && f.value !== '');

  const allFields = [...coreFields, ...categoryFields];
  const attachments = record.attachments || [];

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: '20px'
    }}>
      <div style={{
        width: 'min(800px, 95vw)',
        maxHeight: '90vh',
        background: '#ffffff',
        borderRadius: '20px',
        border: '1px solid rgba(15, 43, 92, 0.1)',
        boxShadow: '0 25px 50px -12px rgba(15, 43, 92, 0.25)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #0f2b5c 0%, #1e3a5f 100%)',
          color: '#ffffff',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div>
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1.2px',
              textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.65)'
            }}>
              {titleCategory || 'Record Details'}
            </span>
            <h3 style={{ margin: '4px 0 0 0', fontSize: '1.3rem', fontWeight: 700, color: '#ffffff' }}>
              {record.fullName || record.personalId || 'View Record'}
            </h3>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: '#ffffff',
            width: '36px', height: '36px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'background 0.2s'
          }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
             onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* 🏛️ Physical Archive Location Hierarchy Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(15, 43, 92, 0.04) 0%, rgba(16, 185, 129, 0.04) 100%)',
            border: '1.5px solid rgba(15, 43, 92, 0.15)',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#0f2b5c' }}>
                🏛️ Physical Archive Location
              </span>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Warehouse Mapping</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '0.85rem', fontWeight: 700 }}>
              <span style={{ color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '3px 9px', borderRadius: '6px' }}>🏢 {record.building || 'Building —'}</span>
              <span style={{ color: '#94a3b8' }}>➔</span>
              <span style={{ color: '#059669', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '3px 9px', borderRadius: '6px' }}>🚪 {record.room || 'Room —'}</span>
              <span style={{ color: '#94a3b8' }}>➔</span>
              <span style={{ color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', padding: '3px 9px', borderRadius: '6px' }}>📚 {record.shelfNumber || 'Shelf —'}</span>
              <span style={{ color: '#94a3b8' }}>➔</span>
              <span style={{ color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '3px 9px', borderRadius: '6px' }}>📦 {record.boxNumber || 'Box —'}</span>
              <span style={{ color: '#94a3b8' }}>➔</span>
              <span style={{ color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', padding: '3px 9px', borderRadius: '6px' }}>📁 {record.folderNumber || 'Folder —'}</span>
            </div>
          </div>

          {/* Key Details Grid — proper responsive columns */}
          <div>
            <h4 style={{
              fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)',
              textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              📄 Record Information
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '12px',
            }}>
              {allFields.map((f, idx) => (
                <div key={idx} style={{
                  padding: '12px 16px',
                  background: f.highlight ? 'rgba(29,78,216,0.04)' : '#f8fafc',
                  border: f.highlight ? '1px solid rgba(29,78,216,0.2)' : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  borderLeft: f.highlight ? '3px solid #1d4ed8' : undefined,
                }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: '4px' }}>
                    {f.label}
                  </span>
                  <div style={{
                    fontSize: '0.94rem',
                    fontWeight: f.bold || f.highlight ? 700 : 500,
                    color: f.highlight ? '#1d4ed8' : 'var(--text-primary)',
                    wordBreak: 'break-word',
                    fontFamily: (f.label.includes('ID') || f.label.includes('Number') || f.label.includes('Passport')) ? 'monospace' : 'inherit'
                  }}>
                    {f.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Attachments & Scans Section */}
          <div>
            <h4 style={{
              fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)',
              textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              Attached Documents ({attachments.length})
            </h4>

            {attachments.length === 0 ? (
              <div style={{
                padding: '24px', textAlign: 'center', background: '#f8fafc',
                borderRadius: '12px', border: '1px dashed #cbd5e1', color: 'var(--text-secondary)',
                fontSize: '0.88rem'
              }}>
                No document scans uploaded for this record.
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '14px'
              }}>
                {attachments.map((att, i) => {
                  const isImg = att.dataUrl && (att.dataUrl.startsWith('data:image') || att.type?.startsWith('image/'));
                  return (
                    <div key={i} style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      display: 'flex', flexDirection: 'column',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}>
                      <div style={{
                        height: '110px', background: '#f1f5f9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        position: 'relative', overflow: 'hidden', cursor: isImg ? 'pointer' : 'default'
                      }} onClick={() => isImg && setSelectedAttachment(att)}>
                        {isImg ? (
                          <img src={att.dataUrl} alt={att.label || att.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <FileText size={36} style={{ color: '#64748b' }} />
                        )}
                        {isImg && (
                          <div style={{
                            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: 0, transition: 'opacity 0.2s', color: '#fff'
                          }} onMouseEnter={e => e.currentTarget.style.opacity = 1}
                             onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                            <Eye size={20} />
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', truncate: 'ellipsis' }}>
                            {att.label || att.name}
                          </div>
                          {att.category && (
                            <span style={{ fontSize: '0.65rem', color: '#059669', fontWeight: 700 }}>
                              {att.category}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
                          {att.dataUrl && (
                            <a href={att.dataUrl} download={att.name || 'document'} style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              fontSize: '0.72rem', fontWeight: 600, color: '#1d4ed8', textDecoration: 'none'
                            }}>
                              <Download size={12} /> Download
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={async () => {
                              if (att.ocrText) {
                                setSelectedOcrText({ name: att.name || att.label, text: att.ocrText });
                              } else if (att.dataUrl) {
                                setOcrLoading(true);
                                try {
                                  const res = await extractTextFromAttachment(att);
                                  setSelectedOcrText({ name: att.name || att.label, text: res.fullText || 'No text detected on document.' });
                                } catch (e) {
                                  alert('OCR error: ' + e.message);
                                } finally {
                                  setOcrLoading(false);
                                }
                              }
                            }}
                            style={{
                              border: 'none', background: att.ocrText ? 'rgba(16,185,129,0.12)' : 'rgba(59,130,246,0.1)',
                              color: att.ocrText ? '#059669' : '#2563eb',
                              padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            <Sparkles size={11} /> {att.ocrText ? 'OCR Text' : 'Run OCR'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div style={{
          padding: '16px 24px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setIsBarcodeOpen(true)} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px',
              border: '1px solid rgba(15,23,42,0.25)', background: '#0f172a',
              color: '#ffffff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
            }}>
              <QrCode size={15} /> QR / Barcode Tag
            </button>
            {onPrint && (
              <button onClick={() => { onPrint(record); }} style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '8px',
                border: '1px solid rgba(16,185,129,0.35)', background: 'rgba(16,185,129,0.08)',
                color: '#059669', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
              }}>
                <Printer size={15} /> Print Card
              </button>
            )}
            {onEdit && (
              <button onClick={() => { onClose(); onEdit(record); }} style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '8px',
                border: '1px solid rgba(59,130,246,0.35)', background: 'rgba(59,130,246,0.08)',
                color: '#1d4ed8', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
              }}>
                <Edit size={15} /> Edit Record
              </button>
            )}
          </div>
          <button onClick={onClose} style={{
            padding: '8px 20px', borderRadius: '8px',
            border: '1px solid #cbd5e1', background: '#ffffff',
            color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
          }}>
            Close
          </button>
        </div>
      </div>

      {/* Barcode & QR Code Tag Modal */}
      <BarcodeQRModal
        isOpen={isBarcodeOpen}
        onClose={() => setIsBarcodeOpen(false)}
        record={record}
        category={category}
      />

      {/* Image Preview Overlay Modal */}
      {selectedAttachment && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }} onClick={() => setSelectedAttachment(null)}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <img src={selectedAttachment.dataUrl} alt="Preview" style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px' }} />
            <button onClick={() => setSelectedAttachment(null)} style={{
              position: 'absolute', top: '-16px', right: '-16px',
              background: '#ef4444', color: '#fff', border: 'none',
              borderRadius: '50%', width: '32px', height: '32px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* OCR Extracted Text Modal */}
      {selectedOcrText && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            zIndex: 3500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}
          onClick={() => setSelectedOcrText(null)}
        >
          <div
            style={{
              width: 'min(720px, 95vw)', maxHeight: '82vh', background: '#fff',
              borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} style={{ color: '#10b981' }} />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                  Extracted Document Text — {selectedOcrText.name}
                </h3>
              </div>
              <button onClick={() => setSelectedOcrText(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <textarea
              readOnly
              value={selectedOcrText.text || 'No text extracted.'}
              style={{
                width: '100%', height: '360px', padding: '14px', borderRadius: '8px',
                border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.84rem',
                lineHeight: 1.5, resize: 'none', background: '#f8fafc'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {(selectedOcrText.text || '').split(/\s+/).filter(Boolean).length} words detected
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedOcrText.text || '');
                  alert('OCR text copied to clipboard!');
                }}
                style={{
                  padding: '8px 18px', borderRadius: '8px', background: '#0f172a', color: '#fff',
                  border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <Copy size={14} /> Copy Extracted Text
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
