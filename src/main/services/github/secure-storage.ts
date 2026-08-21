// ============================================================================
// GITHUB SECRET STORAGE
// ============================================================================
//
// Secret material for the GitHub integration is encrypted with Electron's
// safeStorage, which delegates to the operating system credential store:
// Keychain on macOS, DPAPI on Windows, and libsecret via the desktop keyring
// on Linux. The resulting ciphertext is written into the github-auth store as
// base64.
//
// The point of the change: the previous scheme obfuscated the store with a key
// derived from hostname, platform, architecture, home directory and userData
// path. Every one of those is readable by any process running as the same
// user, so the key was derivable and the token recoverable. safeStorage keys
// are held by the OS and are not reconstructible from machine facts.
//
// When safeStorage reports that encryption is unavailable, this module falls
// back to writing the value into the obfuscated store and says so plainly
// through getSecretStorageStatus(). The fallback is exactly as strong as the
// old scheme, which is to say weak, and callers are expected to surface that
// rather than imply the secret is protected.
//
// No function in this module logs secret material. Log lines carry key names,
// value lengths and booleans only.
// ============================================================================

import { safeStorage } from 'electron';
import { Logger } from '../logger.js';
import { githubStore } from './store.js';

const logger = new Logger('GitHubSecureStorage');

// ============================================================================
// TYPES
// ============================================================================

/** The secret-bearing keys this module manages. */
export type SecretName =
  | 'accessToken'
  | 'refreshToken'
  | 'clientSecret'
  | 'customClientSecret';

export const SECRET_NAMES: readonly SecretName[] = [
  'accessToken',
  'refreshToken',
  'clientSecret',
  'customClientSecret',
] as const;

export type SecretBackend = 'os-keychain' | 'obfuscated-fallback';

export interface SecretStorageStatus {
  /** Which mechanism is actually protecting secrets right now. */
  backend: SecretBackend;
  /** Whether safeStorage reported encryption as available. */
  encryptionAvailable: boolean;
  /**
   * On Linux, which credential backend safeStorage selected. `basic_text` means
   * no keyring was found and safeStorage is not meaningfully protecting the
   * value, which is reported as a weakness rather than glossed over.
   */
  linuxBackend: string | null;
  /**
   * A plain statement of the weakness when there is one, suitable for showing
   * to a user or writing to a log. Null when secrets are OS-protected.
   */
  weakness: string | null;
}

// ============================================================================
// KEY NAMING
// ============================================================================

type SecureKey = `secure.${SecretName}`;

function secureKey(name: SecretName): SecureKey {
  return `secure.${name}`;
}

// ============================================================================
// BACKEND DETECTION
// ============================================================================

/**
 * safeStorage must not be touched before the app is ready, so availability is
 * resolved lazily on first use rather than at module load.
 */
function isEncryptionAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch (error) {
    logger.warn('safeStorage availability check threw, treating as unavailable', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * On Linux safeStorage may fall back to `basic_text`, which stores with a
 * hardcoded key and protects nothing. Electron exposes the selected backend
 * only on Linux, so this returns null elsewhere.
 */
function getLinuxBackend(): string | null {
  if (process.platform !== 'linux') {
    return null;
  }
  try {
    const getBackend = (
      safeStorage as unknown as { getSelectedStorageBackend?: () => string }
    ).getSelectedStorageBackend;
    return typeof getBackend === 'function' ? getBackend.call(safeStorage) : null;
  } catch {
    return null;
  }
}

/**
 * Report how secrets are being protected, including the honest weakness when
 * the protection is not real. Callers surface this instead of assuming
 * encryption succeeded.
 */
export function getSecretStorageStatus(): SecretStorageStatus {
  const encryptionAvailable = isEncryptionAvailable();
  const linuxBackend = getLinuxBackend();

  if (!encryptionAvailable) {
    return {
      backend: 'obfuscated-fallback',
      encryptionAvailable: false,
      linuxBackend,
      weakness:
        'The OS credential store is unavailable, so GitHub tokens are only obfuscated ' +
        'in a local file. The obfuscation key is derived from machine details that any ' +
        'program running as you can read, so treat a stored token as recoverable by ' +
        'anything running under your account, and revoke it from GitHub if this machine ' +
        'is shared or lost.',
    };
  }

  if (linuxBackend === 'basic_text') {
    return {
      backend: 'obfuscated-fallback',
      encryptionAvailable: true,
      linuxBackend,
      weakness:
        'No desktop keyring was found, so the OS credential store fell back to its ' +
        'basic_text backend, which encrypts with a fixed well-known key and protects ' +
        'nothing. Install and unlock a keyring such as gnome-keyring or kwallet to get ' +
        'real protection. Until then, treat a stored token as recoverable by anything ' +
        'running under your account.',
    };
  }

  return {
    backend: 'os-keychain',
    encryptionAvailable: true,
    linuxBackend,
    weakness: null,
  };
}

// ============================================================================
// READ AND WRITE
// ============================================================================

/**
 * Encrypt and store a secret. Falls back to the obfuscated store when
 * safeStorage is unavailable, and removes whichever representation is now
 * stale so a value never exists in both forms.
 */
export function setSecret(name: SecretName, value: string): void {
  if (!isEncryptionAvailable()) {
    githubStore.set(name, value);
    githubStore.delete(secureKey(name));
    logger.warn('Stored secret without OS encryption', {
      key: name,
      valueLength: value.length,
      backend: 'obfuscated-fallback',
    });
    return;
  }

  try {
    const ciphertext = safeStorage.encryptString(value).toString('base64');
    githubStore.set(secureKey(name), ciphertext);
    // Remove any legacy plaintext copy now that the encrypted one is authoritative.
    githubStore.delete(name);
    logger.debug('Stored secret with OS encryption', {
      key: name,
      valueLength: value.length,
      backend: 'os-keychain',
    });
  } catch (error) {
    logger.error('Failed to encrypt secret, storing via fallback', {
      key: name,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    githubStore.set(name, value);
    githubStore.delete(secureKey(name));
  }
}

/**
 * Read a secret. An encrypted value is preferred. A legacy plaintext value is
 * migrated to the encrypted form on the way out, so the first read after an
 * upgrade both returns the value and upgrades its storage.
 */
export function getSecret(name: SecretName): string | null {
  const ciphertext = githubStore.get(secureKey(name));

  if (typeof ciphertext === 'string' && ciphertext.length > 0) {
    try {
      return safeStorage.decryptString(Buffer.from(ciphertext, 'base64'));
    } catch (error) {
      // A decrypt failure means the OS key no longer matches this ciphertext,
      // for example after the value was written on another machine or the
      // keychain entry was reset. The stored value is unusable, so drop it and
      // make the caller re-authenticate rather than return a broken token.
      logger.error('Failed to decrypt stored secret, discarding it', {
        key: name,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      githubStore.delete(secureKey(name));
      return null;
    }
  }

  const legacy = githubStore.get(name);
  if (typeof legacy === 'string' && legacy.length > 0) {
    migrateSecret(name, legacy);
    return legacy;
  }

  return null;
}

/** Remove a secret in both its encrypted and legacy forms. */
export function deleteSecret(name: SecretName): void {
  githubStore.delete(secureKey(name));
  githubStore.delete(name);
}

// ============================================================================
// MIGRATION
// ============================================================================

/**
 * Re-store one legacy value through safeStorage and delete the legacy copy.
 * A no-op when safeStorage is unavailable, so the value keeps working under
 * the old scheme instead of being lost.
 */
function migrateSecret(name: SecretName, value: string): boolean {
  if (!isEncryptionAvailable()) {
    logger.debug('Leaving legacy secret in place, OS encryption unavailable', {
      key: name,
    });
    return false;
  }

  try {
    const ciphertext = safeStorage.encryptString(value).toString('base64');
    githubStore.set(secureKey(name), ciphertext);
    githubStore.delete(name);
    logger.info('Migrated secret to OS-encrypted storage', {
      key: name,
      valueLength: value.length,
    });
    return true;
  } catch (error) {
    logger.error('Failed to migrate secret, leaving legacy value in place', {
      key: name,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export interface MigrationResult {
  migrated: SecretName[];
  /** Legacy values found but left alone because safeStorage could not take them. */
  skipped: SecretName[];
  backend: SecretBackend;
}

/**
 * Move every legacy secret to safeStorage. Safe to call on every startup: keys
 * already migrated or absent are skipped silently, so this converges after one
 * successful run and costs nothing afterwards.
 */
export function migrateLegacySecrets(): MigrationResult {
  const migrated: SecretName[] = [];
  const skipped: SecretName[] = [];

  for (const name of SECRET_NAMES) {
    const legacy = githubStore.get(name);
    if (typeof legacy !== 'string' || legacy.length === 0) {
      continue;
    }
    if (migrateSecret(name, legacy)) {
      migrated.push(name);
    } else {
      skipped.push(name);
    }
  }

  const status = getSecretStorageStatus();

  if (migrated.length > 0) {
    logger.info('Legacy GitHub secrets migrated to OS-encrypted storage', {
      migratedKeys: migrated.join(','),
      count: migrated.length,
    });
  }

  if (skipped.length > 0 && status.weakness) {
    logger.warn('Legacy GitHub secrets could not be migrated', {
      skippedKeys: skipped.join(','),
      count: skipped.length,
      weakness: status.weakness,
    });
  }

  return { migrated, skipped, backend: status.backend };
}
