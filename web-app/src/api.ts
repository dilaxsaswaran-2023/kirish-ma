export const BASE_URL = import.meta.env.VITE_BASE_URL as string;
const isNgrokFreeTunnel = BASE_URL && /(^|\.)ngrok-free\.(app|dev)$/.test(new URL(BASE_URL).hostname);

export type Session = {token: string; expiresAt: string; userId: string; corporationId: string; role: string; displayName: string};
export type Me = {id: string; display_name: string; account_status: string; activeCorporationId: string; role: string};
export type Site = {id: string; name: string; type: string; location: string; health: string; moisture: number | null; pressure: number | null};
export type Device = {id: string; site_id: string; name: string; model: string; serial?: string; status: string; last_seen_at: string | null; actuator_count: number; sensor_count: number};
export type Zone = {id: string; site_id: string; name: string; site_name: string; location: string | null; health: string; device_count: number; online_count: number | null};
export type ZoneDetail = Zone & {devices: Device[]};
export type DeviceComponent = {id: string; device_id: string; kind: string; name: string; hardware_channel: string;
  reported_state: string | null; feedback_quality: string; latest_value: string | null; state_version: number;
  measured_at: string | null; display_order: number};
export type DeviceDetail = Device & {zone_id: string; zone_name: string; site_name: string; firmware: string | null; components: DeviceComponent[]};
export type SensorReading = {id: string; component_id: string; component_name: string; value: string; unit: string | null; quality: string; measured_at: string};
export type Alert = {id: string; site_id: string; severity: string; title: string; detail: string; raised_at: string; acknowledged_at: string | null};
export type Schedule = {id: string; site_id: string; name: string; recurrence: string; next_due_at: string | null; enabled: boolean};
export type User = {id: string; email: string; display_name: string; account_status: string; corporate_role: string};
export type Corporation = {id: string; workspace_code: string; name: string; status: string; default_timezone: string};
export type Audit = {id: string; actor_id: string; operation: string; target: string; summary: string; occurred_at: string};
export type Overview = {corporations: number; sites: number; devicesOnline: number; openCriticalAlerts: number; outboxBacklog: number; health: string};
export type SiteComponent = {id: string; device_id: string; device_name: string; device_status: string; kind: string;
  name: string; hardware_channel: string; reported_state: string | null; feedback_quality: string};
export type OperationalFlow = {id: string; site_id: string; name: string; status: string; published_version: number; step_count: number};
export type OperationalFlowStep = {id: string; step_index: number; component_id: string; component_name: string;
  kind: string; on_action: string; off_action: string; device_id: string; device_name: string; device_status: string;
  reported_state: string | null; feedback_quality: string};
export type OperationalFlowDetail = OperationalFlow & {steps: OperationalFlowStep[]; online: boolean;
  currentState: 'ON' | 'OFF' | 'UNKNOWN'; latestRun: {id: string; state: string; requested_action: string} | null};

let token = sessionStorage.getItem('kirish-token');
export function setToken(next: string | null) {
  token = next;
  if (next) sessionStorage.setItem('kirish-token', next);
  else sessionStorage.removeItem('kirish-token');
}
export function hasToken() { return Boolean(token); }

export async function api<T>(path: string, options: {method?: string; body?: unknown; headers?: Record<string, string>} = {}): Promise<T> {
  if (!BASE_URL) throw new Error('VITE_BASE_URL is missing. Configure the hosted backend URL in .env.');
  let response: Response;
  try {
    response = await fetch(`${BASE_URL.replace(/\/+$/, '')}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(isNgrokFreeTunnel ? {'ngrok-skip-browser-warning': '1'} : {}),
        ...(token ? {Authorization: `Bearer ${token}`} : {}),
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error(`Could not reach the backend at ${BASE_URL}. Check the service address and DNS.`);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message ?? `Request failed (${response.status})`);
  return payload as T;
}

export const login = (email: string, password: string) => api<Session>('/v1/auth/login', {method: 'POST', body: {email, password}});
