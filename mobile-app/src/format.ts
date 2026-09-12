import type {Tone} from './theme';
import type {IconName} from './icons';
import type {Alert, DeviceComponent, Site} from './api/types';

/** Presentation helpers. Every label pairs a word with the colour tone. */

export function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase().replace(/_/g, ' ');
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) {
    return 'No reading yet';
  }
  const then = Date.parse(iso);
  if (Number.isNaN(then)) {
    return 'No reading yet';
  }
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 0) {
    return formatDateTime(iso);
  }
  if (seconds < 45) {
    return `${Math.max(seconds, 1)} sec ago`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return formatDate(iso);
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleDateString(undefined, {day: 'numeric', month: 'short'});
}

export function formatTime(iso: string | null | undefined) {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit'});
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) {
    return '—';
  }
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

export function clock(totalSeconds: number) {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function minutesLabel(seconds: number) {
  return `${Math.round(seconds / 60)} min`;
}

export function siteTone(health: Site['health']): Tone {
  if (health === 'HEALTHY') {
    return 'green';
  }
  return health === 'OFFLINE' ? 'red' : 'amber';
}

export function siteIcon(type: string): IconName {
  if (type === 'GREENHOUSE') {
    return 'home';
  }
  return type === 'BUILDING' ? 'pin' : 'leaf';
}

export function alertTone(severity: Alert['severity']): Tone {
  if (severity === 'CRITICAL') {
    return 'red';
  }
  return severity === 'WARNING' ? 'amber' : 'green';
}

export function componentIcon(kind: DeviceComponent['kind']): IconName {
  switch (kind) {
    case 'PUMP':
      return 'motor';
    case 'VALVE':
      return 'valve';
    case 'SENSOR':
      return 'sensor';
    case 'TANK':
      return 'tank';
    default:
      return 'cpu';
  }
}

/**
 * Words first: a component is described by its reported state, and an
 * unconfirmed reading is never presented as a known position.
 */
export function componentStateLabel(component: DeviceComponent): string {
  if (component.feedback_quality !== 'CONFIRMED') {
    return 'State unknown';
  }
  switch (component.reported_state) {
    case 'RUNNING':
      return 'Running';
    case 'STOPPED':
      return 'Off';
    case 'OPEN':
      return 'Open';
    case 'CLOSED':
      return 'Closed';
    case 'VALID':
      return component.latest_value ?? 'Reading valid';
    default:
      return component.reported_state ? titleCase(component.reported_state) : 'No state reported';
  }
}

export function componentTone(component: DeviceComponent): Tone {
  if (component.feedback_quality !== 'CONFIRMED') {
    return 'amber';
  }
  return component.reported_state === 'RUNNING' || component.reported_state === 'OPEN' ? 'blue' : 'green';
}

export function isActive(component: DeviceComponent) {
  return component.reported_state === 'RUNNING' || component.reported_state === 'OPEN';
}
