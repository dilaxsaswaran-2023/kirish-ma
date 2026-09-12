import type {Device, DeviceComponent, DeviceDetail} from '../api/types';
import {getDevice, getDevices} from '../api/endpoints';

/** Equipment helpers shared by the dashboard and the control screens. */

export type SiteEquipment = {
  devices: Device[];
  /** Controllers with at least one pump or valve, newest feedback first. */
  controllers: DeviceDetail[];
};

export async function loadSiteEquipment(siteId: string): Promise<SiteEquipment> {
  const devices = await getDevices(siteId);
  const actuated = devices.filter(device => (device.actuator_count ?? 0) > 0);
  const controllers = await Promise.all(actuated.map(device => getDevice(device.id)));
  return {devices, controllers};
}

export const pumpsOf = (components: DeviceComponent[]) =>
  components.filter(component => component.kind === 'PUMP');

export const valvesOf = (components: DeviceComponent[]) =>
  components.filter(component => component.kind === 'VALVE');

export const sensorsOf = (components: DeviceComponent[]) =>
  components.filter(component => component.kind === 'SENSOR');

/** The first controller that can actually be commanded right now. */
export function primaryController(controllers: DeviceDetail[]): DeviceDetail | undefined {
  return controllers.find(device => device.status === 'ONLINE') ?? controllers[0];
}

export function primaryPump(device: DeviceDetail | undefined): DeviceComponent | undefined {
  return device ? pumpsOf(device.components)[0] : undefined;
}

/**
 * The valve the service reserves alongside a start. PlatformService fences the
 * pump together with the site's valve, so the first valve on the controller is
 * the one whose confirmed position gates the run.
 */
export function gatingValve(device: DeviceDetail | undefined): DeviceComponent | undefined {
  return device ? valvesOf(device.components)[0] : undefined;
}
