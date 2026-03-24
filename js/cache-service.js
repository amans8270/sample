/**
 * TripCacheService - Client-side caching system for trip pages.
 *
 * Three-tier cache:
 *   1. In-memory   (fastest, session-scoped)
 *   2. localStorage (persistent, small payloads < 5 MB)
 *   3. IndexedDB    (persistent, large payloads >= 5 MB)
 *
 * Features:
 *   - Configurable TTL (default 1 hour)
 *   - Stale-while-revalidate strategy
 *   - Cache size limits (max entries)
 *   - Data consistency via last_updated comparison
 *   - Manual invalidation API
 */

var TripCacheService = (function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------
  var CONFIG = {
    DEFAULT_TTL: 3600,           // seconds (1 hour)
    MAX_MEMORY_ENTRIES: 50,
    MAX_STORAGE_ENTRIES: 200,
    LARGE_PAYLOAD_THRESHOLD: 5 * 1024 * 1024, // 5 MB
    KEY_PREFIX: "trip_page_",
    IDB_NAME: "TripCacheDB",
    IDB_STORE: "pages",
    IDB_VERSION: 1
  };

  // ---------------------------------------------------------------------------
  // In-memory cache (Map-like, with LRU eviction)
  // ---------------------------------------------------------------------------
  var memoryCache = {};
  var memoryKeys = []; // ordered oldest→newest for LRU

  function memoryGet(key) {
    if (memoryCache.hasOwnProperty(key)) {
      // Move key to end (most recently used)
      var idx = memoryKeys.indexOf(key);
      if (idx !== -1) {
        memoryKeys.splice(idx, 1);
        memoryKeys.push(key);
      }
      return memoryCache[key];
    }
    return null;
  }

  function memorySet(key, entry) {
    if (!memoryCache.hasOwnProperty(key)) {
      memoryKeys.push(key);
    } else {
      var idx = memoryKeys.indexOf(key);
      if (idx !== -1) {
        memoryKeys.splice(idx, 1);
        memoryKeys.push(key);
      }
    }
    memoryCache[key] = entry;
    // Evict oldest if over limit
    while (memoryKeys.length > CONFIG.MAX_MEMORY_ENTRIES) {
      var oldest = memoryKeys.shift();
      delete memoryCache[oldest];
    }
  }

  function memoryDelete(key) {
    if (memoryCache.hasOwnProperty(key)) {
      delete memoryCache[key];
      var idx = memoryKeys.indexOf(key);
      if (idx !== -1) {
        memoryKeys.splice(idx, 1);
      }
    }
  }

  function memoryClear() {
    memoryCache = {};
    memoryKeys = [];
  }

  // ---------------------------------------------------------------------------
  // localStorage helpers
  // ---------------------------------------------------------------------------
  function localStorageAvailable() {
    try {
      var test = "__cache_test__";
      localStorage.setItem(test, "1");
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  function lsKey(tripId) {
    return CONFIG.KEY_PREFIX + tripId;
  }

  function lsGet(tripId) {
    if (!localStorageAvailable()) return null;
    try {
      var raw = localStorage.getItem(lsKey(tripId));
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function lsSet(tripId, entry) {
    if (!localStorageAvailable()) return;
    try {
      localStorage.setItem(lsKey(tripId), JSON.stringify(entry));
      enforceLocalStorageLimit();
    } catch (e) {
      // quota exceeded – evict oldest entries and retry once
      evictOldestLocalStorage(10);
      try {
        localStorage.setItem(lsKey(tripId), JSON.stringify(entry));
      } catch (e2) {
        // give up silently
      }
    }
  }

  function lsDelete(tripId) {
    if (!localStorageAvailable()) return;
    try {
      localStorage.removeItem(lsKey(tripId));
    } catch (e) {
      // ignore
    }
  }

  function enforceLocalStorageLimit() {
    if (!localStorageAvailable()) return;
    var keys = getAllLocalStorageCacheKeys();
    if (keys.length <= CONFIG.MAX_STORAGE_ENTRIES) return;
    // Sort by timestamp ascending and remove oldest
    var entries = keys.map(function (k) {
      try {
        var parsed = JSON.parse(localStorage.getItem(k));
        return { key: k, timestamp: (parsed && parsed.timestamp) || 0 };
      } catch (e) {
        return { key: k, timestamp: 0 };
      }
    });
    entries.sort(function (a, b) { return a.timestamp - b.timestamp; });
    var toRemove = entries.length - CONFIG.MAX_STORAGE_ENTRIES;
    for (var i = 0; i < toRemove; i++) {
      localStorage.removeItem(entries[i].key);
    }
  }

  function evictOldestLocalStorage(count) {
    var keys = getAllLocalStorageCacheKeys();
    var entries = keys.map(function (k) {
      try {
        var parsed = JSON.parse(localStorage.getItem(k));
        return { key: k, timestamp: (parsed && parsed.timestamp) || 0 };
      } catch (e) {
        return { key: k, timestamp: 0 };
      }
    });
    entries.sort(function (a, b) { return a.timestamp - b.timestamp; });
    for (var i = 0; i < Math.min(count, entries.length); i++) {
      localStorage.removeItem(entries[i].key);
    }
  }

  function getAllLocalStorageCacheKeys() {
    var result = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(CONFIG.KEY_PREFIX) === 0) {
        result.push(k);
      }
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // IndexedDB helpers
  // ---------------------------------------------------------------------------
  function openIDB() {
    return new Promise(function (resolve, reject) {
      if (typeof indexedDB === "undefined") {
        return reject(new Error("IndexedDB not available"));
      }
      var request = indexedDB.open(CONFIG.IDB_NAME, CONFIG.IDB_VERSION);
      request.onupgradeneeded = function (event) {
        var db = event.target.result;
        if (!db.objectStoreNames.contains(CONFIG.IDB_STORE)) {
          var store = db.createObjectStore(CONFIG.IDB_STORE, { keyPath: "id" });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
      request.onsuccess = function (event) {
        resolve(event.target.result);
      };
      request.onerror = function (event) {
        reject(event.target.error);
      };
    });
  }

  function idbGet(tripId) {
    return openIDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(CONFIG.IDB_STORE, "readonly");
        var store = tx.objectStore(CONFIG.IDB_STORE);
        var request = store.get(CONFIG.KEY_PREFIX + tripId);
        request.onsuccess = function () {
          resolve(request.result || null);
        };
        request.onerror = function () {
          reject(request.error);
        };
      });
    });
  }

  function idbSet(tripId, entry) {
    return openIDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(CONFIG.IDB_STORE, "readwrite");
        var store = tx.objectStore(CONFIG.IDB_STORE);
        var record = Object.assign({}, entry, { id: CONFIG.KEY_PREFIX + tripId });
        store.put(record);
        tx.oncomplete = function () {
          resolve();
          enforceIDBLimit(db);
        };
        tx.onerror = function () {
          reject(tx.error);
        };
      });
    });
  }

  function idbDelete(tripId) {
    return openIDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(CONFIG.IDB_STORE, "readwrite");
        var store = tx.objectStore(CONFIG.IDB_STORE);
        store.delete(CONFIG.KEY_PREFIX + tripId);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function enforceIDBLimit(db) {
    var tx = db.transaction(CONFIG.IDB_STORE, "readwrite");
    var store = tx.objectStore(CONFIG.IDB_STORE);
    var countReq = store.count();
    countReq.onsuccess = function () {
      if (countReq.result <= CONFIG.MAX_STORAGE_ENTRIES) return;
      var toRemove = countReq.result - CONFIG.MAX_STORAGE_ENTRIES;
      var idx = store.index("timestamp");
      var cursor = idx.openCursor(); // ascending by timestamp
      var removed = 0;
      cursor.onsuccess = function (event) {
        var c = event.target.result;
        if (c && removed < toRemove) {
          store.delete(c.primaryKey);
          removed++;
          c.continue();
        }
      };
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function nowSeconds() {
    return Math.floor(Date.now() / 1000);
  }

  function isExpired(entry) {
    if (!entry || !entry.timestamp || !entry.ttl) return true;
    return (nowSeconds() - entry.timestamp) > entry.ttl;
  }

  function buildEntry(data, ttl) {
    return {
      data: data,
      timestamp: nowSeconds(),
      ttl: ttl || CONFIG.DEFAULT_TTL
    };
  }

  function payloadSize(data) {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch (e) {
      // Rough fallback
      return JSON.stringify(data).length * 2;
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * getCachedPage(tripId)
   *
   * Returns a Promise that resolves with cached data or null.
   *
   * Lookup order: memory → localStorage → IndexedDB.
   * Promotes found entries into faster tiers.
   */
  function getCachedPage(tripId) {
    // 1. In-memory
    var memEntry = memoryGet(CONFIG.KEY_PREFIX + tripId);
    if (memEntry) {
      if (!isExpired(memEntry)) {
        return Promise.resolve(memEntry.data);
      }
      // Expired – remove from memory, continue lookup
      memoryDelete(CONFIG.KEY_PREFIX + tripId);
    }

    // 2. localStorage
    var lsEntry = lsGet(tripId);
    if (lsEntry) {
      if (!isExpired(lsEntry)) {
        // Promote to memory
        memorySet(CONFIG.KEY_PREFIX + tripId, lsEntry);
        return Promise.resolve(lsEntry.data);
      }
      // Expired – clean up
      lsDelete(tripId);
    }

    // 3. IndexedDB
    return idbGet(tripId)
      .then(function (idbEntry) {
        if (idbEntry && !isExpired(idbEntry)) {
          // Promote to memory
          memorySet(CONFIG.KEY_PREFIX + tripId, idbEntry);
          return idbEntry.data;
        }
        if (idbEntry) {
          // Expired – clean up
          idbDelete(tripId).catch(function () {});
        }
        return null;
      })
      .catch(function () {
        return null;
      });
  }

  /**
   * setCachedPage(tripId, data, ttl?)
   *
   * Stores the data in the appropriate tier(s).
   * - Always stored in memory.
   * - Small payloads (< 5 MB) → localStorage.
   * - Large payloads (>= 5 MB) → IndexedDB.
   *
   * Returns a Promise.
   */
  function setCachedPage(tripId, data, ttl) {
    var entry = buildEntry(data, ttl);

    // Always cache in memory
    memorySet(CONFIG.KEY_PREFIX + tripId, entry);

    var size = payloadSize(data);
    if (size < CONFIG.LARGE_PAYLOAD_THRESHOLD) {
      // Small → localStorage
      lsSet(tripId, entry);
      return Promise.resolve();
    } else {
      // Large → IndexedDB
      return idbSet(tripId, entry).catch(function () {
        // Fallback: try localStorage anyway
        lsSet(tripId, entry);
      });
    }
  }

  /**
   * invalidateCache(tripId)
   *
   * Removes the entry for the given tripId from ALL tiers.
   * Returns a Promise.
   */
  function invalidateCache(tripId) {
    memoryDelete(CONFIG.KEY_PREFIX + tripId);
    lsDelete(tripId);
    return idbDelete(tripId).catch(function () {});
  }

  /**
   * invalidateAll()
   *
   * Clears every trip cache entry from all tiers.
   * Returns a Promise.
   */
  function invalidateAll() {
    memoryClear();

    // localStorage
    if (localStorageAvailable()) {
      getAllLocalStorageCacheKeys().forEach(function (k) {
        localStorage.removeItem(k);
      });
    }

    // IndexedDB – delete entire DB
    return new Promise(function (resolve) {
      if (typeof indexedDB === "undefined") return resolve();
      var req = indexedDB.deleteDatabase(CONFIG.IDB_NAME);
      req.onsuccess = function () { resolve(); };
      req.onerror = function () { resolve(); };
      req.onblocked = function () { resolve(); };
    });
  }

  /**
   * fetchWithCache(tripId, fetchFn, options?)
   *
   * High-level helper implementing stale-while-revalidate.
   *
   * @param {string}   tripId   - Unique trip identifier.
   * @param {function} fetchFn  - Function that returns a Promise resolving with
   *                              the page data from the backend. The response
   *                              object should include a "last_updated" field.
   * @param {object}   options  - Optional { ttl, onRevalidated }
   *   - ttl: cache TTL in seconds (default CONFIG.DEFAULT_TTL)
   *   - onRevalidated: callback(newData) fired when background refresh completes
   *                    with newer data
   *
   * Returns a Promise that resolves with the page data as quickly as possible.
   */
  function fetchWithCache(tripId, fetchFn, options) {
    options = options || {};
    var ttl = options.ttl || CONFIG.DEFAULT_TTL;
    var onRevalidated = options.onRevalidated || null;

    return getCachedPage(tripId).then(function (cachedData) {
      if (cachedData !== null) {
        // Return cached data immediately, revalidate in background
        revalidateInBackground(tripId, fetchFn, cachedData, ttl, onRevalidated);
        return cachedData;
      }

      // No cache – must fetch
      return fetchFn().then(function (freshData) {
        setCachedPage(tripId, freshData, ttl);
        return freshData;
      });
    });
  }

  /**
   * Background revalidation: fetches fresh data, compares last_updated,
   * and updates cache + fires callback if data is newer.
   */
  function revalidateInBackground(tripId, fetchFn, cachedData, ttl, onRevalidated) {
    // Use setTimeout to defer so the UI isn't blocked
    setTimeout(function () {
      fetchFn()
        .then(function (freshData) {
          var cachedTimestamp = (cachedData && cachedData.last_updated) || 0;
          var serverTimestamp = (freshData && freshData.last_updated) || 0;

          if (serverTimestamp > cachedTimestamp) {
            setCachedPage(tripId, freshData, ttl);
            if (typeof onRevalidated === "function") {
              onRevalidated(freshData);
            }
          }
        })
        .catch(function () {
          // Background refresh failed – keep serving stale data
        });
    }, 0);
  }

  /**
   * configure(overrides)
   *
   * Override default configuration values.
   * e.g. TripCacheService.configure({ DEFAULT_TTL: 7200 })
   */
  function configure(overrides) {
    if (overrides && typeof overrides === "object") {
      for (var key in overrides) {
        if (overrides.hasOwnProperty(key) && CONFIG.hasOwnProperty(key)) {
          CONFIG[key] = overrides[key];
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Expose public API
  // ---------------------------------------------------------------------------
  return {
    getCachedPage: getCachedPage,
    setCachedPage: setCachedPage,
    invalidateCache: invalidateCache,
    invalidateAll: invalidateAll,
    fetchWithCache: fetchWithCache,
    configure: configure
  };
})();
