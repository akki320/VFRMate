// Installs a fake IndexedDB (indexedDB/IDBKeyRange globals) so the
// src/store/ persistence layer can be unit-tested under Vitest's Node
// environment, without a real browser.
import 'fake-indexeddb/auto'
