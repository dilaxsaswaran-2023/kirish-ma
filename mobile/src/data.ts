import { Alert, Component, Device, Flow, Schedule, Site } from './types';

export const sites: Site[] = [
  { id: 'site-north', name: 'North Field', type: 'Farm', location: 'Kilinochchi', health: 'healthy', onlineDevices: 4, totalDevices: 4, moisture: 42, pressure: 2.4 },
  { id: 'site-greenhouse', name: 'Greenhouse 02', type: 'Greenhouse', location: 'Vavuniya', health: 'warning', onlineDevices: 2, totalDevices: 3, moisture: 36, pressure: 1.9 },
  { id: 'site-residence', name: 'West Residence', type: 'Building', location: 'Colombo', health: 'offline', onlineDevices: 0, totalDevices: 1, moisture: 51, pressure: 0 },
];

export const devices: Device[] = [
  { id: 'device-controller-01', siteId: 'site-north', name: 'Controller 01', model: 'AT-8X', firmware: '3.4.1', online: true, lastSeen: '12 sec ago', actuatorCount: 3, sensorCount: 4 },
  { id: 'device-climate-01', siteId: 'site-north', name: 'Climate Station', model: 'AT-CLIMA', firmware: '2.8.0', online: true, lastSeen: '34 sec ago', actuatorCount: 0, sensorCount: 5 },
  { id: 'device-controller-02', siteId: 'site-greenhouse', name: 'Controller 02', model: 'AT-8X', firmware: '3.3.7', online: false, lastSeen: '28 min ago', actuatorCount: 4, sensorCount: 3 },
];

export const components: Component[] = [
  { id: 'valve-a', deviceId: 'device-controller-01', name: 'Valve A', kind: 'valve', state: 'CLOSED', quality: 'CONFIRMED', channel: 'DO1 / DI1' },
  { id: 'pump-01', deviceId: 'device-controller-01', name: 'Pump 01', kind: 'pump', state: 'STOPPED', quality: 'CONFIRMED', channel: 'DO2 / DI2' },
  { id: 'moisture-01', deviceId: 'device-controller-01', name: 'Bed moisture', kind: 'sensor', state: 'VALID', quality: 'CONFIRMED', value: '42%', channel: 'AI1' },
  { id: 'flow-01', deviceId: 'device-controller-01', name: 'Flow rate', kind: 'sensor', state: 'VALID', quality: 'CONFIRMED', value: '0.0 L/min', channel: 'AI2' },
];

export const flows: Flow[] = [
  { id: 'flow-morning', name: 'Morning irrigation', site: 'North Field', status: 'Published · v3', nextRun: 'Tomorrow, 06:00', components: 4 },
  { id: 'flow-greenhouse', name: 'Greenhouse cooling', site: 'Greenhouse 02', status: 'Needs review', components: 3 },
];

export const initialSchedules: Schedule[] = [
  { id: 'schedule-morning', name: 'Morning irrigation', rule: 'Mon–Fri · 06:00 · 15 min', nextRun: 'Tomorrow at 06:00', enabled: true },
  { id: 'schedule-dry', name: 'Dry-soil recovery', rule: 'Moisture < 30% for 10 min', nextRun: 'Condition monitored', enabled: true },
  { id: 'schedule-weekend', name: 'Weekend irrigation', rule: 'Sat–Sun · 06:30 · 12 min', nextRun: 'Saturday at 06:30', enabled: false },
];

export const initialAlerts: Alert[] = [
  { id: 'alert-valve', title: 'Valve opening failed', detail: 'Valve B did not confirm open. Pump remained stopped.', severity: 'critical', time: '8 min ago', acknowledged: false },
  { id: 'alert-offline', title: 'Controller 02 offline', detail: 'Last message received 28 minutes ago.', severity: 'warning', time: '28 min ago', acknowledged: false },
  { id: 'alert-filter', title: 'Filter maintenance due', detail: 'Runtime threshold reached at North Field.', severity: 'info', time: 'Yesterday', acknowledged: true },
];
