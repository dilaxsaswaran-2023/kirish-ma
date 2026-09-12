import {idempotencyKey, request} from './client';
import type {
  Alert,
  AuditEvent,
  Capabilities,
  Command,
  CommandAction,
  CommandReceipt,
  Device,
  DeviceComponent,
  DeviceDetail,
  Diagnostics,
  Flow,
  FlowValidation,
  Me,
  Run,
  RunEvent,
  Schedule,
  SchedulePreview,
  Site,
  SiteDetail,
  Topology,
  Workspace,
} from './types';

/** One function per documented route in backend ApiController. */

export const getMe = () => request<Me>('/v1/me');
export const getWorkspaces = () => request<Workspace[]>('/v1/me/workspaces');
export const selectWorkspace = () =>
  request<{context: Me; selectedAt: string}>('/v1/session/context', {method: 'POST'});

export const getSites = () => request<Site[]>('/v1/sites');
export const getSite = (siteId: string) => request<SiteDetail>(`/v1/sites/${siteId}`);
export const getTopology = (siteId: string) => request<Topology>(`/v1/sites/${siteId}/topology`);

export const getDevices = (siteId: string) =>
  request<Device[]>(`/v1/devices?siteId=${encodeURIComponent(siteId)}`);
export const getDevice = (deviceId: string) => request<DeviceDetail>(`/v1/devices/${deviceId}`);
export const getComponents = (deviceId: string) =>
  request<DeviceComponent[]>(`/v1/devices/${deviceId}/components`);
export const getCapabilities = (deviceId: string) =>
  request<Capabilities>(`/v1/devices/${deviceId}/capabilities`);
export const getDiagnostics = (deviceId: string) =>
  request<Diagnostics>(`/v1/devices/${deviceId}/diagnostics`);

export const getFlows = () => request<Flow[]>('/v1/flows');
export const validateFlow = (flowId: string) =>
  request<FlowValidation>(`/v1/flows/${flowId}/validate`, {method: 'POST'});
export const publishFlow = (flowId: string) =>
  request<{flowId: string; version: number; status: string; scheduleMigrationRequired: boolean}>(
    `/v1/flows/${flowId}/publish`,
    {method: 'POST'},
  );
export const runFlow = (flowId: string) =>
  request<CommandReceipt>(`/v1/flows/${flowId}/runs`, {
    method: 'POST',
    headers: {'Idempotency-Key': idempotencyKey(`flow-${flowId}`)},
  });

export const getSchedules = () => request<Schedule[]>('/v1/schedules');
export const setScheduleEnabled = (scheduleId: string, enabled: boolean) =>
  request<{id: string; enabled: boolean; activeRunAffected: boolean}>(`/v1/schedules/${scheduleId}`, {
    method: 'PATCH',
    body: {enabled},
  });
export const previewSchedule = (scheduleId: string) =>
  request<SchedulePreview>(`/v1/schedules/${scheduleId}/preview`, {method: 'POST'});

export const getAlerts = () => request<Alert[]>('/v1/alerts');
export const acknowledgeAlert = (alertId: string) =>
  request<Partial<Alert>>(`/v1/alerts/${alertId}/acknowledgements`, {method: 'POST'});

export const getAuditEvents = () => request<AuditEvent[]>('/v1/audit-events');

/**
 * Protected control write. The service validates ownership, controller
 * liveness, capability and fresh valve feedback before it accepts a START, and
 * answers 202 with a receipt — never a completed action.
 */
export const sendCommand = (componentId: string, action: CommandAction, durationSeconds: number) =>
  request<CommandReceipt>(`/v1/components/${componentId}/commands`, {
    method: 'POST',
    headers: {'Idempotency-Key': idempotencyKey(`${componentId}-${action}`)},
    body: {action, durationSeconds},
  });

export const getCommand = (commandId: string) => request<Command>(`/v1/commands/${commandId}`);
export const getRun = (runId: string) => request<Run>(`/v1/runs/${runId}`);
export const getRunEvents = (runId: string) => request<RunEvent[]>(`/v1/runs/${runId}/events`);
export const safeStopRun = (runId: string) =>
  request<CommandReceipt>(`/v1/runs/${runId}/safe-stop`, {
    method: 'POST',
    headers: {'Idempotency-Key': idempotencyKey(`safe-stop-${runId}`)},
  });
