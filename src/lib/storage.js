/**
 * Sheggar Wheels Browser Storage System
 * Clean, safe wrapper around localStorage & sessionStorage with JSON parsing,
 * quota handling, seed initialization, and cross-tab/in-tab change subscriptions.
 */

import {
  SEED_USERS,
  SEED_CARS,
  SEED_BOOKINGS,
  SEED_REVIEWS,
  SEED_DISPUTES,
  SEED_ANNOUNCEMENTS,
  SEED_ACTIVITY,
  DEFAULT_SETTINGS,
} from './seed';

export const STORAGE_KEYS = {
  USERS: 'sw_users_v1',
  CARS: 'sw_cars_v1',
  BOOKINGS: 'sw_bookings_v1',
  REVIEWS: 'sw_reviews_v1',
  DISPUTES: 'sw_disputes_v1',
  ANNOUNCEMENTS: 'sw_announcements_v1',
  ACTIVITY: 'sw_activity_v1',
  SETTINGS: 'sw_settings_v1',
  SESSION: 'sw_session_v1',
  CHECKOUT_DRAFT: 'sw_checkout_draft_v1',
};

/**
 * Determine if key belongs in sessionStorage.
 * NOTE: All keys now use localStorage for network-link compatibility.
 * sessionStorage is per-tab AND per-origin — switching between localhost:3000
 * and a network IP (192.168.x.x:3000) gives a completely empty sessionStorage,
 * making the app appear logged out on the network link.
 * We use localStorage for everything and rely on explicit sign-out to clear it.
 * @param {string} _key
 * @returns {boolean}
 */
export function isSessionKey(_key) {
  return false; // All keys use localStorage
}

/**
 * Safe unique ID generator with fallback
 * @param {string} [prefix]
 * @returns {string}
 */
export function generateId(prefix = '') {
  let uuid;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    uuid = crypto.randomUUID();
  } else {
    uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  return prefix ? `${prefix}-${uuid.slice(0, 8)}` : uuid;
}

/**
 * Get target storage engine (localStorage vs sessionStorage)
 * @param {string} key
 * @returns {Storage|null}
 */
function getStorageEngine(key) {
  if (typeof window === 'undefined') return null;
  return isSessionKey(key) ? window.sessionStorage : window.localStorage;
}

/**
 * Read data from browser storage with fallback and corrupted data recovery
 * @param {string} key
 * @param {any} fallback
 * @returns {any}
 */
export function readStorage(key, fallback = null) {
  const engine = getStorageEngine(key);
  if (!engine) return fallback;

  try {
    const raw = engine.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[Storage] Failed to parse key "${key}". Recovering with fallback:`, err);
    return fallback;
  }
}

/**
 * Write data to browser storage with quota error handling
 * @param {string} key
 * @param {any} value
 * @returns {boolean} true on success, false on quota/error
 */
export function writeStorage(key, value) {
  const engine = getStorageEngine(key);
  if (!engine) return false;

  try {
    const serialized = JSON.stringify(value);
    engine.setItem(key, serialized);

    // Dispatch custom in-tab event for reactive components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('sheggar_storage_change', {
          detail: { key, value },
        })
      );
    }
    return true;
  } catch (err) {
    if (err && (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014)) {
      console.error(`[Storage] Quota exceeded while writing key "${key}":`, err);
    } else {
      console.error(`[Storage] Failed to write key "${key}":`, err);
    }
    return false;
  }
}

/**
 * Remove key from storage
 * @param {string} key
 */
export function removeStorage(key) {
  const engine = getStorageEngine(key);
  if (!engine) return;

  engine.removeItem(key);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('sheggar_storage_change', {
        detail: { key, value: null },
      })
    );
  }
}

/**
 * Initialize demo data in localStorage if keys are not present
 * Seed only if keys are absent
 */
export function initializeDemoData() {
  if (typeof window === 'undefined') return;

  const existingUsers = readStorage(STORAGE_KEYS.USERS, null);
  if (!existingUsers) {
    writeStorage(STORAGE_KEYS.USERS, SEED_USERS);
  }

  const existingCars = readStorage(STORAGE_KEYS.CARS, null);
  if (!existingCars) {
    writeStorage(STORAGE_KEYS.CARS, SEED_CARS);
  }

  const existingBookings = readStorage(STORAGE_KEYS.BOOKINGS, null);
  if (!existingBookings) {
    writeStorage(STORAGE_KEYS.BOOKINGS, SEED_BOOKINGS);
  }

  const existingReviews = readStorage(STORAGE_KEYS.REVIEWS, null);
  if (!existingReviews) {
    writeStorage(STORAGE_KEYS.REVIEWS, SEED_REVIEWS);
  }

  const existingDisputes = readStorage(STORAGE_KEYS.DISPUTES, null);
  if (!existingDisputes) {
    writeStorage(STORAGE_KEYS.DISPUTES, SEED_DISPUTES);
  }

  const existingAnnouncements = readStorage(STORAGE_KEYS.ANNOUNCEMENTS, null);
  if (!existingAnnouncements) {
    writeStorage(STORAGE_KEYS.ANNOUNCEMENTS, SEED_ANNOUNCEMENTS);
  }

  const existingActivity = readStorage(STORAGE_KEYS.ACTIVITY, null);
  if (!existingActivity) {
    writeStorage(STORAGE_KEYS.ACTIVITY, SEED_ACTIVITY);
  }

  const existingSettings = readStorage(STORAGE_KEYS.SETTINGS, null);
  if (!existingSettings) {
    writeStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  }
}

/**
 * Reset all demo data back to clean initial seed
 * Clearly labelled dev control
 */
export function resetDemoData() {
  if (typeof window === 'undefined') return;

  writeStorage(STORAGE_KEYS.USERS, SEED_USERS);
  writeStorage(STORAGE_KEYS.CARS, SEED_CARS);
  writeStorage(STORAGE_KEYS.BOOKINGS, SEED_BOOKINGS);
  writeStorage(STORAGE_KEYS.REVIEWS, SEED_REVIEWS);
  writeStorage(STORAGE_KEYS.DISPUTES, SEED_DISPUTES);
  writeStorage(STORAGE_KEYS.ANNOUNCEMENTS, SEED_ANNOUNCEMENTS);
  writeStorage(STORAGE_KEYS.ACTIVITY, SEED_ACTIVITY);
  writeStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);

  // Clear session & checkout draft
  removeStorage(STORAGE_KEYS.SESSION);
  removeStorage(STORAGE_KEYS.CHECKOUT_DRAFT);
}

/**
 * Subscribe to storage changes across tabs and inside the active tab
 * @param {Function} callback - ({ key, value }) => void
 * @returns {Function} cleanup unsubscribe function
 */
export function subscribeToStorageChanges(callback) {
  if (typeof window === 'undefined') return () => { };

  const handleCustomEvent = (event) => {
    if (event.detail && callback) {
      callback(event.detail);
    }
  };

  const handleNativeStorage = (event) => {
    if (event.key && callback) {
      try {
        const parsed = event.newValue ? JSON.parse(event.newValue) : null;
        callback({ key: event.key, value: parsed });
      } catch {
        callback({ key: event.key, value: event.newValue });
      }
    }
  };

  window.addEventListener('sheggar_storage_change', handleCustomEvent);
  window.addEventListener('storage', handleNativeStorage);

  return () => {
    window.removeEventListener('sheggar_storage_change', handleCustomEvent);
    window.removeEventListener('storage', handleNativeStorage);
  };
}
