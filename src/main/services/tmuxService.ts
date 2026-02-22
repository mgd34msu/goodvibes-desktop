// ============================================================================
// TMUX SERVICE
// ============================================================================
//
// Manages tmux session detection and command wrapping.
// Uses array-form execFileSync to prevent command injection.
// ============================================================================

import { execFileSync } from 'child_process';
import { getSetting } from '../database/index.js';
import { commandExists, getCommandPath } from './safeExec.js';

export type TmuxMode = 'single-session' | 'separate-sessions';

export interface TmuxWrappedCommand {
  command: string;
  args: string[];
}

export class TmuxService {
  private tmuxPath: string | null = null;

  /**
   * Detect if tmux is available on the system.
   * Returns the path to tmux if found, null otherwise.
   */
  detectTmux(): string | null {
    if (!commandExists('tmux')) {
      this.tmuxPath = null;
      return null;
    }
    this.tmuxPath = getCommandPath('tmux');
    return this.tmuxPath;
  }

  /**
   * Check if tmux is available (cached result from detectTmux).
   */
  isAvailable(): boolean {
    return this.tmuxPath !== null;
  }

  /**
   * Get the path to the tmux binary.
   */
  getTmuxPath(): string | null {
    return this.tmuxPath;
  }

  /**
   * Check if a tmux session exists.
   */
  isSessionAlive(sessionName: string): boolean {
    try {
      execFileSync('tmux', ['has-session', '-t', this.escapeSessionName(sessionName)], {
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wrap a command to run inside tmux.
   * Returns the command and args to pass to pty.spawn.
   */
  wrapCommand(
    innerCommand: string,
    innerArgs: string[],
    windowName: string
  ): TmuxWrappedCommand {
    const mode = String(getSetting('tmuxMode') || 'single-session');
    const baseName = String(getSetting('tmuxSessionName') || 'goodvibes');

    if (mode === 'separate-sessions') {
      return this.wrapSeparateSession(innerCommand, innerArgs, windowName, baseName);
    }
    return this.wrapSingleSession(innerCommand, innerArgs, windowName, baseName);
  }

  private wrapSingleSession(
    innerCommand: string,
    innerArgs: string[],
    windowName: string,
    sessionName: string
  ): TmuxWrappedCommand {
    const escapedSession = this.escapeSessionName(sessionName);
    const escapedWindow = this.escapeSessionName(windowName);

    if (this.isSessionAlive(sessionName)) {
      // Session exists — add a new window and attach to it
      return {
        command: 'tmux',
        args: [
          'new-window', '-t', escapedSession,
          '-n', escapedWindow,
          '--', innerCommand, ...innerArgs,
        ],
      };
    }

    // Session doesn't exist — create it
    return {
      command: 'tmux',
      args: [
        'new-session', '-A',
        '-s', escapedSession,
        '-n', escapedWindow,
        '--', innerCommand, ...innerArgs,
      ],
    };
  }

  private wrapSeparateSession(
    innerCommand: string,
    innerArgs: string[],
    windowName: string,
    baseName: string
  ): TmuxWrappedCommand {
    const sessionName = `${baseName}-${windowName}`;
    const escapedSession = this.escapeSessionName(sessionName);

    return {
      command: 'tmux',
      args: [
        'new-session', '-A',
        '-s', escapedSession,
        '--', innerCommand, ...innerArgs,
      ],
    };
  }

  /**
   * Clean up tmux sessions created by the app.
   */
  cleanup(): void {
    const baseName = String(getSetting('tmuxSessionName') || 'goodvibes');
    const mode = String(getSetting('tmuxMode') || 'single-session');

    try {
      if (mode === 'single-session') {
        execFileSync(
          'tmux',
          ['kill-session', '-t', this.escapeSessionName(baseName)],
          { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
        );
      } else {
        // Kill all sessions with the base name prefix
        let sessionOutput = '';
        try {
          sessionOutput = execFileSync(
            'tmux',
            ['list-sessions', '-F', '#{session_name}'],
            { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
          );
        } catch {
          // No sessions found or tmux not running
          return;
        }

        const sessions = sessionOutput
          .trim()
          .split('\n')
          .filter((s) => s.startsWith(`${baseName}-`));

        for (const session of sessions) {
          try {
            execFileSync(
              'tmux',
              ['kill-session', '-t', this.escapeSessionName(session)],
              { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
            );
          } catch {
            // Ignore individual session kill failures
          }
        }
      }
    } catch {
      // Ignore cleanup failures
    }
  }

  /**
   * Sanitize session name to only allow safe characters: [a-zA-Z0-9_-]
   * Replaces all other characters with a dash to prevent tmux argument injection.
   */
  private escapeSessionName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_-]/g, '-');
  }
}

// Singleton instance
export const tmuxService = new TmuxService();
