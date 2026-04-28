/**
 * A lightweight wrapper around native IndexedDB for caching base64 audio strings.
 * This prevents burning API credits on page reloads for exactly the same text.
 */

const DB_NAME = 'TTS_Cache_DB';
const STORE_NAME = 'audio_cache';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function initDB(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            reject('IndexedDB is not supported in this environment.');
            return;
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("IndexedDB initialization error:", event);
            reject(request.error);
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });

    return dbPromise;
}

export async function getCachedAudio(key: string): Promise<string | null> {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);

            request.onsuccess = () => {
                resolve(request.result || null);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    } catch (error) {
        console.warn("Failed to read from IndexedDB:", error);
        return null; // Fallback gracefully
    }
}

export async function cacheAudio(key: string, base64Data: string): Promise<void> {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(base64Data, key);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    } catch (error) {
        console.warn("Failed to write to IndexedDB:", error);
    }
}
