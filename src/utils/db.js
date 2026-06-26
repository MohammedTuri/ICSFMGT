import { createClient } from '@supabase/supabase-js';

// Retrieve credentials from Vite env variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase variables are set to determine active driver
export const isSupabaseEnabled = !!(supabaseUrl && supabaseUrl !== 'your_supabase_project_url' && supabaseAnonKey);

export const supabase = isSupabaseEnabled ? createClient(supabaseUrl, supabaseAnonKey) : null;

if (isSupabaseEnabled) {
  console.log('FMS Database mode: Cloud Database (Supabase Connected)');
} else {
  console.log('FMS Database mode: Local Offline-Capable (IndexedDB Fallback Active)');
}

// ═══════════════════════════════════════════════
//   LOCAL INDEXEDDB FALLBACK (Backward Compatibility)
// ════════════════════════════════════════════════
const DB_NAME = 'ics_file_management_db';
const DB_VERSION = 5;
const STORES = ['visa', 'eoid', 'eoid_normal', 'eoid_underage', 'residence_id', 'etd', 'eritrean_id', 'alien_passport', 'yellow_card', 'users', 'audit_logs'];

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
      personalId: 'EOID-000',
      fullName: 'Lydia Tesfaye',
      passportNumber: 'EP2002002',
      boxNumber: 'BOX-002',
      date: '2026-04-22',
      serviceProvided: 'EOID REGISTRATION',
      citizenship: 'ETHIOPIA',
      eoidNumber: 'EOID-0001'
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
  yellow_card: [
    {
      personalId: 'YC-001',
      fullName: 'Sarah Mengistu',
      passportNumber: 'EP8018008',
      boxNumber: 'BOX-008',
      date: '2026-05-03',
      serviceProvided: 'YELLOW CARD ISSUE',
      citizenship: 'ETHIOPIA',
      yellowCardNumber: 'YC-1001'
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
    transaction.onerror = () => resolve();
  });
}

export function initLocalDB() {
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

// ═══════════════════════════════════════════════
//   UNIFIED DATABASE API (Dual Driver Adapter)
// ════════════════════════════════════════════════

/**
 * Retrieves all records from a specific store.
 */
export async function getAllRecords(storeName) {
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

  // Local fallback
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initLocalDB();
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
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
  const enrichedRecord = {
    ...record,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (isSupabaseEnabled) {
    try {
      // Supabase autoincrements id, omit if empty or local index
      const saveObject = { ...enrichedRecord };
      delete saveObject.id;

      const { data, error } = await supabase
        .from(storeName)
        .insert([saveObject])
        .select();

      if (error) throw error;
      return data && data[0] ? data[0].id : true;
    } catch (err) {
      console.error(`Supabase write error on ${storeName}:`, err);
      throw err;
    }
  }

  // Local fallback
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initLocalDB();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(enrichedRecord);

      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (e) => reject(e.target.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Updates an existing record in a specific store.
 */
export async function updateRecord(storeName, record) {
  if (!record.id) {
    throw new Error('Record ID is required for updates');
  }

  const enrichedRecord = {
    ...record,
    updatedAt: new Date().toISOString()
  };

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

  // Local fallback
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initLocalDB();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(enrichedRecord);

      request.onsuccess = () => resolve(record.id);
      request.onerror = (e) => reject(e.target.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Deletes a record from a specific store by ID.
 */
export async function deleteRecord(storeName, id) {
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

  // Local fallback
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initLocalDB();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(Number(id));

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Bulk imports records into a specific store.
 */
export async function importRecords(storeName, records) {
  if (isSupabaseEnabled) {
    try {
      const formattedRecords = records.map((record) => {
        const item = { ...record };
        delete item.id; // Let database generate autoincrement ID
        if (!item.createdAt) item.createdAt = new Date().toISOString();
        if (!item.updatedAt) item.updatedAt = new Date().toISOString();
        if (!item.attachments) item.attachments = [];
        return item;
      });

      const { error } = await supabase
        .from(storeName)
        .insert(formattedRecords);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error(`Supabase bulk import error on ${storeName}:`, err);
      throw err;
    }
  }

  // Local fallback
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initLocalDB();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = (e) => reject(e.target.error);

      records.forEach((record) => {
        const recordToSave = { ...record };
        if (recordToSave.id) {
          delete recordToSave.id;
        }
        if (!recordToSave.createdAt) recordToSave.createdAt = new Date().toISOString();
        if (!recordToSave.updatedAt) recordToSave.updatedAt = new Date().toISOString();
        if (!recordToSave.attachments) recordToSave.attachments = [];
        store.add(recordToSave);
      });
    } catch (err) {
      reject(err);
    }
  });
}

// -------------------------
// Users store convenience API
// -------------------------
export async function getAllUsers() {
  return getAllRecords('users');
}

export async function addUser(user) {
  return addRecord('users', user);
}

export async function updateUser(user) {
  return updateRecord('users', user);
}

export async function deleteUser(id) {
  return deleteRecord('users', id);
}

// ─────────────────────────────────────────────────
// Audit Logging Functions
// ─────────────────────────────────────────────────

/**
 * Log an audit entry for tracking user actions
 */
export async function logAuditEntry(action, storeName, userId, userName, recordId, recordData, previousData = null) {
  const auditEntry = {
    action, // 'CREATE', 'UPDATE', 'DELETE', 'IMPORT'
    storeName,
    userId,
    userName,
    recordId,
    recordData,
    previousData,
    timestamp: new Date().toISOString(),
    ipAddress: 'local'
  };

  // ── Supabase path ──────────────────────────────────────────
  if (isSupabaseEnabled) {
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert([auditEntry]);
      if (error) {
        console.error('Supabase audit log error:', error);
      }
    } catch (err) {
      console.error('Supabase audit log exception:', err);
    }
    return auditEntry;
  }

  // ── IndexedDB fallback ─────────────────────────────────────
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initLocalDB();
      const transaction = db.transaction('audit_logs', 'readwrite');
      const store = transaction.objectStore('audit_logs');
      const request = store.add(auditEntry);

      request.onsuccess = () => resolve(auditEntry);
      request.onerror = (e) => reject(e.target.error);
    } catch (err) {
      console.error('Audit log error:', err);
      // Don't reject to prevent blocking main operations
      resolve(null);
    }
  });
}

/**
 * Get all audit logs with optional filtering
 */
export async function getAuditLogs(filters = {}) {
  // Helper: push endDate to end of that day so the full day is included
  const endOfDay = (dateStr) => {
    if (!dateStr) return undefined;
    return dateStr.includes('T') ? dateStr : `${dateStr}T23:59:59.999Z`;
  };

  // ── Supabase path ──────────────────────────────────────────
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

  // ── IndexedDB fallback ─────────────────────────────────────
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initLocalDB();
      const transaction = db.transaction('audit_logs', 'readonly');
      const store = transaction.objectStore('audit_logs');
      const request = store.getAll();

      request.onsuccess = () => {
        let logs = (request.result || []).sort((a, b) => {
          return new Date(b.timestamp) - new Date(a.timestamp);
        });

        // Apply filters
        if (filters.action) {
          logs = logs.filter(log => log.action === filters.action);
        }
        if (filters.storeName) {
          logs = logs.filter(log => log.storeName === filters.storeName);
        }
        if (filters.userId) {
          logs = logs.filter(log => log.userId === filters.userId);
        }
        if (filters.startDate) {
          logs = logs.filter(log => new Date(log.timestamp) >= new Date(filters.startDate));
        }
        if (filters.endDate) {
          // Include the full end day
          logs = logs.filter(log => new Date(log.timestamp) <= new Date(endOfDay(filters.endDate)));
        }

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
          if (new Date(log.timestamp) < cutoffDate) {
            store.delete(log.id);
          }
        });
      };

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = (e) => reject(e.target.error);
    } catch (err) {
      reject(err);
    }
  });
}

