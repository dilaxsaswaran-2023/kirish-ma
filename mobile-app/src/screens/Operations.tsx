import React, {useCallback, useState} from 'react';
import {Alert as NativeAlert, Pressable, StyleSheet, Text, View} from 'react-native';
import {getDevices, getOperationalFlow, getOperationalFlows, getOperationalRun, getSite,
  getSiteAlerts, getSiteHistory, getSiteReadings, getSiteSchedules, operateFlow} from '../api/endpoints';
import type {Alert, Device, OperationalFlowDetail, OperationalHistory, OperationalRun, Schedule,
  SensorReading, SiteDetail} from '../api/types';
import {Icon, type IconName} from '../icons';
import {useNavigation, useParams} from '../navigation/Navigator';
import {useResource} from '../state/useResource';
import {useSession} from '../state/SessionContext';
import {colors, radius, spacing} from '../theme';
import {Screen} from '../ui/Screen';
import {Loading} from '../ui/StateViews';

const titleCase = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const when = (value?: string | null) => value ? new Date(value).toLocaleString() : 'Not recorded';

function Section({icon, title, children}: {icon: IconName; title: string; children: React.ReactNode}) {
  return <View style={styles.section}><View style={styles.sectionTitle}><Icon name={icon} size={21} />
    <Text style={styles.heading}>{title}</Text></View>{children}</View>;
}

function Line({icon, title, subtitle, state}: {icon: IconName; title: string; subtitle?: string; state?: string}) {
  return <View style={styles.line}><View style={styles.lineIcon}><Icon name={icon} size={22} /></View>
    <View style={styles.lineCopy}><Text style={styles.lineTitle}>{title}</Text>
      {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}</View>
    {state ? <Text style={styles.state}>{titleCase(state)}</Text> : null}</View>;
}

function Empty({message}: {message: string}) { return <Text style={styles.empty}>{message}</Text>; }

export function OperationsHomeScreen() {
  const navigation = useNavigation();
  const session = useSession();
  const [corporationOpen, setCorporationOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSiteId, setFilterSiteId] = useState('ALL');
  const [error, setError] = useState('');
  const active = session.workspaces.find(space => space.id === session.me?.activeCorporationId) ?? session.workspaces[0];
  const shown = filterSiteId === 'ALL' ? session.sites : session.sites.filter(site => site.id === filterSiteId);

  return <Screen title="My sites" subtitle="Choose a site to operate its device flows." hideBack showTabs={false}
    onRefresh={() => void session.refreshSites()} refreshing={session.connecting}>
    <View style={styles.intro}><Icon name="power" color={colors.white} size={34} />
      <Text style={styles.introTitle}>Device control</Text><Text style={styles.introCopy}>Your assigned sites and operational flows, in one place.</Text></View>
    <Section icon="home" title="Corporation">
      <Pressable style={styles.picker} onPress={() => setCorporationOpen(!corporationOpen)} accessibilityRole="button"
        accessibilityLabel="Choose corporation"><Icon name="home" size={22} /><Text style={styles.pickerText}>{active?.name ?? 'No corporation'}</Text>
        <Icon name="reorder" size={20} /></Pressable>
      {corporationOpen && session.workspaces.map(space => <Pressable key={space.id} style={styles.option}
        onPress={async () => {setCorporationOpen(false); setError(''); try {await session.selectCorporation(space.id); setFilterSiteId('ALL');}
          catch (cause) {setError(cause instanceof Error ? cause.message : 'Could not switch corporation.');}}}>
        <Text style={styles.optionText}>{space.name}</Text>{space.id === active?.id ? <Icon name="check" size={19} /> : null}</Pressable>)}
      {session.connecting ? <Loading label="Switching corporation…" /> : null}
    </Section>
    <Section icon="pin" title={`Sites (${session.sites.length})`}>
      <Pressable style={styles.picker} onPress={() => setFilterOpen(!filterOpen)} accessibilityRole="button"
        accessibilityLabel="Filter sites"><Icon name="pin" size={22} />
        <Text style={styles.pickerText}>{filterSiteId === 'ALL' ? 'All sites' : session.sites.find(site => site.id === filterSiteId)?.name ?? 'All sites'}</Text>
        <Icon name="reorder" size={20} /></Pressable>
      {filterOpen && [{id: 'ALL', name: 'All sites'}, ...session.sites].map(site => <Pressable key={site.id} style={styles.option}
        onPress={() => {setFilterSiteId(site.id); setFilterOpen(false);}}><Text style={styles.optionText}>{site.name}</Text>
        {site.id === filterSiteId ? <Icon name="check" size={19} /> : null}</Pressable>)}
      {shown.length === 0 ? <Empty message="No sites are assigned in this corporation." /> : shown.map(site =>
        <Pressable key={site.id} style={styles.siteCard} accessibilityRole="button" accessibilityLabel={`Open ${site.name}`}
          onPress={() => {session.selectSite(site.id); navigation.navigate('site', {siteId: site.id});}}>
          <View style={styles.siteIcon}><Icon name={site.type === 'GREENHOUSE' ? 'leaf' : 'pin'} size={29} /></View>
          <View style={styles.siteCopy}><Text style={styles.siteTitle}>{site.name}</Text>
            <Text style={styles.muted}>{site.location ?? site.timezone} · {titleCase(site.health)}</Text></View>
          <Icon name="next" size={22} /></Pressable>)}
    </Section>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <Pressable style={styles.signOut} onPress={() => {session.signOut(); navigation.reset('signin');}}>
      <Icon name="lock" size={18} /><Text style={styles.muted}>Sign out</Text></Pressable>
  </Screen>;
}

type SiteDashboard = {site: SiteDetail; flows: OperationalFlowDetail[]; devices: Device[]; schedules: Schedule[];
  history: OperationalHistory[]; readings: SensorReading[]; alerts: Alert[]};

export function OperationsSiteScreen() {
  const {siteId} = useParams<'site'>();
  const session = useSession();
  const [busyFlowId, setBusyFlowId] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async (): Promise<SiteDashboard> => {
    const [site, flowRows, devices, schedules, history, readings, alerts] = await Promise.all([
      getSite(siteId), getOperationalFlows(siteId), getDevices(siteId), getSiteSchedules(siteId),
      getSiteHistory(siteId), getSiteReadings(siteId), getSiteAlerts(siteId)]);
    const flows = await Promise.all(flowRows.map(flow => getOperationalFlow(flow.id)));
    return {site, flows, devices, schedules, history, readings, alerts};
  }, [siteId]);
  const dashboard = useResource<SiteDashboard>(load, [siteId, session.me?.activeCorporationId], {pollMs: 15000});
  const run = useResource<OperationalRun>(() => getOperationalRun(activeRunId!), [activeRunId],
    {enabled: Boolean(activeRunId), pollMs: 5000});

  const requestAction = (flow: OperationalFlowDetail, action: 'ON' | 'OFF') => {
    const order = action === 'ON' ? flow.steps : [...flow.steps].reverse();
    NativeAlert.alert(`${action === 'ON' ? 'Turn on' : 'Turn off'} ${flow.name}?`,
      `${order.map(step => step.component_name).join(' → ')}. Each step waits for device confirmation.`, [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Request', onPress: async () => {
          setBusyFlowId(flow.id); setError('');
          try {const receipt = await operateFlow(flow.id, action); setActiveRunId(receipt.id); await dashboard.reload();}
          catch (cause) {setError(cause instanceof Error ? cause.message : 'The operation was refused.');}
          finally {setBusyFlowId(null);}
        }},
      ]);
  };

  if (!dashboard.data) return <Screen title="Site" subtitle="Loading operations" showTabs={false}>
    {dashboard.loading ? <Loading label="Reading site…" /> : <Text style={styles.error}>{dashboard.error?.message ?? 'Site unavailable.'}</Text>}
  </Screen>;
  const {site, flows, devices, schedules, history, readings, alerts} = dashboard.data;
  return <Screen title={site.name} subtitle={`${site.location ?? site.timezone} · ${titleCase(site.health)}`} showTabs={false}
    onRefresh={() => void dashboard.reload()} refreshing={dashboard.refreshing}>
    <View style={styles.summary}><View><Text style={styles.summaryNumber}>{devices.filter(device => device.status === 'ONLINE').length}/{devices.length}</Text>
      <Text style={styles.summaryCaption}>Devices online</Text></View><View><Text style={styles.summaryNumber}>{flows.length}</Text>
      <Text style={styles.summaryCaption}>Operational flows</Text></View><View><Text style={styles.summaryNumber}>{alerts.filter(alert => !alert.resolved_at).length}</Text>
      <Text style={styles.summaryCaption}>Open alerts</Text></View></View>
    <Section icon="power" title="Operate flows">
      {flows.length === 0 ? <Empty message="No operational flows have been configured for this site." /> : flows.map(flow => {
        const ready = session.canControl && flow.status === 'PUBLISHED' && flow.online &&
          flow.steps.every(step => step.feedback_quality === 'CONFIRMED') &&
          !['ACCEPTED', 'WAITING_FEEDBACK'].includes(flow.latestRun?.state ?? '');
        return <View key={flow.id} style={styles.flowCard}><View style={styles.flowHead}><View style={styles.flowIcon}><Icon name="flow" size={27} /></View>
          <View style={styles.lineCopy}><Text style={styles.flowTitle}>{flow.name}</Text>
            <Text style={styles.muted}>{flow.steps.length} steps · {flow.online ? 'Devices online' : 'Device offline'}</Text></View>
          <Text style={styles.state}>{flow.currentState}</Text></View>
          <View style={styles.stepPath}>{flow.steps.map((step, index) => <React.Fragment key={step.id}>
            {index > 0 ? <Icon name="arrow" size={17} color={colors.muted} /> : null}
            <Icon name={step.kind === 'VALVE' ? 'valve' : 'motor'} size={18} />
            <Text style={styles.stepLabel}>{step.component_name}</Text></React.Fragment>)}</View>
          <View style={styles.controlRow}><Pressable style={[styles.controlButton, styles.onButton, !ready || flow.currentState === 'ON' ? styles.disabled : null]}
            disabled={!ready || flow.currentState === 'ON' || busyFlowId === flow.id} accessibilityRole="button"
            accessibilityLabel={`Turn on ${flow.name}`} onPress={() => requestAction(flow, 'ON')}>
            <Icon name="power" color={colors.white} size={23} /><Text style={styles.onText}>ON</Text></Pressable>
            <Pressable style={[styles.controlButton, styles.offButton, !ready || flow.currentState === 'OFF' ? styles.disabled : null]}
              disabled={!ready || flow.currentState === 'OFF' || busyFlowId === flow.id} accessibilityRole="button"
              accessibilityLabel={`Turn off ${flow.name}`} onPress={() => requestAction(flow, 'OFF')}>
              <Icon name="stop" size={23} /><Text style={styles.offText}>OFF</Text></Pressable></View>
          {!ready ? <Text style={styles.hint}>{!session.canControl ? 'Your role has view-only access.' : !flow.online ?
            'Control unavailable while a device is offline.' : flow.latestRun && ['ACCEPTED', 'WAITING_FEEDBACK'].includes(flow.latestRun.state) ?
            'A command is waiting for device confirmation.' : 'Waiting for confirmed component feedback.'}</Text> : null}
        </View>;
      })}
    </Section>
    {activeRunId && run.data ? <Section icon="clock" title="Current operation">
      <Line icon="flow" title={`${run.data.flow_name} · ${run.data.requested_action}`} state={run.data.state} />
      {run.data.steps.map(step => <Line key={step.id} icon={step.action === 'OPEN' || step.action === 'CLOSE' ? 'valve' : 'motor'}
        title={`${step.step_index}. ${step.component_name}`} subtitle={titleCase(step.action)} state={step.state} />)}
    </Section> : null}
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <Section icon="cpu" title="Devices">{devices.length ? devices.map(device => <Line key={device.id} icon="cpu"
      title={device.name} subtitle={device.model} state={device.status} />) : <Empty message="No devices registered." />}</Section>
    <Section icon="calendar" title="Schedules">{schedules.length ? schedules.map(schedule => <Line key={schedule.id} icon="calendar"
      title={schedule.name} subtitle={schedule.recurrence} state={schedule.enabled ? 'Enabled' : 'Paused'} />) :
      <Empty message="No schedules for this site." />}</Section>
    <Section icon="chart" title="Sensor readings">{readings.length ? readings.slice(0, 10).map(reading =>
      <Line key={reading.id} icon="sensor" title={`${reading.component_name}: ${reading.value}${reading.unit ? ` ${reading.unit}` : ''}`}
        subtitle={when(reading.measured_at)} state={reading.quality} />) : <Empty message="No sensor readings reported yet." />}</Section>
    <Section icon="bell" title="Alerts">{alerts.length ? alerts.slice(0, 10).map(alert =>
      <Line key={alert.id} icon="alert" title={alert.title} subtitle={alert.detail} state={alert.severity} />) :
      <Empty message="No alerts for this site." />}</Section>
    <Section icon="clock" title="Past operations">{history.length ? history.slice(0, 15).map(event =>
      <Line key={event.id} icon="flow" title={`${event.flow_name} · ${event.requested_action}`}
        subtitle={when(event.started_at)} state={event.state} />) : <Empty message="No past operations yet." />}</Section>
  </Screen>;
}

const styles = StyleSheet.create({
  section: {gap: 10, marginBottom: 6}, sectionTitle: {flexDirection: 'row', alignItems: 'center', gap: 9},
  heading: {fontSize: 18, fontWeight: '700', color: colors.ink}, muted: {fontSize: 13, color: colors.muted, lineHeight: 19},
  intro: {backgroundColor: colors.forest, borderRadius: radius.hero, padding: 23, gap: 8},
  introTitle: {fontSize: 26, fontWeight: '700', color: colors.white}, introCopy: {fontSize: 14, color: colors.heroCopy},
  picker: {backgroundColor: colors.white, borderRadius: radius.action, borderWidth: 1, borderColor: colors.line,
    padding: spacing.inner, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56},
  pickerText: {fontSize: 16, fontWeight: '600', color: colors.ink, flex: 1},
  option: {backgroundColor: colors.white, padding: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginLeft: 10}, optionText: {fontSize: 15, color: colors.ink},
  siteCard: {backgroundColor: colors.white, borderRadius: radius.card, padding: 15, flexDirection: 'row',
    alignItems: 'center', gap: 13, minHeight: 84, borderWidth: 1, borderColor: colors.line},
  siteIcon: {width: 52, height: 52, borderRadius: 16, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center'},
  siteCopy: {flex: 1, gap: 5}, siteTitle: {fontSize: 17, fontWeight: '700', color: colors.ink},
  signOut: {flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12},
  summary: {backgroundColor: colors.forest, borderRadius: radius.hero, padding: 22, flexDirection: 'row', justifyContent: 'space-between'},
  summaryNumber: {fontSize: 25, fontWeight: '700', color: colors.white}, summaryCaption: {fontSize: 11, color: colors.heroCopy},
  flowCard: {backgroundColor: colors.white, borderRadius: radius.card, padding: 17, gap: 14, borderWidth: 1, borderColor: colors.line},
  flowHead: {flexDirection: 'row', alignItems: 'center', gap: 11}, flowIcon: {width: 47, height: 47, borderRadius: 14,
    backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center'},
  flowTitle: {fontSize: 17, fontWeight: '700', color: colors.ink},
  stepPath: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, paddingVertical: 3},
  stepLabel: {fontSize: 12, fontWeight: '600', color: colors.ink},
  controlRow: {flexDirection: 'row', gap: 10}, controlButton: {minHeight: 58, borderRadius: radius.action,
    flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9},
  onButton: {backgroundColor: colors.green}, offButton: {backgroundColor: colors.sage, borderWidth: 1, borderColor: colors.line},
  onText: {fontSize: 18, fontWeight: '800', color: colors.white}, offText: {fontSize: 18, fontWeight: '800', color: colors.green},
  disabled: {opacity: 0.4}, hint: {fontSize: 12, color: colors.amber},
  line: {backgroundColor: colors.white, borderRadius: 15, borderWidth: 1, borderColor: colors.line,
    padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10},
  lineIcon: {width: 38, height: 38, borderRadius: 12, backgroundColor: colors.sage,
    alignItems: 'center', justifyContent: 'center'},
  lineCopy: {flex: 1, gap: 3}, lineTitle: {fontSize: 14, fontWeight: '600', color: colors.ink},
  state: {fontSize: 11, fontWeight: '700', color: colors.green}, empty: {fontSize: 14, color: colors.muted, padding: 16},
  error: {fontSize: 13, color: colors.red, backgroundColor: colors.redBg, padding: 13, borderRadius: 12},
});
