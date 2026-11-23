/* Volleyball Scouting – Browser-Datenbank (IndexedDB): Dokumente unter einem Pfad, dazu Datei-Griffe für Videos */
(function () {
  'use strict';
  const NAME = 'volleyball-scouting', DOCS = 'docs', HANDLES = 'handles';
  let dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!window.indexedDB) { rej(new Error('IndexedDB fehlt')); return; }
      const r = indexedDB.open(NAME, 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains(DOCS)) d.createObjectStore(DOCS, { keyPath: 'path' });
        if (!d.objectStoreNames.contains(HANDLES)) d.createObjectStore(HANDLES);
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function tx(store, mode, fn) {
    const d = await open();
    return new Promise((res, rej) => {
      const t = d.transaction(store, mode);
      let out;
      const q = fn(t.objectStore(store));
      if (q) q.onsuccess = () => { out = q.result; };
      t.oncomplete = () => res(out);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  }
  window.VIDB = {
    open,
    all: () => tx(DOCS, 'readonly', (s) => s.getAll()),
    put: (path, data) => tx(DOCS, 'readwrite', (s) => s.put({ path, data })),
    del: (path) => tx(DOCS, 'readwrite', (s) => s.delete(path)),
    clear: () => tx(DOCS, 'readwrite', (s) => s.clear()),
    putHandle: (id, h) => tx(HANDLES, 'readwrite', (s) => s.put(h, id)),
    getHandle: (id) => tx(HANDLES, 'readonly', (s) => s.get(id)),
  };
})();
