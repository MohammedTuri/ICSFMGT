import { createClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════
//   DRIVER CONFIGURATION
//   Priority: 1. Supabase (cloud)  2. Local API (PostgreSQL)  3. IndexedDB
// ═══════════════════════════════════════════════════════

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const localApiUrl     = import.meta.env.VITE_API_URL;

export const isSupabaseEnabled =
  !!(supabaseUrl && supabaseUrl !== 'your_supabase_project_url' && supabaseAnonKey);

export const isLocalApiEnabled = !isSupabaseEnabled;

export const supabase = isSupabaseEnabled
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (isSupabaseEnabled) {
  console.log('FMS Database mode: Cloud Database (Supabase Connected)');
} else if (isLocalApiEnabled) {
  const modeLabel = localApiUrl ? localApiUrl : 'same-origin (production)';
  console.log(`FMS Database mode: Local PostgreSQL API (${modeLabel})`);
} else {
  console.log('FMS Database mode: Local Offline-Capable (IndexedDB Fallback Active)');
}

// ═══════════════════════════════════════════════════════
//   LOCAL API HELPER
// ═══════════════════════════════════════════════════════

async function apiFetch(path, options = {}) {
  // If VITE_API_URL is empty the app is served by the Express server itself,
  // so we use a relative URL — it works on ANY server IP automatically.
  const base = (localApiUrl && localApiUrl.trim() !== '') ? localApiUrl.trim() : '';
  const url = `${base}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let errMsg = `API error ${res.status}`;
    try { const body = await res.json(); errMsg = body.error || errMsg; } catch (_) {}
    throw new Error(errMsg);
  }
  return res.json();
}

// ═══════════════════════════════════════════════════════
//   LOCAL INDEXEDDB FALLBACK (Backward Compatibility)
// ═══════════════════════════════════════════════════════
const DB_NAME    = 'ics_file_management_db';
const DB_VERSION = 6;
const STORES     = ['visa', 'eoid', 'eoid_normal', 'eoid_underage', 'residence_id', 'etd', 'eritrean_id', 'alien_passport', 'residence_id_cancellation', 'users', 'audit_logs', 'recycle_bin'];

function resolveStoreName(storeName) {
  return storeName === 'eoid-normal' || storeName === 'eoid-underage' ? 'eoid' : storeName;
}

const SAMPLE_STORE_DATA = {
  visa: [
    {
      personalId: 'VISA-001',
      fullName: 'Samuel Bekele',
      passportNumber: 'EP1001001',
      boxNumber: 'BOX-001',
      date: '2026-05-10',
      serviceProvided: 'VISA EXTENSION',
      citizenship: 'ETHIOPIA',
      requestNumber: 'REQ-1001'
    }
  ],
  eoid: [
    {
      personalId: '100245',
      fullName: 'Lydia Tesfaye',
      passportNumber: 'EP2002002',
      boxNumber: 'EOID-B1-01',
      date: '2026-04-22',
      serviceProvided: 'EOID REGISTRATION',
      citizenship: 'ETHIOPIA',
      requestNumber: 'REQ-1002',
      eoidType: 'EOID-NORMAL',
      eoidNumber: 'EOID-2024-0001'
    }
  ],
  eoid_normal: [
    {
      personalId: 'EOID-N-001',
      fullName: 'Abdi Chala Kabada',
      passportNumber: 'EP1010101',
      boxNumber: 'BOX-001',
      date: '2026-05-25',
      serviceProvided: 'EOID NORMAL',
      citizenship: 'ETHIOPIA',
      eoidNumber: 'EOID-N-1001'
    }
  ],
  eoid_underage: [
    {
      personalId: 'EOID-U-001',
      fullName: 'Mariam Solomon',
      passportNumber: 'EP3013003',
      boxNumber: 'BOX-003',
      date: '2026-05-12',
      serviceProvided: 'EOID UNDERAGE',
      citizenship: 'ETHIOPIA',
      eoidNumber: 'EOID-U-2001'
    }
  ],
  residence_id: [
    {
      personalId: 'RES-001',
      fullName: 'Mekdes Fikru',
      passportNumber: 'EP4014004',
      boxNumber: 'BOX-004',
      date: '2026-03-18',
      serviceProvided: 'RESIDENCE ID ISSUANCE',
      citizenship: 'ETHIOPIA',
      residenceIdNumber: 'R-1001',
      companyName: 'Ethiopian Logistics'
    }
  ],
  etd: [
    {
      personalId: 'ETD-001',
      fullName: 'Hanna Alemu',
      passportNumber: 'EP5015005',
      boxNumber: 'BOX-005',
      date: '2026-04-02',
      serviceProvided: 'EMERGENCY TRAVEL DOCUMENT',
      citizenship: 'ETHIOPIA',
      etdNumber: 'ETD-1001'
    }
  ],
  eritrean_id: [
    {
      personalId: 'ER-001',
      fullName: 'Natnael Ghebre',
      passportNumber: 'ER6006006',
      boxNumber: 'BOX-006',
      date: '2026-02-28',
      serviceProvided: 'ERITREAN ID ISSUE',
      citizenship: 'ERITREA',
      eritreanIdNumber: 'ER-1001'
    }
  ],
  alien_passport: [
    {
      personalId: 'AL-001',
      fullName: 'John Doe',
      passportNumber: 'AP7007007',
      boxNumber: 'BOX-007',
      date: '2026-01-15',
      serviceProvided: 'ALIEN PASSPORT',
      citizenship: 'UNKNOWN',
      alienPassportNumber: 'AP-1001'
    }
  ],
  residence_id_cancellation: [
    {
      personalId: '848235',
      fullName: 'SAMUEL YOHANNES BEKELE',
      passportNumber: 'EP9009009',
      boxNumber: 'RC-B1-01',
      shelfNumber: 'Shelf A7',
      date: '2026-08-19',
      birthdate: '1990-01-01',
      serviceProvided: 'Residence ID Cancellation',
      citizenship: 'ETHIOPIA',
      requestNumber: 'REQ-RC-88178'
    }
  ]
};

function seedStoreIfEmpty(db, storeName, entries) {
  return new Promise((resolve) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const countRequest = store.count();
    countRequest.onsuccess = () => {
      if (countRequest.result === 0 && entries && entries.length > 0) {
        entries.forEach((entry) => {
          const recordToSave = {
            ...entry,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            attachments: []
          };
          store.add(recordToSave);
        });
      }
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror   = () => resolve();
  });
}

export async function initLocalDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      try {
        const transaction = db.transaction('users', 'readwrite');
        const store = transaction.objectStore('users');
        const countRequest = store.count();
        countRequest.onsuccess = () => {
          if (countRequest.result === 0) {
            store.add({
              username: 'admin',
              password: 'admin123',
              role: 'ADMIN',
              fullName: 'System Administrator',
              createdAt: new Date().toISOString()
            });
          }
          Promise.all(
            STORES.filter((name) => name !== 'users').map((storeName) =>
              seedStoreIfEmpty(db, storeName, SAMPLE_STORE_DATA[storeName] || [])
            )
          ).then(() => resolve(db));
        };
      } catch (e) {
        // Ignored if users store is not accessible
      }
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      STORES.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
        }
      });
    };
  });
}

// ═══════════════════════════════════════════════════════
//   UNIFIED DATABASE API  (Triple Driver Adapter)
// ═══════════════════════════════════════════════════════

/**
 * Retrieves all records from a specific store.
 */
export async function getAllRecords(storeName) {
  // ── Supabase ───────────────────────────────────────────
  if (isSupabaseEnabled) {
    try {
      const { data, error } = await supabase
        .from(storeName)
        .select('*')
        .order('id', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error(`Supabase read error on ${storeName}:`, err);
      throw err;
    }
  }

  // ── Local PostgreSQL API (with IndexedDB fallback) ────
  if (isLocalApiEnabled) {
    try {
      return await apiFetch(`/api/${storeName}`);
    } catch (apiErr) {
      console.warn(`Local API fetch failed for /api/${storeName}, falling back to IndexedDB:`, apiErr.message);
    }
  }

  // ── IndexedDB fallback ─────────────────────────────────
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initLocalDB();
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(targetStore);
      const request = store.getAll();
      request.onsuccess = () => {
        const records = request.result || [];
        records.sort((a, b) => b.id - a.id);
        resolve(records);
      };
      request.onerror = (e) => reject(e.target.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Adds a new record to a specific store.
 */
export async function addRecord(storeName, record) {
  const targetStore = resolveStoreName(storeName);
  const enrichedRecord = {
    ...record,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // ── Supabase ───────────────────────────────────────────
  if (isSupabaseEnabled) {
    try {
      const saveObject = { ...enrichedRecord };
      delete saveObject.id;
      const { data, error } = await supabase
        .from(targetStore)
        .insert([saveObject])
        .select();
      if (error) throw error;
      return data && data[0] ? data[0].id : true;
    } catch (err) {
      console.error(`Supabase write error on ${targetStore}:`, err);
      throw err;
    }
  }

  // ── Local PostgreSQL API ───────────────────────────────
  if (isLocalApiEnabled) {
    const saveObject = { ...enrichedRecord };
    delete saveObject.id;
    const row = await apiFetch(`/api/${targetStore}`, {
      method: 'POST',
      body: JSON.stringify(saveObject),
    });
    return row.id;
  }

  // ── IndexedDB fallback ─────────────────────────────────
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initLocalDB();
      const transaction = db.transaction(targetStore, 'readwrite');
      const store = transaction.objectStore(targetStore);
      const request = store.add(enrichedRecord);
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror   = (e)     => reject(e.target.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Updates an existing record in a specific store.
 */
export async function updateRecord(storeName, record) {
  if (!record.id) throw new Error('Record ID is required for updates');

  const enrichedRecord = {
    ...record,
    updatedAt: new Date().toISOString()
  };

  // ── Supabase ───────────────────────────────────────────
  if (isSupabaseEnabled) {
    try {
      const { error } = await supabase
        .from(storeName)
        .update(enrichedRecord)
        .eq('id', record.id);
      if (error) throw error;
      return record.id;
    } catch (err) {
      console.error(`Supabase update error on ${storeName}:`, err);
      throw err;
    }
  }

  // ── Local PostgreSQL API ───────────────────────────────
  if (isLocalApiEnabled) {
    await apiFetch(`/api/${storeName}/${record.id}`, {
      method: 'PUT',
      body: JSON.stringify(enrichedRecord),
    });
    return record.id;
  }

  // ── IndexedDB fallback ─────────────────────────────────
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initLocalDB();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(enrichedRecord);
      request.onsuccess = () => resolve(record.id);
      request.onerror   = (e) => reject(e.target.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Deletes a record from a specific store by ID.
 */
export async function deleteRecord(storeName, id) {
  // ── Supabase ───────────────────────────────────────────
  if (isSupabaseEnabled) {
    try {
      const { error } = await supabase
        .from(storeName)
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error(`Supabase delete error on ${storeName}:`, err);
      throw err;
    }
  }

  // ── Local PostgreSQL API ───────────────────────────────
  if (isLocalApiEnabled) {
    await apiFetch(`/api/${storeName}/${id}`, { method: 'DELETE' });
    return true;
  }

  // ── IndexedDB fallback ─────────────────────────────────
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initLocalDB();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(Number(id));
      request.onsuccess = () => resolve(true);
      request.onerror   = (e) => reject(e.target.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Bulk imports records into a specific store.
 */
export async function importRecords(storeName, records) {
  // ── Supabase ───────────────────────────────────────────
  if (isSupabaseEnabled) {
    try {
      const formattedRecords = records.map((record) => {
        const item = { ...record };
        delete item.id;
        if (!item.createdAt)   item.createdAt   = new Date().toISOString();
        if (!item.updatedAt)   item.updatedAt   = new Date().toISOString();
        if (!item.attachments) item.attachments = [];
        return item;
      });
      const { error } = await supabase.from(storeName).insert(formattedRecords);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error(`Supabase bulk import error on ${storeName}:`, err);
      throw err;
    }
  }

  // ── Local PostgreSQL API ───────────────────────────────
  if (isLocalApiEnabled) {
    await apiFetch(`/api/${storeName}/bulk`, {
      method: 'POST',
      body: JSON.stringify({ records }),
    });
    return true;
  }

  // ── IndexedDB fallback ─────────────────────────────────
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initLocalDB();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      transaction.oncomplete = () => resolve(true);
      transaction.onerror    = (e) => reject(e.target.error);

      records.forEach((record) => {
        const recordToSave = { ...record };
        if (recordToSave.id)          delete recordToSave.id;
        if (!recordToSave.createdAt)   recordToSave.createdAt   = new Date().toISOString();
        if (!recordToSave.updatedAt)   recordToSave.updatedAt   = new Date().toISOString();
        if (!recordToSave.attachments) recordToSave.attachments = [];
        store.add(recordToSave);
      });
    } catch (err) {
      reject(err);
    }
  });
}

// ─────────────────────────────────────────────────
// Users store convenience API
// ─────────────────────────────────────────────────
export async function getAllUsers()    { return getAllRecords('users'); }
export async function addUser(user)   { return addRecord('users', user); }
export async function updateUser(user){ return updateRecord('users', user); }
export async function deleteUser(id)  { return deleteRecord('users', id); }

// ─────────────────────────────────────────────────
// Audit Logging Functions
// ─────────────────────────────────────────────────

/**
 * Log an audit entry for tracking user actions
 */
export async function logAuditEntry(action, storeName, userId, userName, recordId, recordData, previousData = null) {
  let auditEntry;

  // Handle single object parameter (e.g. logAuditEntry({ action: 'BULK_INGESTION', details: '...', storeName: 'visa' }))
  if (action && typeof action === 'object' && !Array.isArray(action)) {
    const opts = action;
    const session = JSON.parse(localStorage.getItem('ics_auth_user') || '{}');
    auditEntry = {
      action: opts.action || 'CREATE',
      storeName: opts.storeName || opts.module || 'system',
      userId: opts.userId || session.id || 'system',
      userName: opts.userName || opts.performedBy || session.fullName || session.username || 'System Administrator',
      recordId: opts.recordId || null,
      recordData: opts.recordData || (opts.details ? { details: opts.details } : null),
      previousData: opts.previousData || null,
      timestamp: opts.timestamp || new Date().toISOString(),
      ipAddress: 'local'
    };
  } else {
    auditEntry = {
      action: typeof action === 'string' ? action : 'CREATE',
      storeName,
      userId,
      userName,
      recordId,
      recordData,
      previousData,
      timestamp: new Date().toISOString(),
      ipAddress: 'local'
    };
  }

  // ── Supabase ───────────────────────────────────────────
  if (isSupabaseEnabled) {
    try {
      const { error } = await supabase.from('audit_logs').insert([auditEntry]);
      if (error) console.error('Supabase audit log error:', error);
    } catch (err) {
      console.error('Supabase audit log exception:', err);
    }
    return auditEntry;
  }

  // ── Local PostgreSQL API ───────────────────────────────
  if (isLocalApiEnabled) {
    try {
      await apiFetch('/api/audit_logs', {
        method: 'POST',
        body: JSON.stringify(auditEntry),
      });
    } catch (err) {
      console.error('Local API audit log error:', err);
    }
    return auditEntry;
  }

  // ── IndexedDB fallback ─────────────────────────────────
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initLocalDB();
      const transaction = db.transaction('audit_logs', 'readwrite');
      const store = transaction.objectStore('audit_logs');
      const request = store.add(auditEntry);
      request.onsuccess = () => resolve(auditEntry);
      request.onerror   = (e) => reject(e.target.error);
    } catch (err) {
      console.error('Audit log error:', err);
      resolve(null);
    }
  });
}

/**
 * Get all audit logs with optional filtering
 */
export async function getAuditLogs(filters = {}) {
  const endOfDay = (dateStr) => {
    if (!dateStr) return undefined;
    return dateStr.includes('T') ? dateStr : `${dateStr}T23:59:59.999Z`;
  };

  // ── Supabase ───────────────────────────────────────────
  if (isSupabaseEnabled) {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      if (filters.action)    query = query.eq('action', filters.action);
      if (filters.storeName) query = query.eq('storeName', filters.storeName);
      if (filters.userId)    query = query.eq('userId', filters.userId);
      if (filters.startDate) query = query.gte('timestamp', filters.startDate);
      if (filters.endDate)   query = query.lte('timestamp', endOfDay(filters.endDate));

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Supabase getAuditLogs error:', err);
      throw err;
    }
  }

  // ── Local PostgreSQL API ───────────────────────────────
  if (isLocalApiEnabled) {
    const params = new URLSearchParams();
    if (filters.action)    params.append('action',    filters.action);
    if (filters.storeName) params.append('storeName', filters.storeName);
    if (filters.userId)    params.append('userId',    filters.userId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate)   params.append('endDate',   endOfDay(filters.endDate));

    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/api/audit_logs${qs}`);
  }

  // ── IndexedDB fallback ─────────────────────────────────
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initLocalDB();
      const transaction = db.transaction('audit_logs', 'readonly');
      const store = transaction.objectStore('audit_logs');
      const request = store.getAll();

      request.onsuccess = () => {
        let logs = (request.result || []).sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );

        if (filters.action)    logs = logs.filter(l => l.action    === filters.action);
        if (filters.storeName) logs = logs.filter(l => l.storeName === filters.storeName);
        if (filters.userId)    logs = logs.filter(l => l.userId    === filters.userId);
        if (filters.startDate) logs = logs.filter(l => new Date(l.timestamp) >= new Date(filters.startDate));
        if (filters.endDate)   logs = logs.filter(l => new Date(l.timestamp) <= new Date(endOfDay(filters.endDate)));

        resolve(logs);
      };
      request.onerror = (e) => reject(e.target.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Clear old audit logs (keep last N days)
 */
export async function clearOldAuditLogs(daysToKeep = 90) {
  // ── Local PostgreSQL API ───────────────────────────────
  if (isLocalApiEnabled) {
    await apiFetch(`/api/audit_logs/old?daysToKeep=${daysToKeep}`, { method: 'DELETE' });
    return true;
  }

  // ── IndexedDB fallback (Supabase doesn't have this util endpoint) ──
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initLocalDB();
      const transaction = db.transaction('audit_logs', 'readwrite');
      const store = transaction.objectStore('audit_logs');
      const request = store.getAll();

      request.onsuccess = () => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        (request.result || []).forEach(log => {
          if (new Date(log.timestamp) < cutoffDate) store.delete(log.id);
        });
      };

      transaction.oncomplete = () => resolve(true);
      transaction.onerror    = (e) => reject(e.target.error);
    } catch (err) {
      reject(err);
    }
  });
}

// ─────────────────────────────────────────────────
// Recycle Bin Functions
// ─────────────────────────────────────────────────

/**
 * Get all records in the recycle bin.
 */
export async function getRecycleBinRecords() {
  return getAllRecords('recycle_bin');
}

/**
 * Permanently delete a record from the recycle bin.
 */
export async function deletePermanently(id) {
  return deleteRecord('recycle_bin', id);
}

/**
 * Restore a record from the recycle bin to its original store.
 */
export async function restoreRecord(recycleRecord) {
  const { originalStore, recordData } = recycleRecord;
  await addRecord(originalStore, recordData);
  await deleteRecord('recycle_bin', recycleRecord.id);
  return true;
}

/**
 * Empty all items from the recycle bin.
 */
export async function emptyRecycleBin() {
  // ── Supabase ───────────────────────────────────────────
  if (isSupabaseEnabled) {
    try {
      const { error } = await supabase.from('recycle_bin').delete().neq('id', 0);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Supabase empty recycle bin error:', err);
      throw err;
    }
  }

  // ── Local PostgreSQL API ───────────────────────────────
  if (isLocalApiEnabled) {
    await apiFetch('/api/recycle_bin/all', { method: 'DELETE' });
    return true;
  }

  // ── IndexedDB fallback ─────────────────────────────────
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initLocalDB();
      const transaction = db.transaction('recycle_bin', 'readwrite');
      const store = transaction.objectStore('recycle_bin');
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror   = (e) => reject(e.target.error);
    } catch (err) {
      reject(err);
    }
  });
}

// ═══════════════════════════════════════════════════════
//   SYSTEM CONFIGURATION / DYNAMIC MODULES
// ═══════════════════════════════════════════════════════

const LOCAL_STORAGE_MODULES_KEY = 'ics_custom_modules_cache';

/**
 * Fetch all dynamic system modules.
 */
export async function getSystemModules() {
  if (isLocalApiEnabled) {
    try {
      const modules = await apiFetch('/api/system-modules');
      localStorage.setItem(LOCAL_STORAGE_MODULES_KEY, JSON.stringify(modules));
      return modules;
    } catch (err) {
      console.warn('Failed to fetch system modules from API, checking local cache:', err);
    }
  }

  // Fallback to localStorage cache
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_MODULES_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (_) {
    return [];
  }
}

/**
 * Create a new dynamic system module.
 */
export async function addSystemModule(moduleData) {
  if (isLocalApiEnabled) {
    const created = await apiFetch('/api/system-modules', {
      method: 'POST',
      body: JSON.stringify(moduleData)
    });
    // Update local cache
    const existing = await getSystemModules();
    const updated = [...existing.filter(m => m.key !== created.key), created];
    localStorage.setItem(LOCAL_STORAGE_MODULES_KEY, JSON.stringify(updated));
    return created;
  }

  // Local fallback
  const existing = await getSystemModules();
  const newMod = {
    id: Date.now(),
    ...moduleData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  existing.push(newMod);
  localStorage.setItem(LOCAL_STORAGE_MODULES_KEY, JSON.stringify(existing));
  return newMod;
}

/**
 * Update an existing dynamic system module.
 */
export async function updateSystemModule(id, moduleData) {
  if (isLocalApiEnabled) {
    const updated = await apiFetch(`/api/system-modules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(moduleData)
    });
    const existing = await getSystemModules();
    const list = existing.map(m => m.id === id || m.id === Number(id) ? updated : m);
    localStorage.setItem(LOCAL_STORAGE_MODULES_KEY, JSON.stringify(list));
    return updated;
  }

  // Local fallback
  const existing = await getSystemModules();
  const list = existing.map(m => m.id === id || m.id === Number(id) ? { ...m, ...moduleData, updatedAt: new Date().toISOString() } : m);
  localStorage.setItem(LOCAL_STORAGE_MODULES_KEY, JSON.stringify(list));
  return list.find(m => m.id === id || m.id === Number(id));
}

/**
 * Delete a dynamic system module.
 */
export async function deleteSystemModule(id) {
  if (isLocalApiEnabled) {
    await apiFetch(`/api/system-modules/${id}`, { method: 'DELETE' });
  }
  const existing = await getSystemModules();
  const list = existing.filter(m => m.id !== id && m.id !== Number(id));
  localStorage.setItem(LOCAL_STORAGE_MODULES_KEY, JSON.stringify(list));
  return true;
}

// ═══════════════════════════════════════════════════════
//   SYSTEM DYNAMIC CLASSIFICATIONS & VISA TYPES
// ═══════════════════════════════════════════════════════

const LOCAL_STORAGE_CLASSIFICATIONS_KEY = 'ics_system_classifications';

export const DEFAULT_CLASSIFICATIONS = {
  visaTypes: [
    'Medical Treatment Visa',
    'Sports Competition and Training Visa',
    'Residence Visa',
    'Religion Visa',
    'Student Visa',
    'Entertainment Industry Visa',
    'Private Work Visa',
    'NGO Visa-NV',
    'Government Work Visa',
    'Investment Visa',
    'Tourist Visa',
    'Workshop/Conference Visa',
    'Journalist Visa'
  ],
  residenceTypes: [
    { key: 'PERMANENT', label: 'Permanent ID' },
    { key: 'TEMPORARY', label: 'Temporary ID' }
  ],
  etdTypes: [
    { key: 'RRS', label: 'RRS — Regional Refugee Status (RRS)' },
    { key: 'UNHCR', label: 'UNHCR — United Nations High Commissioner for Refugees' },
    { key: 'IOM', label: 'IOM — International Organization for Migration' }
  ]
};

export async function getSystemClassifications() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CLASSIFICATIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      let vTypes = parsed.visaTypes && parsed.visaTypes.length > 0 ? parsed.visaTypes : DEFAULT_CLASSIFICATIONS.visaTypes;
      
      // Clean up typos and case-insensitive duplicates (e.g. 'STUDET VISA')
      const seen = new Set();
      const cleanedTypes = [];
      for (const t of vTypes) {
        if (!t || typeof t !== 'string') continue;
        const trimmed = t.trim();
        const norm = trimmed.toUpperCase();
        // Remove known accidental typo 'STUDET VISA' if Student Visa exists
        if (norm === 'STUDET VISA') continue;
        if (!seen.has(norm)) {
          seen.add(norm);
          cleanedTypes.push(trimmed);
        }
      }

      const result = {
        ...DEFAULT_CLASSIFICATIONS,
        ...parsed,
        visaTypes: cleanedTypes.length > 0 ? cleanedTypes : DEFAULT_CLASSIFICATIONS.visaTypes,
      };

      // Persist cleaned list if any typos or duplicates were removed
      if (vTypes.length !== cleanedTypes.length) {
        localStorage.setItem(LOCAL_STORAGE_CLASSIFICATIONS_KEY, JSON.stringify(result));
      }
      return result;
    }
  } catch (e) {
    console.warn('Failed to load dynamic classifications from storage:', e);
  }
  return { ...DEFAULT_CLASSIFICATIONS };
}

export async function saveSystemClassifications(classifications) {
  try {
    localStorage.setItem(LOCAL_STORAGE_CLASSIFICATIONS_KEY, JSON.stringify(classifications));
    return classifications;
  } catch (e) {
    console.error('Failed to save classifications:', e);
    throw e;
  }
}

/**
 * Change the logged in user's password with validation
 */
export async function changeUserPassword(userId, currentPassword, newPassword) {
  const allUsers = await getAllRecords('users');
  const user = allUsers.find(u => u.id === userId || u.id === Number(userId) || (userId && u.username === String(userId)));
  if (!user) {
    throw new Error('User account not found.');
  }

  if (user.password !== currentPassword) {
    throw new Error('Incorrect current password. Please try again.');
  }

  if (!newPassword || newPassword.length < 4) {
    throw new Error('New password must be at least 4 characters long.');
  }

  const updatedUser = {
    ...user,
    password: newPassword,
    updatedAt: new Date().toISOString()
  };

  await updateRecord('users', updatedUser);

  // Update localStorage session if it's the current user
  const sessionStr = localStorage.getItem('ics_auth_user');
  if (sessionStr) {
    try {
      const session = JSON.parse(sessionStr);
      if (session.id === user.id || session.username === user.username) {
        session.password = newPassword;
        localStorage.setItem('ics_auth_user', JSON.stringify(session));
      }
    } catch (_) {}
  }

  await logAuditEntry({
    action: 'UPDATE',
    storeName: 'users',
    userId: user.id,
    userName: user.fullName || user.username,
    recordId: user.id,
    details: 'User updated their personal account password.'
  }).catch(() => {});

  return true;
}

// ─────────────────────────────────────────────────
//   MODULAR MODULE REGISTRY & CONFIGURATION
// ─────────────────────────────────────────────────

const MODULE_OVERRIDES_KEY = 'ics_module_overrides';

export function getModuleOverrides() {
  try {
    const raw = localStorage.getItem(MODULE_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

export function saveModuleOverride(key, overrideData) {
  try {
    const existing = getModuleOverrides();
    existing[key] = { ...(existing[key] || {}), ...overrideData };
    localStorage.setItem(MODULE_OVERRIDES_KEY, JSON.stringify(existing));
    return existing;
  } catch (err) {
    console.error('Failed to save module override:', err);
    return {};
  }
}

export function toggleModuleActiveStatus(key, isActive) {
  return saveModuleOverride(key, { isActive });
}

