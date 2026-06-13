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
const DB_VERSION = 4;
const STORES = ['visa', 'eoid', 'eoid_normal', 'eoid_underage', 'residence_id', 'etd', 'eritrean_id', 'alien_passport', 'yellow_card', 'users'];

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
