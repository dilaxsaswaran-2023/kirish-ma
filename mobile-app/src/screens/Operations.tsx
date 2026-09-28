import React, {useCallback, useMemo, useState} from 'react';
import {Alert as NativeAlert, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {getDevice, getOperationalFlow, getOperationalFlows, getSite, getSiteReadings, getZone, getZones,
  operateFlow, updateComponent, updateOperationalFlow} from '../api/endpoints';
import type {DeviceComponent, DeviceDetail, OperationalFlowDetail, SensorReading, SiteDetail, Zone, ZoneDetail} from '../api/types';
import {Icon, type IconName} from '../icons';
import {useNavigation, useParams} from '../navigation/Navigator';
import {useResource} from '../state/useResource';
import {useSession} from '../state/SessionContext';
import {colors, radius, spacing} from '../theme';
import {Screen} from '../ui/Screen';
import {Loading} from '../ui/StateViews';

const titleCase = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const when = (value?: string | null) => value ? new Date(value).toLocaleString() : 'Not recorded';
const componentIcon = (kind: string): IconName => kind === 'VALVE' ? 'valve' : kind === 'SENSOR' ? 'sensor' : 'motor';

function Section({icon, title, children}: {icon: IconName; title: string; children: React.ReactNode}) {
  return <View style={styles.section}><View style={styles.sectionTitle}><Icon name={icon} size={21} /><Text style={styles.heading}>{title}</Text></View>{children}</View>;
}
function Empty({message}: {message: string}) { return <Text style={styles.empty}>{message}</Text>; }
function ErrorText({message}: {message: string}) { return <Text style={styles.error}>{message}</Text>; }

function CorporationPicker() {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const active = session.workspaces.find(space => space.id === session.me?.activeCorporationId) ?? session.workspaces[0];
  return <Section icon="home" title="Corporation">
    <Pressable style={styles.picker} onPress={() => setOpen(value => !value)} accessibilityRole="button">
      <Icon name="home" size={22} /><Text style={styles.pickerText}>{active?.name ?? 'No corporation'}</Text><Icon name="reorder" size={20} />
    </Pressable>
    {open && session.workspaces.map(space => <Pressable key={space.id} style={styles.option} onPress={async () => {
      setOpen(false); setError('');
      try { await session.selectCorporation(space.id); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not switch corporation.'); }
    }}><Text style={styles.optionText}>{space.name}</Text>{space.id === active?.id ? <Icon name="check" size={19} /> : null}</Pressable>)}
    {error ? <ErrorText message={error} /> : null}
  </Section>;
}

function ZoneGrid({zones}: {zones: Zone[]}) {
  const navigation = useNavigation();
  return <View style={styles.zoneGrid}>{zones.map(zone => <Pressable key={zone.id} style={styles.zoneCard}
    accessibilityRole="button" accessibilityLabel={`Open ${zone.name}`} onPress={() => navigation.navigate('zone', {zoneId: zone.id})}>
    <View style={styles.zoneIcon}><Icon name="pin" size={25} /></View><Text style={styles.zoneTitle}>{zone.name}</Text>
    <Text style={styles.zoneMeta}>{zone.device_count ?? 0} devices</Text><View style={styles.zoneStatus}>
      <View style={[styles.dot, (zone.online_count ?? 0) > 0 ? styles.dotOnline : styles.dotOffline]} />
      <Text style={styles.zoneStatusText}>{zone.online_count ?? 0} online</Text></View>
  </Pressable>)}</View>;
}

export function OperationsHomeScreen() {
  const session = useSession();
  const navigation = useNavigation();
  const zones = useResource<Zone[]>(useCallback(() => getZones(), []), [session.me?.activeCorporationId], {pollMs: 20000});
  const groups = useMemo(() => session.sites.map(site => ({site, zones: (zones.data ?? []).filter(zone => zone.site_id === site.id)})), [session.sites, zones.data]);
  return <Screen title="Zones" subtitle="Choose a zone to view its devices." hideBack showTabs={false} onRefresh={zones.reload} refreshing={zones.refreshing}>
    <View style={styles.intro}><Icon name="leaf" color={colors.white} size={34} /><Text style={styles.introTitle}>Farm operations</Text>
      <Text style={styles.introCopy}>Corporation → site → zone → device → component</Text></View>
    <CorporationPicker />
    {zones.loading ? <Loading label="Reading zones…" /> : null}
    {zones.error && !zones.data ? <ErrorText message={zones.error.message} /> : null}
    {groups.map(({site, zones: siteZones}) => <Section key={site.id} icon={site.type === 'GREENHOUSE' ? 'leaf' : 'pin'} title={site.name}>
      <Text style={styles.groupMeta}>{site.location ?? site.timezone} · {titleCase(site.health)}</Text>
      {siteZones.length ? <ZoneGrid zones={siteZones} /> : <Empty message="No zones have been configured for this site." />}
    </Section>)}
    <Pressable style={styles.signOut} onPress={() => {session.signOut(); navigation.reset('signin');}}><Icon name="lock" size={18} /><Text style={styles.muted}>Sign out</Text></Pressable>
  </Screen>;
}

export function OperationsSiteScreen() {
  const {siteId} = useParams<'site'>();
  const site = useResource<SiteDetail>(useCallback(() => getSite(siteId), [siteId]), [siteId], {pollMs: 20000});
  return <Screen title={site.data?.name ?? 'Site'} subtitle="Zones at this site" showTabs={false} onRefresh={site.reload} refreshing={site.refreshing}>
    {site.loading ? <Loading label="Reading site…" /> : null}{site.error && !site.data ? <ErrorText message={site.error.message} /> : null}
    {site.data ? <ZoneGrid zones={site.data.zones} /> : null}
  </Screen>;
}

export function OperationsZoneScreen() {
  const {zoneId} = useParams<'zone'>();
  const navigation = useNavigation();
  const zone = useResource<ZoneDetail>(useCallback(() => getZone(zoneId), [zoneId]), [zoneId], {pollMs: 15000});
  return <Screen title={zone.data?.name ?? 'Zone'} subtitle={zone.data ? `${zone.data.site_name} · ${zone.data.location ?? ''}` : 'Loading zone'}
    showTabs={false} onRefresh={zone.reload} refreshing={zone.refreshing}>
    {zone.loading ? <Loading label="Reading devices…" /> : null}{zone.error && !zone.data ? <ErrorText message={zone.error.message} /> : null}
    {zone.data ? <><View style={styles.summary}><Metric value={`${zone.data.devices.filter(device => device.status === 'ONLINE').length}/${zone.data.devices.length}`} label="Online" />
      <Metric value={String(zone.data.devices.reduce((sum, device) => sum + (device.actuator_count ?? 0), 0))} label="Actuators" />
      <Metric value={String(zone.data.devices.reduce((sum, device) => sum + (device.sensor_count ?? 0), 0))} label="Sensors" /></View>
      <Section icon="cpu" title="Devices">{zone.data.devices.length ? zone.data.devices.map(device => <Pressable key={device.id} style={styles.deviceCard}
        onPress={() => navigation.navigate('device', {deviceId: device.id})} accessibilityRole="button">
        <View style={styles.deviceIcon}><Icon name="cpu" size={25} /></View><View style={styles.grow}><Text style={styles.deviceTitle}>{device.name}</Text>
          <Text style={styles.muted}>{device.model} · {device.actuator_count ?? 0} controls · {device.sensor_count ?? 0} sensors</Text></View>
        <View><Text style={[styles.state, device.status !== 'ONLINE' && styles.offlineText]}>{titleCase(device.status)}</Text><Icon name="next" size={19} /></View>
      </Pressable>) : <Empty message="No devices are assigned to this zone." />}</Section></> : null}
  </Screen>;
}

type DeviceDashboard = {device: DeviceDetail; flows: OperationalFlowDetail[]; readings: SensorReading[]};
export function OperationsDeviceScreen() {
  const {deviceId} = useParams<'device'>();
  const session = useSession();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [editing, setEditing] = useState<DeviceComponent | null>(null);
  const load = useCallback(async (): Promise<DeviceDashboard> => {
    const device = await getDevice(deviceId);
    const [flowRows, readings] = await Promise.all([getOperationalFlows(device.site_id), getSiteReadings(device.site_id)]);
    const allFlows = await Promise.all(flowRows.map(flow => getOperationalFlow(flow.id)));
    const ids = new Set(device.components.map(component => component.id));
    return {device, flows: allFlows.filter(flow => flow.steps.some(step => step.device_id === device.id)), readings: readings.filter(reading => ids.has(reading.component_id))};
  }, [deviceId]);
  const dashboard = useResource<DeviceDashboard>(load, [deviceId], {pollMs: 15000});

  async function run(flow: OperationalFlowDetail, action: 'ON' | 'OFF') {
    const ordered = action === 'ON' ? flow.steps : [...flow.steps].reverse();
    NativeAlert.alert(`${action} ${flow.name}?`, `${ordered.map(step => step.component_name).join(' → ')}. Each step waits for confirmation.`, [
      {text: 'Cancel', style: 'cancel'}, {text: 'Request', onPress: async () => {setBusy(flow.id); setError('');
        try { await operateFlow(flow.id, action); await dashboard.reload(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Operation refused.'); } finally { setBusy(''); }}},
    ]);
  }
  async function saveComponent(component: DeviceComponent) {
    setBusy(component.id); setError('');
    try { await updateComponent(component); setEditing(null); await dashboard.reload(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update component.'); } finally { setBusy(''); }
  }
  async function moveComponent(index: number, direction: -1 | 1) {
    if (!dashboard.data) return; const ordered = [...dashboard.data.device.components]; const target = index + direction;
    if (target < 0 || target >= ordered.length) return; [ordered[index], ordered[target]] = [ordered[target], ordered[index]]; setBusy('components'); setError('');
    try { await Promise.all(ordered.map((component, order) => updateComponent({...component, display_order: order + 1}))); await dashboard.reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not rearrange components.'); } finally { setBusy(''); }
  }
  async function moveFlowStep(flow: OperationalFlowDetail, index: number, direction: -1 | 1) {
    const ids = flow.steps.map(step => step.component_id); const target = index + direction; if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]]; setBusy(flow.id); setError('');
    try { await updateOperationalFlow(flow.id, flow.name, ids); await dashboard.reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not change operation order.'); } finally { setBusy(''); }
  }
  if (!dashboard.data) return <Screen title="Device" subtitle="Loading configuration" showTabs={false}>
    {dashboard.loading ? <Loading label="Reading device…" /> : <ErrorText message={dashboard.error?.message ?? 'Device unavailable.'} />}</Screen>;
  const {device, flows, readings} = dashboard.data;
  return <Screen title={device.name} subtitle={`${device.zone_name} · ${device.site_name}`} showTabs={false} onRefresh={dashboard.reload} refreshing={dashboard.refreshing}>
    <View style={styles.deviceHero}><View><Text style={styles.heroLabel}>DEVICE STATUS</Text><Text style={styles.heroValue}>{titleCase(device.status)}</Text>
      <Text style={styles.heroCopy}>{device.model} · {device.serial} · firmware {device.firmware ?? 'unknown'}</Text></View><Icon name="cpu" color={colors.white} size={42} /></View>
    {error ? <ErrorText message={error} /> : null}
    <Section icon="power" title="Device operations">{flows.length ? flows.map(flow => {
      const ready = session.canControl && flow.online && flow.status === 'PUBLISHED' && flow.steps.every(step => step.feedback_quality === 'CONFIRMED');
      return <View key={flow.id} style={styles.operationCard}><View style={styles.operationHead}><View><Text style={styles.deviceTitle}>{flow.name}</Text>
        <Text style={styles.muted}>{flow.steps.length} ordered steps · state {flow.currentState}</Text></View><Text style={styles.state}>{flow.currentState}</Text></View>
        <View style={styles.sequence}>{flow.steps.map((step, index) => <React.Fragment key={step.id}>{index ? <Icon name="arrow" size={15} color={colors.muted} /> : null}<Text style={styles.sequenceText}>{index + 1}. {step.component_name}</Text></React.Fragment>)}</View>
        <View style={styles.controlRow}><Pressable disabled={!ready || busy === flow.id} style={[styles.control, styles.on, !ready && styles.disabled]} onPress={() => run(flow, 'ON')}><Text style={styles.onText}>ON</Text></Pressable>
          <Pressable disabled={!ready || busy === flow.id} style={[styles.control, styles.off, !ready && styles.disabled]} onPress={() => run(flow, 'OFF')}><Text style={styles.offText}>OFF</Text></Pressable></View>
        {session.canManage ? <View><Text style={styles.tableCaption}>OPERATION ORDER · ON top-to-bottom, OFF bottom-to-top</Text>{flow.steps.map((step, index) => <View key={step.id} style={styles.orderRow}>
          <Text style={styles.orderNumber}>{index + 1}</Text><Text style={styles.growText}>{step.component_name} · {titleCase(step.on_action)}</Text>
          <SmallButton label="↑" disabled={index === 0 || busy === flow.id} onPress={() => moveFlowStep(flow, index, -1)} /><SmallButton label="↓" disabled={index === flow.steps.length - 1 || busy === flow.id} onPress={() => moveFlowStep(flow, index, 1)} />
        </View>)}</View> : null}{!ready ? <Text style={styles.hint}>{!session.canControl ? 'Your role is view only.' : 'Operations require online devices and confirmed component feedback.'}</Text> : null}</View>;
    }) : <Empty message="No operational flow includes this device." />}</Section>
    <Section icon="settings" title="Component configuration & arrangement">
      <View style={styles.tableHeader}><Text style={styles.tableCellWide}>Component</Text><Text style={styles.tableCell}>Channel</Text><Text style={styles.tableCell}>State / value</Text></View>
      {device.components.map((component, index) => <View key={component.id}>{editing?.id === component.id ? <View style={styles.editor}>
        <TextInput style={styles.input} value={editing.name} onChangeText={name => setEditing({...editing, name})} placeholder="Component name" />
        <TextInput style={styles.input} value={editing.hardware_channel} onChangeText={hardware_channel => setEditing({...editing, hardware_channel})} placeholder="Hardware channel" />
        <Text style={styles.tableCaption}>COMPONENT TYPE</Text><View style={styles.kindChoices}>{['VALVE', 'MOTOR', 'PUMP', 'SWITCH', 'RELAY', 'SENSOR'].map(kind => <Pressable key={kind}
          style={[styles.kindChoice, editing.kind === kind && styles.kindChoiceActive]} onPress={() => setEditing({...editing, kind})}>
          <Text style={[styles.kindChoiceText, editing.kind === kind && styles.kindChoiceTextActive]}>{kind}</Text></Pressable>)}</View>
        <View style={styles.controlRow}><SmallButton label="Cancel" onPress={() => setEditing(null)} /><SmallButton label="Save" disabled={busy === component.id} onPress={() => saveComponent(editing)} /></View>
      </View> : <View style={styles.tableRow}><View style={styles.tableCellWide}><Icon name={componentIcon(component.kind)} size={18} /><View><Text style={styles.tableText}>{component.name}</Text><Text style={styles.tableSub}>{component.kind}</Text></View></View>
        <Text style={styles.tableCell}>{component.hardware_channel}</Text><Text style={styles.tableCell}>{component.latest_value ?? titleCase(component.reported_state ?? 'Unknown')}</Text>
        {session.canManage ? <View style={styles.rowActions}><SmallButton label="↑" disabled={index === 0 || busy === 'components'} onPress={() => moveComponent(index, -1)} /><SmallButton label="↓" disabled={index === device.components.length - 1 || busy === 'components'} onPress={() => moveComponent(index, 1)} />
          <Pressable style={styles.editButton} onPress={() => setEditing({...component})}><Icon name="edit" size={16} /></Pressable></View> : null}</View>}</View>)}
    </Section>
    <Section icon="chart" title="Device data table">{readings.length ? readings.map(reading => <View key={reading.id} style={styles.dataRow}>
      <Text style={styles.dataName}>{reading.component_name}</Text><Text style={styles.dataValue}>{reading.value}{reading.unit ? ` ${reading.unit}` : ''}</Text>
      <Text style={styles.dataTime}>{when(reading.measured_at)}</Text><Text style={styles.state}>{titleCase(reading.quality)}</Text></View>) : <Empty message="No sensor data has been reported for this device." />}</Section>
  </Screen>;
}

function Metric({value, label}: {value: string; label: string}) { return <View><Text style={styles.summaryNumber}>{value}</Text><Text style={styles.summaryCaption}>{label}</Text></View>; }
function SmallButton({label, disabled, onPress}: {label: string; disabled?: boolean; onPress: () => void}) { return <Pressable style={[styles.smallButton, disabled && styles.disabled]} disabled={disabled} onPress={onPress}><Text style={styles.smallButtonText}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  section: {gap: 10, marginBottom: 10}, sectionTitle: {flexDirection: 'row', alignItems: 'center', gap: 9}, heading: {fontSize: 18, fontWeight: '700', color: colors.ink}, muted: {fontSize: 13, color: colors.muted, lineHeight: 19},
  intro: {backgroundColor: colors.forest, borderRadius: radius.hero, padding: 23, gap: 8}, introTitle: {fontSize: 26, fontWeight: '700', color: colors.white}, introCopy: {fontSize: 14, color: colors.heroCopy}, picker: {backgroundColor: colors.white, borderRadius: radius.action, borderWidth: 1, borderColor: colors.line, padding: spacing.inner, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56}, pickerText: {fontSize: 16, fontWeight: '600', color: colors.ink, flex: 1}, option: {backgroundColor: colors.white, padding: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginLeft: 10}, optionText: {fontSize: 15, color: colors.ink},
  groupMeta: {fontSize: 12, color: colors.muted, marginTop: -7}, zoneGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10}, zoneCard: {width: '48%', minHeight: 150, backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: 15, gap: 7}, zoneIcon: {width: 44, height: 44, borderRadius: 14, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center'}, zoneTitle: {fontSize: 16, fontWeight: '700', color: colors.ink}, zoneMeta: {fontSize: 12, color: colors.muted}, zoneStatus: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 'auto'}, zoneStatusText: {fontSize: 11, color: colors.muted}, dot: {width: 7, height: 7, borderRadius: 4}, dotOnline: {backgroundColor: colors.green}, dotOffline: {backgroundColor: colors.amber}, signOut: {flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12},
  summary: {backgroundColor: colors.forest, borderRadius: radius.hero, padding: 22, flexDirection: 'row', justifyContent: 'space-between'}, summaryNumber: {fontSize: 25, fontWeight: '700', color: colors.white}, summaryCaption: {fontSize: 11, color: colors.heroCopy}, deviceCard: {backgroundColor: colors.white, borderRadius: 15, borderWidth: 1, borderColor: colors.line, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11}, deviceIcon: {width: 45, height: 45, borderRadius: 13, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center'}, grow: {flex: 1}, growText: {flex: 1, color: colors.ink, fontSize: 13}, deviceTitle: {fontSize: 16, fontWeight: '700', color: colors.ink}, state: {fontSize: 11, fontWeight: '700', color: colors.green}, offlineText: {color: colors.amber},
  deviceHero: {backgroundColor: colors.forest, borderRadius: radius.hero, padding: 21, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}, heroLabel: {fontSize: 10, letterSpacing: 1.5, color: colors.heroCopy}, heroValue: {fontSize: 27, fontWeight: '800', color: colors.white, marginVertical: 5}, heroCopy: {fontSize: 12, color: colors.heroCopy}, operationCard: {backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 13}, operationHead: {flexDirection: 'row', justifyContent: 'space-between'}, sequence: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5}, sequenceText: {fontSize: 12, color: colors.ink}, controlRow: {flexDirection: 'row', gap: 8}, control: {flex: 1, minHeight: 48, borderRadius: radius.action, alignItems: 'center', justifyContent: 'center'}, on: {backgroundColor: colors.green}, off: {backgroundColor: colors.sage, borderWidth: 1, borderColor: colors.line}, onText: {color: colors.white, fontSize: 17, fontWeight: '800'}, offText: {color: colors.green, fontSize: 17, fontWeight: '800'}, disabled: {opacity: 0.4}, hint: {fontSize: 12, color: colors.amber},
  tableCaption: {fontSize: 10, letterSpacing: 0.8, color: colors.muted, marginVertical: 7}, orderRow: {flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.line}, orderNumber: {width: 24, height: 24, borderRadius: 12, textAlign: 'center', paddingTop: 3, backgroundColor: colors.sage, color: colors.green, fontWeight: '700'}, smallButton: {minWidth: 34, minHeight: 32, paddingHorizontal: 9, borderRadius: 9, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line}, smallButtonText: {fontSize: 13, color: colors.green, fontWeight: '700'},
  tableHeader: {flexDirection: 'row', backgroundColor: colors.sage, borderRadius: 10, padding: 9}, tableRow: {backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 11, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', gap: 6}, tableCellWide: {flex: 1.45, color: colors.ink, fontSize: 11, flexDirection: 'row', alignItems: 'center', gap: 6}, tableCell: {flex: 1, color: colors.ink, fontSize: 11}, tableText: {fontSize: 12, fontWeight: '600', color: colors.ink}, tableSub: {fontSize: 10, color: colors.muted}, rowActions: {flexDirection: 'row', gap: 3}, editButton: {width: 32, height: 32, alignItems: 'center', justifyContent: 'center'}, editor: {backgroundColor: colors.white, borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: colors.line}, input: {minHeight: 44, borderWidth: 1, borderColor: colors.line, borderRadius: 10, color: colors.ink, paddingHorizontal: 12, backgroundColor: colors.paper},
  kindChoices: {flexDirection: 'row', flexWrap: 'wrap', gap: 6}, kindChoice: {paddingVertical: 7, paddingHorizontal: 9, borderRadius: 9, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper}, kindChoiceActive: {backgroundColor: colors.green, borderColor: colors.green}, kindChoiceText: {fontSize: 10, fontWeight: '700', color: colors.green}, kindChoiceTextActive: {color: colors.white},
  dataRow: {backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.line, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8}, dataName: {flex: 1.3, color: colors.ink, fontWeight: '600', fontSize: 12}, dataValue: {flex: 0.8, color: colors.green, fontWeight: '700', fontSize: 12}, dataTime: {flex: 1.1, color: colors.muted, fontSize: 10}, empty: {fontSize: 14, color: colors.muted, padding: 16}, error: {fontSize: 13, color: colors.red, backgroundColor: colors.redBg, padding: 13, borderRadius: 12},
});
