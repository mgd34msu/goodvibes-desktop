// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================

import { useEffect } from 'react';

import { TitleBar } from './components/layout/TitleBar';
import { MainContent } from './components/layout/MainContent';
import { LoadingOverlay } from './components/common/LoadingOverlay';
import { ToastContainer } from './components/common/Toast';
import { CommandPalette } from './components/overlays/CommandPalette';
import { QuickSwitcher } from './components/overlays/QuickSwitcher';
import { AboutModal } from './components/overlays/AboutModal';
import { KeyboardShortcutsPanel } from './components/overlays/KeyboardShortcutsPanel';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SkipLink } from './components/common/SkipLink';
import { LiveRegionProvider } from './components/common/LiveRegion';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAppStore } from './stores/appStore';
import { useSettingsStore } from './stores/settingsStore';
import { useScanStatus } from './hooks/useScanStatus';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useIpcListeners } from './hooks/useIpcListeners';
import { useContextMenu } from './hooks/useContextMenu';
import { createLogger } from '../shared/logger';

const logger = createLogger('App');

export default function App() {
  const theme = useSettingsStore((s) => s.settings.theme);
  const isLoading = useAppStore((s) => s.isLoading);
  const loadingMessage = useAppStore((s) => s.loadingMessage);

  useScanStatus();

  useKeyboardShortcuts();

  useIpcListeners();

  useContextMenu();

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  // loadSettings updates the Zustand store directly, not component state, so this
  // stays safe even if the component unmounts before it resolves.
  useEffect(() => {
    useSettingsStore.getState().loadSettings();
  }, []);

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        logger.error('App Error:', error);
        logger.error('Component Stack:', errorInfo.componentStack);
      }}
      onReset={() => {
        // Reset app state on error recovery
        useAppStore.getState().setLoading(false);
      }}
    >
      <ThemeProvider>
        <LiveRegionProvider>
          {/* Skip link for keyboard navigation */}
          <SkipLink targetId="main-content" />

          <div className="flex flex-col h-screen overflow-hidden bg-surface-950 isolate">
            {/* Title Bar - z-[9999] for dropdowns above content */}
            <TitleBar />

            {/* Main Content with error boundary - z-0 base layer */}
            <ErrorBoundary>
              <main id="main-content" tabIndex={-1} className="flex-1 overflow-hidden outline-none relative z-0">
                <MainContent />
              </main>
            </ErrorBoundary>

            {/* Global Overlays */}
            <CommandPalette />
            <QuickSwitcher />
            <AboutModal />
            <KeyboardShortcutsPanel />
            <ToastContainer />

            {/* Loading Overlay */}
            {isLoading && <LoadingOverlay message={loadingMessage} />}
          </div>
        </LiveRegionProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
