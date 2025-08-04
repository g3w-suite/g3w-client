/**
 * Based on: localForage v1.10.0 - https://localforage.github.io/localForage/
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
 * 
 * @since 4.1.0
 */
export const idb = {
  clear() {
    window.indexedDB.deleteDatabase('default');
  },

  async open() {
    const db = window.indexedDB.open('default', 1);
    return await new Promise(ok => {
      db.onsuccess       = () => { ok(db.result); };
      db.onerror         = e  => { console.error('[idb]', e); ok(undefined); };
      db.onupgradeneeded = () => {
        if (!db.result.objectStoreNames.contains('db')) {
          const store = db.result.createObjectStore('db', { keyPath: 'name' })
          store.createIndex('name', 'name', { unique: true })
        }
      };
    });
  },

  async setItem(name, value) {
    const db = await this.open();
    if (db) {
      return await new Promise(ok => {
        const store   = db.transaction('db', 'readwrite').objectStore('db');
        const res     = store.get(name);
        res.onsuccess = () => {
          let _res;
          _res           = undefined === res.result ? store.add({ name, value }) : store.put({ name, value });
          _res.onsuccess = () => { console.info(`[idb] ${name}`, value); ok(undefined); };
          _res.onerror   = e  => { console.error(`[idb] ${name}`, value, 'error:', e); ok(e); };
        };
        res.onerror   = e => { console.error(`[idb] name: ${name} value: `, value, 'error:', e); ok(e); };
      });
    }
  },

  async getItem(name) {
    const db = await this.open();
    if (db) {
      return new Promise(ok => {
        const store   = db.transaction('db', 'readwrite').objectStore('db');
        const res     = store.get(name);
        res.onsuccess = () => { console.info(`[idb] ${name}`, res.result?.value); ok(res.result?.value); };
        res.onerror   = e => { console.error(`[idb] ${name} error:`, e); ok(undefined); };
      });
    }
  },
}
