import React, {useCallback, useState} from 'react';
import {getCapabilities, getDevice} from '../api/endpoints';
import type {DeviceComponent, DeviceDetail} from '../api/types';
import {componentStateLabel, componentTone, minutesLabel, relativeTime} from '../format';
import {useNavigation, useParams} from '../navigation/Navigator';
import {useResource} from '../state/useResource';
import {useSession} from '../state/SessionContext';
import {useControl} from '../state/ControlContext';
import {gatingValve, valvesOf} from '../state/equipment';
import {Screen} from '../ui/Screen';
import {ActionButton} from '../ui/ActionButton';
import {Choices, Field, Hero, Note, Steps, Tiles} from '../ui/blocks';
import {ErrorState, Loading} from '../ui/StateViews';

const DURATION_CHOICES = [5, 10, 20, 30];

/** Explains the protection the service enforces; no controls of its own. */
export function ProtectionScreen() {
  return (
    <Screen title="Safe watering" subtitle="These checks protect your equipment.">
      <Steps
        items={[
          {icon: 'valve', label: 'Open the valve', sub: 'The run waits for a confirmed open position'},
          {icon: 'motor', label: 'Start the motor', sub: 'Only after the valve has confirmed'},
          {icon: 'stop', label: 'Stop the motor', sub: 'The run waits for confirmed motor-off'},
          {icon: 'valve', label: 'Close the valve', sub: 'Only after the motor is confirmed off'},
        ]}
      />
      <Note
        icon="shield"
        label="Protection stays on"
        sub="The service refuses a start when the controller is offline, when the valve position is not fresh, or when another run already holds the equipment."
      />
      <Note
        icon="clock"
        label="Time is never treated as feedback"
        sub="A step only advances when the controller reports the new state. If a stop is not confirmed, the motor is treated as still running."
      />
    </Screen>
  );
}

export function WaterNowScreen() {
  const params = useParams<'waterNow'>();
  const {deviceId, componentId} = params;
  const navigation = useNavigation();
  const session = useSession();
  const load = useCallback(() => getDevice(deviceId), [deviceId]);
  const device = useResource<DeviceDetail>(load, [deviceId], {pollMs: 5000});
  const capabilities = useResource(() => getCapabilities(deviceId), [deviceId]);
  const [valveId, setValveId] = useState<string | undefined>(params.valveId);
  const [durationSeconds, setDurationSeconds] = useState(params.durationSeconds ?? 20 * 60);

  if (device.loading) {
    return (
      <Screen title="Water now" subtitle="Reading equipment…">
        <Loading />
      </Screen>
    );
  }
  if (!device.data) {
    return (
      <Screen title="Water now" subtitle="Unavailable">
        {device.error ? <ErrorState error={device.error} onRetry={device.reload} /> : null}
      </Screen>
    );
  }

  const detail = device.data;
  const pump = detail.components.find(component => component.id === componentId);
  const valves = valvesOf(detail.components);
  const selectedValve: DeviceComponent | undefined =
    valves.find(valve => valve.id === valveId) ?? gatingValve(detail);
  const online = detail.status === 'ONLINE';
  const valveReady = selectedValve ? selectedValve.feedback_quality === 'CONFIRMED' : false;
  const canContinue = Boolean(pump) && online && session.canControl && valveReady;

  return (
    <Screen
      title="Water now"
      subtitle={`${pump?.name ?? 'Motor'} · ${detail.name}`}
      badge={{icon: 'drop', tone: online ? 'green' : 'amber'}}
      onRefresh={device.reload}
      refreshing={device.refreshing}>
      <Hero
        icon="motor"
        label={online ? 'READY' : 'NO LIVE FEEDBACK'}
        value={pump ? componentStateLabel(pump) : 'Motor not found'}
        sub={`${detail.name} · ${online ? 'Online' : 'Offline'} · ${relativeTime(detail.last_seen_at)}`}
        tone={online ? 'forest' : 'amber'}
      />

      {valves.length > 0 ? (
        <>
          <Choices
            items={valves}
            selectedId={selectedValve?.id}
            onSelect={valve => setValveId(valve.id)}
            renderLabel={valve => valve.name}
            renderSub={valve =>
              valve.feedback_quality === 'CONFIRMED'
                ? `${componentStateLabel(valve)} · position confirmed`
                : 'Position not confirmed · cannot gate a start'
            }
            iconFor={() => 'valve'}
            toneFor={valve => componentTone(valve)}
            disabledFor={valve => valve.feedback_quality !== 'CONFIRMED'}
          />
          {valves.length > 1 ? (
            <Note
              icon="link"
              label="One valve gates the run"
              sub="The service reserves the motor together with the site valve for the whole run."
            />
          ) : null}
        </>
      ) : (
        <Note
          icon="alert"
          label="No valve on this controller"
          sub="A protected start needs a valve whose open position can be confirmed."
          tone="amber"
        />
      )}

      <Field
        label="Water for"
        value={minutesLabel(durationSeconds)}
        icon="clock"
        onPress={() =>
          navigation.navigate('duration', {
            deviceId,
            componentId,
            valveId: selectedValve?.id,
            durationSeconds,
          })
        }
      />
      <Tiles
        items={DURATION_CHOICES.map(minutes => ({
          icon: 'clock' as const,
          label: `${minutes} min`,
          sub: durationSeconds === minutes * 60 ? 'Selected' : undefined,
          onPress: () => setDurationSeconds(minutes * 60),
        }))}
      />

      {!online ? (
        <Note
          icon="offline"
          label="The controller is offline"
          sub="No start will be queued for reconnect. Nothing is sent while it is not reporting."
          tone="amber"
        />
      ) : null}
      {!session.canControl ? (
        <Note
          icon="lock"
          label="View-only access"
          sub="Your role cannot issue equipment commands."
          tone="amber"
        />
      ) : null}
      {online && selectedValve && !valveReady ? (
        <Note
          icon="shield"
          label="Valve feedback is not fresh"
          sub="The service requires a confirmed valve position before it accepts a protected start."
          tone="amber"
        />
      ) : null}

      <Note
        icon="shield"
        label="Valve opens first"
        sub={
          capabilities.data
            ? `This controller accepts ${capabilities.data.actions.join(' and ')}.`
            : 'The motor stays off until the valve confirms open.'
        }
      />

      <ActionButton
        label="Continue"
        icon="arrow"
        disabled={!canContinue}
        onPress={() =>
          navigation.navigate('startConfirm', {
            deviceId,
            componentId,
            valveId: selectedValve?.id,
            durationSeconds,
          })
        }
      />
    </Screen>
  );
}

export function DurationScreen() {
  const params = useParams<'duration'>();
  const navigation = useNavigation();
  const [seconds, setSeconds] = useState(params.durationSeconds);

  return (
    <Screen title="Watering time" subtitle="How long you plan to water for.">
      <Hero
        icon="clock"
        label="PLANNED RUN TIME"
        value={minutesLabel(seconds)}
        sub="The service reserves the motor and valve for this long, plus a safety margin."
      />
      <Tiles
        items={DURATION_CHOICES.map(minutes => ({
          icon: 'clock' as const,
          label: `${minutes} min`,
          sub: seconds === minutes * 60 ? 'Selected' : undefined,
          onPress: () => setSeconds(minutes * 60),
        }))}
      />
      <Note
        icon="shield"
        label="A run ends with a confirmed safe stop"
        sub="When the planned time is up the app asks you to stop; the motor is stopped first and the valve closes only after motor-off is confirmed."
      />
      <ActionButton
        label={`Use ${minutesLabel(seconds)}`}
        icon="check"
        onPress={() =>
          navigation.replace('waterNow', {
            deviceId: params.deviceId,
            componentId: params.componentId,
            valveId: params.valveId,
            durationSeconds: seconds,
          })
        }
      />
    </Screen>
  );
}

export function StartConfirmScreen() {
  const params = useParams<'startConfirm'>();
  const navigation = useNavigation();
  const control = useControl();
  const load = useCallback(() => getDevice(params.deviceId), [params.deviceId]);
  const device = useResource<DeviceDetail>(load, [params.deviceId]);

  const pump = device.data?.components.find(component => component.id === params.componentId);
  const valve = device.data?.components.find(component => component.id === params.valveId);
  const otherValves =
    device.data?.components.filter(
      component => component.kind === 'VALVE' && component.id !== params.valveId,
    ) ?? [];

  const start = async () => {
    try {
      await control.start({
        componentId: params.componentId,
        deviceId: params.deviceId,
        valveId: params.valveId,
        durationSeconds: params.durationSeconds,
      });
      navigation.replace('live');
    } catch {
      // The refusal is presented on its own screen with the service's reason.
      navigation.replace('blocked');
    }
  };

  return (
    <Screen
      title="Start watering?"
      subtitle={`${valve?.name ?? 'Valve'} · ${minutesLabel(params.durationSeconds)}`}>
      <Steps
        items={[
          {
            icon: 'valve',
            label: `Open ${valve?.name ?? 'the valve'}`,
            sub: 'Wait for confirmation from the controller',
          },
          {
            icon: 'motor',
            label: `Start ${pump?.name ?? 'the motor'}`,
            sub: `Planned run: ${minutesLabel(params.durationSeconds)}`,
          },
          {
            icon: 'shield',
            label: 'Safe stop',
            sub: 'Motor off is confirmed, then the valve closes',
          },
        ]}
      />
      {otherValves.length > 0 ? (
        <Note
          icon="lock"
          label={`${otherValves.map(valveItem => valveItem.name).join(', ')} stays closed`}
          sub="Only the valve in this run is opened."
        />
      ) : null}
      <Note
        icon="shield"
        label="Nothing moves until the service accepts"
        sub="The request is checked for ownership, controller liveness and fresh valve feedback before any command is issued."
      />
      <ActionButton label="Start safely" icon="play" onPress={start} busy={control.busy} />
      <ActionButton label="Cancel" icon="close" tone="outline" onPress={navigation.goBack} />
    </Screen>
  );
}
