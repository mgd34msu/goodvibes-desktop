// ============================================================================
// WINDOW MANAGEMENT
// ============================================================================

import { BrowserWindow, app, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

// ============================================================================
// CONTENT SECURITY POLICY
// ============================================================================

/**
 * Configure Content Security Policy for the application.
 * This protects against XSS and other injection attacks.
 */
function setupContentSecurityPolicy(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const cspDirectives = [
      // Only allow scripts from same origin and inline scripts (needed for Vite HMR in dev)
      process.env['ELECTRON_RENDERER_URL']
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" // Dev mode needs eval for HMR
        : "script-src 'self'", // Production: strict
      // Styles from same origin and inline (Tailwind uses inline styles)
      "style-src 'self' 'unsafe-inline'",
      // Images from same origin, data URIs (for base64 images), and blob (for dynamic content)
      "img-src 'self' data: blob: https:",
      // Fonts from same origin and data URIs
      "font-src 'self' data:",
      // Connect to same origin and GitHub API (for GitHub integration)
      "connect-src 'self' https://api.github.com https://github.com ws://localhost:* wss://localhost:*",
      // No object/embed/base
      "object-src 'none'",
      "base-uri 'self'",
      // Forms only submit to same origin
      "form-action 'self'",
      // Frames from same origin only
      "frame-ancestors 'self'",
      // Upgrade insecure requests in production
      ...(process.env['ELECTRON_RENDERER_URL'] ? [] : ["upgrade-insecure-requests"]),
    ];

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [cspDirectives.join('; ')],
      },
    });
  });
}

export function createWindow(): BrowserWindow {
  setupContentSecurityPolicy();

  // In dev: resources folder is at project root
  // In prod: resources folder is at app root (same level as app.asar)
  const resourcesPath = app.isPackaged
    ? path.join(process.resourcesPath, '..')
    : path.join(__dirname, '..', '..');

  const iconPath = process.platform === 'win32'
    ? path.join(resourcesPath, 'resources', 'icon.ico')
    : path.join(resourcesPath, 'resources', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1a1a2e',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '..', 'preload', 'index.cjs'),
      // The Chromium sandbox is on. A sandboxed preload may only require
      // 'electron' plus the polyfilled 'events', 'timers' and 'url'. The built
      // preload bundle (out/preload/index.cjs) requires exactly one module,
      // 'electron', because every src/preload module imports only ipcRenderer
      // or contextBridge, the two shared/types imports are `import type` and so
      // are erased, and the rollupOptions externals (better-sqlite3, node-pty)
      // are never referenced from preload code. Node work happens in the main
      // process behind ipcRenderer.invoke, so nothing here needs Node at all.
      //
      // If a future preload change needs a Node built-in, move that work to an
      // IPC handler in src/main/ipc/handlers rather than turning this back off.
      sandbox: true,
      // Additional security settings
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1a1a2e',
      symbolColor: '#ffffff',
      height: 40,
    },
    frame: false,
    show: false,
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    // In dev mode, load from Vite dev server
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  return mainWindow;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function sendToRenderer(channel: string, ...args: unknown[]): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
}
