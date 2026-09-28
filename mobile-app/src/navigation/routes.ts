/** Every destination in the farmer app, with the parameters it needs. */
export type RouteParams = {
  welcome: undefined;
  signin: undefined;
  home: undefined;

  sites: undefined;
  site: {siteId: string};
  zone: {zoneId: string};
  devices: {siteId: string};
  device: {deviceId: string};
  components: {deviceId: string};
  component: {deviceId: string; componentId: string};
  readings: {deviceId: string};
  diagnostics: {deviceId: string};

  protection: undefined;
  waterNow: {deviceId: string; componentId: string; valveId?: string; durationSeconds?: number};
  duration: {deviceId: string; componentId: string; valveId?: string; durationSeconds: number};
  startConfirm: {deviceId: string; componentId: string; valveId?: string; durationSeconds: number};
  live: undefined;
  stopConfirm: undefined;
  complete: undefined;
  blocked: undefined;
  stopUnknown: undefined;

  paths: undefined;
  path: {flowId: string};
  topology: {siteId: string};
  sequence: {flowId: string};

  schedules: undefined;
  schedule: {scheduleId: string};

  alerts: undefined;
  alert: {alertId: string};
  history: undefined;

  settings: undefined;
};

export type RouteName = keyof RouteParams;

export type Route<Name extends RouteName = RouteName> = {
  key: string;
  name: Name;
  params: RouteParams[Name];
};

/** Bottom navigation, matching the four tabs in the design prototype. */
export type TabName = 'home' | 'sites' | 'flows' | 'alerts';

export const TABS: {name: TabName; label: string; icon: 'home' | 'pin' | 'flow' | 'bell'; route: RouteName}[] = [
  {name: 'home', label: 'Home', icon: 'home', route: 'home'},
  {name: 'sites', label: 'Sites', icon: 'pin', route: 'sites'},
  {name: 'flows', label: 'Paths', icon: 'flow', route: 'paths'},
  {name: 'alerts', label: 'Alerts', icon: 'bell', route: 'alerts'},
];

/** Which tab stays highlighted for a given screen. */
export const TAB_FOR_ROUTE: Partial<Record<RouteName, TabName>> = {
  home: 'home',
  protection: 'home',
  schedules: 'home',
  schedule: 'home',
  complete: 'home',
  settings: 'home',
  sites: 'sites',
  site: 'sites',
  zone: 'sites',
  devices: 'sites',
  device: 'sites',
  components: 'sites',
  component: 'sites',
  readings: 'sites',
  diagnostics: 'sites',
  paths: 'flows',
  path: 'flows',
  topology: 'flows',
  sequence: 'flows',
  alerts: 'alerts',
  alert: 'alerts',
  history: 'alerts',
  blocked: 'alerts',
  stopUnknown: 'alerts',
};
