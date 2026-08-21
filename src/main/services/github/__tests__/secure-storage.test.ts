// ============================================================================
// GITHUB SECURE STORAGE TESTS
// ============================================================================
//
// These cover the four paths that matter for token safety:
//   1. store  - a secret is written as safeStorage ciphertext, never plaintext
//   2. read   - the ciphertext round-trips back to the original value
//   3. migrate- a legacy plaintext value is re-stored encrypted and deleted
//   4. fallback - when safeStorage is unavailable the weakness is reported
//                 honestly rather than the value being silently unprotected
//
// The store is backed by a real Map so assertions can inspect exactly what
// would land on disk.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// MOCKS
// ============================================================================

/**
 * vi.mock factories are hoisted above the module body, so the shared state they
 * close over has to be created with vi.hoisted rather than as plain top-level
 * constants.
 */
const h = vi.hoisted(() => {
  /** Backing map standing in for the on-disk electron-store contents. */
  const storeData = new Map<string, unknown>();

  /**
   * safeStorage stand-in. Encryption is a reversible marker rather than real
   * crypto, which is what lets a test assert that the stored bytes are not the
   * plaintext without depending on a platform keychain.
   */
  const ENCRYPTION_MARKER = 'ENCRYPTED::';

  const safeStorageState = {
    available: true,
    linuxBackend: 'gnome_libsecret' as string | null,
    encryptThrows: false,
    decryptThrows: false,
  };

  const logCalls: Array<{ level: string; args: unknown[] }> = [];

  return { storeData, ENCRYPTION_MARKER, safeStorageState, logCalls };
});

const { storeData, ENCRYPTION_MARKER, safeStorageState, logCalls } = h;

vi.mock('../store.js', () => ({
  githubStore: {
    get: (key: string) => h.storeData.get(key),
    set: (key: string, value: unknown) => {
      h.storeData.set(key, value);
    },
    delete: (key: string) => {
      h.storeData.delete(key);
    },
  },
}));

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => h.safeStorageState.available,
    encryptString: (plain: string) => {
      if (h.safeStorageState.encryptThrows) {
        throw new Error('keychain write refused');
      }
      return Buffer.from(`${h.ENCRYPTION_MARKER}${plain}`, 'utf8');
    },
    decryptString: (buf: Buffer) => {
      if (h.safeStorageState.decryptThrows) {
        throw new Error('keychain key mismatch');
      }
      const text = buf.toString('utf8');
      if (!text.startsWith(h.ENCRYPTION_MARKER)) {
        throw new Error('not ciphertext produced by this key');
      }
      return text.slice(h.ENCRYPTION_MARKER.length);
    },
    getSelectedStorageBackend: () => h.safeStorageState.linuxBackend,
  },
}));

vi.mock('../../logger.js', () => ({
  Logger: class MockLogger {
    info = (...args: unknown[]) => h.logCalls.push({ level: 'info', args });
    warn = (...args: unknown[]) => h.logCalls.push({ level: 'warn', args });
    error = (...args: unknown[]) => h.logCalls.push({ level: 'error', args });
    debug = (...args: unknown[]) => h.logCalls.push({ level: 'debug', args });
  },
}));

import {
  setSecret,
  getSecret,
  deleteSecret,
  migrateLegacySecrets,
  getSecretStorageStatus,
  SECRET_NAMES,
} from '../secure-storage.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const ACCESS_TOKEN = 'gho_exampleAccessTokenValue1234567890';
const REFRESH_TOKEN = 'ghr_exampleRefreshTokenValue1234567890';
const CLIENT_SECRET = 'example_client_secret_value';

/** Every string written into the store, flattened for plaintext scanning. */
function storedStrings(): string[] {
  return [...storeData.values()].filter((v): v is string => typeof v === 'string');
}

/** Every string that reached a log line, flattened for leak scanning. */
function loggedText(): string {
  return JSON.stringify(logCalls);
}

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
  storeData.clear();
  logCalls.length = 0;
  safeStorageState.available = true;
  safeStorageState.linuxBackend = 'gnome_libsecret';
  safeStorageState.encryptThrows = false;
  safeStorageState.decryptThrows = false;
  vi.clearAllMocks();
});

// ============================================================================
// STORE
// ============================================================================

describe('setSecret', () => {
  it('writes ciphertext under the secure key and never the plaintext', () => {
    setSecret('accessToken', ACCESS_TOKEN);

    expect(storeData.has('secure.accessToken')).toBe(true);
    expect(storeData.has('accessToken')).toBe(false);

    const stored = storeData.get('secure.accessToken') as string;
    expect(stored).not.toContain(ACCESS_TOKEN);
    expect(Buffer.from(stored, 'base64').toString('utf8')).toBe(
      `${ENCRYPTION_MARKER}${ACCESS_TOKEN}`
    );
  });

  it('removes a stale legacy plaintext copy when writing the encrypted one', () => {
    storeData.set('accessToken', 'stale_plaintext_token');

    setSecret('accessToken', ACCESS_TOKEN);

    expect(storeData.has('accessToken')).toBe(false);
    expect(storeData.has('secure.accessToken')).toBe(true);
  });

  it('does not log the secret value', () => {
    setSecret('accessToken', ACCESS_TOKEN);
    expect(loggedText()).not.toContain(ACCESS_TOKEN);
  });

  it('falls back to the obfuscated store when encryption throws', () => {
    safeStorageState.encryptThrows = true;

    setSecret('accessToken', ACCESS_TOKEN);

    expect(storeData.get('accessToken')).toBe(ACCESS_TOKEN);
    expect(storeData.has('secure.accessToken')).toBe(false);
    expect(loggedText()).not.toContain(ACCESS_TOKEN);
  });
});

// ============================================================================
// READ
// ============================================================================

describe('getSecret', () => {
  it('round-trips a stored secret', () => {
    setSecret('accessToken', ACCESS_TOKEN);
    expect(getSecret('accessToken')).toBe(ACCESS_TOKEN);
  });

  it('returns null when nothing is stored', () => {
    expect(getSecret('accessToken')).toBeNull();
  });

  it('keeps separate secrets separate', () => {
    setSecret('accessToken', ACCESS_TOKEN);
    setSecret('refreshToken', REFRESH_TOKEN);
    setSecret('clientSecret', CLIENT_SECRET);

    expect(getSecret('accessToken')).toBe(ACCESS_TOKEN);
    expect(getSecret('refreshToken')).toBe(REFRESH_TOKEN);
    expect(getSecret('clientSecret')).toBe(CLIENT_SECRET);
  });

  it('discards a ciphertext it cannot decrypt instead of returning a broken value', () => {
    setSecret('accessToken', ACCESS_TOKEN);
    safeStorageState.decryptThrows = true;

    expect(getSecret('accessToken')).toBeNull();
    // The unusable value is dropped so the caller re-authenticates.
    expect(storeData.has('secure.accessToken')).toBe(false);
  });

  it('treats an empty stored value as absent', () => {
    storeData.set('secure.accessToken', '');
    storeData.set('accessToken', '');
    expect(getSecret('accessToken')).toBeNull();
  });
});

// ============================================================================
// MIGRATE
// ============================================================================

describe('migration', () => {
  it('upgrades a legacy plaintext value on first read and deletes the original', () => {
    storeData.set('accessToken', ACCESS_TOKEN);

    // The read returns the value...
    expect(getSecret('accessToken')).toBe(ACCESS_TOKEN);

    // ...and leaves it encrypted, with the plaintext gone.
    expect(storeData.has('accessToken')).toBe(false);
    expect(storeData.has('secure.accessToken')).toBe(true);
    expect(storedStrings().some((s) => s.includes(ACCESS_TOKEN))).toBe(false);

    // A second read comes from the encrypted copy and still matches.
    expect(getSecret('accessToken')).toBe(ACCESS_TOKEN);
  });

  it('migrateLegacySecrets moves every legacy secret and reports which', () => {
    storeData.set('accessToken', ACCESS_TOKEN);
    storeData.set('refreshToken', REFRESH_TOKEN);
    storeData.set('customClientSecret', CLIENT_SECRET);

    const result = migrateLegacySecrets();

    expect(result.migrated.sort()).toEqual(
      ['accessToken', 'customClientSecret', 'refreshToken'].sort()
    );
    expect(result.skipped).toEqual([]);
    expect(result.backend).toBe('os-keychain');

    for (const name of ['accessToken', 'refreshToken', 'customClientSecret']) {
      expect(storeData.has(name)).toBe(false);
      expect(storeData.has(`secure.${name}`)).toBe(true);
    }
    expect(storedStrings().some((s) => s.includes(ACCESS_TOKEN))).toBe(false);
  });

  it('is a no-op when there is nothing to migrate', () => {
    const result = migrateLegacySecrets();
    expect(result.migrated).toEqual([]);
    expect(result.skipped).toEqual([]);
  });

  it('converges, so a second run migrates nothing', () => {
    storeData.set('accessToken', ACCESS_TOKEN);

    expect(migrateLegacySecrets().migrated).toEqual(['accessToken']);
    expect(migrateLegacySecrets().migrated).toEqual([]);
  });

  it('leaves non-secret keys untouched', () => {
    storeData.set('user', { login: 'octocat' });
    storeData.set('tokenExpiresAt', 1234567890);
    storeData.set('clientId', 'public_client_id');

    migrateLegacySecrets();

    expect(storeData.get('user')).toEqual({ login: 'octocat' });
    expect(storeData.get('tokenExpiresAt')).toBe(1234567890);
    expect(storeData.get('clientId')).toBe('public_client_id');
  });

  it('does not log migrated secret values', () => {
    storeData.set('accessToken', ACCESS_TOKEN);
    storeData.set('refreshToken', REFRESH_TOKEN);

    migrateLegacySecrets();

    const text = loggedText();
    expect(text).not.toContain(ACCESS_TOKEN);
    expect(text).not.toContain(REFRESH_TOKEN);
  });
});

// ============================================================================
// FALLBACK
// ============================================================================

describe('fallback when safeStorage is unavailable', () => {
  beforeEach(() => {
    safeStorageState.available = false;
  });

  it('still stores and reads the value so the feature keeps working', () => {
    setSecret('accessToken', ACCESS_TOKEN);
    expect(getSecret('accessToken')).toBe(ACCESS_TOKEN);
  });

  it('writes to the legacy key rather than pretending to encrypt', () => {
    setSecret('accessToken', ACCESS_TOKEN);

    expect(storeData.get('accessToken')).toBe(ACCESS_TOKEN);
    expect(storeData.has('secure.accessToken')).toBe(false);
  });

  it('reports the backend and states the weakness plainly', () => {
    const status = getSecretStorageStatus();

    expect(status.backend).toBe('obfuscated-fallback');
    expect(status.encryptionAvailable).toBe(false);
    expect(status.weakness).toBeTruthy();
    expect(status.weakness).toContain('recoverable');
  });

  it('leaves legacy values in place rather than losing them', () => {
    storeData.set('accessToken', ACCESS_TOKEN);

    const result = migrateLegacySecrets();

    expect(result.migrated).toEqual([]);
    expect(result.skipped).toEqual(['accessToken']);
    expect(result.backend).toBe('obfuscated-fallback');
    expect(storeData.get('accessToken')).toBe(ACCESS_TOKEN);
  });

  it('does not log the secret even on the unprotected path', () => {
    setSecret('accessToken', ACCESS_TOKEN);
    expect(loggedText()).not.toContain(ACCESS_TOKEN);
  });
});

// ============================================================================
// STATUS REPORTING
// ============================================================================

describe('getSecretStorageStatus', () => {
  it('reports OS protection with no weakness when encryption is available', () => {
    const status = getSecretStorageStatus();

    expect(status.backend).toBe('os-keychain');
    expect(status.encryptionAvailable).toBe(true);
    expect(status.weakness).toBeNull();
  });

  it('treats the Linux basic_text backend as unprotected and says why', () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'linux' });
    safeStorageState.linuxBackend = 'basic_text';

    try {
      const status = getSecretStorageStatus();

      expect(status.backend).toBe('obfuscated-fallback');
      // safeStorage claims availability here, which is exactly why the
      // backend name has to be checked rather than trusted.
      expect(status.encryptionAvailable).toBe(true);
      expect(status.linuxBackend).toBe('basic_text');
      expect(status.weakness).toContain('keyring');
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    }
  });

  it('treats a real Linux keyring backend as protected', () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'linux' });
    safeStorageState.linuxBackend = 'gnome_libsecret';

    try {
      const status = getSecretStorageStatus();
      expect(status.backend).toBe('os-keychain');
      expect(status.weakness).toBeNull();
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    }
  });
});

// ============================================================================
// DELETE
// ============================================================================

describe('deleteSecret', () => {
  it('removes both the encrypted and legacy representations', () => {
    storeData.set('accessToken', 'legacy_value');
    setSecret('refreshToken', REFRESH_TOKEN);
    storeData.set('secure.accessToken', 'some_ciphertext');

    deleteSecret('accessToken');

    expect(storeData.has('accessToken')).toBe(false);
    expect(storeData.has('secure.accessToken')).toBe(false);
    // Unrelated secrets survive.
    expect(getSecret('refreshToken')).toBe(REFRESH_TOKEN);
  });
});

// ============================================================================
// COVERAGE OF THE KEY SET
// ============================================================================

describe('SECRET_NAMES', () => {
  it('covers every secret-bearing key the GitHub integration stores', () => {
    expect([...SECRET_NAMES].sort()).toEqual(
      ['accessToken', 'clientSecret', 'customClientSecret', 'refreshToken'].sort()
    );
  });

  it('round-trips every declared secret name', () => {
    for (const name of SECRET_NAMES) {
      setSecret(name, `value_for_${name}`);
    }
    for (const name of SECRET_NAMES) {
      expect(getSecret(name)).toBe(`value_for_${name}`);
    }
    expect(storedStrings().some((s) => s.startsWith('value_for_'))).toBe(false);
  });
});
