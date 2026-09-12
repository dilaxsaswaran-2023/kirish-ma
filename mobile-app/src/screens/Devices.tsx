import React, {useCallback} from 'react';
import {getCapabilities, getDevice, getDevices, getDiagnostics} from '../api/endpoints';
import type {Capabilities, Device, DeviceDetail, Diagnostics} from '../api/types';
import {componentIcon, componentStateLabel, componentTone, relativeTime} from '../format';
import {useNavigation, useParams} from '../navigation/Navigator';
import {useResource} from '../state/useResource';
import {useSession} from '../state/SessionContext';
import {gatingValve, primaryPump, sensorsOf} from '../state/equipment';
import {Screen} from '../ui/Screen';
import {ActionButton} from '../ui/ActionButton';
import {Hero, Metrics, Note, Row, Tiles} from '../ui/blocks';
import {EmptyState, ErrorState, Loading} from '../ui/StateViews';

export function DevicesScreen() {
  const {siteId} = useParams<'devices'>();
  const navigation = useNavigation();
  const load = useCallback(() => getDevices(siteId), [siteId]);
  const devices = useResource<Device[]>(load, [siteId], {pollMs: 20000});

  return (
    <Screen
      title="Controllers"
      subtitle="Every motor, valve and sensor sits on a controller."
      onRefresh={devices.reload}
      refreshing={devices.refreshing}>
      {devices.loading ? <Loading label="Reading controllers…" /> : null}
      {devices.error && !devices.data ? (
        <ErrorState error={devices.error} onRetry={devices.reload} />
      ) : null}
      {devices.data?.length === 0 ? (
        <EmptyState icon="cpu" title="No controllers yet" sub="This site has no controller connected." />
      ) : null}
      {devices.data?.map(device => {
        const online = device.status === 'ONLINE';
        return (
          <Row
            key={device.id}
            icon="cpu"
            label={device.name}
            sub={`${device.model} · ${device.actuator_count ?? 0} actuators · ${
              device.sensor_count ?? 0
            } sensors · ${relativeTime(device.last_seen_at)}`}
            tone={online ? 'green' : 'amber'}
            badge={online ? 'Online' : 'Offline'}
            onPress={() => navigation.navigate('device', {deviceId: device.id})}
          />
        );
      })}
      <Note
        icon="wifi"
        label="Offline means no live feedback"
        sub="A controller that is not reporting cannot be started remotely."
      />
    </Screen>
  );
}

export function DeviceScreen() {
  const {deviceId} = useParams<'device'>();
  const navigation = useNavigation();
  const session = useSession();
  const load = useCallback(() => getDevice(deviceId), [deviceId]);
  const device = useResource<DeviceDetail>(load, [deviceId], {pollMs: 5000});

  if (device.loading) {
    return (
      <Screen title="Controller" subtitle="Reading controller…">
        <Loading />
      </Screen>
    );
  }
  if (!device.data) {
    return (
      <Screen title="Controller" subtitle="Unavailable">
        {device.error ? <ErrorState error={device.error} onRetry={device.reload} /> : null}
      </Screen>
    );
  }

  const detail = device.data;
  const online = detail.status === 'ONLINE';
  const pump = primaryPump(detail);
  const valve = gatingValve(detail);
  const sensors = sensorsOf(detail.components);
  const running = pump?.reported_state === 'RUNNING';

  return (
    <Screen
      title={detail.name}
      subtitle={`${detail.model} · ${online ? 'Online' : 'Offline'} · ${relativeTime(detail.last_seen_at)}`}
      badge={{icon: 'cpu', tone: online ? 'green' : 'amber'}}
      onRefresh={device.reload}
      refreshing={device.refreshing}>
      <Hero
        icon={pump ? 'motor' : 'cpu'}
        label={online ? 'CONFIRMED STATE' : 'NO LIVE FEEDBACK'}
        value={pump ? componentStateLabel(pump) : online ? 'Online' : 'State unknown'}
        sub={
          valve
            ? `${valve.name} ${componentStateLabel(valve).toLowerCase()} · Serial ${detail.serial}`
            : `Serial ${detail.serial} · Firmware ${detail.firmware ?? '—'}`
        }
        tone={running ? 'blue' : online ? 'forest' : 'amber'}
      />

      {pump && online && session.canControl ? (
        <ActionButton
          label={running ? 'View the live run' : 'Water now'}
          icon="drop"
          onPress={() =>
            running
              ? navigation.navigate('live')
              : navigation.navigate('waterNow', {deviceId: detail.id, componentId: pump.id})
          }
        />
      ) : null}

      {!online ? (
        <Note
          icon="offline"
          label="Remote control unavailable"
          sub="The service refuses a start while the controller is not reporting. Use the local controls on site if needed."
          tone="amber"
        />
      ) : null}

      <Tiles
        items={[
          {
            icon: 'motor',
            label: 'Components',
            sub: `${detail.components.length} connected`,
            onPress: () => navigation.navigate('components', {deviceId: detail.id}),
          },
          {
            icon: 'chart',
            label: 'Readings',
            sub: `${sensors.length} sensors`,
            onPress: () => navigation.navigate('readings', {deviceId: detail.id}),
          },
          {
            icon: 'wifi',
            label: 'Diagnostics',
            sub: 'Link and configuration',
            onPress: () => navigation.navigate('diagnostics', {deviceId: detail.id}),
          },
          {
            icon: 'shield',
            label: 'Protection',
            sub: 'What the checks do',
            onPress: () => navigation.navigate('protection'),
          },
        ]}
      />

      {detail.components.map(component => (
        <Row
          key={component.id}
          icon={componentIcon(component.kind)}
          label={component.name}
          sub={`${component.hardware_channel} · ${componentStateLabel(component)}`}
          tone={componentTone(component)}
          badge={component.feedback_quality === 'CONFIRMED' ? undefined : 'Unconfirmed'}
          onPress={() =>
            navigation.navigate('component', {deviceId: detail.id, componentId: component.id})
          }
        />
      ))}
    </Screen>
  );
}

export function ComponentsScreen() {
  const {deviceId} = useParams<'components'>();
  const navigation = useNavigation();
  const load = useCallback(() => getDevice(deviceId), [deviceId]);
  const device = useResource<DeviceDetail>(load, [deviceId], {pollMs: 5000});

  return (
    <Screen
      title="Components"
      subtitle={device.data ? `${device.data.name} · ${device.data.components.length} connected` : 'Reading…'}
      onRefresh={device.reload}
      refreshing={device.refreshing}>
      {device.loading ? <Loading /> : null}
      {device.error && !device.data ? <ErrorState error={device.error} onRetry={device.reload} /> : null}
      {device.data?.components.map(component => (
        <Row
          key={component.id}
          icon={componentIcon(component.kind)}
          label={component.name}
          sub={`${component.hardware_channel} · ${componentStateLabel(component)} · ${relativeTime(
            component.measured_at,
          )}`}
          tone={componentTone(component)}
          onPress={() =>
            navigation.navigate('component', {deviceId, componentId: component.id})
          }
        />
      ))}
      <Note
        icon="link"
        label="Channels come from the controller"
        sub="Each component is bound to the hardware channel it was commissioned on."
      />
    </Screen>
  );
}

export function ComponentScreen() {
  const {deviceId, componentId} = useParams<'component'>();
  const navigation = useNavigation();
  const session = useSession();
  const load = useCallback(() => getDevice(deviceId), [deviceId]);
  const device = useResource<DeviceDetail>(load, [deviceId], {pollMs: 3000});
  const component = device.data?.components.find(item => item.id === componentId);

  if (device.loading) {
    return (
      <Screen title="Component" subtitle="Reading state…">
        <Loading />
      </Screen>
    );
  }
  if (!component) {
    return (
      <Screen title="Component" subtitle="Unavailable">
        {device.error ? (
          <ErrorState error={device.error} onRetry={device.reload} />
        ) : (
          <EmptyState icon="search" title="Component not found" sub="It is no longer on this controller." />
        )}
      </Screen>
    );
  }

  const confirmed = component.feedback_quality === 'CONFIRMED';
  const online = device.data?.status === 'ONLINE';
  const active = component.reported_state === 'RUNNING' || component.reported_state === 'OPEN';
  const isPump = component.kind === 'PUMP';

  return (
    <Screen
      title={component.name}
      subtitle={`${device.data?.name} · ${component.hardware_channel}`}
      badge={{icon: componentIcon(component.kind), tone: componentTone(component)}}
      onRefresh={device.reload}
      refreshing={device.refreshing}>
      <Hero
        icon={componentIcon(component.kind)}
        label={confirmed ? 'CONFIRMED STATE' : 'POSITION NOT CONFIRMED'}
        value={componentStateLabel(component)}
        sub={`Feedback ${component.feedback_quality.toLowerCase()} · reading ${relativeTime(
          component.measured_at,
        )}`}
        tone={!confirmed ? 'amber' : active ? 'blue' : 'forest'}
      />

      <Metrics
        items={[
          {icon: 'link', value: component.hardware_channel, label: 'Hardware channel'},
          {icon: 'refresh', value: `v${component.state_version}`, label: 'State version'},
        ]}
      />

      {isPump && online && session.canControl ? (
        <ActionButton
          label={component.reported_state === 'RUNNING' ? 'View the live run' : 'Water now'}
          icon="drop"
          onPress={() =>
            component.reported_state === 'RUNNING'
              ? navigation.navigate('live')
              : navigation.navigate('waterNow', {deviceId, componentId: component.id})
          }
        />
      ) : null}

      {!isPump ? (
        <Note
          icon="shield"
          label="This component is moved by a protected run"
          sub="A valve opens as part of a run so the motor can never start against a closed valve."
        />
      ) : null}

      {!confirmed ? (
        <Note
          icon="alert"
          label="Position needs a check"
          sub="Without confirmed feedback the service will not allow a start that depends on this component."
          tone="amber"
        />
      ) : null}

      <Row
        icon="shield"
        label="Protection"
        sub="Valve first, motor second, safe stop last"
        onPress={() => navigation.navigate('protection')}
      />
      <Row
        icon="chart"
        label="Readings"
        sub="Sensor values on this controller"
        onPress={() => navigation.navigate('readings', {deviceId})}
      />
    </Screen>
  );
}

export function DiagnosticsScreen() {
  const {deviceId} = useParams<'diagnostics'>();
  const load = useCallback(
    async (): Promise<{diagnostics: Diagnostics; capabilities: Capabilities}> => {
      const [diagnostics, capabilities] = await Promise.all([
        getDiagnostics(deviceId),
        getCapabilities(deviceId),
      ]);
      return {diagnostics, capabilities};
    },
    [deviceId],
  );
  const resource = useResource(load, [deviceId], {pollMs: 10000});

  return (
    <Screen
      title="Diagnostics"
      subtitle="What the service knows about the link"
      onRefresh={resource.reload}
      refreshing={resource.refreshing}>
      {resource.loading ? <Loading /> : null}
      {resource.error && !resource.data ? (
        <ErrorState error={resource.error} onRetry={resource.reload} />
      ) : null}
      {resource.data ? (
        <>
          <Hero
            icon="wifi"
            label="CONTROLLER LINK"
            value={resource.data.diagnostics.mqtt === 'CONNECTED' ? 'Connected' : 'Not connected'}
            sub={`Status ${resource.data.diagnostics.status} · configuration ${resource.data.diagnostics.configuration.toLowerCase()}`}
            tone={resource.data.diagnostics.status === 'ONLINE' ? 'forest' : 'amber'}
          />
          <Metrics
            items={[
              {
                icon: 'clock',
                value: `${resource.data.diagnostics.telemetryLagSeconds}s`,
                label: 'Telemetry lag',
              },
              {icon: 'cpu', value: resource.data.capabilities.model, label: 'Model'},
            ]}
          />
          <Row
            icon="power"
            label="Supported actions"
            sub={resource.data.capabilities.actions.join(' · ')}
          />
          <Row
            icon="link"
            label="Channels"
            sub={resource.data.capabilities.channels.join(' · ')}
          />
          <Note
            icon="shield"
            label="Only protected actions are offered"
            sub="The controller accepts a protected start and a safe stop; nothing else can be commanded from the phone."
          />
        </>
      ) : null}
    </Screen>
  );
}
