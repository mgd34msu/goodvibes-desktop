// Vitest resolves 'electron' here (vitest.config.ts alias) so unit tests never
// depend on the real Electron binary having downloaded. The real module throws
// at require time when its dist folder is missing, which made two suites'
// results depend on install-time network behavior. Only the surface unit tests
// actually touch is stubbed; anything new that needs more should extend this
// stub rather than un-alias the module.
import path from 'path';
import os from 'os';

const tmpBase = path.join(os.tmpdir(), 'goodvibes-desktop-test');

export const app = {
  getPath: (name: string): string => path.join(tmpBase, name),
  getName: (): string => 'GoodVibes',
  getVersion: (): string => '0.0.0-test',
  isPackaged: false,
  on: (): void => undefined,
  whenReady: (): Promise<void> => Promise.resolve(),
};

export const ipcMain = {
  handle: (): void => undefined,
  on: (): void => undefined,
  removeHandler: (): void => undefined,
};

export const ipcRenderer = {
  invoke: (): Promise<undefined> => Promise.resolve(undefined),
  on: (): void => undefined,
  send: (): void => undefined,
};

export const shell = {
  openExternal: (): Promise<void> => Promise.resolve(),
};

export const safeStorage = {
  isEncryptionAvailable: (): boolean => false,
  encryptString: (value: string): Buffer => Buffer.from(value, 'utf8'),
  decryptString: (buffer: Buffer): string => buffer.toString('utf8'),
  getSelectedStorageBackend: (): string => 'unknown',
};

export const BrowserWindow = class {
  static getAllWindows(): unknown[] { return []; }
};

export const contextBridge = {
  exposeInMainWorld: (): void => undefined,
};

export default { app, ipcMain, ipcRenderer, shell, safeStorage, BrowserWindow, contextBridge };
