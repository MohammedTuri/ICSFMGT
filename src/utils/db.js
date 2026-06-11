const DB_NAME = 'ics_file_management_db';
const DB_VERSION = 4; // Added eoid_normal and eoid_underage stores
const STORES = ['visa', 'eoid', 'eoid_normal', 'eoid_underage', 'residence_id', 'etd', 'eritrean_id', 'alien_passport', 'yellow_card', 'users'];

/**
 * Initializes the IndexedDB database and seeds default admin.
 */
export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Database failed to open:', event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      
      // Self-seeding default admin if empty
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
            console.log('Default Administrator account seeded (username: admin, password: admin123).');
          }
        };
      } catch (e) {
        console.warn('Seeding skipped or store not ready.');
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

/**
 * Retrieves all records from a specific store.
 */
export function getAllRecords(storeName) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initDB();
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = request.result || [];
        // Sort descending by id
        records.sort((a, b) => b.id - a.id);
        resolve(records);
      };

      request.onerror = (e) => {
        reject(e.target.error);
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Adds a new record to a specific store.
 */
export function addRecord(storeName, record) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initDB();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const enrichedRecord = {
        ...record,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const request = store.add(enrichedRecord);

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (e) => {
        reject(e.target.error);
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Updates an existing record in a specific store.
 */
export function updateRecord(storeName, record) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!record.id) {
        return reject(new Error('Record ID is required for updates'));
      }
      
      const db = await initDB();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      const enrichedRecord = {
        ...record,
        updatedAt: new Date().toISOString()
      };

      const request = store.put(enrichedRecord);

      request.onsuccess = () => {
        resolve(record.id);
      };

      request.onerror = (e) => {
        reject(e.target.error);
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Deletes a record from a specific store by ID.
 */
export function deleteRecord(storeName, id) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initDB();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(Number(id));

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = (e) => {
        reject(e.target.error);
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Bulk imports records into a specific store.
 */
export function importRecords(storeName, records) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initDB();
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      transaction.oncomplete = () => {
        resolve(true);
      };

      transaction.onerror = (e) => {
        reject(e.target.error);
      };

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
