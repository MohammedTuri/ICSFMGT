import { useState, useEffect } from 'react';
import { X, Printer, Copy, Check } from 'lucide-react';

// Code 128 character set B
const CODE128_B = [
  ' ','!','"','#','$','%','&',"'",'(',')','*','+',',','-','.','/',
  '0','1','2','3','4','5','6','7','8','9',':',';','<','=','>','?',
  '@','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O',
  'P','Q','R','S','T','U','V','W','X','Y','Z','[','\\\\',']','^','_',
  '`','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o',
  'p','q','r','s','t','u','v','w','x','y','z','{','|','}','~',
];

const C128PAT = [
  '11011001100','11001101100','11001100110','10010011000','10010001100',
  '10001001100','10011001000','10011000100','10001100100','11001001000',
  '11001000100','11000100100','10110011100','10011011100','10011001110',
  '10111001100','10011101100','10011100110','11001110010','11001011100',
  '11001001110','11011100100','11001110100','11101101110','11101001100',
  '11100101100','11100100110','11101100100','11100110100','11100110010',
  '11011011000','11011000110','11000110110','10100011000','10001011000',
  '10001000110','10110001000','10001101000','10001100010','11010001000',
  '11000101000','11000100010','10110111000','10110001110','10001101110',
  '10111011000','10111000110','10001110110','11101110110','11010001110',
  '11000101110','11011101000','11011100010','11011101110','11101011000',
  '11101000110','11100010110','11101101000','11101100010','11100011010',
  '11101111010','11001000010','11110001010','10100110000','10100001100',
  '10010110000','10010000110','10000101100','10000100110','10110010000',
  '10110000100','10011010000','10011000010','10000110100','10000110010',
  '11000010010','11001010000','11110111010','11000010100','10001111010',
  '10100111100','10010111100','10010011110','10111100100','10011110100',
  '10011110010','11110100100','11110010100','11110010010','11011011110',
  '11011110110','11110110110','10101111000','10100011110','10001011110',
  '10111101000','10111100010','11110101000','11110100010','10111011110',
  '10111101110','11101011110','11110101110','11010000100','11010010000',
  '11010011100','1100011101011',
];


function encodeC128(text) {
  const safe = text.replace(/[^\x20-\x7E]/g, ' ');
  const vals = [104]; // START_B = 104
  for (let i = 0; i < safe.length; i++) {
    const idx = CODE128_B.indexOf(safe[i]);
    vals.push(idx >= 0 ? idx : 0);
  }
  let cs = 104;
  for (let i = 1; i < vals.length; i++) cs += vals[i] * i;
  vals.push(cs % 103);
  vals.push(106); // STOP
  return vals.reduce((bits, v) => bits + (C128PAT[v] || ''), '') + '0000000000';
}

function buildBarSVGStr(value, mw, barH) {
  const bits = encodeC128(value);
  const qz = Math.max(10, mw * 8);
  const bw = bits.length * mw + qz * 2;
  const th = 18;
  let bars = '';
  let bx = qz;
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') bars += `<rect x="${bx}" y="0" width="${mw}" height="${barH}" fill="#000"/>`;
    bx += mw;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${bw}" height="${barH + th + 4}" viewBox="0 0 ${bw} ${barH + th + 4}" style="display:block;max-width:100%"><rect x="0" y="0" width="${bw}" height="${barH + th + 4}" fill="white"/>${bars}<text x="${bw / 2}" y="${barH + th}" text-anchor="middle" font-size="11" font-family="'Courier New',Courier,monospace" font-weight="600" fill="#000" letter-spacing="1.5">${value}</text></svg>`;
  return { svg, bw, bh: barH + th + 4 };
}

function BarcodeSVG({ value, height = 68 }) {
  if (!value) return null;
  const bits = encodeC128(value);
  const mw = 2, qz = 20, th = 18;
  const bw = bits.length * mw + qz * 2;
  const totalH = height + th + 4;
  const rects = [];
  let bx = qz;
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') rects.push(<rect key={i} x={bx} y={0} width={mw} height={height} fill="#000" />);
    bx += mw;
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={bw} height={totalH}
      viewBox={`0 0 ${bw} ${totalH}`} style={{ display: 'block', maxWidth: '100%' }}>
      <rect x={0} y={0} width={bw} height={totalH} fill="white" />
      {rects}
      <text x={bw / 2} y={height + th} textAnchor="middle" fontSize="11"
        fontFamily="'Courier New', Courier, monospace" fontWeight="600"
        fill="#000" letterSpacing="1.5">{value}</text>
    </svg>
  );
}

function QRImg({ data, size = 180 }) {
  const url = `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodeURIComponent(data)}&choe=UTF-8&chld=M|2`;
  return <img src={url} alt="QR Code" width={size} height={size}
    style={{ display: 'block', imageRendering: 'pixelated', borderRadius: '4px' }} />;
}

function openPrintWin(html, filename) {
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
  else {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename || 'tag.html';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }
}

const SHARED_CSS = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Inter,sans-serif;background:#f8fafc;padding:36px 20px;display:flex;flex-direction:column;align-items:center;gap:20px}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;width:100%;max-width:560px;box-shadow:0 8px 32px rgba(0,0,0,.1);page-break-inside:avoid}
.hdr{background:linear-gradient(135deg,#0f172a,#1e3a5f);color:#fff;padding:18px 24px}
.hlbl{font-size:.6rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:4px}
.hname{font-size:1.2rem;font-weight:800}.hsub{font-size:.74rem;color:rgba(255,255,255,.5);margin-top:2px}
.body{padding:18px 22px;display:flex;gap:18px;align-items:flex-start}
.codes{display:flex;flex-direction:column;gap:10px}
.cb{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;display:flex;flex-direction:column;align-items:center;gap:8px}
.clbl{font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b}
.fields{display:flex;flex-direction:column;gap:7px;min-width:145px}
.field{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:7px 11px}
.fk{font-size:.58rem;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#94a3b8;margin-bottom:2px}
.fv{font-size:.8rem;font-weight:600;color:#0f172a;font-family:'Courier New',monospace;word-break:break-all}
.ftr{padding:10px 22px;background:#f1f5f9;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:.67rem;color:#94a3b8}
.pbtn{display:block;margin-bottom:22px;padding:10px 28px;background:#0f172a;color:#fff;border:none;border-radius:8px;font-size:.9rem;font-weight:700;cursor:pointer}
@media print{body{background:#fff;padding:0}.card{box-shadow:none;border-radius:0}.pbtn{display:none!important}}`;

const BATCH_CSS = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Inter,sans-serif;background:#f8fafc;padding:22px}
h2{font-size:1rem;font-weight:700;color:#0f172a;margin-bottom:4px}p{font-size:.78rem;color:#64748b;margin-bottom:18px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(285px,1fr));gap:14px}
.tag{background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;page-break-inside:avoid}
.thdr{background:linear-gradient(135deg,#0f172a,#1e3a5f);color:#fff;padding:10px 13px}
.tname{font-size:.86rem;font-weight:700}.tsub{font-size:.62rem;color:rgba(255,255,255,.5);margin-top:2px}
.tbody{padding:10px 12px;display:flex;gap:10px;align-items:flex-start}
.tc{display:flex;flex-direction:column;align-items:center;gap:4px}
.tlbl{font-size:.58rem;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#94a3b8}
.tmeta{font-size:.6rem;color:#64748b;margin-top:3px}
.pbtn{display:block;margin-bottom:18px;padding:8px 24px;background:#0f172a;color:#fff;border:none;border-radius:8px;font-size:.85rem;font-weight:700;cursor:pointer}
@media print{body{background:#fff;padding:8px}.pbtn{display:none!important}}`;

export default function BarcodeQRModal({ isOpen, onClose, record, category, allRecords }) {
  const [activeTab, setActiveTab] = useState('single');
  const [copied, setCopied] = useState(false);

  useEffect(() => { if (!isOpen) { setActiveTab('single'); setCopied(false); } }, [isOpen]);
  if (!isOpen || !record) return null;

  const divTitle = (category || record._division || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const qrData = JSON.stringify({
    id: record.id,
    name: record.fullName || '',
    passport: record.passportNumber || '',
    bld: record.building || '',
    room: record.room || '',
    shelf: record.shelfNumber || '',
    box: record.boxNumber || '',
    fld: record.folderNumber || '',
    div: category || '',
    date: record.date || '',
  });
  const barVal = (record.boxNumber || record.personalId || `REC-${record.id || '000'}`).toUpperCase();

  const handleCopy = () => {
    navigator.clipboard?.writeText(qrData).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const handlePrintSingle = () => {
    const { svg: barSvg } = buildBarSVGStr(barVal, 2, 62);
    const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=160x160&chl=${encodeURIComponent(qrData)}&choe=UTF-8&chld=M|2`;
    const fields = [
      ['Building', record.building],
      ['Room / Vault', record.room],
      ['Shelf', record.shelfNumber],
      ['Box No.', record.boxNumber],
      ['Folder', record.folderNumber],
      ['Passport', record.passportNumber],
      ['Personal ID', record.personalId],
      ['Division', divTitle],
      ['Date', record.date],
    ].filter(([, v]) => v);
    const fRows = fields.map(([k, v]) => `<div class="field"><div class="fk">${k}</div><div class="fv">${v}</div></div>`).join('');
    openPrintWin(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>File Tag</title>
<style>${SHARED_CSS}</style></head>
<body>
<button class="pbtn" onclick="window.print()">🖨 Print Tag</button>
<div class="card">
  <div class="hdr">
    <div class="hlbl">ICS File Management System · ${divTitle}</div>
    <div class="hname">${record.fullName || barVal}</div>
    <div class="hsub">Record ID: ${record.id || '—'} · Box: ${record.boxNumber || '—'}${record.folderNumber ? ' · Folder: ' + record.folderNumber : ''}</div>
  </div>
  <div class="body">
    <div class="codes">
      <div class="cb"><div class="clbl">📱 QR Code — Scan to Locate</div><img src="${qrUrl}" width="155" height="155" alt="QR"/></div>
      <div class="cb"><div class="clbl">📦 Barcode — Box Scanner Tag</div>${barSvg}</div>
    </div>
    <div class="fields">${fRows}</div>
  </div>
  <div class="ftr">
    <span>Printed: ${new Date().toLocaleString()}</span>
    <span>ICS — Ethiopian Immigration &amp; Citizenship</span>
  </div>
</div></body></html>`, `tag_${barVal}.html`);
  };

  const handlePrintBatch = () => {
    const recs = allRecords || [];
    if (!recs.length) { alert('No records to print.'); return; }
    const cards = recs.map(rec => {
      const bv = (rec.boxNumber || rec.personalId || `REC-${rec.id || '000'}`).toUpperCase();
      const pl = JSON.stringify({ id: rec.id, name: rec.fullName || '', passport: rec.passportNumber || '', bld: rec.building || '', room: rec.room || '', shelf: rec.shelfNumber || '', box: rec.boxNumber || '', fld: rec.folderNumber || '', div: category || '' });
      const qr = `https://chart.googleapis.com/chart?cht=qr&chs=100x100&chl=${encodeURIComponent(pl)}&choe=UTF-8&chld=M|2`;
      const { svg: bs } = buildBarSVGStr(bv, 1.4, 40);
      const locStr = [rec.building, rec.room, rec.shelfNumber, rec.boxNumber, rec.folderNumber].filter(Boolean).join(' ➔ ');
      return `<div class="tag"><div class="thdr"><div class="tname">${rec.fullName || bv}</div><div class="tsub">${divTitle} · Box: ${rec.boxNumber || '—'} · ID: ${rec.id || '—'}</div></div><div class="tbody"><div class="tc"><div class="tlbl">QR</div><img src="${qr}" width="90" height="90" alt="QR"/></div><div class="tc" style="flex:1"><div class="tlbl">Barcode</div>${bs}<div class="tmeta">🏛️ ${locStr || 'Shelf: ' + (rec.shelfNumber || '—')}</div><div class="tmeta">Passport: ${rec.passportNumber || '—'}</div></div></div></div>`;
    }).join('');
    openPrintWin(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Batch Tags — ${divTitle}</title>
<style>${BATCH_CSS}</style></head>
<body>
<button class="pbtn" onclick="window.print()">🖨 Print All (${recs.length})</button>
<h2>Batch File Tags — ${divTitle}</h2>
<p>Generated ${recs.length} tags · ${new Date().toLocaleString()} · ICS File Management System</p>
<div class="grid">${cards}</div></body></html>`, `batch_${category}.html`);
  };

  const tabBtn = (id, label) => (
    <button key={id} onClick={() => setActiveTab(id)} style={{
      padding: '8px 18px', borderRadius: '8px', fontWeight: 600, fontSize: '.85rem',
      cursor: 'pointer', border: 'none', transition: 'all .18s',
      background: activeTab === id ? '#0f172a' : 'transparent',
      color: activeTab === id ? '#fff' : 'var(--text-secondary)',
    }}>{label}</button>
  );

  const cellItem = (k, v) => v ? (
    <div key={k} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px' }}>
      <div style={{ fontSize: '.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: '#94a3b8', marginBottom: '3px' }}>{k}</div>
      <div style={{ fontSize: '.82rem', fontWeight: 600, color: '#0f172a', fontFamily: 'monospace', wordBreak: 'break-all' }}>{v}</div>
    </div>
  ) : null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.78)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
      <div style={{ width: 'min(760px,96vw)', maxHeight: '92vh', background: '#fff', borderRadius: '20px', border: '1px solid rgba(15,43,92,.1)', boxShadow: '0 25px 50px -12px rgba(15,43,92,.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '18px 24px', background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '.62rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', marginBottom: '4px' }}>
              QR Code &amp; Barcode Generator
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{record.fullName || barVal}</div>
            <div style={{ fontSize: '.75rem', color: 'rgba(255,255,255,.55)', marginTop: '2px' }}>
              {divTitle} · Box: {record.boxNumber || '—'} · ID: {record.id || '—'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.1)', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ padding: '12px 24px 0', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '4px' }}>
          {tabBtn('single', '📄 Single Record Tag')}
          {allRecords && allRecords.length > 1 && tabBtn('batch', `📦 Batch Print (${allRecords.length} records)`)}
        </div>

        {/* Body */}
        <div style={{ padding: '22px', overflowY: 'auto', flex: 1 }}>

          {activeTab === 'single' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* QR Panel */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '.64rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b' }}>📱 QR Code — Scan to Retrieve</div>
                  <QRImg data={qrData} size={176} />
                  <div style={{ fontSize: '.69rem', color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 }}>
                    Encodes full record metadata.<br />Scan with any QR reader.
                  </div>
                  <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer', color: copied ? '#059669' : 'var(--text-secondary)' }}>
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? 'Copied!' : 'Copy QR Data'}
                  </button>
                </div>

                {/* Barcode Panel */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '.64rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b' }}>📦 Code 128 Barcode — Box Tag</div>
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '108px', overflow: 'auto', width: '100%' }}>
                    <BarcodeSVG value={barVal} height={68} />
                  </div>
                  <div style={{ fontSize: '.69rem', color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 }}>
                    Encodes box number. Works with<br />all standard barcode scanners.
                  </div>
                  <div style={{ background: 'rgba(15,23,42,.04)', borderRadius: '8px', padding: '7px 14px', fontSize: '.8rem', fontWeight: 700, fontFamily: 'monospace', color: '#0f172a', letterSpacing: '1.5px' }}>
                    {barVal}
                  </div>
                </div>
              </div>

              {/* Quick Summary */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px' }}>
                <div style={{ fontSize: '.64rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', marginBottom: '12px' }}>📋 Record Quick Summary</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(148px,1fr))', gap: '9px' }}>
                  {cellItem('Box Number', record.boxNumber)}
                  {cellItem('Shelf', record.shelfNumber)}
                  {cellItem('Personal ID', record.personalId)}
                  {cellItem('Passport No.', record.passportNumber)}
                  {cellItem('Full Name', record.fullName)}
                  {cellItem('Division', divTitle)}
                  {cellItem('Date', record.date)}
                  {cellItem('Service', record.serviceProvided)}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'batch' && allRecords && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'rgba(16,185,129,.06)', border: '1px solid rgba(16,185,129,.25)', borderRadius: '10px', padding: '14px 18px', fontSize: '.86rem', color: '#059669', fontWeight: 600 }}>
                📦 Ready to print <strong>{allRecords.length}</strong> file tags. Each tag includes a QR code and barcode for quick scanning.
              </div>
              <div style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b' }}>
                Preview (first {Math.min(allRecords.length, 4)})
              </div>
              {allRecords.slice(0, 4).map((rec, i) => (
                <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', background: '#0f172a', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '.85rem', flexShrink: 0 }}>
                    {(rec.fullName || 'R')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '.87rem', color: '#0f172a' }}>{rec.fullName || '—'}</div>
                    <div style={{ fontSize: '.72rem', color: '#64748b', marginTop: '2px' }}>
                      Box: {rec.boxNumber || '—'} · Passport: {rec.passportNumber || '—'}
                    </div>
                  </div>
                  <div style={{ fontSize: '.64rem', fontWeight: 600, color: '#10b981', background: 'rgba(16,185,129,.08)', borderRadius: '6px', padding: '3px 8px' }}>
                    QR + Barcode
                  </div>
                </div>
              ))}
              {allRecords.length > 4 && (
                <div style={{ textAlign: 'center', fontSize: '.8rem', color: '#94a3b8' }}>
                  + {allRecords.length - 4} more records included
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: 'var(--text-secondary)', fontSize: '.85rem', fontWeight: 600, cursor: 'pointer' }}>
            Close
          </button>
          <div style={{ display: 'flex', gap: '10px' }}>
            {activeTab === 'batch' && allRecords && allRecords.length > 0 && (
              <button onClick={handlePrintBatch} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 20px', borderRadius: '9px', background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.35)', color: '#059669', fontSize: '.85rem', fontWeight: 700, cursor: 'pointer' }}>
                <Printer size={15} /> Print All {allRecords.length} Tags
              </button>
            )}
            {activeTab === 'single' && (
              <button onClick={handlePrintSingle} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 20px', borderRadius: '9px', background: '#0f172a', border: 'none', color: '#fff', fontSize: '.85rem', fontWeight: 700, cursor: 'pointer' }}>
                <Printer size={15} /> Print Tag
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
