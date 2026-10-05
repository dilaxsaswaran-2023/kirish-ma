import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert as NativeAlert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  getDevice,
  getOperationalFlow,
  getOperationalFlows,
  getSite,
  getSiteReadings,
  getZone,
  getZones,
  operateFlow,
  updateComponent,
  updateOperationalFlow,
} from '../api/endpoints';
import type {
  DeviceComponent,
  DeviceDetail,
  OperationalFlowDetail,
  SensorReading,
  SiteDetail,
  Zone,
  ZoneDetail,
} from '../api/types';
import { Icon, type IconName } from '../icons';
import { useNavigation, useParams } from '../navigation/Navigator';
import { useResource } from '../state/useResource';
import { useSession } from '../state/SessionContext';
import { controlBlocker, latestReadings } from '../state/farmer';
import { colors, radius, spacing } from '../theme';
import { ActionButton } from '../ui/ActionButton';
import { Screen } from '../ui/Screen';
import { Loading } from '../ui/StateViews';

const titleCase = (value: string) =>
  value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
const when = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : 'No update yet';
const componentIcon = (kind: string): IconName =>
  kind === 'VALVE' ? 'valve' : kind === 'SENSOR' ? 'sensor' : 'motor';

function Section({
  icon,
  title,
  children,
}: {
  icon: IconName;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitle}>
        <Icon name={icon} size={24} />
        <Text style={styles.heading}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
function Empty({ message }: { message: string }) {
  return <Text style={styles.empty}>{message}</Text>;
}
function Message({
  message,
  warning = false,
}: {
  message: string;
  warning?: boolean;
}) {
  return (
    <View
      style={[styles.message, warning && styles.warning]}
      accessibilityLiveRegion="polite"
    >
      <Icon
        name={warning ? 'alert' : 'check'}
        size={24}
        color={warning ? colors.amber : colors.green}
      />
      <Text style={styles.messageText}>{message}</Text>
    </View>
  );
}
function ReadError({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.section}>
      <Message
        warning
        message="Could not update your farm. Check your internet connection and try again."
      />
      <ActionButton
        label="Try again"
        icon="refresh"
        tone="outline"
        onPress={onRetry}
      />
    </View>
  );
}
function More({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.section}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        style={styles.more}
        onPress={() => setOpen(value => !value)}
      >
        <Text style={styles.deviceTitle}>{title}</Text>
        <Text style={styles.moreLabel}>{open ? 'Hide' : 'Show'}</Text>
      </Pressable>
      {open ? children : null}
    </View>
  );
}
function CorporationPicker() {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const active =
    session.workspaces.find(
      space => space.id === session.me?.activeCorporationId,
    ) ?? session.workspaces[0];
  return (
    <Section icon="home" title="Corporation">
      <Pressable
        style={styles.picker}
        disabled={session.connecting}
        onPress={() => setOpen(value => !value)}
        accessibilityRole="button"
        accessibilityLabel={`Choose corporation. ${
          active?.name ?? 'None selected'
        }`}
        accessibilityState={{ expanded: open, disabled: session.connecting }}
      >
        <Text style={styles.pickerText}>
          {session.connecting
            ? 'Changing corporation...'
            : active?.name ?? 'No corporation'}
        </Text>
        <Text style={styles.moreLabel}>{open ? 'Close' : 'Change'}</Text>
      </Pressable>
      {open &&
        session.workspaces.map(space => (
          <Pressable
            key={space.id}
            style={styles.option}
            accessibilityRole="radio"
            accessibilityState={{ selected: space.id === active?.id }}
            onPress={async () => {
              setOpen(false);
              setError('');
              try {
                await session.selectCorporation(space.id);
              } catch {
                setError('Could not change corporation. Please try again.');
              }
            }}
          >
            <Text style={styles.optionText}>{space.name}</Text>
            {space.id === active?.id ? <Icon name="check" size={24} /> : null}
          </Pressable>
        ))}
      {error ? <Message warning message={error} /> : null}
    </Section>
  );
}
function ZoneGrid({ zones }: { zones: Zone[] }) {
  const navigation = useNavigation();
  const pairs = Array.from(
    { length: Math.ceil(zones.length / 2) },
    (_, index) => zones.slice(index * 2, index * 2 + 2),
  );
  return (
    <View style={styles.section}>
      {pairs.map((pair, index) => (
        <View key={index} style={styles.zoneRow}>
          {pair.map(zone => (
            <Pressable
              key={zone.id}
              style={styles.zoneCard}
              accessibilityRole="button"
              accessibilityLabel={`Open ${zone.name}. ${
                zone.device_count ?? 0
              } devices. ${zone.online_count ?? 0} online.`}
              onPress={() => navigation.navigate('zone', { zoneId: zone.id })}
            >
              <View style={styles.zoneIcon}>
                <Icon name="leaf" size={28} />
              </View>
              <Text style={styles.zoneTitle}>{zone.name}</Text>
              <Text style={styles.muted}>
                {zone.device_count ?? 0}{' '}
                {zone.device_count === 1 ? 'device' : 'devices'}
              </Text>
              <Text
                style={[
                  styles.status,
                  !(zone.online_count ?? 0) && styles.offlineText,
                ]}
              >
                {(zone.online_count ?? 0) > 0
                  ? `${zone.online_count} online`
                  : 'No connection'}
              </Text>
              <Text style={styles.moreLabel}>View devices</Text>
            </Pressable>
          ))}
          {pair.length === 1 ? <View style={styles.grow} /> : null}
        </View>
      ))}
    </View>
  );
}
export function OperationsHomeScreen() {
  const session = useSession();
  const navigation = useNavigation();
  const zones = useResource<Zone[]>(
    useCallback(() => getZones(), []),
    [session.me?.activeCorporationId, session.connecting],
    { pollMs: 20000, enabled: !session.connecting },
  );
  const groups = useMemo(
    () =>
      session.sites.map(site => ({
        site,
        zones: (zones.data ?? []).filter(zone => zone.site_id === site.id),
      })),
    [session.sites, zones.data],
  );
  return (
    <Screen
      title="My farm"
      subtitle="Choose a zone, then choose your device."
      hideBack
      showTabs={false}
      onRefresh={zones.reload}
      refreshing={zones.refreshing}
    >
      <CorporationPicker />
      {zones.loading || session.connecting ? (
        <Loading label="Loading your zones..." />
      ) : null}
      {zones.error ? <ReadError onRetry={zones.reload} /> : null}
      {!session.connecting &&
        groups.map(({ site, zones: siteZones }) => (
          <Section key={site.id} icon="pin" title={site.name}>
            {site.location ? (
              <Text style={styles.muted}>{site.location}</Text>
            ) : null}
            {siteZones.length ? (
              <ZoneGrid zones={siteZones} />
            ) : !zones.loading && !zones.error ? (
              <Empty message="No zones yet. Ask your manager to add a zone." />
            ) : null}
          </Section>
        ))}
      {!session.sites.length && !session.connecting ? (
        <Empty message="No farms are assigned to you. Please contact your manager." />
      ) : null}
      <ActionButton
        label="Sign out"
        icon="lock"
        tone="outline"
        onPress={() =>
          NativeAlert.alert(
            'Sign out?',
            'You will need your email and password to sign in again.',
            [
              { text: 'Stay signed in', style: 'cancel' },
              {
                text: 'Sign out',
                onPress: () => {
                  session.signOut();
                  navigation.reset('signin');
                },
              },
            ],
          )
        }
      />
    </Screen>
  );
}
export function OperationsSiteScreen() {
  const { siteId } = useParams<'site'>();
  const navigation = useNavigation();
  const site = useResource<SiteDetail>(
    useCallback(() => getSite(siteId), [siteId]),
    [siteId],
    { pollMs: 20000 },
  );
  return (
    <Screen
      title={site.data?.name ?? 'Site'}
      subtitle="Choose a zone"
      showTabs={false}
      onHome={() => navigation.reset('home')}
      onRefresh={site.reload}
      refreshing={site.refreshing}
    >
      {site.loading ? <Loading label="Loading zones..." /> : null}
      {site.error ? <ReadError onRetry={site.reload} /> : null}
      {site.data ? <ZoneGrid zones={site.data.zones} /> : null}
    </Screen>
  );
}
export function OperationsZoneScreen() {
  const { zoneId } = useParams<'zone'>();
  const navigation = useNavigation();
  const zone = useResource<ZoneDetail>(
    useCallback(() => getZone(zoneId), [zoneId]),
    [zoneId],
    { pollMs: 15000 },
  );
  return (
    <Screen
      title={zone.data?.name ?? 'Zone'}
      subtitle={zone.data?.site_name ?? 'Choose a device'}
      showTabs={false}
      onHome={() => navigation.reset('home')}
      onRefresh={zone.reload}
      refreshing={zone.refreshing}
    >
      {zone.loading ? <Loading label="Loading devices..." /> : null}
      {zone.error ? <ReadError onRetry={zone.reload} /> : null}
      {zone.data ? (
        <Section icon="cpu" title="Choose a device">
          {zone.data.devices.length ? (
            zone.data.devices.map(device => (
              <Pressable
                key={device.id}
                style={styles.deviceCard}
                onPress={() =>
                  navigation.navigate('device', { deviceId: device.id })
                }
                accessibilityRole="button"
                accessibilityLabel={`Open ${device.name}. ${
                  device.status === 'ONLINE' ? 'Online' : 'Offline'
                }`}
              >
                <View style={styles.deviceIcon}>
                  <Icon name="cpu" size={28} />
                </View>
                <View style={styles.grow}>
                  <Text style={styles.deviceTitle}>{device.name}</Text>
                  <Text
                    style={[
                      styles.status,
                      device.status !== 'ONLINE' && styles.offlineText,
                    ]}
                  >
                    {device.status === 'ONLINE' ? 'Online' : 'Offline'}
                  </Text>
                  <Text style={styles.muted}>
                    {device.actuator_count ?? 0} controls ·{' '}
                    {device.sensor_count ?? 0} sensors
                  </Text>
                </View>
                <Icon name="next" size={24} />
              </Pressable>
            ))
          ) : (
            <Empty message="No devices yet. Ask your manager to add a device." />
          )}
        </Section>
      ) : null}
    </Screen>
  );
}
type DeviceDashboard = {
  device: DeviceDetail;
  flows: OperationalFlowDetail[];
  readings: SensorReading[];
};
export function OperationsDeviceScreen() {
  const { deviceId } = useParams<'device'>();
  const navigation = useNavigation();
  const session = useSession();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const writing = useRef(false);
  const [editing, setEditing] = useState<DeviceComponent | null>(null);
  const load = useCallback(async (): Promise<DeviceDashboard> => {
    const device = await getDevice(deviceId);
    const [flowRows, readings] = await Promise.all([
      getOperationalFlows(device.site_id),
      getSiteReadings(device.site_id),
    ]);
    const allFlows = await Promise.all(
      flowRows.map(flow => getOperationalFlow(flow.id)),
    );
    const ids = new Set(device.components.map(component => component.id));
    return {
      device,
      flows: allFlows.filter(flow =>
        flow.steps.some(step => step.device_id === device.id),
      ),
      readings: readings.filter(reading => ids.has(reading.component_id)),
    };
  }, [deviceId]);
  const dashboard = useResource<DeviceDashboard>(load, [deviceId], {
    pollMs: 15000,
  });
  async function change(id: string, action: () => Promise<void>) {
    if (writing.current) return;
    writing.current = true;
    setBusy(id);
    setError('');
    setNotice('');
    try {
      await action();
      await dashboard.reload();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not complete the request. Please try again.',
      );
    } finally {
      writing.current = false;
      setBusy('');
    }
  }
  function run(flow: OperationalFlowDetail, action: 'ON' | 'OFF') {
    const label = action === 'ON' ? 'Start' : 'Stop';
    const ordered = action === 'ON' ? flow.steps : [...flow.steps].reverse();
    NativeAlert.alert(
      `${label} ${flow.name}?`,
      `This operates: ${ordered
        .map(step => `${step.component_name} (${step.device_name})`)
        .join(', ')}. We wait for each device to confirm.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: label,
          onPress: () =>
            change(flow.id, async () => {
              const receipt = await operateFlow(flow.id, action);
              setNotice(
                receipt.state === 'CONFIRMED'
                  ? 'The equipment confirmed your request.'
                  : 'Request sent. Wait for confirmation before assuming the equipment has changed.',
              );
            }),
        },
      ],
    );
  }
  function saveComponent(component: DeviceComponent) {
    if (!component.name.trim() || !component.hardware_channel.trim()) {
      setError('Enter a component name and hardware channel.');
      return;
    }
    change(component.id, async () => {
      await updateComponent({
        ...component,
        name: component.name.trim(),
        hardware_channel: component.hardware_channel.trim(),
      });
      setEditing(null);
      setNotice('Component settings saved.');
    });
  }
  function moveComponent(index: number, direction: -1 | 1) {
    if (!dashboard.data) return;
    const ordered = [...dashboard.data.device.components];
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    change('components', async () => {
      for (const [order, component] of ordered.entries())
        await updateComponent({ ...component, display_order: order + 1 });
      setNotice('Component display order saved.');
    });
  }
  function moveFlowStep(
    flow: OperationalFlowDetail,
    index: number,
    direction: -1 | 1,
  ) {
    const ids = flow.steps.map(step => step.component_id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    change(flow.id, async () => {
      await updateOperationalFlow(flow.id, flow.name, ids);
      setNotice('Operation order saved.');
    });
  }
  if (!dashboard.data)
    return (
      <Screen
        title="Device"
        subtitle="Loading equipment"
        showTabs={false}
        onHome={() => navigation.reset('home')}
      >
        {dashboard.loading ? (
          <Loading label="Loading your device..." />
        ) : (
          <ReadError onRetry={dashboard.reload} />
        )}
      </Screen>
    );
  const { device, flows, readings } = dashboard.data;
  const latest = latestReadings(readings);
  const offline = device.status !== 'ONLINE';
  const settingsDisabled = Boolean(busy) || Boolean(dashboard.error);
  return (
    <Screen
      title={device.name}
      subtitle={`${device.zone_name} · ${device.site_name}`}
      showTabs={false}
      onHome={() => navigation.reset('home')}
      onRefresh={dashboard.reload}
      refreshing={dashboard.refreshing}
    >
      <Message
        warning={offline || Boolean(dashboard.error)}
        message={
          dashboard.error
            ? 'Connection lost. The information below may be out of date.'
            : offline
            ? 'Device offline. Check its power and connection on site.'
            : 'Device online. You can check its status below.'
        }
      />
      {dashboard.error ? (
        <ActionButton
          label="Refresh status"
          icon="refresh"
          tone="outline"
          onPress={dashboard.reload}
        />
      ) : null}
      {error ? <Message warning message={error} /> : null}
      {notice ? <Message message={notice} /> : null}
      <Section icon="power" title="Start or stop">
        {flows.length ? (
          flows.map(flow => {
            const blocked = controlBlocker(
              flow,
              session.canControl,
              Boolean(dashboard.error),
            );
            const pending =
              flow.latestRun &&
              ['ACCEPTED', 'WAITING_FEEDBACK'].includes(flow.latestRun.state);
            const confirmedSnapshot =
              flow.online &&
              !dashboard.error &&
              flow.steps.every(step => step.feedback_quality === 'CONFIRMED');
            const state = pending
              ? 'Waiting for confirmation'
              : confirmedSnapshot && flow.currentState === 'ON'
              ? 'Running'
              : confirmedSnapshot && flow.currentState === 'OFF'
              ? 'Stopped'
              : 'Status not confirmed';
            return (
              <View key={flow.id} style={styles.operationCard}>
                <Text style={styles.deviceTitle}>{flow.name}</Text>
                <Text
                  style={styles.operationState}
                  accessibilityLiveRegion="polite"
                >
                  {state}
                </Text>
                <Text style={styles.muted}>
                  {flow.steps.map(step => step.component_name).join(' → ')}
                </Text>
                <View style={styles.controlRow}>
                  <View style={styles.grow}>
                    <ActionButton
                      label="Start"
                      icon="power"
                      disabled={
                        Boolean(blocked) ||
                        Boolean(busy) ||
                        flow.currentState === 'ON'
                      }
                      busy={busy === flow.id}
                      onPress={() => run(flow, 'ON')}
                    />
                  </View>
                  <View style={styles.grow}>
                    <ActionButton
                      label="Stop"
                      icon="stop"
                      tone="red"
                      disabled={
                        Boolean(blocked) ||
                        Boolean(busy) ||
                        flow.currentState === 'OFF'
                      }
                      onPress={() => run(flow, 'OFF')}
                    />
                  </View>
                </View>
                {blocked ? <Text style={styles.hint}>{blocked}</Text> : null}
                {flow.latestRun &&
                !pending &&
                flow.latestRun.state !== 'CONFIRMED' ? (
                  <Text style={styles.hint}>
                    Last request: {titleCase(flow.latestRun.state)}. Check the
                    equipment before trying again.
                  </Text>
                ) : null}
              </View>
            );
          })
        ) : (
          <Empty message="No operations yet. Ask your manager to set up a start/stop sequence." />
        )}
      </Section>
      <Section icon="sensor" title="Latest readings">
        {latest.length ? (
          latest.map(reading => (
            <View key={reading.component_id} style={styles.readingCard}>
              <Text style={styles.deviceTitle}>{reading.component_name}</Text>
              <Text style={styles.readingValue}>
                {reading.value}
                {reading.unit ? ` ${reading.unit}` : ''}
              </Text>
              <Text style={styles.muted}>
                Updated {when(reading.measured_at)}
              </Text>
              <Text style={styles.status}>{titleCase(reading.quality)}</Text>
            </View>
          ))
        ) : (
          <Empty message="No sensor readings yet. Values will appear when the device sends them." />
        )}
      </Section>
      <Section icon="motor" title="Equipment">
        {device.components.map(component => (
          <View key={component.id} style={styles.deviceCard}>
            <View style={styles.deviceIcon}>
              <Icon name={componentIcon(component.kind)} size={28} />
            </View>
            <View style={styles.grow}>
              <Text style={styles.deviceTitle}>{component.name}</Text>
              <Text style={styles.muted}>{titleCase(component.kind)}</Text>
              <Text style={styles.status}>
                {component.kind === 'SENSOR'
                  ? component.latest_value ?? 'No reading yet'
                  : titleCase(component.reported_state ?? 'Unknown')}
              </Text>
              {offline || component.feedback_quality !== 'CONFIRMED' ? (
                <Text style={styles.hint}>Not confirmed live</Text>
              ) : null}
            </View>
          </View>
        ))}
      </Section>
      {readings.length ? (
        <More title="Past readings">
          {[...readings]
            .sort(
              (a, b) => Date.parse(b.measured_at) - Date.parse(a.measured_at),
            )
            .map(reading => (
              <View key={reading.id} style={styles.historyCard}>
                <Text style={styles.deviceTitle}>
                  {reading.component_name}: {reading.value} {reading.unit ?? ''}
                </Text>
                <Text style={styles.muted}>
                  {when(reading.measured_at)} · {titleCase(reading.quality)}
                </Text>
              </View>
            ))}
        </More>
      ) : null}
      <More title="Device settings">
        <Text style={styles.muted}>
          {device.model} · Serial {device.serial} · Firmware{' '}
          {device.firmware ?? 'not recorded'}
        </Text>
        {session.canManage ? (
          <>
            <Message
              warning
              message="These settings change how the equipment works. Only change them if you understand the wiring and operating order."
            />
            <Section icon="settings" title="Components & display order">
              {device.components.map((component, index) => (
                <View key={component.id} style={styles.editor}>
                  {editing?.id === component.id ? (
                    <>
                      <Text style={styles.fieldLabel}>Component name</Text>
                      <TextInput
                        accessibilityLabel="Component name"
                        style={styles.input}
                        value={editing.name}
                        editable={!settingsDisabled}
                        onChangeText={name => setEditing({ ...editing, name })}
                      />
                      <Text style={styles.fieldLabel}>Hardware channel</Text>
                      <TextInput
                        accessibilityLabel="Hardware channel"
                        autoCapitalize="none"
                        style={styles.input}
                        value={editing.hardware_channel}
                        editable={!settingsDisabled}
                        onChangeText={hardware_channel =>
                          setEditing({ ...editing, hardware_channel })
                        }
                      />
                      <Text style={styles.fieldLabel}>Component type</Text>
                      <View style={styles.kindChoices}>
                        {[
                          'VALVE',
                          'MOTOR',
                          'PUMP',
                          'SWITCH',
                          'RELAY',
                          'SENSOR',
                        ].map(kind => (
                          <Pressable
                            key={kind}
                            accessibilityRole="radio"
                            accessibilityState={{
                              selected: editing.kind === kind,
                              disabled: settingsDisabled,
                            }}
                            disabled={settingsDisabled}
                            style={[
                              styles.kindChoice,
                              editing.kind === kind && styles.kindChoiceActive,
                            ]}
                            onPress={() => setEditing({ ...editing, kind })}
                          >
                            <Text
                              style={[
                                styles.kindChoiceText,
                                editing.kind === kind &&
                                  styles.kindChoiceTextActive,
                              ]}
                            >
                              {titleCase(kind)}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      <View style={styles.controlRow}>
                        <SmallButton
                          label="Cancel"
                          disabled={Boolean(busy)}
                          onPress={() => setEditing(null)}
                        />
                        <SmallButton
                          label="Save"
                          disabled={settingsDisabled}
                          onPress={() => saveComponent(editing)}
                        />
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.deviceTitle}>
                        {index + 1}. {component.name}
                      </Text>
                      <Text style={styles.muted}>
                        {titleCase(component.kind)} · Channel{' '}
                        {component.hardware_channel}
                      </Text>
                      <View style={styles.controlRow}>
                        <SmallButton
                          label="Move up"
                          disabled={index === 0 || settingsDisabled}
                          onPress={() => moveComponent(index, -1)}
                        />
                        <SmallButton
                          label="Move down"
                          disabled={
                            index === device.components.length - 1 ||
                            settingsDisabled
                          }
                          onPress={() => moveComponent(index, 1)}
                        />
                        <SmallButton
                          label="Edit"
                          disabled={settingsDisabled}
                          onPress={() => setEditing({ ...component })}
                        />
                      </View>
                    </>
                  )}
                </View>
              ))}
            </Section>
            <Section icon="reorder" title="Operation order">
              <Text style={styles.muted}>
                Start follows this order. Stop follows the reverse order.
              </Text>
              {flows.map(flow => (
                <View key={flow.id} style={styles.editor}>
                  <Text style={styles.deviceTitle}>{flow.name}</Text>
                  {flow.steps.map((step, index) => (
                    <View key={step.id} style={styles.orderRow}>
                      <Text style={styles.fieldLabel}>
                        {index + 1}. {step.component_name} ·{' '}
                        {titleCase(step.on_action)}
                      </Text>
                      <View style={styles.controlRow}>
                        <SmallButton
                          label="Move up"
                          disabled={index === 0 || settingsDisabled}
                          onPress={() => moveFlowStep(flow, index, -1)}
                        />
                        <SmallButton
                          label="Move down"
                          disabled={
                            index === flow.steps.length - 1 || settingsDisabled
                          }
                          onPress={() => moveFlowStep(flow, index, 1)}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </Section>
          </>
        ) : (
          <Text style={styles.muted}>
            Ask your manager to change component settings or operation order.
          </Text>
        )}
      </More>
    </Screen>
  );
}
function SmallButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={[styles.smallButton, disabled && styles.disabled]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={styles.smallButtonText}>{label}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  section: { gap: 12, marginBottom: 6 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heading: { fontSize: 21, fontWeight: '700', color: colors.ink },
  muted: { fontSize: 16, color: colors.muted, lineHeight: 23 },
  message: {
    backgroundColor: colors.sage,
    borderRadius: radius.card,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  warning: { backgroundColor: colors.amberBg },
  messageText: { flex: 1, fontSize: 16, lineHeight: 24, color: colors.ink },
  picker: {
    backgroundColor: colors.white,
    borderRadius: radius.action,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.inner,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
  },
  pickerText: { fontSize: 18, fontWeight: '600', color: colors.ink, flex: 1 },
  option: {
    backgroundColor: colors.white,
    padding: 16,
    minHeight: 56,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  optionText: { fontSize: 18, color: colors.ink, flex: 1 },
  zoneRow: { flexDirection: 'row', gap: 12 },
  zoneCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 185,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 8,
  },
  zoneIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneTitle: { fontSize: 19, fontWeight: '700', color: colors.ink },
  status: { fontSize: 16, fontWeight: '600', color: colors.green },
  offlineText: { color: colors.amber },
  moreLabel: { fontSize: 16, fontWeight: '700', color: colors.green },
  deviceCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grow: { flex: 1, minWidth: 0, gap: 6 },
  deviceTitle: {
    fontSize: 19,
    lineHeight: 26,
    fontWeight: '700',
    color: colors.ink,
    flexShrink: 1,
  },
  operationCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 14,
  },
  operationState: { fontSize: 22, fontWeight: '700', color: colors.ink },
  controlRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  disabled: { opacity: 0.45 },
  hint: { fontSize: 16, lineHeight: 23, color: colors.amber },
  readingCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    gap: 8,
  },
  readingValue: { fontSize: 32, fontWeight: '700', color: colors.ink },
  historyCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  more: {
    minHeight: 60,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  orderRow: {
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  smallButton: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  smallButtonText: { fontSize: 16, color: colors.green, fontWeight: '700' },
  editor: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  fieldLabel: { fontSize: 16, fontWeight: '600', color: colors.ink },
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    fontSize: 18,
    color: colors.ink,
    paddingHorizontal: 14,
    backgroundColor: colors.paper,
  },
  kindChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kindChoice: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  kindChoiceActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  kindChoiceText: { fontSize: 16, fontWeight: '600', color: colors.green },
  kindChoiceTextActive: { color: colors.white },
  empty: { fontSize: 16, lineHeight: 24, color: colors.muted, padding: 16 },
});
