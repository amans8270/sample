/**
 * Client-side cache integration for trip pages.
 *
 * Three-tier cache: in-memory → localStorage → IndexedDB
 * Uses stale-while-revalidate strategy.
 *
 * This is a TypeScript wrapper around the vanilla JS TripCacheService
 * (js/cache-service.js) for use in the Next.js frontend. In the static
 * site, the service is loaded as a global script. Here we implement an
 * equivalent lightweight version that works with React/Next.js.
 */

import type { GeneratedPageContent } from "@/types/page";

const KEY_PREFIX = "trip_page_";
const DEFAULT_TTL = 3600; // 1 hour
const IDB_NAME = "TripCacheDB";
const IDB_STORE = "pages";
const LARGE_THRESHOLD = 5 * 1024 * 1024; // 5 MB

interface CacheEntry {
  data: GeneratedPageContent;
  timestamp: number;
  ttl: number;
  version: string;
}

function isExpired(entry: CacheEntry): boolean {
  return Date.now() / 1000 - entry.timestamp > entry.ttl;
}

// In-memory LRU cache
const memoryCache = new Map<string, CacheEntry>();
const MAX_MEMORY = 50;

function memSet(key: string, entry: CacheEntry) {
  if (memoryCache.size >= MAX_MEMORY) {
    const oldest = memoryCache.keys().next().value;
    if (oldest) memoryCache.delete(oldest);
  }
  memoryCache.set(key, entry);
}

// IndexedDB helpers
function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<CacheEntry | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbSet(key: string, entry: CacheEntry): Promise<void> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      store.put(entry, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // silently fail
  }
}

async function idbDelete(key: string): Promise<void> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // silently fail
  }
}

// Public API

export async function getCachedPage(
  tripId: string,
): Promise<GeneratedPageContent | null> {
  const key = KEY_PREFIX + tripId;

  // 1. Memory
  const mem = memoryCache.get(key);
  if (mem && !isExpired(mem)) return mem.data;
  if (mem) memoryCache.delete(key);

  // 2. localStorage
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const entry: CacheEntry = JSON.parse(raw);
        if (!isExpired(entry)) {
          memSet(key, entry);
          return entry.data;
        }
        localStorage.removeItem(key);
      }
    } catch {
      // corrupted entry
    }
  }

  // 3. IndexedDB
  const idbEntry = await idbGet(key);
  if (idbEntry && !isExpired(idbEntry)) {
    memSet(key, idbEntry);
    return idbEntry.data;
  }
  if (idbEntry) await idbDelete(key);

  return null;
}

export async function setCachedPage(
  tripId: string,
  data: GeneratedPageContent,
  ttl = DEFAULT_TTL,
): Promise<void> {
  const key = KEY_PREFIX + tripId;
  const entry: CacheEntry = {
    data,
    timestamp: Date.now() / 1000,
    ttl,
    version: data.version,
  };

  memSet(key, entry);

  const serialized = JSON.stringify(entry);
  if (serialized.length < LARGE_THRESHOLD) {
    try {
      localStorage.setItem(key, serialized);
    } catch {
      // quota exceeded — fall through to IndexedDB
      await idbSet(key, entry);
    }
  } else {
    await idbSet(key, entry);
  }
}

export async function invalidateCache(tripId: string): Promise<void> {
  const key = KEY_PREFIX + tripId;
  memoryCache.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
  await idbDelete(key);
}

/**
 * Fetch with stale-while-revalidate strategy.
 */
export async function fetchWithCache(
  tripId: string,
  fetchFn: () => Promise<GeneratedPageContent>,
  options?: {
    ttl?: number;
    onRevalidated?: (data: GeneratedPageContent) => void;
  },
): Promise<GeneratedPageContent> {
  const cached = await getCachedPage(tripId);

  if (cached) {
    // Return stale data immediately, revalidate in background
    fetchFn()
      .then(async (fresh) => {
        if (fresh.last_updated > cached.last_updated) {
          await setCachedPage(tripId, fresh, options?.ttl);
          options?.onRevalidated?.(fresh);
        }
      })
      .catch(() => {
        // background revalidation failed, stale data is still valid
      });
    return cached;
  }

  const fresh = await fetchFn();
  await setCachedPage(tripId, fresh, options?.ttl);
  return fresh;
}
