import type { OperationalFlowDetail, SensorReading } from '../api/types';

/** A failed refresh must not make an old equipment snapshot look safe to use. */
export function controlBlocker(
  flow: OperationalFlowDetail,
  canControl: boolean,
  stale: boolean,
): string | undefined {
  if (!canControl)
    return 'You can view this equipment. Ask your manager to start or stop it.';
  if (stale) return 'Connection lost. Refresh before using the controls.';
  if (
    flow.latestRun &&
    ['ACCEPTED', 'WAITING_FEEDBACK'].includes(flow.latestRun.state)
  ) {
    return 'Waiting for the equipment to confirm the last request.';
  }
  if (!flow.online)
    return 'Equipment is offline. Check its power and connection on site.';
  if (flow.status !== 'PUBLISHED' || flow.steps.length === 0)
    return 'Your manager needs to finish setting up this operation.';
  if (flow.steps.some(step => step.feedback_quality !== 'CONFIRMED')) {
    return 'Equipment status is not confirmed. Check the device on site.';
  }
  return undefined;
}

export function latestReadings(readings: SensorReading[]): SensorReading[] {
  const latest = new Map<string, SensorReading>();
  for (const reading of readings) {
    const previous = latest.get(reading.component_id);
    if (
      !previous ||
      Date.parse(reading.measured_at) > Date.parse(previous.measured_at)
    )
      latest.set(reading.component_id, reading);
  }
  return [...latest.values()];
}
