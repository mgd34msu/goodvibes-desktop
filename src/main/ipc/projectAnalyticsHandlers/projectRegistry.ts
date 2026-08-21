// ============================================================================
// PROJECT REGISTRY IPC HANDLERS
// ============================================================================

import { ipcMain } from 'electron';
import { getProjectRegistry } from '../../services/projectRegistry/index.js';
import { getProjectCoordinator } from '../../services/projectCoordinator/index.js';
import type {
  ProjectSettings,
  ProjectAgentSettings,
} from '../../database/projectRegistry.js';

// ============================================================================
// PROJECT HANDLERS
// ============================================================================

export function registerProjectHandlers(): void {
  const registry = getProjectRegistry();

  ipcMain.handle('project:register', async (_event, options: {
    path: string;
    name?: string;
    description?: string;
    settings?: ProjectSettings;
  }) => {
    return registry.addProject(
      options.path,
      options.name,
      options.description,
      options.settings
    );
  });

  ipcMain.handle('project:update', async (_event, projectId: number, updates: {
    name?: string;
    description?: string | null;
    settings?: ProjectSettings;
  }) => {
    return registry.updateProject(projectId, updates);
  });

  ipcMain.handle('project:remove', async (_event, projectId: number) => {
    registry.removeProject(projectId);
    return true;
  });

  ipcMain.handle('project:getAll', async () => {
    return registry.getAllProjects();
  });

  ipcMain.handle('project:get', async (_event, projectId: number) => {
    return registry.getProject(projectId);
  });

  ipcMain.handle('project:getByPath', async (_event, path: string) => {
    return registry.getProjectByPath(path);
  });

  // Search projects
  ipcMain.handle('project:search', async (_event, query: string) => {
    return registry.findProjects(query);
  });

  ipcMain.handle('project:getSettings', async (_event, projectId: number) => {
    return registry.getProjectSettings(projectId);
  });

  ipcMain.handle('project:updateSettings', async (_event, projectId: number, settings: ProjectSettings) => {
    return registry.updateProjectSettings(projectId, settings);
  });

  // Switch project context
  ipcMain.handle('project:switch', async (_event, projectId: number) => {
    return registry.switchProject(projectId);
  });

  ipcMain.handle('project:getCurrent', async () => {
    return registry.getCurrentProject();
  });

  ipcMain.handle('project:getContext', async (_event, projectId: number) => {
    return registry.getProjectContext(projectId);
  });

  // Assign agent to project
  ipcMain.handle('project:assignAgent', async (_event, options: {
    projectId: number;
    agentId: number;
    priority?: number;
    settings?: ProjectAgentSettings;
  }) => {
    return registry.addAgentToProject(
      options.projectId,
      options.agentId,
      options.priority ?? 0,
      options.settings
    );
  });

  ipcMain.handle('project:getAgents', async (_event, projectId: number) => {
    return registry.getAgentsForProject(projectId);
  });

  ipcMain.handle('project:updateAgent', async (_event, agentAssignmentId: number, updates: {
    priority?: number;
    settings?: ProjectAgentSettings;
  }) => {
    return registry.updateAgentConfig(agentAssignmentId, updates);
  });

  ipcMain.handle('project:removeAgent', async (_event, projectId: number, agentId: number) => {
    registry.removeAgentFromProjectConfig(projectId, agentId);
    return true;
  });

  ipcMain.handle('project:getAutoActivateAgents', async (_event, projectId: number) => {
    return registry.getAutoActivateAgents(projectId);
  });
}

// ============================================================================
// TEMPLATE HANDLERS
// ============================================================================

export function registerTemplateHandlers(): void {
  const registry = getProjectRegistry();

  ipcMain.handle('template:create', async (_event, options: {
    name: string;
    description?: string;
    settings?: ProjectSettings;
    agents?: Array<{ agentId: number; priority: number; settings?: ProjectAgentSettings }>;
  }) => {
    return registry.createTemplate(
      options.name,
      options.description,
      options.settings,
      options.agents
    );
  });

  ipcMain.handle('template:get', async (_event, templateId: number) => {
    return registry.getTemplate(templateId);
  });

  ipcMain.handle('template:getByName', async (_event, name: string) => {
    return registry.getTemplateByName(name);
  });

  ipcMain.handle('template:getAll', async () => {
    return registry.getAllTemplates();
  });

  ipcMain.handle('template:update', async (_event, templateId: number, updates: {
    name?: string;
    description?: string | null;
    settings?: ProjectSettings;
    agents?: Array<{ agentId: number; priority: number; settings?: ProjectAgentSettings }>;
  }) => {
    return registry.updateTemplate(templateId, updates);
  });

  ipcMain.handle('template:delete', async (_event, templateId: number) => {
    registry.removeTemplate(templateId);
    return true;
  });

  // Apply template to project
  ipcMain.handle('template:apply', async (_event, projectId: number, templateId: number) => {
    return registry.applyTemplate(projectId, templateId);
  });

  ipcMain.handle('template:createFromProject', async (_event, options: {
    projectId: number;
    templateName: string;
    description?: string;
  }) => {
    return registry.createTemplateFromExistingProject(
      options.projectId,
      options.templateName,
      options.description
    );
  });
}

// ============================================================================
// COORDINATION HANDLERS
// ============================================================================

export function registerCoordinationHandlers(): void {
  const coordinator = getProjectCoordinator();

  ipcMain.handle('coordinator:registerAgent', async (_event, options: {
    agentId: number;
    agentName: string;
    projectIds: number[];
  }) => {
    return coordinator.registerCrossProjectAgent(
      options.agentId,
      options.agentName,
      options.projectIds
    );
  });

  // Unregister cross-project agent
  ipcMain.handle('coordinator:unregisterAgent', async (_event, agentId: number) => {
    coordinator.unregisterCrossProjectAgent(agentId);
    return true;
  });

  ipcMain.handle('coordinator:getAgent', async (_event, agentId: number) => {
    return coordinator.getCrossProjectAgent(agentId);
  });

  ipcMain.handle('coordinator:getAllAgents', async () => {
    return coordinator.getAllCrossProjectAgents();
  });

  ipcMain.handle('coordinator:getAgentsForProject', async (_event, projectId: number) => {
    return coordinator.getAgentsForProject(projectId);
  });

  // Transition agent to project
  ipcMain.handle('coordinator:transitionAgent', async (_event, agentId: number, targetProjectId: number) => {
    return coordinator.transitionAgentToProject(agentId, targetProjectId);
  });

  ipcMain.handle('coordinator:updateAgentStatus', async (_event, agentId: number, status: 'idle' | 'active' | 'transitioning') => {
    coordinator.updateAgentStatus(agentId, status);
    return true;
  });

  // Share skill across projects
  ipcMain.handle('coordinator:shareSkill', async (_event, options: {
    skillId: number;
    skillName: string;
    projectIds: number[];
    settings?: Record<string, unknown>;
  }) => {
    return coordinator.shareSkillAcrossProjects(
      options.skillId,
      options.skillName,
      options.projectIds,
      options.settings
    );
  });

  // Unshare skill from projects
  ipcMain.handle('coordinator:unshareSkill', async (_event, skillId: number, projectIds: number[]) => {
    coordinator.unshareSkillFromProjects(skillId, projectIds);
    return true;
  });

  ipcMain.handle('coordinator:getSharedSkill', async (_event, skillId: number) => {
    return coordinator.getSharedSkillConfig(skillId);
  });

  ipcMain.handle('coordinator:getAllSharedSkills', async () => {
    return coordinator.getAllSharedSkillConfigs();
  });

  ipcMain.handle('coordinator:getSharedSkillsForProject', async (_event, projectId: number) => {
    return coordinator.getSharedSkillsForProject(projectId);
  });

  ipcMain.handle('coordinator:updateSharedSkillSettings', async (_event, skillId: number, settings: Record<string, unknown>) => {
    return coordinator.updateSharedSkillSettings(skillId, settings);
  });

  // Toggle shared skill
  ipcMain.handle('coordinator:toggleSharedSkill', async (_event, skillId: number, enabled: boolean) => {
    coordinator.setSharedSkillEnabled(skillId, enabled);
    return true;
  });

  ipcMain.handle('coordinator:getProjectState', async (_event, projectId: number) => {
    return coordinator.getProjectState(projectId);
  });

  ipcMain.handle('coordinator:updateProjectState', async (_event, projectId: number, updates: {
    activeAgents?: number[];
    pendingSkills?: number[];
    sessionId?: string | null;
  }) => {
    return coordinator.updateProjectState(projectId, updates);
  });

  // Sync project states
  ipcMain.handle('coordinator:syncStates', async (_event, sourceProjectId: number, targetProjectIds: number[]) => {
    coordinator.syncProjectStates(sourceProjectId, targetProjectIds);
    return true;
  });

  ipcMain.handle('coordinator:getAllStates', async () => {
    return coordinator.getAllProjectStates();
  });

  // Broadcast to projects
  ipcMain.handle('coordinator:broadcast', async (_event, options: {
    type: string;
    data: Record<string, unknown>;
    targetProjectIds: number[];
    sourceProjectId?: number;
  }) => {
    return coordinator.broadcastToProjects(
      options.type,
      options.data,
      options.targetProjectIds,
      options.sourceProjectId
    );
  });

  // Broadcast to all projects
  ipcMain.handle('coordinator:broadcastAll', async (_event, options: {
    type: string;
    data: Record<string, unknown>;
    sourceProjectId?: number;
  }) => {
    return coordinator.broadcastToAllProjects(
      options.type,
      options.data,
      options.sourceProjectId
    );
  });

  ipcMain.handle('coordinator:getPendingEvents', async (_event, projectId: number) => {
    return coordinator.getPendingEventsForProject(projectId);
  });

  // Mark event handled
  ipcMain.handle('coordinator:markEventHandled', async (_event, eventId: string) => {
    coordinator.markEventHandled(eventId);
    return true;
  });

  ipcMain.handle('coordinator:getStatus', async () => {
    return coordinator.getStatus();
  });
}
