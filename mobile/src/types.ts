export type Role = 'SUPER_ADMIN' | 'CORPORATE_ADMIN' | 'SITE_MANAGER' | 'OPERATOR' | 'VIEWER';
export type Health = 'healthy' | 'warning' | 'fault' | 'offline';
export type Screen =
  | 'welcome' | 'home' | 'sites' | 'site' | 'devices' | 'device' | 'components'
  | 'control' | 'flows' | 'topology' | 'sequence' | 'schedules' | 'alerts'
  | 'more' | 'corporateAdmin' | 'superAdmin';

export type Site = {
  id: string; name: string; type: string; location: string; health: Health;
  onlineDevices: number; totalDevices: number; moisture: number; pressure: number;
};

export type Device = {
  id: string; siteId: string; name: string; model: string; firmware: string;
  online: boolean; lastSeen: string; actuatorCount: number; sensorCount: number;
};

export type Component = {
  id: string; deviceId: string; name: string; kind: 'pump' | 'valve' | 'sensor';
  state: string; quality: 'CONFIRMED' | 'INFERRED' | 'UNKNOWN'; value?: string; channel: string;
};

export type Flow = { id: string; name: string; site: string; status: string; nextRun?: string; components: number };
export type Schedule = { id: string; name: string; rule: string; nextRun: string; enabled: boolean };
export type Alert = { id: string; title: string; detail: string; severity: 'critical' | 'warning' | 'info'; time: string; acknowledged: boolean };
export type CommandState = 'IDLE' | 'ACCEPTED' | 'EXECUTING' | 'CONFIRMED' | 'STOPPING' | 'STOPPED' | 'FAILED';
