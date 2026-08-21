// ============================================================================
// ANALYTICS IPC HANDLERS
// ============================================================================

import { ipcMain } from 'electron';
import { getProjectRegistry } from '../../services/projectRegistry/index.js';
import {
  getTestMonitor,
  startTestMonitor,
  stopTestMonitor,
  type TestResult,
  type TestStats,
} from '../../services/testMonitor.js';

// ============================================================================
// ANALYTICS HANDLERS
// ============================================================================

export function registerAnalyticsHandlers(): void {
  const registry = getProjectRegistry();

  ipcMain.handle('project:getAnalytics', async (_event, projectId: number) => {
    return registry.getAnalyticsForProject(projectId);
  });

  ipcMain.handle('project:getGlobalAnalytics', async () => {
    return registry.getGlobalProjectAnalytics();
  });

  ipcMain.handle('project:getAgentUsageStats', async () => {
    return registry.getAgentUsageStats();
  });

  ipcMain.handle('project:getSessionDistribution', async () => {
    return registry.getSessionDistributionStats();
  });

  // Compare project analytics
  ipcMain.handle('project:compareAnalytics', async (_event, projectIds: number[]) => {
    return registry.compareProjectAnalytics(projectIds);
  });

  ipcMain.handle('project:getTotalCost', async () => {
    return registry.getTotalCostAcrossProjects();
  });

  ipcMain.handle('project:getSessions', async (_event, projectId: number, limit?: number) => {
    return registry.getSessionsForProject(projectId, limit);
  });

  ipcMain.handle('project:getActiveSessions', async () => {
    return registry.getActiveSessionsAcrossProjects();
  });

  ipcMain.handle('project:startSession', async (_event, options: {
    sessionId: string;
    projectId: number;
    agentSessionId?: string;
    metadata?: Record<string, unknown>;
  }) => {
    return registry.startProjectSession(
      options.sessionId,
      options.projectId,
      options.agentSessionId,
      options.metadata
    );
  });

  // Complete session
  ipcMain.handle('project:completeSession', async (_event, sessionId: string, success?: boolean) => {
    registry.completeSession(sessionId, success ?? true);
    return true;
  });

  ipcMain.handle('project:updateSessionUsage', async (_event, sessionId: string, tokens: number, cost: number) => {
    registry.updateSessionUsage(sessionId, tokens, cost);
    return true;
  });

  ipcMain.handle('project:getStatus', async () => {
    return registry.getStatus();
  });

  // Cleanup old data
  ipcMain.handle('project:cleanup', async (_event, maxAgeDays?: number) => {
    return registry.cleanup(maxAgeDays ?? 90);
  });
}

// ============================================================================
// TEST MONITOR HANDLERS
// ============================================================================

export function registerTestMonitorHandlers(): void {
  const testMonitor = getTestMonitor();

  ipcMain.handle('test-monitor:start', async () => {
    startTestMonitor();
    return testMonitor.getStatus();
  });

  ipcMain.handle('test-monitor:stop', async () => {
    stopTestMonitor();
    return { listening: false, resultCount: 0 };
  });

  ipcMain.handle('test-monitor:status', async () => {
    return testMonitor.getStatus();
  });

  ipcMain.handle('test-monitor:getRecentResults', async (
    _event,
    options?: { limit?: number; sessionId?: string }
  ): Promise<TestResult[]> => {
    return testMonitor.getRecentResults(
      options?.limit ?? 20,
      options?.sessionId
    );
  });

  ipcMain.handle('test-monitor:getResult', async (
    _event,
    id: string
  ): Promise<TestResult | null> => {
    return testMonitor.getResult(id);
  });

  ipcMain.handle('test-monitor:getStats', async (
    _event,
    sessionId?: string
  ): Promise<TestStats> => {
    return testMonitor.getStats(sessionId);
  });

  // Clear all test results
  ipcMain.handle('test-monitor:clear', async () => {
    testMonitor.clear();
    return true;
  });

  // Subscribe to test result events
  ipcMain.handle('test-monitor:subscribe', async () => {
    if (!testMonitor.getStatus().listening) {
      startTestMonitor();
    }
    return { subscribed: true };
  });

  // Unsubscribe from test result events
  ipcMain.handle('test-monitor:unsubscribe', async () => {
    return { subscribed: false };
  });
}
