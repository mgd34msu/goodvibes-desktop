// ============================================================================
// TMUX SETTINGS SECTION
// ============================================================================

import { useState, useEffect } from 'react';
import type { AppSettings } from '../../../../shared/types';
import { SettingsSection, SettingRow, ToggleSwitch } from './components';

// ============================================================================
// TYPES
// ============================================================================

interface TmuxDetectResult {
  available: boolean;
  path: string | null;
}

interface TmuxSettingsProps {
  settings: AppSettings;
  onChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

// ============================================================================
// TMUX SETTINGS COMPONENT
// ============================================================================

export function TmuxSettings({ settings, onChange }: TmuxSettingsProps): React.JSX.Element {
  const [tmuxDetect, setTmuxDetect] = useState<TmuxDetectResult | null>(null);

  useEffect(() => {
    // Detect tmux availability via IPC
    window.goodvibes.detectTmux().then((result) => {
      setTmuxDetect(result as TmuxDetectResult);
    }).catch(() => {
      setTmuxDetect({ available: false, path: null });
    });
  }, []);

  return (
    <SettingsSection title="Tmux">
      <SettingRow
        label="Enable tmux integration"
        description="Wrap sessions, terminals, and editors in tmux for persistence and external access"
      >
        <div className="flex items-center gap-3">
          {tmuxDetect !== null && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium ${
                tmuxDetect.available
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-amber-500/15 text-amber-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  tmuxDetect.available ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              {tmuxDetect.available ? 'Detected' : 'Not found'}
            </span>
          )}
          <ToggleSwitch
            checked={settings.tmuxEnabled}
            onChange={(value) => onChange('tmuxEnabled', value)}
          />
        </div>
      </SettingRow>

      {settings.tmuxEnabled && (
        <>
          <SettingRow
            label="Session Mode"
            description={
              settings.tmuxMode === 'single-session'
                ? 'All windows grouped under one tmux session'
                : 'Each process gets its own tmux session'
            }
          >
            <select
              value={settings.tmuxMode}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'single-session' || value === 'separate-sessions') {
                  onChange('tmuxMode', value);
                }
              }}
              className="select w-48"
            >
              <option value="single-session">Single Session</option>
              <option value="separate-sessions">Separate Sessions</option>
            </select>
          </SettingRow>

          <SettingRow
            label="Session Name"
            description="Base name for tmux sessions"
          >
            <input
              type="text"
              value={settings.tmuxSessionName}
              onChange={(e) => {
                const sanitized = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '');
                onChange('tmuxSessionName', sanitized);
              }}
              maxLength={64}
              placeholder="goodvibes"
              className="input w-48"
            />
          </SettingRow>
        </>
      )}
    </SettingsSection>
  );
}
