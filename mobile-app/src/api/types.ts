/**
 * Shapes returned by the AgroThulir Spring Boot service (backend/src/main/java).
 * Field names are kept exactly as the API sends them (snake_case rows straight
 * out of PlatformService) so nothing is invented on the client.
 */

export type Role = 'SUPER_ADMIN' | 'CORPORATE_ADMIN' | 'SITE_MANAGER' | 'OPERATOR' | 'VIEWER';

export type Me = {
  id: string;
  display_name: string;
  account_status: string;
  activeCorporationId: string;
  role: Role;
};

export type Workspace = {
  id: string;
  workspace_code: string;
  name: string;
  status: string;
  default_timezone: string;
  corporate_role?: string;
};

export type OperationalFlow = {id: string; site_id: string; name: string; status: string; published_version: number; step_count: number};
export type OperationalStep = {id: string; step_index: number; component_id: string; component_name: string; kind: string;
  on_action: string; off_action: string; reported_state: string | null; feedback_quality: string;
  device_id: string; device_name: string; device_status: string};
export type OperationalFlowDetail = OperationalFlow & {corporation_id: string; steps: OperationalStep[];
  online: boolean; currentState: 'ON' | 'OFF' | 'UNKNOWN'; latestRun: OperationalHistory | null};
export type OperationalRunStep = {id: string; step_index: number; component_id: string; component_name: string;
  action: string; expected_state: string; state: string; command_id: string | null; created_at: string; confirmed_at: string | null};
export type OperationalRun = {id: string; site_id: string; flow_id: string; flow_name: string; requested_action: 'ON' | 'OFF';
  state: string; started_at: string; ended_at: string | null; steps: OperationalRunStep[]};
export type OperationalHistory = Omit<OperationalRun, 'steps'>;
export type SensorReading = {id: string; component_id: string; component_name: string; value: string; unit: string | null;
  quality: string; measured_at: string};

export type SiteHealth = 'HEALTHY' | 'WARNING' | 'OFFLINE' | string;

export type Site = {
  id: string;
  name: string;
  type: string;
  location: string | null;
  timezone: string;
  health: SiteHealth;
  moisture: number | null;
  pressure: number | null;
  permission_profile?: string;
};

export type Zone = {
  id: string;
  site_id: string;
  name: string;
  site_name?: string;
  location?: string | null;
  health?: SiteHealth;
  device_count: number;
  online_count: number | null;
};

export type ZoneDetail = Zone & {site_name: string; devices: Device[]};

export type SiteDetail = Site & {
  zones: Zone[];
  deviceCounts: {total: number; online: number | null};
};

export type DeviceStatus = 'ONLINE' | 'OFFLINE' | string;

export type Device = {
  id: string;
  site_id: string;
  zone_id: string;
  zone_name?: string;
  name: string;
  model: string;
  firmware: string | null;
  status: DeviceStatus;
  last_seen_at: string | null;
  actuator_count?: number;
  sensor_count?: number;
};

export type ComponentKind = 'PUMP' | 'VALVE' | 'SENSOR' | string;

export type DeviceComponent = {
  id: string;
  device_id: string;
  kind: ComponentKind;
  name: string;
  hardware_channel: string;
  /** RUNNING / STOPPED for pumps, OPEN / CLOSED for valves, VALID for sensors. */
  reported_state: string | null;
  feedback_quality: 'CONFIRMED' | 'STALE' | 'UNKNOWN' | string;
  latest_value: string | null;
  state_version: number;
  measured_at: string | null;
  display_order: number;
};

export type DeviceDetail = Device & {serial: string; site_name: string; zone_name: string; components: DeviceComponent[]};

export type Capabilities = {
  deviceId: string;
  model: string;
  version: string;
  actions: string[];
  channels: string[];
};

export type Diagnostics = {
  deviceId: string;
  status: string;
  mqtt: string;
  telemetryLagSeconds: number;
  configuration: string;
};

export type TopologyConnection = {from: string; to: string; type: string};
export type TopologyNode = {id: string; type: 'CORPORATION' | 'SITE' | 'ZONE' | 'DEVICE' | 'COMPONENT'; name: string; kind?: string};

export type Topology = {
  siteId: string;
  status: string;
  nodes: TopologyNode[];
  connections: TopologyConnection[];
};

export type Flow = {
  id: string;
  site_id: string;
  name: string;
  status: 'PUBLISHED' | 'DRAFT' | string;
  published_version: number | null;
  config_hash: string | null;
};

export type FlowValidation = {flowId: string; valid: boolean; checks: string[]};

export type Schedule = {
  id: string;
  site_id: string;
  target_flow_id: string;
  flow_version: number;
  name: string;
  timezone: string;
  recurrence: string;
  next_due_at: string | null;
  missed_policy: string;
  enabled: boolean;
};

export type SchedulePreview = {
  scheduleId: string;
  timezone: string;
  dstPolicy: string;
  occurrences: string[];
};

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO' | string;

export type Alert = {
  id: string;
  site_id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  raised_at: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
};

export type AuditEvent = {
  id: string;
  actor_id: string;
  corporation_id: string | null;
  site_id: string | null;
  operation: string;
  target: string;
  summary: string | null;
  occurred_at: string;
};

export type CommandAction = 'START' | 'SAFE_STOP';

/** ACCEPTED → EXECUTING → CONFIRMED (start) or STOPPED (safe stop). */
export type CommandState = 'ACCEPTED' | 'EXECUTING' | 'CONFIRMED' | 'STOPPED' | string;

export type CommandReceipt = {
  commandId: string;
  runId: string;
  state: CommandState;
  statusUrl: string;
};

export type Command = {
  id: string;
  run_id: string;
  component_id: string;
  action: CommandAction;
  state: CommandState;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

export type Run = {
  id: string;
  site_id: string;
  initiator_id: string;
  source: string;
  state: CommandState;
  started_at: string | null;
  ended_at: string | null;
};

export type RunEvent = {sequence: number; state: string; at: string};
