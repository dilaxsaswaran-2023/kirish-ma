import type {IconName} from '../icons';
import type {Tone} from '../theme';
import {ApiError} from './client';

/**
 * The service answers refusals with a machine-readable code. Each one is given
 * a short farmer-facing headline and on-site guidance; the service's own
 * sentence is always shown alongside rather than replaced, so nothing about the
 * equipment state is softened or invented.
 */
export type ErrorPresentation = {
  headline: string;
  guidance: string;
  icon: IconName;
  tone: Tone;
  /** True when the refusal means no equipment was energised. */
  equipmentUntouched: boolean;
};

const BY_CODE: Record<string, ErrorPresentation> = {
  NETWORK_UNREACHABLE: {
    headline: 'No connection to the service',
    guidance: 'Check the phone network and the API address in Settings, then try again.',
    icon: 'offline',
    tone: 'amber',
    equipmentUntouched: true,
  },
  AUTHENTICATION_REQUIRED: {
    headline: 'Sign in again',
    guidance: 'The workspace identity was not accepted. Sign in to continue.',
    icon: 'lock',
    tone: 'amber',
    equipmentUntouched: true,
  },
  INVALID_ROLE: {
    headline: 'Role not recognised',
    guidance: 'Choose a role the workspace knows on the sign-in screen.',
    icon: 'user',
    tone: 'amber',
    equipmentUntouched: true,
  },
  RESOURCE_NOT_FOUND: {
    headline: 'Not found in this workspace',
    guidance: 'It may have been removed, or it belongs to another workspace.',
    icon: 'search',
    tone: 'amber',
    equipmentUntouched: true,
  },
  SITE_ACCESS_DENIED: {
    headline: 'No access to this site',
    guidance: 'Ask an administrator to grant you access to the site.',
    icon: 'lock',
    tone: 'amber',
    equipmentUntouched: true,
  },
  MANAGEMENT_FORBIDDEN: {
    headline: 'Changes are not allowed',
    guidance: 'Your role can watch this, but not change the configuration.',
    icon: 'lock',
    tone: 'amber',
    equipmentUntouched: true,
  },
  PLATFORM_ADMIN_REQUIRED: {
    headline: 'Platform access required',
    guidance: 'This area is for platform administration only.',
    icon: 'lock',
    tone: 'amber',
    equipmentUntouched: true,
  },
  CONTROL_FORBIDDEN: {
    headline: 'View-only access',
    guidance: 'Your role cannot start or stop equipment. Nothing was sent to the controller.',
    icon: 'lock',
    tone: 'amber',
    equipmentUntouched: true,
  },
  UNSUPPORTED_ACTION: {
    headline: 'Action not supported',
    guidance: 'This component only accepts a protected start and a safe stop.',
    icon: 'shield',
    tone: 'amber',
    equipmentUntouched: true,
  },
  CAPABILITY_MISMATCH: {
    headline: 'This component cannot be started',
    guidance: 'Only a pump accepts a protected start. Choose the motor instead.',
    icon: 'shield',
    tone: 'amber',
    equipmentUntouched: true,
  },
  CORPORATION_SUSPENDED: {
    headline: 'New starts are disabled',
    guidance: 'The workspace is suspended. Contact your administrator.',
    icon: 'lock',
    tone: 'amber',
    equipmentUntouched: true,
  },
  DEVICE_OFFLINE: {
    headline: 'Controller offline',
    guidance: 'Nothing was queued for reconnect. Check power and signal at the controller.',
    icon: 'offline',
    tone: 'amber',
    equipmentUntouched: true,
  },
  RESOURCE_BUSY: {
    headline: 'Equipment is in another run',
    guidance: 'The motor or valve is reserved by a run that is still active. Wait for it to finish.',
    icon: 'lock',
    tone: 'amber',
    equipmentUntouched: true,
  },
  STALE_STATE: {
    headline: 'Motor kept off',
    guidance: 'The valve has not confirmed its position, so no start was sent. Check the valve on site.',
    icon: 'shield',
    tone: 'amber',
    equipmentUntouched: true,
  },
  VALIDATION_FAILED: {
    headline: 'The request was rejected',
    guidance: 'Some values were not accepted by the service.',
    icon: 'alert',
    tone: 'amber',
    equipmentUntouched: true,
  },
};

const FALLBACK: ErrorPresentation = {
  headline: 'Something went wrong',
  guidance: 'Try again. If it keeps happening, check the service.',
  icon: 'alert',
  tone: 'red',
  equipmentUntouched: false,
};

export function presentError(error: ApiError | undefined): ErrorPresentation {
  if (!error) {
    return FALLBACK;
  }
  return BY_CODE[error.code] ?? FALLBACK;
}
