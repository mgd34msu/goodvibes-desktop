// ============================================================================
// GITHUB CREDENTIAL STORE
// ============================================================================
//
// The on-disk container for GitHub auth data. This module owns the
// electron-store instance and nothing else, so that both credentials.ts and
// secure-storage.ts can use it without importing each other.
//
// IMPORTANT: this store is NOT the security boundary for secret material.
// Its `encryptionKey` is derived from machine identifiers that any process
// running as the same user can read, so the key is derivable and the file is
// obfuscated rather than protected. Secret values (access tokens, refresh
// tokens, client secrets) go through secure-storage.ts, which encrypts them
// with the OS keychain via Electron's safeStorage before they are written
// here. The obfuscation remains as a second, weaker layer and as the fallback
// when safeStorage is unavailable.
// ============================================================================

import { app } from 'electron';
import crypto from 'crypto';
import os from 'os';
import Store from 'electron-store';
import type { GitHubUser } from '../../../shared/types/github.js';

/**
 * Derive the electron-store obfuscation key from machine identifiers.
 *
 * Every input here is readable by any process running as the same user, so a
 * process at that privilege level can recompute this key. That is why secret
 * material is encrypted by secure-storage.ts before it reaches this store.
 * What this key still buys is that the file is not plaintext on disk, so a
 * token does not leak through a casual look at the file, a screen share, or a
 * backup being browsed.
 */
function deriveObfuscationKey(): string {
  const machineInfo = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.homedir(),
    app.getPath('userData'),
  ].join('|');

  return crypto
    .createHash('sha256')
    .update(`goodvibes-github-${machineInfo}`)
    .digest('hex')
    .substring(0, 32);
}

/**
 * Keys holding secret material. These are written by secure-storage.ts under
 * their `secure.` prefixed names once safeStorage has encrypted them. The
 * unprefixed names below are the legacy layout, still read so an existing
 * install can be migrated, and still written when safeStorage is unavailable.
 */
export interface GitHubStoreSchema {
  // Legacy secret locations (pre-safeStorage). Read for migration.
  accessToken?: string;
  refreshToken?: string;
  clientSecret?: string;
  customClientSecret?: string;

  // safeStorage ciphertext, base64. Written by secure-storage.ts.
  'secure.accessToken'?: string;
  'secure.refreshToken'?: string;
  'secure.clientSecret'?: string;
  'secure.customClientSecret'?: string;

  // Non-secret values. These stay in the store as-is.
  tokenExpiresAt?: number;
  user?: GitHubUser;
  clientId?: string;
  customClientId?: string;
  customUseDeviceFlow?: boolean;
}

export const githubStore = new Store<GitHubStoreSchema>({
  name: 'github-auth',
  encryptionKey: deriveObfuscationKey(),
});
