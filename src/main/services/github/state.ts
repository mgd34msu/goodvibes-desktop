// ============================================================================
// GITHUB AUTH STATE MANAGEMENT
// ============================================================================

import { Logger } from '../logger.js';
import type { GitHubUser, GitHubAuthState, GitHubOAuthTokens } from '../../../shared/types/github.js';
import { githubStore } from './store.js';
import { getSecret, setSecret, deleteSecret } from './secure-storage.js';

const logger = new Logger('GitHubState');

// ============================================================================
// STATE
// ============================================================================

let authState: GitHubAuthState = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  tokenExpiresAt: null,
};

// ============================================================================
// STATE ACCESSORS
// ============================================================================

/**
 * Get the current access token
 */
export function getAccessToken(): string | null {
  return authState.accessToken;
}

/**
 * Check if the user is authenticated
 */
export function isAuthenticated(): boolean {
  return authState.isAuthenticated;
}

/**
 * Get the current authenticated user
 */
export function getCurrentUser(): GitHubUser | null {
  return authState.user;
}

/**
 * Get the full auth state (public - returns copy)
 */
export function getAuthState(): GitHubAuthState {
  return { ...authState };
}

/**
 * Get the internal auth state reference (for internal module use)
 */
export function getAuthStateInternal(): GitHubAuthState {
  return authState;
}

// ============================================================================
// STATE MUTATORS
// ============================================================================

/**
 * Update the auth state
 */
export function updateAuthState(newState: Partial<GitHubAuthState>): void {
  authState = { ...authState, ...newState };
}

/**
 * Reset auth state to unauthenticated
 */
export function resetAuthState(): void {
  authState = {
    isAuthenticated: false,
    user: null,
    accessToken: null,
    tokenExpiresAt: null,
  };
}

// ============================================================================
// CREDENTIAL STORAGE
// ============================================================================

/**
 * Store tokens and user information after successful authentication
 */
export function storeTokensAndUser(tokens: GitHubOAuthTokens, user: GitHubUser): void {
  setSecret('accessToken', tokens.access_token);
  if (tokens.refresh_token) {
    setSecret('refreshToken', tokens.refresh_token);
  }
  if (tokens.expires_in) {
    const expiresAt = Date.now() + tokens.expires_in * 1000;
    githubStore.set('tokenExpiresAt', expiresAt);
  }
  githubStore.set('user', user);
}

/**
 * Update stored tokens after refresh
 */
export function updateStoredTokens(tokens: GitHubOAuthTokens): void {
  setSecret('accessToken', tokens.access_token);
  if (tokens.refresh_token) {
    setSecret('refreshToken', tokens.refresh_token);
  }
  if (tokens.expires_in) {
    const expiresAt = Date.now() + tokens.expires_in * 1000;
    githubStore.set('tokenExpiresAt', expiresAt);
  }
}

/**
 * Clear all stored credentials
 */
export async function clearStoredCredentials(): Promise<void> {
  deleteSecret('accessToken');
  deleteSecret('refreshToken');
  githubStore.delete('tokenExpiresAt');
  githubStore.delete('user');
}

/**
 * Get stored credentials for initialization
 */
export function getStoredCredentials(): {
  accessToken: string | undefined;
  user: GitHubUser | undefined;
  tokenExpiresAt: number | undefined;
  refreshToken: string | undefined;
} {
  // Reading a secret migrates it from the legacy obfuscated layout to
  // OS-encrypted storage on the way out, so an existing install upgrades on
  // its first read rather than needing the user to sign in again.
  return {
    accessToken: getSecret('accessToken') ?? undefined,
    user: githubStore.get('user'),
    tokenExpiresAt: githubStore.get('tokenExpiresAt'),
    refreshToken: getSecret('refreshToken') ?? undefined,
  };
}

// ============================================================================
// LOGOUT
// ============================================================================

/**
 * Logout from GitHub and clear stored credentials
 */
export async function logout(): Promise<void> {
  logger.info('Logging out from GitHub');

  await clearStoredCredentials();
  resetAuthState();

  logger.info('GitHub logout complete');
}
