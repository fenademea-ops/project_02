/**
 * Sheggar Wheels Authentication & Session Utilities
 * Browser-only session stored in sessionStorage under sw_session_v1.
 * Never stores passwords, secrets, or payment credentials.
 */

import { STORAGE_KEYS, readStorage, writeStorage, removeStorage, generateId } from './storage';
import { isValidEmail, isEmailUnique, validateRequiredFields } from './validation';

/**
 * Validate and sanitize return path for redirects.
 * Strictly prevents open redirect attacks.
 * Only allows single-slash relative internal paths, rejecting //, http:, https:, javascript:, etc.
 * @param {string|null} path
 * @returns {string} Safe relative path (defaults to '/')
 */
export function safeReturnPath(path) {
  if (!path || typeof path !== 'string') return '/';

  const trimmed = path.trim();

  // Must begin with a single slash and not followed by a second slash or backslash
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return '/';
  }

  // Reject external protocols or script schemes
  if (
    trimmed.includes('://') ||
    trimmed.toLowerCase().startsWith('javascript:') ||
    trimmed.toLowerCase().startsWith('data:')
  ) {
    return '/';
  }

  return trimmed;
}

/**
 * Get current session and attached user record
 * @returns {{ session: { userId: string, signedInAt: string }|null, user: Object|null }}
 */
export function getCurrentSession() {
  if (typeof window === 'undefined') {
    return { session: null, user: null };
  }

  const session = readStorage(STORAGE_KEYS.SESSION, null);
  if (!session || !session.userId) {
    return { session: null, user: null };
  }

  const users = readStorage(STORAGE_KEYS.USERS, []);
  const user = users.find((u) => u.id === session.userId) || null;

  return { session, user };
}

/**
 * Check if user has a specific role
 * @param {Object|null} user
 * @param {string} role - 'renter' | 'owner' | 'admin'
 * @returns {boolean}
 */
export function hasRole(user, role) {
  if (!user || !Array.isArray(user.roles)) return false;
  return user.roles.includes(role);
}

/**
 * Check if user account is suspended
 * @param {Object|null} user
 * @returns {boolean}
 */
export function isUserSuspended(user) {
  return user?.status === 'suspended';
}

/**
 * Sign in as a demo user
 * @param {string} userId
 * @returns {{ success: boolean, user?: Object, error?: string }}
 */
export function signInAsDemo(userId) {
  const users = readStorage(STORAGE_KEYS.USERS, []);
  const user = users.find((u) => u.id === userId);

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  if (isUserSuspended(user)) {
    return {
      success: false,
      error: 'This account has been suspended by an administrator.',
      user,
    };
  }

  const sessionData = {
    userId: user.id,
    signedInAt: new Date().toISOString(),
  };

  writeStorage(STORAGE_KEYS.SESSION, sessionData);
  return { success: true, user };
}

/**
 * Mock email sign-in (lookup by email in demo data)
 * @param {string} email
 * @returns {{ success: boolean, user?: Object, error?: string }}
 */
export function signInWithEmail(email) {
  if (!isValidEmail(email)) {
    return { success: false, error: 'Please enter a valid email address' };
  }

  const users = readStorage(STORAGE_KEYS.USERS, []);
  const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

  if (!user) {
    return { success: false, error: 'No user registered with this email in demo data.' };
  }

  if (isUserSuspended(user)) {
    return {
      success: false,
      error: 'This account has been suspended by an administrator.',
      user,
    };
  }

  const sessionData = {
    userId: user.id,
    signedInAt: new Date().toISOString(),
  };

  writeStorage(STORAGE_KEYS.SESSION, sessionData);
  return { success: true, user };
}

/**
 * Register a new user
 * Note: Public registration can NEVER grant the 'admin' role.
 * @param {Object} payload - { name, email, phone, alsoOwner: boolean, bio }
 * @returns {{ success: boolean, user?: Object, error?: string }}
 */
export function registerUser(payload) {
  const { name, email, phone, alsoOwner, bio = '' } = payload || {};

  const required = validateRequiredFields(payload, ['name', 'email', 'phone']);
  if (!required.valid) {
    return { success: false, error: `Missing required field: ${required.missing.join(', ')}` };
  }

  if (!isValidEmail(email)) {
    return { success: false, error: 'Invalid email address' };
  }

  const users = readStorage(STORAGE_KEYS.USERS, []);
  if (!isEmailUnique(email, users)) {
    return { success: false, error: 'An account with this email already exists' };
  }

  // Set roles: default to renter, optionally add owner. Never admin.
  const roles = ['renter'];
  if (alsoOwner) {
    roles.push('owner');
  }

  const newUser = {
    id: generateId('user'),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    roles,
    status: 'active',
    bio: bio.trim(),
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  writeStorage(STORAGE_KEYS.USERS, users);

  // Automatically start session for newly registered user
  writeStorage(STORAGE_KEYS.SESSION, {
    userId: newUser.id,
    signedInAt: new Date().toISOString(),
  });

  return { success: true, user: newUser };
}

/**
 * Sign out current session and clear drafts.
 * Dispatches a custom event so React/Next.js handles routing correctly
 * regardless of the origin (localhost vs. network IP).
 */
export function signOut() {
  removeStorage(STORAGE_KEYS.SESSION);
  removeStorage(STORAGE_KEYS.CHECKOUT_DRAFT);
  if (typeof window !== 'undefined') {
    // Dispatch sign-out event; layout/RouteGuard listens and redirects via Next.js router
    window.dispatchEvent(new CustomEvent('sheggar_signout'));
    // Fallback: hard redirect after a tick in case no listener catches it
    setTimeout(() => {
      if (window.location.pathname !== '/') {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = '/';
      }
    }, 100);
  }
}
