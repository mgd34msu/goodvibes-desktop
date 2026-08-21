// ============================================================================
// APPROVAL & AGENT IPC HANDLERS
// ============================================================================
//
// This module registers IPC handlers for:
// - Approval Queue
// - Agent Orchestration
//
// ============================================================================

import { ipcMain } from 'electron';
import { Logger } from '../services/logger.js';
import { getPolicyEngine } from '../services/policyEngine.js';
import { getAgentTreeService } from '../services/agentTree.js';

const logger = new Logger('ApprovalAgentIPC');

// ============================================================================
// REGISTRATION
// ============================================================================

export function registerApprovalAgentHandlers(): void {
  // Approval Handlers
  registerApprovalHandlers();

  // Agent Tree Handlers
  registerAgentTreeHandlers();

  logger.info('Approval & Agent IPC handlers registered');
}

// ============================================================================
// APPROVAL HANDLERS
// ============================================================================

function registerApprovalHandlers(): void {
  const policyEngine = getPolicyEngine();

  ipcMain.handle('approval:getPending', async (_event, sessionId?: string) => {
    return policyEngine.getPendingApprovals(sessionId);
  });

  // Approve item
  ipcMain.handle('approval:approve', async (_event, itemId: number) => {
    policyEngine.approveItem(itemId, true);
    return true;
  });

  // Deny item
  ipcMain.handle('approval:deny', async (_event, itemId: number) => {
    policyEngine.denyItem(itemId, true);
    return true;
  });

  // Batch approve
  ipcMain.handle('approval:batchApprove', async (_event, itemIds: number[]) => {
    policyEngine.batchApprove(itemIds);
    return true;
  });

  // Batch deny
  ipcMain.handle('approval:batchDeny', async (_event, itemIds: number[]) => {
    policyEngine.batchDeny(itemIds);
    return true;
  });

  ipcMain.handle('policy:getAll', async () => {
    return policyEngine.getAllPolicies();
  });

  ipcMain.handle('policy:getEnabled', async () => {
    return policyEngine.getEnabledPolicies();
  });

  ipcMain.handle('policy:create', async (_event, policy: {
    name: string;
    matcher: string;
    action: 'auto-approve' | 'auto-deny' | 'queue';
    priority?: number;
    enabled?: boolean;
  }) => {
    return policyEngine.createPolicy(policy);
  });

  ipcMain.handle('policy:update', async (_event, id: number, updates: {
    name?: string;
    matcher?: string;
    action?: 'auto-approve' | 'auto-deny' | 'queue';
    priority?: number;
    enabled?: boolean;
  }) => {
    policyEngine.updatePolicy(id, updates);
    return policyEngine.getPolicy(id);
  });

  ipcMain.handle('policy:delete', async (_event, id: number) => {
    policyEngine.deletePolicy(id);
    return true;
  });
}

// ============================================================================
// AGENT TREE HANDLERS
// ============================================================================

function registerAgentTreeHandlers(): void {
  const agentTreeService = getAgentTreeService();

  ipcMain.handle('agentTree:getAgent', async (_event, sessionId: string) => {
    return agentTreeService.getAgent(sessionId);
  });

  ipcMain.handle('agentTree:getTree', async (_event, rootSessionId: string) => {
    return agentTreeService.getTree(rootSessionId);
  });

  ipcMain.handle('agentTree:getRunning', async (_event, rootSessionId?: string) => {
    return agentTreeService.getRunningAgents(rootSessionId);
  });

  ipcMain.handle('agentTree:getChildren', async (_event, sessionId: string) => {
    return agentTreeService.getChildren(sessionId);
  });

  ipcMain.handle('agentTree:getSummary', async (_event, rootSessionId: string) => {
    return agentTreeService.getSummary(rootSessionId);
  });

  ipcMain.handle('agentTree:getVisualizationTree', async (_event, rootSessionId: string) => {
    return agentTreeService.getVisualizationTree(rootSessionId);
  });

  ipcMain.handle('agentTree:getFlatList', async (_event, rootSessionId: string) => {
    return agentTreeService.getFlatTreeList(rootSessionId);
  });

  ipcMain.handle('agentTree:getMetrics', async (_event, agentName: string) => {
    return agentTreeService.getAgentMetrics(agentName);
  });

  ipcMain.handle('agentTree:getAllMetrics', async () => {
    return agentTreeService.getAllMetrics();
  });

  // Terminate agent
  ipcMain.handle('agentTree:terminate', async (_event, sessionId: string) => {
    agentTreeService.terminateAgent(sessionId);
    return true;
  });

  // Allocate budget
  ipcMain.handle('agentTree:allocateBudget', async (_event, sessionId: string, amount: number) => {
    return agentTreeService.allocateBudget(sessionId, amount, false);
  });
}
