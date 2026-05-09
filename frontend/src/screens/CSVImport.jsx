import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Card from '../components/ui/Card';
import { fmt } from '../utils/format';
import { useAccent } from '../context/TweakContext';
import { createTransaction } from '../api/transactions';
import { fetchBudget } from '../api/budget';

// ── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_KEYWORDS = {
  'Salary':        ['SALARY', 'PAYROLL', 'WAGES', 'PAYSLIP', 'NEFT CR SAL', 'SALARY RECEIVED'],
  'Food & Dining': ['ZOMATO', 'SWIGGY', 'RESTAURANT', 'CAFE', 'BLINKIT', 'DOMINOS', 'PIZZA', 'BURGER', 'DINING', 'KFC', 'MCDONALD'],
  'Groceries':     ['GROCERY', 'GROCER', 'BIGBASKET', 'JIOMART', 'DMART', 'SUPERMARKET', 'VEGETABLES', 'FRESH MART'],
  'Transport':     ['UBER', 'OLA', 'RAPIDO', 'METRO', 'PETROL', 'DIESEL', 'IRCTC', 'RAILWAY', 'FUEL'],
  'Utilities':     ['ELECTRICITY', 'BESCOM', 'MSEDCL', 'BSES', 'TATA POWER', 'WATER BILL', 'BROADBAND', 'INTERNET', 'AIRTEL', 'JIO', 'VODAFONE'],
  'Entertainment': ['NETFLIX', 'PRIME VIDEO', 'HOTSTAR', 'DISNEY', 'SPOTIFY', 'BOOKMYSHOW', 'PVR', 'INOX', 'GAMING', 'XBOX', 'GAMEPASS', 'YOUTUBE', 'AMAZON PRIME'],
  'Shopping':      ['AMAZON', 'FLIPKART', 'MYNTRA', 'NYKAA', 'AJIO', 'MEESHO', 'HEADPHONES', 'GADGET'],
  'Healthcare':    ['HOSPITAL', 'CLINIC', 'PHARMACY', 'MEDICINE', 'APOLLO', 'MEDPLUS', 'DOCTOR'],
  'Rent':          ['RENT', 'RENTAL', 'HOUSE RENT', 'MAINTENANCE CHARGES'],
  'Interest':      ['INTEREST CREDIT', 'INT CREDIT', 'INT EARNED', 'SAVINGS INTEREST', 'INTEREST RECEIVED'],
  'Freelance':     ['FREELANCE', 'CONSULTING', 'INVOICE'],
  'Insurance':     ['LIC', 'INSURANCE', 'PREMIUM', 'POLICY'],
  'Investment':    ['MUTUAL FUND', 'MF TRANSFER', 'MF TRAN', 'SIP', 'ZERODHA', 'GROWW', 'UPSTOX', 'FIXED DEPOSIT', 'INVESCO'],
};

// Maps Google Sheets / budget template category labels → app categories
const SHEET_CAT_MAP = {
  'subscriptions': 'Entertainment',
  'food':          'Food & Dining',
  'investments':   'Investment',
  'paycheck':      'Salary',
  'refunds':       'Other',
  'personal':      'Other',
  'gadgets':       'Shopping',
  'interest':      'Interest',
  'other':         'Other',
};

function resolveCategory(sheetCat, desc) {
  if (sheetCat) {
    const mapped = SHEET_CAT_MAP[sheetCat.toLowerCase().trim()];
    if (mapped) return mapped;
  }
  return autoCategory(desc);
}

function autoCategory(desc) {
  const upper = (desc || '').toUpperCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => upper.includes(kw))) return cat;
  }
  return 'Other';
}

function parseAmount(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return raw;
  const s = String(raw).trim();
  if (!s) return null;
  const isCr = /\bcr\b|\bcredit\b/i.test(s);
  const isDr = /\bdr\b|\bdebit\b/i.test(s);
  const inParens = /^\(.*\)$/.test(s);
  // Strip cr/dr markers and parens first, then commas/spaces, then any remaining
  // non-numeric chars (handles ₹, $, £, garbled UTF-8 bytes, etc.)
  const cleaned = s
    .replace(/\bcr\b|\bcredit\b|\bdr\b|\bdebit\b/gi, '')
    .replace(/[()]/g, '')
    .replace(/[,\s]/g, '')
    .replace(/[^\d.+\-]/g, '');
  const val = parseFloat(cleaned);
  if (isNaN(val)) return null;
  if (isCr) return Math.abs(val);
  if (isDr || inParens) return -Math.abs(val);
  return val;
}

const MONTH_MAP = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

// fmt: 'DMY' = DD/MM/YYYY (default, Indian banking), 'MDY' = MM/DD/YYYY (US)
function parseDate(raw, fmt = 'DMY') {
  if (!raw && raw !== 0) return null;
  if (typeof raw === 'number') {
    try {
      const d = XLSX.SSF.parse_date_code(raw);
      if (d) return _validYear(`${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`);
    } catch { /* fall through */ }
  }
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return _validYear(s);
  const m1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m1) {
    const [, a, b, y] = m1;
    const aNum = parseInt(a, 10), bNum = parseInt(b, 10);
    // Resolve ambiguity: if first number > 12 it must be the day (DD/MM)
    // if second number > 12 it must be the month (MM/DD)
    let day, mon;
    if (aNum > 12)      { day = a; mon = b; }           // definitely DD/MM
    else if (bNum > 12) { day = b; mon = a; }           // definitely MM/DD
    else                { [day, mon] = fmt === 'MDY' ? [b, a] : [a, b]; }
    return _validYear(`${y}-${mon.padStart(2, '0')}-${day.padStart(2, '0')}`);
  }
  const m2 = s.match(/^(\d{1,2})[\s\-\/]([a-zA-Z]{3})[\s\-\/](\d{4})$/);
  if (m2) {
    const mo = MONTH_MAP[m2[2].toLowerCase()];
    if (mo) return _validYear(`${m2[3]}-${mo}-${m2[1].padStart(2, '0')}`);
  }
  return null;
}

// Scans the first 20 date values in a column to guess DD/MM vs MM/DD.
function autoDetectDateFmt(rows, dateColIdx) {
  if (dateColIdx === '' || dateColIdx === undefined) return 'DMY';
  for (const row of rows.slice(0, 20)) {
    const s = String(row[dateColIdx] || '').trim();
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      if (parseInt(m[1], 10) > 12) return 'DMY';
      if (parseInt(m[2], 10) > 12) return 'MDY';
    }
  }
  return 'DMY'; // default: Indian banking standard
}

function _validYear(iso) {
  if (!iso) return null;
  const y = parseInt(iso.slice(0, 4), 10);
  return (y >= 1980 && y <= 2100) ? iso : null;
}

function autoDetectMapping(headers) {
  const h = headers.map((x, i) => ({ u: (x || '').toUpperCase(), i }));
  const find = (pats) => (h.find(({ u }) => pats.some((p) => u.includes(p)))?.i ?? '');
  return {
    dateCol:   find(['DATE', 'TXN DATE', 'TRANSACTION DATE', 'VALUE DATE', 'POSTING DATE']),
    descCol:   find(['NARRATION', 'DESCRIPTION', 'PARTICULARS', 'REMARKS', 'DETAILS', 'TRANSACTION DETAILS', 'DESC']),
    debitCol:  find(['WITHDRAWAL', 'DEBIT AMT', 'DEBIT AMOUNT', 'DR AMT', 'DR AMOUNT', 'DEBIT']),
    creditCol: find(['DEPOSIT', 'CREDIT AMT', 'CREDIT AMOUNT', 'CR AMT', 'CR AMOUNT', 'CREDIT']),
    amountCol: find(['AMOUNT', 'TRANSACTION AMOUNT', 'NET AMOUNT', 'TXN AMOUNT']),
    catCol:    find(['CATEGORY']),
    typeCol:   '',
  };
}

// Detects a side-by-side "Expenses | Income" layout (two Date columns in headers)
// and flattens both panels into a single-column list with a forced __type tag.
function detectAndNormalizeTwoPanel(headers, rows) {
  const dateIdxs = headers.reduce((arr, h, i) => {
    if ((h || '').toUpperCase().trim() === 'DATE') arr.push(i);
    return arr;
  }, []);
  if (dateIdxs.length < 2) return null;

  const [leftStart, rightStart] = dateIdxs;

  const _find = (pats, from, to) => {
    for (let i = from; i < to; i++) {
      const u = (headers[i] || '').toUpperCase();
      if (pats.some((p) => u.includes(p))) return i;
    }
    return -1;
  };

  const lDate = leftStart;
  const lAmt  = _find(['AMOUNT', 'AMT'], leftStart + 1, rightStart);
  const lDesc = _find(['DESCRIPTION', 'DESC', 'NARRATION', 'PARTICULARS'], leftStart + 1, rightStart);
  const lCat  = _find(['CATEGORY'], leftStart + 1, rightStart);

  const rDate = rightStart;
  const rAmt  = _find(['AMOUNT', 'AMT'], rightStart + 1, headers.length);
  const rDesc = _find(['DESCRIPTION', 'DESC', 'NARRATION', 'PARTICULARS'], rightStart + 1, headers.length);
  const rCat  = _find(['CATEGORY'], rightStart + 1, headers.length);

  const flat = [];
  for (const row of rows) {
    const get = (idx) => (idx >= 0 ? row[idx] : '');
    if (get(lDate) || get(lDesc)) flat.push([get(lDate), get(lDesc), get(lAmt), get(lCat), 'expense']);
    if (get(rDate) || get(rDesc)) flat.push([get(rDate), get(rDesc), get(rAmt), get(rCat), 'income']);
  }

  return {
    headers: ['Date', 'Description', 'Amount', 'Category', '__type'],
    data:    flat,
    mapping: { dateCol: 0, descCol: 1, amountCol: 2, debitCol: '', creditCol: '', catCol: 3, typeCol: 4 },
  };
}

// ── Styles ───────────────────────────────────────────────────────────────────

const inputSt = {
  background: '#1F2333', border: '1px solid #2A2D3E', borderRadius: 9,
  padding: '9px 12px', color: '#E8EAF0', fontSize: 13, fontFamily: 'DM Sans',
  width: '100%', boxSizing: 'border-box',
};
const btnSec = {
  padding: '9px 20px', borderRadius: 9, border: '1px solid #2A2D3E',
  background: 'transparent', color: '#9CA3AF', fontFamily: 'DM Sans',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

const STEPS = ['Upload', 'Map Columns', 'Review', 'Import'];

// ── Component ────────────────────────────────────────────────────────────────

export default function CSVImport({ onNavigate }) {
  const accent   = useAccent();
  const fileRef  = useRef(null);

  const [step,       setStep]       = useState(0);
  const [dragging,   setDragging]   = useState(false);
  const [fileName,   setFileName]   = useState('');
  const [sheetData,  setSheetData]  = useState([]);
  const [headers,    setHeaders]    = useState([]);
  const [mapping,    setMapping]    = useState({ dateCol: '', descCol: '', debitCol: '', creditCol: '', amountCol: '', catCol: '', typeCol: '', dateFormat: 'DMY' });
  const [isTwoPanel, setIsTwoPanel] = useState(false);
  const [reviewRows, setReviewRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [importing,  setImporting]  = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [result,     setResult]     = useState(null);

  useEffect(() => {
    fetchBudget()
      .then((cats) => setCategories(cats.map((c) => c.name)))
      .catch(() => {});
  }, []);

  const processFile = (file) => {
    setFileName(file.name);
    const isCSV = /\.csv$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      // CSV: read as UTF-8 text so ₹ and other Unicode chars survive intact.
      // XLS/XLSX: read as binary array (required by SheetJS for binary formats).
      const wb = isCSV
        ? XLSX.read(e.target.result, { type: 'string', cellDates: false, raw: true })
        : XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: false });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      // raw: true — prevents SheetJS from silently coercing date-looking strings
      // (e.g. "04/01/2026") into date serial numbers using US MM/DD/YYYY format.
      const raw  = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });

      // Find header row (first row with ≥3 non-empty cells, within first 10 rows)
      let hdrIdx = 0;
      for (let i = 0; i < Math.min(10, raw.length); i++) {
        if (raw[i].filter((c) => c !== '').length >= 3) { hdrIdx = i; break; }
      }
      const hdrs = raw[hdrIdx].map((h) => String(h).trim());
      const rows = raw.slice(hdrIdx + 1).filter((r) => r.some((c) => c !== ''));

      const normalized = detectAndNormalizeTwoPanel(hdrs, rows);
      if (normalized) {
        setHeaders(normalized.headers);
        setSheetData(normalized.data);
        setMapping({ ...normalized.mapping, dateFormat: autoDetectDateFmt(normalized.data, normalized.mapping.dateCol) });
        setIsTwoPanel(true);
      } else {
        const detected = autoDetectMapping(hdrs);
        setHeaders(hdrs);
        setSheetData(rows);
        setMapping({ ...detected, typeCol: '', dateFormat: autoDetectDateFmt(rows, detected.dateCol) });
        setIsTwoPanel(false);
      }
      setStep(1);
    };
    if (isCSV) {
      reader.readAsText(file, 'UTF-8');
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  };

  const buildReviewRows = () => {
    const { dateCol, descCol, debitCol, creditCol, amountCol, catCol, typeCol } = mapping;
    const rows = [];
    for (let i = 0; i < sheetData.length; i++) {
      const row     = sheetData[i];
      const rawDate = dateCol !== '' ? row[dateCol] : '';
      const rawDesc = descCol !== '' ? row[descCol] : '';
      const rawCat  = catCol  !== '' && catCol !== undefined ? String(row[catCol] || '').trim() : '';
      const typeOverride = typeCol !== '' && typeCol !== undefined ? String(row[typeCol] || '').trim() : '';

      let amount = null;
      if (amountCol !== '') {
        amount = parseAmount(row[amountCol]);
      } else {
        const debit  = debitCol  !== '' ? parseAmount(row[debitCol])  : null;
        const credit = creditCol !== '' ? parseAmount(row[creditCol]) : null;
        if (credit !== null && credit > 0) amount = credit;
        else if (debit !== null && debit > 0) amount = -debit;
        else if (credit !== null) amount = credit;
        else if (debit  !== null) amount = -Math.abs(debit);
      }

      const date        = parseDate(rawDate, mapping.dateFormat);
      const desc        = String(rawDesc).trim();
      const absAmt      = amount !== null ? Math.abs(amount) : 0;
      const type        = typeOverride === 'expense' || typeOverride === 'income'
        ? typeOverride
        : (amount !== null && amount >= 0) ? 'income' : 'expense';
      const dateError   = !date;
      const amountError = amount === null || absAmt === 0;

      if (!date && !desc && absAmt === 0) continue;

      rows.push({
        id:          i,
        date:        date || '',
        desc,
        amount:      absAmt,
        type,
        category:    resolveCategory(rawCat, desc),
        include:     !!(date && desc && !amountError),
        dateError,
        amountError,
      });
    }
    setReviewRows(rows);
    setStep(2);
  };

  const toggleInclude = (id) =>
    setReviewRows((rs) => rs.map((r) => (r.id === id ? { ...r, include: !r.include } : r)));

  const updateRow = (id, field, value) =>
    setReviewRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const handleImport = async () => {
    setImporting(true);
    setProgress(0);
    setStep(3);
    const toImport = reviewRows.filter((r) => r.include && r.date && r.desc && r.amount > 0);
    let imported = 0, errors = 0;
    for (let i = 0; i < toImport.length; i++) {
      const r = toImport[i];
      try {
        await createTransaction({
          date:     r.date,
          desc:     r.desc,
          amount:   r.type === 'expense' ? -r.amount : r.amount,
          category: r.category,
          type:     r.type,
        });
        imported++;
      } catch {
        errors++;
      }
      setProgress(Math.round(((i + 1) / toImport.length) * 100));
    }
    const skipped = reviewRows.filter((r) => !r.include).length;
    setResult({ imported, skipped, errors });
    setImporting(false);
  };

  const reset = () => {
    setStep(0); setFileName(''); setSheetData([]); setHeaders([]);
    setMapping({ dateCol: '', descCol: '', debitCol: '', creditCol: '', amountCol: '', catCol: '', typeCol: '', dateFormat: 'DMY' });
    setIsTwoPanel(false);
    setReviewRows([]); setProgress(0); setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const validToImport  = reviewRows.filter((r) => r.include && r.date && r.desc && r.amount > 0);
  const includedCount  = reviewRows.filter((r) => r.include).length;
  const hasIssues      = reviewRows.some((r) => r.dateError || r.amountError);
  const allCats        = [...new Set([...categories, ...reviewRows.map((r) => r.category), 'Other'])];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="fade-in"
      style={{ padding: 'var(--content-pad,24px)', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--content-gap,14px)' }}
    >
      {/* Header */}
      <div>
        <div style={{ fontSize: 22, fontWeight: 700 }}>Import Transactions</div>
        <div style={{ color: '#6B7280', fontSize: 13, marginTop: 3 }}>Upload bank statements — CSV or Excel (.xlsx / .xls)</div>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'initial' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, flexShrink: 0,
                background: i < step ? accent : i === step ? accent : '#2A2D3E',
                color: i <= step ? '#000' : '#6B7280',
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 12, fontWeight: i === step ? 600 : 400, color: i === step ? '#E8EAF0' : '#6B7280', whiteSpace: 'nowrap' }}>
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 1, background: i < step ? accent : '#2A2D3E', margin: '0 10px', minWidth: 16 }} />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 0: Upload ─────────────────────────────────────────────────── */}
      {step === 0 && (
        <Card>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleFileInput} />
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? accent : '#2A2D3E'}`,
              borderRadius: 12, padding: '48px 24px', textAlign: 'center',
              transition: 'all 0.2s', cursor: 'pointer',
              background: dragging ? accent + '0A' : 'transparent',
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Drop your file here or click to browse</div>
            <div style={{ color: '#6B7280', fontSize: 13 }}>CSV, Excel (.xlsx, .xls) supported</div>
          </div>

          <div style={{ marginTop: 20, padding: '12px 16px', background: '#161820', borderRadius: 10, border: '1px solid #2A2D3E' }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#9CA3AF', marginBottom: 6 }}>Google Sheets</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>
              Export your sheet via <span style={{ color: '#E8EAF0' }}>File → Download → CSV</span>, then upload here.
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', marginBottom: 8 }}>Works with</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['HDFC CSV', 'SBI CSV', 'ICICI CSV', 'Axis XLS', 'Kotak CSV', 'Generic CSV'].map((b) => (
                <span key={b} style={{ fontSize: 11.5, background: '#1F2333', border: '1px solid #2A2D3E', borderRadius: 7, padding: '4px 10px', color: '#9CA3AF' }}>{b}</span>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ── Step 1: Map Columns ───────────────────────────────────────────── */}
      {step === 1 && (
        <Card>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Map Columns</div>
          <div style={{ color: '#6B7280', fontSize: 12.5, marginBottom: 16 }}>
            File: <span style={{ color: accent }}>{fileName}</span> · {sheetData.length} rows detected
          </div>

          {isTwoPanel && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: accent + '12', border: `1px solid ${accent}44`, borderRadius: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>✦</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: accent, marginBottom: 3 }}>Side-by-side layout detected</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.5 }}>
                  Found separate Expenses and Income columns. Both panels have been automatically
                  merged into a flat list with types pre-assigned. Column mapping is locked.
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            {[
              ['Date Column *',           'dateCol'],
              ['Description Column *',    'descCol'],
              ['Debit / Withdrawal Col',  'debitCol'],
              ['Credit / Deposit Col',    'creditCol'],
              ['Single Amount Column',    'amountCol'],
            ].filter(([, key]) => !isTwoPanel || (key !== 'debitCol' && key !== 'creditCol'))
            .map(([label, key]) => (
              <div key={key}>
                <div style={{ fontSize: 11.5, color: '#9CA3AF', fontWeight: 500, marginBottom: 6 }}>{label}</div>
                <select
                  value={mapping[key]}
                  disabled={isTwoPanel}
                  onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value === '' ? '' : Number(e.target.value) }))}
                  style={{ ...inputSt, cursor: isTwoPanel ? 'default' : 'pointer', opacity: isTwoPanel ? 0.6 : 1 }}
                >
                  <option value="">— Not mapped —</option>
                  {headers.filter((h) => !h.startsWith('__')).map((h, i) => (
                    <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11.5, color: '#9CA3AF', fontWeight: 500, marginBottom: 6 }}>Date Format</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['DMY', 'DD/MM/YYYY', 'Indian / UK (HDFC, SBI, ICICI…)'], ['MDY', 'MM/DD/YYYY', 'US format']].map(([val, label, hint]) => (
                <button
                  key={val}
                  onClick={() => setMapping((m) => ({ ...m, dateFormat: val }))}
                  style={{
                    padding: '8px 14px', borderRadius: 9, border: `1px solid ${mapping.dateFormat === val ? accent : '#2A2D3E'}`,
                    background: mapping.dateFormat === val ? accent + '18' : 'transparent',
                    color: mapping.dateFormat === val ? accent : '#6B7280',
                    fontFamily: 'DM Sans', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div>{label}</div>
                  <div style={{ fontSize: 10.5, fontWeight: 400, opacity: 0.8, marginTop: 2 }}>{hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: '10px 14px', background: '#161820', borderRadius: 8, fontSize: 12, color: '#9CA3AF', marginBottom: 20 }}>
            Map either <strong style={{ color: '#E8EAF0' }}>Debit + Credit</strong> (separate columns for withdrawals and deposits) or a single <strong style={{ color: '#E8EAF0' }}>Amount</strong> column (positive = income, negative = expense).
          </div>

          {/* Preview first data row */}
          {sheetData.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11.5, color: '#6B7280', marginBottom: 8 }}>First data row preview</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {headers.filter((h) => !h.startsWith('__')).map((h, i) => (
                  <div key={i} style={{ background: '#1F2333', border: '1px solid #2A2D3E', borderRadius: 6, padding: '4px 10px' }}>
                    <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 2 }}>{h || `Col ${i + 1}`}</div>
                    <div style={{ fontSize: 12, color: '#E8EAF0' }}>{String(sheetData[0][i] || '—').slice(0, 20)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(0)} style={btnSec}>← Back</button>
            <button
              onClick={buildReviewRows}
              disabled={mapping.dateCol === '' || mapping.descCol === ''}
              style={{
                padding: '9px 24px', borderRadius: 9, border: 'none', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: (mapping.dateCol === '' || mapping.descCol === '') ? '#2A2D3E' : accent,
                color: '#000', opacity: (mapping.dateCol === '' || mapping.descCol === '') ? 0.5 : 1,
              }}
            >
              Preview Transactions →
            </button>
          </div>
        </Card>
      )}

      {/* ── Step 2: Review ────────────────────────────────────────────────── */}
      {step === 2 && (
        <>
          {/* ── Top control bar — always visible ── */}
          <Card style={{ padding: '12px 16px', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>{reviewRows.length} rows parsed</span>
                <span style={{ color: '#6B7280', marginLeft: 12 }}>{includedCount} selected</span>
                {hasIssues && <span style={{ color: '#F59E0B', marginLeft: 12, fontSize: 12 }}>⚠ Some rows have issues</span>}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {[
                  ['Valid only', () => setReviewRows((rs) => rs.map((r) => ({ ...r, include: !r.dateError && !r.amountError && !!r.desc })))],
                  ['All',        () => setReviewRows((rs) => rs.map((r) => ({ ...r, include: true })))],
                  ['None',       () => setReviewRows((rs) => rs.map((r) => ({ ...r, include: false })))],
                ].map(([label, fn]) => (
                  <button key={label} onClick={fn} style={{ ...btnSec, padding: '5px 12px', fontSize: 12 }}>{label}</button>
                ))}
                <button
                  onClick={handleImport}
                  disabled={validToImport.length === 0}
                  style={{
                    padding: '6px 18px', borderRadius: 9, border: 'none', fontFamily: 'DM Sans',
                    fontSize: 12.5, fontWeight: 600, cursor: validToImport.length === 0 ? 'default' : 'pointer',
                    background: validToImport.length === 0 ? '#2A2D3E' : accent, color: '#000',
                    opacity: validToImport.length === 0 ? 0.5 : 1,
                  }}
                >
                  Import {validToImport.length} →
                </button>
              </div>
            </div>
          </Card>

          {/* ── Scrollable review table ── */}
          <Card style={{ padding: 0, overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '52vh' }}>
              <table style={{ width: '100%', minWidth: 660, borderCollapse: 'collapse', tableLayout: 'fixed', fontFamily: 'DM Sans' }}>
                <colgroup>
                  <col style={{ width: 36 }} />
                  <col style={{ width: 102 }} />
                  <col />
                  <col style={{ width: 150 }} />
                  <col style={{ width: 98 }} />
                  <col style={{ width: 114 }} />
                </colgroup>
                <thead style={{ position: 'sticky', top: 0, background: '#1A1D27', zIndex: 2 }}>
                  <tr style={{ borderBottom: '1px solid #2A2D3E' }}>
                    <th style={{ padding: '10px 10px 10px 14px' }} />
                    <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>Description</th>
                    <th style={{ padding: '10px 4px',  fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>Category</th>
                    <th style={{ padding: '10px 4px',  fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>Type</th>
                    <th style={{ padding: '10px 14px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewRows.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #2A2D3E18', opacity: r.include ? 1 : 0.4 }}>
                      <td style={{ padding: '7px 10px 7px 14px' }}>
                        <input
                          type="checkbox"
                          checked={r.include}
                          onChange={() => toggleInclude(r.id)}
                          style={{ width: 14, height: 14, cursor: 'pointer', accentColor: accent }}
                        />
                      </td>
                      <td style={{ padding: '7px 12px', fontSize: 12.5, color: r.dateError ? '#EF4444' : '#9CA3AF', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {r.date || <span style={{ color: '#EF4444' }}>⚠ invalid</span>}
                      </td>
                      <td style={{ padding: '7px 12px', overflow: 'hidden' }}>
                        <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.desc || <span style={{ color: '#6B7280', fontStyle: 'italic' }}>empty</span>}
                        </div>
                      </td>
                      <td style={{ padding: '5px 4px', overflow: 'hidden' }}>
                        <select
                          value={r.category}
                          onChange={(e) => updateRow(r.id, 'category', e.target.value)}
                          style={{ ...inputSt, padding: '5px 7px', fontSize: 11.5 }}
                        >
                          {allCats.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '5px 4px', overflow: 'hidden' }}>
                        <select
                          value={r.type}
                          onChange={(e) => updateRow(r.id, 'type', e.target.value)}
                          style={{ ...inputSt, padding: '5px 7px', fontSize: 11.5 }}
                        >
                          <option value="expense">expense</option>
                          <option value="income">income</option>
                        </select>
                      </td>
                      <td style={{ padding: '7px 14px', textAlign: 'right' }}>
                        <span style={{ fontFamily: 'DM Mono', fontSize: 13, fontWeight: 600, color: r.amountError ? '#6B7280' : r.type === 'income' ? accent : '#EF4444' }}>
                          {r.amountError
                            ? <span style={{ color: '#EF4444' }}>⚠ —</span>
                            : `${r.type === 'income' ? '+' : '-'}${fmt(r.amount)}`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* ── Bottom actions ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <button onClick={() => setStep(1)} style={btnSec}>← Back</button>
            <button
              onClick={handleImport}
              disabled={validToImport.length === 0}
              style={{
                padding: '9px 28px', borderRadius: 9, border: 'none', fontFamily: 'DM Sans', fontSize: 13,
                fontWeight: 600, cursor: validToImport.length === 0 ? 'default' : 'pointer',
                background: validToImport.length === 0 ? '#2A2D3E' : accent, color: '#000',
                opacity: validToImport.length === 0 ? 0.5 : 1,
              }}
            >
              Import {validToImport.length} transaction{validToImport.length !== 1 ? 's' : ''} →
            </button>
          </div>
        </>
      )}

      {/* ── Step 3: Import / Done ─────────────────────────────────────────── */}
      {step === 3 && (
        <Card style={{ textAlign: 'center', padding: '48px 24px' }}>
          {importing ? (
            <>
              <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Importing transactions…</div>
              <div style={{ color: '#6B7280', fontSize: 13, marginBottom: 20 }}>{progress}% complete</div>
              <div style={{ height: 8, background: '#2A2D3E', borderRadius: 99, overflow: 'hidden', maxWidth: 320, margin: '0 auto' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: accent, borderRadius: 99, transition: 'width 0.3s ease' }} />
              </div>
            </>
          ) : result && (
            <>
              <div style={{ fontSize: 40, marginBottom: 16 }}>
                {result.errors === 0 ? '🎉' : '⚠️'}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
                {result.errors === 0 ? 'Import Complete!' : 'Import finished with errors'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginBottom: 28 }}>
                <div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: accent }}>{result.imported}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>imported</div>
                </div>
                <div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#6B7280' }}>{result.skipped}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>skipped</div>
                </div>
                {result.errors > 0 && (
                  <div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: '#EF4444' }}>{result.errors}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>errors</div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button onClick={reset} style={btnSec}>Import Another</button>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate('transactions')}
                    style={{ padding: '10px 26px', borderRadius: 10, border: 'none', background: accent, color: '#000', fontFamily: 'DM Sans', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    View Transactions →
                  </button>
                )}
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
