import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Edit2, Save, X, Settings, Package, ChevronDown, ChevronUp, Check, AlertTriangle, Loader2, Building2, MapPin, CheckCircle, XCircle, Search, Power } from 'lucide-react';
import { getSystemModules, addSystemModule, updateSystemModule, deleteSystemModule, getAllRecords, addRecord, updateRecord, deleteRecord, getSystemClassifications, saveSystemClassifications, DEFAULT_CLASSIFICATIONS, getModuleOverrides, saveModuleOverride, toggleModuleActiveStatus } from '../utils/db';
import { useBranch } from '../context/BranchContext';

const COLOR_OPTIONS = [
  { label: 'Emerald', value: '#10b981' },
  { label: 'Blue', value: '#1d4ed8' },
  { label: 'Gold', value: '#f59e0b' },
  { label: 'Red', value: '#dc2626' },
  { label: 'Purple', value: '#7c3aed' },
  { label: 'Orange', value: '#ea580c' },
];

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'checkbox', label: 'Checkbox' },
];

const EMPTY_MODULE = {
  title: '', key: '', description: '', icon: 'Package', color: '#10b981', prefix: '',
  types: [], docTypes: [],
  customFields: [], isActive: true,
};

const EMPTY_BRANCH = {
  code: '', name: '', city: '', address: '', isActive: true
};

function slugify(str) { return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''); }

function TagInput({ value = [], onChange, placeholder }) {
  const [input, setInput] = useState('');
  const handleKey = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      if (!value.includes(input.trim())) onChange([...value, input.trim()]);
      setInput('');
    }
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 10px', minHeight: '42px' }}>
      {value.map(tag => (
        <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '20px', padding: '2px 10px', fontSize: '0.78rem', fontWeight: 600 }}>
          {tag}
          <button onClick={() => onChange(value.filter(t => t !== tag))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', display: 'flex' }}><X size={11} /></button>
        </span>
      ))}
      <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} placeholder={placeholder || 'Add item and press Enter...'} style={{ border: 'none', outline: 'none', flex: 1, minWidth: '140px', background: 'transparent', fontSize: '0.85rem' }} />
    </div>
  );
}

function ModuleFormPanel({ editingModule, saving, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_MODULE, ...(editingModule || {}) });
  const [autoKey, setAutoKey] = useState(!editingModule?.key);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleTitle = (e) => { const t = e.target.value; setForm(f => ({ ...f, title: t, key: autoKey ? slugify(t) : f.key })); };
  const addField = () => set('customFields', [...(form.customFields || []), { label: '', key: '', type: 'text' }]);
  const updField = (i, field) => { const a = [...(form.customFields || [])]; a[i] = field; set('customFields', a); };
  const remField = (i) => set('customFields', (form.customFields || []).filter((_, j) => j !== i));
  const inp = (extra) => ({ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box', ...extra });
  const lbl = { fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px', textTransform: 'uppercase' };
  return (
    <div style={{ background: 'white', border: '2px solid #10b981', borderRadius: '12px', marginBottom: '24px', overflow: 'hidden' }}>
      <div style={{ padding: '18px 24px', background: 'rgba(16,185,129,0.05)', borderBottom: '1px solid rgba(16,185,129,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Package size={18} style={{ color: '#10b981' }} />
          {editingModule ? 'Edit Module: ' + editingModule.title : 'Create New Module'}
        </div>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
      </div>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div><label style={lbl}>Module Title *</label><input value={form.title} onChange={handleTitle} placeholder='e.g. Work Permit' style={inp()} /></div>
          <div>
            <label style={lbl}>URL Slug / Key * {editingModule?.isCore && '(Core Endpoint)'}</label>
            <input 
              value={form.key} 
              disabled={!!editingModule?.isCore}
              onChange={e => { setAutoKey(false); set('key', slugify(e.target.value)); }} 
              placeholder='e.g. work-permit' 
              style={inp({ 
                color: '#1d4ed8', 
                fontFamily: 'monospace',
                background: editingModule?.isCore ? '#f1f5f9' : '#ffffff',
                cursor: editingModule?.isCore ? 'not-allowed' : 'text'
              })} 
            />
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
              {editingModule?.isCore ? `Core system route: /${form.key}` : `URL: /modules/${form.key || 'your-key'}`}
            </div>
          </div>
          <div><label style={lbl}>Box Number Prefix</label><input value={form.prefix} onChange={e => set('prefix', e.target.value.toUpperCase())} placeholder='e.g. WP' style={inp()} /></div>
          <div><label style={lbl}>Description</label><input value={form.description} onChange={e => set('description', e.target.value)} placeholder='Short description...' style={inp()} /></div>
        </div>
        <div>
          <label style={lbl}>Theme Color</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {COLOR_OPTIONS.map(c => (
              <button key={c.value} onClick={() => set('color', c.value)} title={c.label} style={{ width: '32px', height: '32px', borderRadius: '50%', background: c.value, cursor: 'pointer', border: form.color === c.value ? '3px solid #000' : '2px solid transparent', position: 'relative' }}>
                {form.color === c.value && <Check size={14} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', strokeWidth: 3 }} />}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => set('isActive', !form.isActive)} style={{ width: '44px', height: '24px', borderRadius: '12px', background: form.isActive ? '#10b981' : '#cbd5e1', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
            <div style={{ position: 'absolute', top: '3px', left: form.isActive ? '22px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
          </button>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Module Active</span>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{form.isActive ? 'Visible in navigation and dashboard' : 'Hidden from users'}</span>
        </div>
        <div>
          <label style={lbl}>Record Types / Sub-classifications</label>
          <TagInput value={form.types || []} onChange={v => set('types', v)} placeholder='e.g. NORMAL, UNDER-AGE' />
        </div>
        {/* ─── Document / Attachment Types Builder ────────────────────────────── */}
        <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: 'linear-gradient(to right, #f0fdf4, #f8fafc)', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', color: '#0f172a' }}>
                Structured Document Attachments
              </span>
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                These become the required document upload slots visible inside the Add New Record form.
              </div>
            </div>
            <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '3px 9px', borderRadius: '12px', fontWeight: 700 }}>
              {(form.docTypes || []).length} items
            </span>
          </div>

          {/* Quick-Pick Presets */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#fafafa' }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Quick Add — Click to add:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[
                'Passport', 'National ID', 'Driving License', 'Birth Certificate',
                'Application Form', 'Application Letter', 'Support Letter',
                'Work Permit', 'Visa Copy', 'Residence Card',
                'Embassy Verification', 'Police Clearance', 'Medical Certificate',
                'Marriage Certificate', 'Bank Statement', 'Business License',
                'Photo (3x4)', 'Fingerprint Card'
              ].map(preset => {
                const already = (form.docTypes || []).includes(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      if (!already) set('docTypes', [...(form.docTypes || []), preset]);
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '16px',
                      border: already ? '1.5px solid #10b981' : '1.5px solid #e2e8f0',
                      background: already ? 'rgba(16,185,129,0.1)' : '#fff',
                      color: already ? '#10b981' : '#475569',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: already ? 'default' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s'
                    }}
                  >
                    {already ? <Check size={11} /> : <Plus size={11} />}
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current attachment list */}
          <div style={{ padding: '12px 16px' }}>
            {(form.docTypes || []).length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.83rem', border: '1px dashed #e2e8f0', borderRadius: '8px' }}>
                No attachment types added yet. Click the quick-add buttons above or type a custom one below.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                {(form.docTypes || []).map((doc, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 12px', background: '#f8fafc', borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <span style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: 'rgba(16,185,129,0.1)', color: '#10b981',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', fontWeight: 800, flexShrink: 0
                    }}>
                      {idx + 1}
                    </span>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>{doc}</span>
                    <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 700, background: '#fee2e2', padding: '2px 7px', borderRadius: '10px' }}>
                      Required
                    </span>
                    <button
                      type="button"
                      onClick={() => set('docTypes', (form.docTypes || []).filter((_, j) => j !== idx))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: '2px' }}
                      title="Remove this attachment"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Custom type input */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                id="custom-doctype-input"
                placeholder="Type a custom document name and press Add..."
                style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
                onKeyDown={e => {
                  if ((e.key === 'Enter' || e.key === ',') && e.target.value.trim()) {
                    e.preventDefault();
                    const val = e.target.value.trim().replace(/,$/, '');
                    if (val && !(form.docTypes || []).includes(val)) {
                      set('docTypes', [...(form.docTypes || []), val]);
                    }
                    e.target.value = '';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const inp = document.getElementById('custom-doctype-input');
                  const val = inp ? inp.value.trim() : '';
                  if (val && !(form.docTypes || []).includes(val)) {
                    set('docTypes', [...(form.docTypes || []), val]);
                    if (inp) inp.value = '';
                  }
                }}
                style={{
                  padding: '8px 16px', background: '#1054a8', color: '#fff',
                  border: 'none', borderRadius: '8px', fontWeight: 700,
                  fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: '5px'
                }}
              >
                <Plus size={14} /> Add
              </button>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '5px' }}>
              Tip: You can also press Enter or comma after typing to add quickly.
            </div>
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label style={lbl}>Custom Metadata Fields</label>
            <button onClick={addField} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '6px', padding: '5px 12px', color: '#10b981', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}><Plus size={13} /> Add Field</button>
          </div>
          {(form.customFields || []).length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '0.83rem', border: '1px dashed #e2e8f0', borderRadius: '8px' }}>No custom fields. Standard fields (Name, ID, Date) are always included.</div>
          ) : (form.customFields || []).map((field, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
              <input value={field.label} onChange={e => updField(idx, { ...field, label: e.target.value, key: slugify(e.target.value) })} placeholder='Field Label' style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.83rem' }} />
              <input value={field.key} onChange={e => updField(idx, { ...field, key: slugify(e.target.value) })} placeholder='key (auto)' style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.83rem', color: '#64748b' }} />
              <select value={field.type} onChange={e => updField(idx, { ...field, type: e.target.value })} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.83rem' }}>
                {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <button onClick={() => remField(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex' }}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
          <button 
            onClick={onCancel} 
            style={{ 
              padding: '9px 18px', 
              background: 'rgba(239, 68, 68, 0.12)', 
              border: '1.5px solid #ef4444', 
              color: '#ef4444', 
              borderRadius: '8px', 
              fontWeight: 700, 
              cursor: 'pointer' 
            }}
          >
            Cancel
          </button>
          <button onClick={() => { if (!form.title.trim() || !form.key.trim()) { alert('Title and Key are required.'); return; } onSave(form); }} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 22px', fontWeight: 700, cursor: 'pointer' }}>
            {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
            {editingModule ? 'Save Changes' : 'Create Module'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BranchFormModal({ editingBranch, saving, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_BRANCH, ...(editingBranch || {}) });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inp = (extra) => ({ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box', ...extra });
  const lbl = { fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px', textTransform: 'uppercase' };

  return (
    <div style={{ background: 'white', border: '2px solid #10b981', borderRadius: '12px', marginBottom: '24px', overflow: 'hidden' }}>
      <div style={{ padding: '18px 24px', background: 'rgba(16,185,129,0.05)', borderBottom: '1px solid rgba(16,185,129,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={18} style={{ color: '#10b981' }} />
          {editingBranch ? 'Edit Branch Station: ' + editingBranch.name : 'Add New Branch Station'}
        </div>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
      </div>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={lbl}>Branch Code *</label>
            <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder='e.g. B-HAW' style={inp({ fontFamily: 'monospace' })} />
          </div>
          <div>
            <label style={lbl}>Branch Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder='e.g. Hawassa Branch' style={inp()} />
          </div>
          <div>
            <label style={lbl}>City / Location *</label>
            <input value={form.city} onChange={e => set('city', e.target.value)} placeholder='e.g. Hawassa' style={inp()} />
          </div>
          <div>
            <label style={lbl}>Address / Area Description</label>
            <input value={form.address} onChange={e => set('address', e.target.value)} placeholder='e.g. Regional Immigration Office' style={inp()} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => set('isActive', form.isActive !== false ? false : true)} style={{ width: '44px', height: '24px', borderRadius: '12px', background: form.isActive !== false ? '#10b981' : '#cbd5e1', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
            <div style={{ position: 'absolute', top: '3px', left: form.isActive !== false ? '22px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
          </button>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Branch Active</span>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{form.isActive !== false ? 'Available for user assignment & record storage' : 'Inactive'}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
          <button 
            onClick={onCancel} 
            style={{ 
              padding: '9px 18px', 
              background: 'rgba(239, 68, 68, 0.12)', 
              border: '1.5px solid #ef4444', 
              color: '#ef4444', 
              borderRadius: '8px', 
              fontWeight: 700, 
              cursor: 'pointer' 
            }}
          >
            Cancel
          </button>
          <button onClick={() => { if (!form.name.trim()) { alert('Branch Name is required.'); return; } onSave(form); }} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 22px', fontWeight: 700, cursor: 'pointer' }}>
            {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
            {editingBranch ? 'Save Branch' : 'Add Branch'}
          </button>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_CORE_MODULES = [
  {
    id: 'core-visa',
    title: 'VISA Files',
    key: 'visa',
    url: '/visa',
    prefix: 'VISA',
    color: '#10b981',
    description: 'Entry visa files, validity periods, stay permit management, and extensions for foreign nationals.',
    isActive: true,
    isCore: true,
    types: ['Medical Treatment Visa', 'Sports Competition and Training Visa', 'Residence Visa', 'Religion Visa', 'Student Visa', 'Entertainment Industry Visa', 'Private Work Visa', 'NGO Visa-NV', 'Government Work Visa', 'Investment Visa', 'Tourist Visa', 'Workshop/Conference Visa', 'Journalist Visa'],
    docTypes: ['Passport Scan', 'Visa Endorsement', 'Application Form', 'Support Letter', 'Entry Clearance Document']
  },
  {
    id: 'core-eoid',
    title: 'Ethiopian Origin ID File',
    key: 'eoid',
    url: '/eoid',
    prefix: 'EOID',
    color: '#f59e0b',
    description: 'Yellow Card identity dossiers, biometric registrations, and renewal archives for foreign nationals of Ethiopian origin.',
    isActive: true,
    isCore: true,
    types: ['NORMAL', 'UNDER-AGE'],
    docTypes: ['Foreign Passport', 'Previous Ethiopian Passport', 'Ethiopian Origin ID', 'Birth Certificate', 'Support Letter', 'Legal Guardian Declaration']
  },
  {
    id: 'core-residence-id',
    title: 'Residence ID File',
    key: 'residence-id',
    url: '/residence-id',
    prefix: 'RES',
    color: '#3b82f6',
    description: 'Foreign resident permits, investment registrations, company sponsorships, and validity cards.',
    isActive: true,
    isCore: true,
    types: ['Permanent ID', 'Temporary ID'],
    docTypes: ['Passport Scan', 'Residence ID Card', 'Work Permit', 'Company Investment License', 'Application Form']
  },
  {
    id: 'core-residence-id-cancellation',
    title: 'Residence ID Cancellation',
    key: 'residence-id-cancellation',
    url: '/residence-id-cancellation',
    prefix: 'RES-CAN',
    color: '#dc2626',
    description: 'Surrendered, revoked, or cancelled resident identity cards and official deportation archives.',
    isActive: true,
    isCore: true,
    types: ['CANCELLATION'],
    docTypes: ['Passport Copy', 'Cancellation Application Form', 'Application Letter', 'Surrendered Resident ID']
  },
  {
    id: 'core-etd',
    title: 'Emergency Travel Document (ETD)',
    key: 'etd',
    url: '/etd',
    prefix: 'ETD',
    color: '#818cf8',
    description: 'Emergency one-way transit passes and departure approvals issued to urgent travelers.',
    isActive: true,
    isCore: true,
    types: ['EMERGENCY PASS'],
    docTypes: ['Police Lost Report', 'Embassy Verification Letter', 'ETD Form', 'Temporary Photo Pass']
  },
  {
    id: 'core-eritrean-id',
    title: 'Eritrean ID File',
    key: 'eritrean-id',
    url: '/eritrean-id',
    prefix: 'ERIT',
    color: '#8b5cf6',
    description: 'Identity verification archives, origin dossiers, and background credential tracking.',
    isActive: true,
    isCore: true,
    types: ['ERITREAN ORIGIN ID'],
    docTypes: ['Passport Scan', 'Origin Verification Form', 'Kebele ID', 'Family Dossier']
  },
  {
    id: 'core-alien-passport',
    title: 'Alien Passport File',
    key: 'alien-passport',
    url: '/alien-passport',
    prefix: 'ALN',
    color: '#0ea5e9',
    description: 'Travel document registry for stateless individuals and qualifying foreign residents.',
    isActive: true,
    isCore: true,
    types: ['STATELESS TRAVEL PASS', 'FOREIGN RESIDENT PASSPORT'],
    docTypes: ['Alien Passport Scan', 'Ministry Authorization', 'Biometric Form', 'Refugee/Stateless Certificate']
  },
  {
    id: 'core-user-management',
    title: 'User Module & Access Control',
    key: 'user-management',
    url: '/user-management',
    prefix: 'USER',
    color: '#059669',
    description: 'Staff directory, branch station assignment, fine-grained division clearance, and security provisioning.',
    isActive: true,
    isCore: true,
    types: ['ADMINISTRATOR', 'SUPERVISOR', 'FIELD OFFICER', 'AUDITOR', 'VIEWER'],
    docTypes: ['Staff ID Scan', 'Official Clearance Letter', 'Delegation Order']
  }
];

function ModuleList({
  loading,
  modules,
  onToggleActive,
  onEdit,
  onDelete,
  onAddNew
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'DISABLED'
  const [expandedId, setExpandedId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
        <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px auto', display: 'block', color: '#10b981' }} />
        <span style={{ fontWeight: 600 }}>Loading system modules and configuration...</span>
      </div>
    );
  }

  const activeCount = modules.filter(m => m.isActive !== false).length;
  const disabledCount = modules.filter(m => m.isActive === false).length;

  const filtered = modules.filter(m => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q ||
      m.title.toLowerCase().includes(q) ||
      (m.prefix && m.prefix.toLowerCase().includes(q)) ||
      (m.description && m.description.toLowerCase().includes(q)) ||
      (m.key && m.key.toLowerCase().includes(q));

    const isModActive = m.isActive !== false;
    const matchStatus = statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && isModActive) ||
      (statusFilter === 'DISABLED' && !isModActive);

    return matchSearch && matchStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Banner / Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        {/* Total Modules Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '18px 22px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(15, 43, 92, 0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'rgba(15, 43, 92, 0.06)', color: '#0f2b5c',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Package size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>
              Total Divisions
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f2b5c', lineHeight: 1.1 }}>
              {modules.length}
            </div>
          </div>
        </div>

        {/* Active Modules Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '18px 22px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(15, 43, 92, 0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.1)', color: '#059669',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>
              Active in Navigation
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#059669', lineHeight: 1.1 }}>
              {activeCount}
            </div>
          </div>
        </div>

        {/* Disabled Modules Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '18px 22px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(15, 43, 92, 0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.08)', color: '#dc2626',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <XCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>
              Deactivated / Hidden
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: disabledCount > 0 ? '#dc2626' : '#64748b', lineHeight: 1.1 }}>
              {disabledCount}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        background: '#ffffff',
        borderRadius: '12px',
        padding: '12px 18px',
        border: '1px solid #e2e8f0'
      }}>
        {/* Search */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '6px 12px',
          flex: '1 1 260px',
          maxWidth: '360px'
        }}>
          <Search size={16} color="#64748b" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search module by name, prefix, or keyword..."
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '0.84rem',
              color: '#0f172a',
              width: '100%'
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <X size={14} color="#94a3b8" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {[
            { key: 'ALL', label: `All (${modules.length})` },
            { key: 'ACTIVE', label: `Active (${activeCount})` },
            { key: 'DISABLED', label: `Disabled (${disabledCount})` }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: '1px solid',
                borderColor: statusFilter === f.key ? '#0f2b5c' : '#e2e8f0',
                background: statusFilter === f.key ? '#0f2b5c' : '#f8fafc',
                color: statusFilter === f.key ? '#ffffff' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Modules Cards List */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 20px',
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px dashed #cbd5e1',
          color: '#64748b'
        }}>
          <Package size={36} style={{ opacity: 0.3, margin: '0 auto 8px auto', display: 'block' }} />
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f2b5c' }}>No modules match your filter</div>
          <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>Try clearing your search query or reset the filter</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map(mod => {
            const isExpanded = expandedId === mod.id;
            const isModActive = mod.isActive !== false;
            const subTypesCount = (mod.types || []).length;
            const docTypesCount = (mod.docTypes || []).length;

            return (
              <div
                key={mod.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  borderLeft: `5px solid ${mod.color || '#10b981'}`,
                  boxShadow: '0 2px 8px rgba(15, 43, 92, 0.03)',
                  overflow: 'hidden',
                  opacity: isModActive ? 1 : 0.68,
                  transition: 'all 0.2s'
                }}
              >
                {/* Main Card Content */}
                <div style={{
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}>
                  {/* Left: Icon & Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 340px' }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: `${mod.color || '#10b981'}15`,
                      color: mod.color || '#10b981',
                      border: `1px solid ${mod.color || '#10b981'}30`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Package size={22} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f2b5c' }}>
                          {mod.title}
                        </span>

                        {mod.prefix && (
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe'
                          }}>
                            {mod.prefix}
                          </span>
                        )}

                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: isModActive ? '#dcfce7' : '#f1f5f9',
                          color: isModActive ? '#15803d' : '#64748b',
                          border: `1px solid ${isModActive ? '#86efac' : '#cbd5e1'}`
                        }}>
                          {isModActive ? '● Active' : '○ Disabled'}
                        </span>

                        {!mod.isCore && (
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '2px 7px',
                            borderRadius: '6px',
                            background: '#f3e8ff',
                            color: '#7c3aed'
                          }}>
                            CUSTOM
                          </span>
                        )}
                      </div>

                      {mod.description && (
                        <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '3px', lineHeight: 1.4 }}>
                          {mod.description}
                        </div>
                      )}

                      {/* Metadata Chips */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          color: '#475569',
                          background: '#f1f5f9',
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          🏷️ {subTypesCount} Sub-type{subTypesCount === 1 ? '' : 's'}
                        </span>
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          color: '#475569',
                          background: '#f1f5f9',
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          📎 {docTypesCount} Attachment slot{docTypesCount === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions & Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Active/Inactive Switch Button */}
                    <button
                      type="button"
                      onClick={() => onToggleActive(mod)}
                      title={isModActive ? 'Click to deactivate module' : 'Click to activate module'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: '1px solid',
                        borderColor: isModActive ? '#86efac' : '#cbd5e1',
                        background: isModActive ? '#dcfce7' : '#f8fafc',
                        color: isModActive ? '#15803d' : '#64748b',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      {isModActive ? <CheckCircle size={14} /> : <XCircle size={14} />}
                      {isModActive ? 'Active' : 'Disabled'}
                    </button>

                    {/* Configure Button */}
                    <button
                      type="button"
                      onClick={() => onEdit(mod)}
                      title="Configure sub-types, document attachments, and prefixes"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0f2b5c',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      <Edit2 size={13} /> Configure
                    </button>

                    {/* Open Division Link */}
                    <a
                      href={mod.url || `/modules/${mod.key}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        color: '#0f2b5c',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        textDecoration: 'none'
                      }}
                    >
                      Open →
                    </a>

                    {/* Delete (Custom only) */}
                    {!mod.isCore && (
                      confirmDelete === mod.id ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fee2e2', padding: '3px 8px', borderRadius: '6px', border: '1px solid #fecaca' }}>
                          <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 700 }}>Confirm?</span>
                          <button onClick={() => onDelete(mod.id)} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', padding: '3px 8px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}>Yes</button>
                          <button onClick={() => setConfirmDelete(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', padding: '3px 6px', fontSize: '0.72rem', cursor: 'pointer' }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(mod.id)} title="Delete Module" style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fee2e2', color: '#dc2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                          <Trash2 size={13} />
                        </button>
                      )
                    )}

                    {/* Expand Details */}
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : mod.id)}
                      title={isExpanded ? 'Collapse specifications' : 'Expand specifications'}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748b',
                        padding: '4px',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                    >
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Specifications Drawer */}
                {isExpanded && (
                  <div style={{
                    padding: '16px 20px',
                    background: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '20px',
                    fontSize: '0.82rem'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f2b5c', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.5px', marginBottom: '8px' }}>
                        Record Sub-types &amp; Classifications ({subTypesCount})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {(mod.types || []).length === 0 ? (
                          <span style={{ color: '#94a3b8' }}>None specified</span>
                        ) : (
                          mod.types.map(t => (
                            <span key={t} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 8px', fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
                              {t}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontWeight: 700, color: '#0f2b5c', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.5px', marginBottom: '8px' }}>
                        Required Document Attachment Slots ({docTypesCount})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {(mod.docTypes || []).length === 0 ? (
                          <span style={{ color: '#94a3b8' }}>No required attachments</span>
                        ) : (
                          mod.docTypes.map(d => (
                            <span key={d} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 8px', fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
                              📎 {d}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SystemConfiguration() {
  const [activeTab, setActiveTab] = useState('modules'); // 'modules' | 'branches'
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  
  // Branch management state
  const { branches: contextBranches, refreshBranches } = useBranch();
  const [allBranches, setAllBranches] = useState([]);  // Load ALL branches (active + inactive)
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Classification & Visa Types State
  const [classifications, setClassifications] = useState(DEFAULT_CLASSIFICATIONS);
  const [newVisaTypeInput, setNewVisaTypeInput] = useState('');
  const [editingVisaType, setEditingVisaType] = useState(null); // { index, value }
  const [newResTypeInput, setNewResTypeInput] = useState('');
  const [newEtdKeyInput, setNewEtdKeyInput] = useState('');
  const [newEtdLabelInput, setNewEtdLabelInput] = useState('');

  // Load all branches (including inactive) for admin management - Define BEFORE useEffect
  const loadAllBranches = useCallback(async () => {
    try {
      const records = await getAllRecords('branches');
      setAllBranches(records || []);
    } catch (e) {
      console.error('Error loading branches:', e);
      setAllBranches([]);
    }
  }, []);

  const [moduleOverrides, setModuleOverrides] = useState(getModuleOverrides());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const customMods = (await getSystemModules()) || [];
      const overrides = getModuleOverrides();
      setModuleOverrides(overrides);
      setModules(customMods);
    } catch (e) {
      setError('Failed to load: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const allConfiguredModules = useMemo(() => {
    const overrides = moduleOverrides || {};
    const coreList = DEFAULT_CORE_MODULES.map(m => {
      const o = overrides[m.key] || {};
      return {
        ...m,
        ...o,
        types: o.types || m.types,
        docTypes: o.docTypes || m.docTypes,
        prefix: o.prefix || m.prefix,
        description: o.description || m.description,
        isActive: o.isActive !== undefined ? o.isActive : m.isActive,
        isCore: true
      };
    });

    const customList = (modules || []).map(m => {
      const o = overrides[m.key] || {};
      return {
        ...m,
        ...o,
        types: o.types || m.types,
        docTypes: o.docTypes || m.docTypes,
        prefix: o.prefix || m.prefix,
        isActive: o.isActive !== undefined ? o.isActive : m.isActive,
        isCore: false
      };
    });

    return [...coreList, ...customList];
  }, [modules, moduleOverrides]);

  const loadClassifications = useCallback(async () => {
    try {
      const data = await getSystemClassifications();
      // Ensure any legacy typo 'STUDET VISA' or case-duplicates are cleaned up
      const seen = new Set();
      const cleanedVisaTypes = [];
      for (const t of (data.visaTypes || [])) {
        if (!t || typeof t !== 'string') continue;
        const trimmed = t.trim();
        const norm = trimmed.toUpperCase();
        if (norm === 'STUDET VISA') continue;
        if (!seen.has(norm)) {
          seen.add(norm);
          cleanedVisaTypes.push(trimmed);
        }
      }

      if (cleanedVisaTypes.length !== (data.visaTypes || []).length) {
        const cleaned = { ...data, visaTypes: cleanedVisaTypes };
        await saveSystemClassifications(cleaned);
        setClassifications(cleaned);
      } else {
        setClassifications(data);
      }
    } catch (e) {
      console.warn('Error loading classifications:', e);
    }
  }, []);

  useEffect(() => { load(); loadAllBranches(); loadClassifications(); }, [load, loadAllBranches, loadClassifications]);

  const notify = (msg, isError = false) => {
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 4000);
  };

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (editingModule?.isCore) {
        saveModuleOverride(editingModule.key, form);
        window.dispatchEvent(new Event('ics_modules_changed'));
        notify(`Configuration for module '${form.title || editingModule.title}' updated successfully!`);
      } else if (editingModule) {
        await updateSystemModule(editingModule.id, form);
        window.dispatchEvent(new Event('ics_modules_changed'));
        notify(`Custom module '${form.title}' updated!`);
      } else {
        await addSystemModule(form);
        window.dispatchEvent(new Event('ics_modules_changed'));
        notify(`New module '${form.title}' registered! Now visible in sidebar and dashboard.`);
      }
      setShowForm(false);
      setEditingModule(null);
      await load();
    } catch (e) {
      notify('Error: ' + e.message, true);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleModuleActive = async (mod) => {
    try {
      const nextActive = mod.isActive === false ? true : false;
      if (mod.isCore) {
        toggleModuleActiveStatus(mod.key, nextActive);
      } else {
        await updateSystemModule(mod.id, { ...mod, isActive: nextActive });
      }
      window.dispatchEvent(new Event('ics_modules_changed'));
      notify(`Module '${mod.title}' is now ${nextActive ? 'Active' : 'Disabled'}.`);
      await load();
    } catch (e) {
      notify('Error changing module status: ' + e.message, true);
    }
  };

  const handleDelete = async (id) => {
    try { await deleteSystemModule(id); setConfirmDelete(null); notify('Module deleted.'); await load(); }
    catch (e) { notify('Error: ' + e.message, true); }
  };

  const handleSaveBranch = async (form) => {
    setSaving(true);
    try {
      if (editingBranch) {
        await updateRecord('branches', { ...editingBranch, ...form });
        notify('Branch updated successfully!');
      } else {
        await addRecord('branches', { ...form, createdAt: new Date().toISOString() });
        notify('New Branch station registered successfully!');
      }
      setShowBranchForm(false);
      setEditingBranch(null);
      // Reload all branches to reflect the change
      await loadAllBranches();
      if (refreshBranches) await refreshBranches();
    } catch (e) {
      notify('Error saving branch: ' + e.message, true);
    } finally {
      setSaving(false);
    }
  };

  const handleAddVisaType = async () => {
    if (!newVisaTypeInput.trim()) return;
    const trimmed = newVisaTypeInput.trim();
    if (classifications.visaTypes.some(t => t.trim().toUpperCase() === trimmed.toUpperCase())) {
      notify('This Visa Type already exists!', true);
      return;
    }
    const updated = {
      ...classifications,
      visaTypes: [...classifications.visaTypes, trimmed]
    };
    await saveSystemClassifications(updated);
    setClassifications(updated);
    setNewVisaTypeInput('');
    notify(`Added "${trimmed}" to official Visa Types!`);
  };

  const handleSaveEditVisaType = async (index) => {
    if (!editingVisaType || !editingVisaType.value.trim()) return;
    const trimmed = editingVisaType.value.trim();
    const isDup = classifications.visaTypes.some((t, i) => i !== index && t.trim().toUpperCase() === trimmed.toUpperCase());
    if (isDup) {
      notify('Another Visa Type already has this name!', true);
      return;
    }
    const updatedTypes = [...classifications.visaTypes];
    updatedTypes[index] = trimmed;
    const updated = {
      ...classifications,
      visaTypes: updatedTypes
    };
    await saveSystemClassifications(updated);
    setClassifications(updated);
    setEditingVisaType(null);
    notify(`Updated Visa Type to "${trimmed}"!`);
  };

  const handleRemoveVisaType = async (typeToRemove) => {
    if (classifications.visaTypes.length <= 1) {
      notify('At least one Visa Type must remain configured.', true);
      return;
    }
    const updated = {
      ...classifications,
      visaTypes: classifications.visaTypes.filter(t => t !== typeToRemove)
    };
    await saveSystemClassifications(updated);
    setClassifications(updated);
    notify(`Removed "${typeToRemove}" from Visa Types.`);
  };

  const handleResetVisaTypes = async () => {
    if (window.confirm('Reset Visa Types to Ethiopia standard official categories?')) {
      const updated = {
        ...classifications,
        visaTypes: DEFAULT_CLASSIFICATIONS.visaTypes
      };
      await saveSystemClassifications(updated);
      setClassifications(updated);
      notify('Reset Visa Types to official defaults.');
    }
  };

  const handleAddResType = async () => {
    if (!newResTypeInput.trim()) return;
    const trimmed = newResTypeInput.trim();
    const key = trimmed.toUpperCase().replace(/\s+/g, '_');
    if (classifications.residenceTypes.some(r => r.key === key)) {
      notify('This Residence ID Type already exists!', true);
      return;
    }
    const updated = {
      ...classifications,
      residenceTypes: [...classifications.residenceTypes, { key, label: trimmed }]
    };
    await saveSystemClassifications(updated);
    setClassifications(updated);
    setNewResTypeInput('');
    notify(`Added "${trimmed}" Residence ID Type!`);
  };

  const handleRemoveResType = async (keyToRemove) => {
    const updated = {
      ...classifications,
      residenceTypes: classifications.residenceTypes.filter(r => r.key !== keyToRemove)
    };
    await saveSystemClassifications(updated);
    setClassifications(updated);
    notify('Removed Residence ID Type.');
  };

  const handleAddEtdType = async () => {
    if (!newEtdKeyInput.trim() || !newEtdLabelInput.trim()) {
      notify('Please enter both ETD Code and Label', true);
      return;
    }
    const key = newEtdKeyInput.trim().toUpperCase();
    const label = newEtdLabelInput.trim();
    if (classifications.etdTypes.some(e => e.key === key)) {
      notify('This ETD Document Type already exists!', true);
      return;
    }
    const updated = {
      ...classifications,
      etdTypes: [...classifications.etdTypes, { key, label: `${key} — ${label}` }]
    };
    await saveSystemClassifications(updated);
    setClassifications(updated);
    setNewEtdKeyInput('');
    setNewEtdLabelInput('');
    notify(`Added ETD Type "${key}"!`);
  };

  const handleRemoveEtdType = async (keyToRemove) => {
    const updated = {
      ...classifications,
      etdTypes: classifications.etdTypes.filter(e => e.key !== keyToRemove)
    };
    await saveSystemClassifications(updated);
    setClassifications(updated);
    notify('Removed ETD Document Type.');
  };

  const handleToggleBranchStatus = async (branch) => {
    try {
      const newStatus = branch.isActive !== false ? false : true;
      await updateRecord('branches', { ...branch, isActive: newStatus });
      notify(`Branch ${branch.name} is now ${newStatus ? 'Active' : 'Inactive'}.`);
      // Reload all branches to reflect the change
      await loadAllBranches();
      if (refreshBranches) await refreshBranches();
    } catch (e) {
      notify('Error updating branch: ' + e.message, true);
    }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg,#0f172a,#1e3a5f)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Settings size={20} style={{ color: '#fff' }} />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>System Configuration</h1>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>Manage custom document modules, regional branch stations, and system-wide parameters.</p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {activeTab === 'modules' && !showForm && (
            <button onClick={() => { setShowForm(true); setEditingModule(null); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 20px', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <Plus size={16} /> New Module
            </button>
          )}
          {activeTab === 'branches' && !showBranchForm && (
            <button onClick={() => { setShowBranchForm(true); setEditingBranch(null); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 20px', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <Plus size={16} /> Add Branch Station
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('modules')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'modules' ? '2.5px solid #10b981' : '2.5px solid transparent',
            background: 'transparent',
            color: activeTab === 'modules' ? '#10b981' : '#64748b',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Package size={17} /> File Modules ({allConfiguredModules.length})
        </button>
        <button
          onClick={() => setActiveTab('classifications')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'classifications' ? '2.5px solid #10b981' : '2.5px solid transparent',
            background: 'transparent',
            color: activeTab === 'classifications' ? '#10b981' : '#64748b',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Settings size={17} /> Visa &amp; Classification Types ({classifications.visaTypes.length + classifications.residenceTypes.length + classifications.etdTypes.length})
        </button>
        <button
          onClick={() => setActiveTab('branches')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'branches' ? '2.5px solid #10b981' : '2.5px solid transparent',
            background: 'transparent',
            color: activeTab === 'branches' ? '#10b981' : '#64748b',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Building2 size={17} /> Regional Branches & Stations ({allBranches.length})
        </button>
      </div>

      {error && <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#dc2626', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={16} /> {error}</div>}
      {success && <div style={{ background: '#d1fae5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#059669', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} /> {success}</div>}

      {/* Tab 1: Modules */}
      {activeTab === 'modules' && (
        <>
          {showForm && <ModuleFormPanel editingModule={editingModule} saving={saving} onSave={handleSave} onCancel={() => { setShowForm(false); setEditingModule(null); }} />}
          <ModuleList
            loading={loading}
            modules={allConfiguredModules}
            onToggleActive={handleToggleModuleActive}
            onEdit={(mod) => { setEditingModule(mod); setShowForm(true); }}
            onDelete={handleDelete}
            onAddNew={() => { setEditingModule(null); setShowForm(true); }}
          />
        </>
      )}

      
      {/* Tab 3: Dynamic Classifications & Visa Types */}
      {activeTab === 'classifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card 1: Official Ethiopian Visa Types */}
          <div className="glass-panel" style={{ padding: '24px', background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🛂</span>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    Ethiopian Visa Types &amp; Classifications ({classifications.visaTypes.length})
                  </h3>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  These visa categories dynamically populate entry forms, search filters, and immigration statistics. Add new categories at any time without modifying source code.
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetVisaTypes}
                style={{
                  padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1',
                  background: '#f8fafc', color: '#475569', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Reset to Standard Ethiopia Types
              </button>
            </div>

            {/* Quick Add Visa Type */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                value={newVisaTypeInput}
                onChange={e => setNewVisaTypeInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddVisaType(); }}
                placeholder="Type new Visa category name (e.g. Humanitarian Emergency Visa, Diplomatic Visa)..."
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem', outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={handleAddVisaType}
                style={{
                  padding: '10px 20px', borderRadius: '8px', background: '#10b981', color: '#fff',
                  border: 'none', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <Plus size={16} /> Add Visa Type
              </button>
            </div>

            {/* Visa Types Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
              {classifications.visaTypes.map((vt, i) => {
                const isEditing = editingVisaType && editingVisaType.index === i;
                return (
                  <div
                    key={vt + '-' + i}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', background: isEditing ? '#eff6ff' : '#f8fafc',
                      border: isEditing ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                      borderRadius: '8px', gap: '8px'
                    }}
                  >
                    {isEditing ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                        <input
                          autoFocus
                          value={editingVisaType.value}
                          onChange={e => setEditingVisaType({ index: i, value: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveEditVisaType(i);
                            if (e.key === 'Escape') setEditingVisaType(null);
                          }}
                          style={{
                            flex: 1, padding: '5px 8px', borderRadius: '5px',
                            border: '1px solid #3b82f6', fontSize: '0.84rem', outline: 'none'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditVisaType(i)}
                          title="Save change"
                          style={{
                            padding: '5px 8px', background: '#10b981', color: '#fff',
                            border: 'none', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center'
                          }}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingVisaType(null)}
                          title="Cancel edit"
                          style={{
                            padding: '5px 8px', background: '#e2e8f0', color: '#475569',
                            border: 'none', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center'
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', width: '22px', flexShrink: 0 }}>{i + 1}.</span>
                          <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f2b5c', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={vt}>
                            {vt}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => setEditingVisaType({ index: i, value: vt })}
                            title="Edit / Rename visa type"
                            style={{
                              background: 'none', border: 'none', color: '#0284c7',
                              cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center'
                            }}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveVisaType(vt)}
                            title="Remove category"
                            style={{
                              background: 'none', border: 'none', color: '#dc2626',
                              cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 2: Residence ID & ETD Types */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* Residence Types */}
            <div className="glass-panel" style={{ padding: '20px', background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>🪪</span>
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                  Residence ID Types
                </h4>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  value={newResTypeInput}
                  onChange={e => setNewResTypeInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddResType(); }}
                  placeholder="New Residence ID type..."
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
                <button
                  type="button"
                  onClick={handleAddResType}
                  style={{ padding: '8px 14px', borderRadius: '6px', background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  <Plus size={14} /> Add
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {classifications.residenceTypes.map(rt => (
                  <div key={rt.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1e3a5f' }}>{rt.label}</span>
                    <button onClick={() => handleRemoveResType(rt.key)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ETD Document Types */}
            <div className="glass-panel" style={{ padding: '20px', background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>📄</span>
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                  Emergency Travel Document (ETD) Types
                </h4>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  value={newEtdKeyInput}
                  onChange={e => setNewEtdKeyInput(e.target.value.toUpperCase())}
                  placeholder="Code (e.g. AU)"
                  style={{ width: '80px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontFamily: 'monospace' }}
                />
                <input
                  value={newEtdLabelInput}
                  onChange={e => setNewEtdLabelInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddEtdType(); }}
                  placeholder="Full agency / document name..."
                  style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
                <button
                  type="button"
                  onClick={handleAddEtdType}
                  style={{ padding: '8px 14px', borderRadius: '6px', background: '#8b5cf6', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  <Plus size={14} /> Add
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {classifications.etdTypes.map(et => (
                  <div key={et.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#5b21b6' }}>{et.label}</span>
                    <button onClick={() => handleRemoveEtdType(et.key)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Tab 2: Branches */}
      {activeTab === 'branches' && (
        <>
          {showBranchForm && <BranchFormModal editingBranch={editingBranch} saving={saving} onSave={handleSaveBranch} onCancel={() => { setShowBranchForm(false); setEditingBranch(null); }} />}
          
          <div className="glass-panel" style={{ padding: '24px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>Code</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>Branch Station Name</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>City / Location</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allBranches.map(b => (
                  <tr key={b.id || b.code || b.name} style={{ borderBottom: '1px solid #f1f5f9', opacity: b.isActive !== false ? 1 : 0.7 }}>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 700, color: b.isActive !== false ? '#3b82f6' : '#94a3b8', fontSize: '0.85rem' }}>
                      {b.code || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: b.isActive !== false ? '#0f172a' : '#64748b', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={15} style={{ color: b.isActive !== false ? '#10b981' : '#cbd5e1' }} />
                        {b.name}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: b.isActive !== false ? '#475569' : '#94a3b8', fontSize: '0.85rem' }}>
                      {b.city || '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {b.isActive !== false ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, background: '#dcfce7', color: '#15803d' }}>
                          <CheckCircle size={12} /> ACTIVE
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, background: '#fee2e2', color: '#b91c1c' }}>
                          <XCircle size={12} /> INACTIVE
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => { setEditingBranch(b); setShowBranchForm(true); }}
                          style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff', color: '#334155', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                        <button
                          onClick={() => handleToggleBranchStatus(b)}
                          style={{
                            padding: '6px 12px',
                            border: `1px solid ${b.isActive !== false ? '#fee2e2' : '#dcfce7'}`,
                            borderRadius: '6px',
                            background: '#fff',
                            color: b.isActive !== false ? '#dc2626' : '#15803d',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {b.isActive !== false ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}