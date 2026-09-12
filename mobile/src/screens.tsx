import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert as NativeAlert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { acknowledgeAlert, loadAlerts, loadDevices, loadFlows, loadSchedules, loadSites, sendComponentCommand, updateSchedule } from './api';
import { components, devices, flows, initialAlerts, initialSchedules, sites } from './data';
import { colors, radius, space } from './theme';
import { Alert, CommandState, Role, Schedule, Screen } from './types';
import { Badge, Card, Divider, Header, IconTile, Metric, PrimaryButton, Row, SectionTitle } from './ui';

export type Navigation = (screen: Screen) => void;
type ScreenProps = { navigate: Navigation; back?: () => void; role?: Role; setRole?: (role: Role) => void };

export function WelcomeScreen({ navigate }: ScreenProps) {
  const [email, setEmail] = useState('anjali@greenroot.example');
  const [password, setPassword] = useState('agrothulir');
  return <ScrollView contentContainerStyle={s.welcome} keyboardShouldPersistTaps="handled">
    <View style={s.brandMark}><MaterialCommunityIcons name="sprout" size={44} color={colors.white} /><View style={s.brandNode} /></View>
    <Text style={s.brand}>AgroThulir</Text>
    <Text style={s.tagline}>Connected care. Growing possibilities.</Text>
    <Card style={s.loginCard}>
      <Text style={s.loginTitle}>Welcome back</Text>
      <Text style={s.copy}>Sign in to monitor your sites and safely control connected equipment.</Text>
      <Text style={s.label}>Email</Text>
      <View style={s.inputWrap}><MaterialCommunityIcons name="email-outline" size={20} color={colors.muted} /><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={s.input} accessibilityLabel="Email" /></View>
      <Text style={s.label}>Password</Text>
      <View style={s.inputWrap}><MaterialCommunityIcons name="lock-outline" size={20} color={colors.muted} /><TextInput value={password} onChangeText={setPassword} secureTextEntry style={s.input} accessibilityLabel="Password" /></View>
      <PrimaryButton label="Sign in" icon="arrow-right" onPress={() => navigate('home')} />
      <Pressable style={s.textButton}><Text style={s.textButtonLabel}>Forgot password?</Text></Pressable>
    </Card>
    <View style={s.securityNote}><MaterialCommunityIcons name="shield-check-outline" size={19} color={colors.green} /><Text style={s.securityText}>Secure tenant-isolated access</Text></View>
  </ScrollView>;
}

export function HomeScreen({ navigate }: ScreenProps) {
  return <ScreenScroll>
    <Header title="Good morning, Anjali" subtitle="GreenRoot Agriculture · 3 assigned sites" action={<RoundIcon name="bell-outline" badge onPress={() => navigate('alerts')} />} />
    <View style={s.pad}>
      <Card style={s.heroCard}>
        <View style={{ flex: 1 }}><Badge label="ALL SYSTEMS READY" /><Text style={s.heroTitle}>Your sites are growing well</Text><Text style={s.heroCopy}>6 of 7 devices online · Updated 12 seconds ago</Text></View>
        <View style={s.heroIcon}><MaterialCommunityIcons name="sprout-outline" size={48} color={colors.green} /></View>
      </Card>
      <View style={s.metricGrid}>
        <Metric icon="water-percent" label="Average moisture" value="42%" />
        <Metric icon="gauge" label="Line pressure" value="2.4 bar" tone="blue" />
        <Metric icon="water-outline" label="Water today" value="6.8 kL" tone="blue" />
        <Metric icon="lightning-bolt-outline" label="Energy today" value="12.4 kWh" tone="amber" />
      </View>
      <SectionTitle>Quick actions</SectionTitle>
      <View style={s.quickGrid}>
        <QuickAction icon="play-circle-outline" title="Run flow" subtitle="2 published" onPress={() => navigate('flows')} />
        <QuickAction icon="calendar-clock-outline" title="Schedules" subtitle="2 active" onPress={() => navigate('schedules')} />
      </View>
      <SectionTitle action={<Pressable onPress={() => navigate('sites')}><Text style={s.link}>View all</Text></Pressable>}>Sites</SectionTitle>
      {sites.slice(0, 2).map(site => <Row key={site.id} icon={site.type === 'Greenhouse' ? 'greenhouse' : 'sprout-outline'} title={site.name} subtitle={`${site.location} · ${site.onlineDevices}/${site.totalDevices} devices online`} badge={<HealthBadge health={site.health} />} onPress={() => navigate('site')} tone={site.health === 'warning' ? 'amber' : 'green'} />)}
      <Card style={s.warningCard} onPress={() => navigate('alerts')} label="Open critical alert">
        <MaterialCommunityIcons name="alert-outline" size={25} color={colors.red} /><View style={{ flex: 1 }}><Text style={s.warningTitle}>Valve opening failed</Text><Text style={s.warningCopy}>Pump stayed safely stopped · 8 min ago</Text></View><MaterialCommunityIcons name="chevron-right" size={24} color={colors.red} />
      </Card>
    </View>
  </ScreenScroll>;
}

export function SitesScreen({ navigate }: ScreenProps) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState(sites);
  useEffect(() => { loadSites().then(setItems).catch(() => undefined); }, []);
  const filtered = items.filter(site => site.name.toLowerCase().includes(query.toLowerCase()));
  return <ScreenScroll><Header title="Sites" subtitle="Places you can access" action={<RoundIcon name="plus" />} />
    <View style={s.pad}><Search value={query} onChange={setQuery} placeholder="Search sites" />
      <View style={s.chips}><Chip active label="All 3" /><Chip label="Farm" /><Chip label="Greenhouse" /></View>
      {filtered.map(site => <Card key={site.id} onPress={() => navigate('site')} label={`Open ${site.name}`} style={s.siteCard}>
        <View style={s.rowBetween}><IconTile name={site.type === 'Farm' ? 'sprout-outline' : site.type === 'Greenhouse' ? 'greenhouse' : 'office-building-outline'} tone={site.health === 'warning' ? 'amber' : site.health === 'offline' ? 'red' : 'green'} /><HealthBadge health={site.health} /></View>
        <Text style={s.cardTitle}>{site.name}</Text><Text style={s.cardSub}>{site.type} · {site.location}</Text>
        <Divider /><View style={s.rowBetween}><Text style={s.small}>{site.onlineDevices}/{site.totalDevices} devices online</Text><View style={s.inline}><MaterialCommunityIcons name="water-percent" size={17} color={colors.blue} /><Text style={s.smallStrong}>{site.moisture}%</Text><MaterialCommunityIcons name="chevron-right" size={23} color={colors.muted} /></View></View>
      </Card>)}
    </View></ScreenScroll>;
}

export function SiteDetailScreen({ navigate, back }: ScreenProps) {
  return <ScreenScroll><Header title="North Field" subtitle="Farm · Kilinochchi" back={back} action={<RoundIcon name="dots-horizontal" />} />
    <View style={s.pad}>
      <Card style={s.mapCard}><View style={s.mapGrid} /><View style={[s.zone, { left: '12%', top: '18%', width: '46%', height: '29%' }]}><Text style={s.zoneText}>Zone A</Text></View><View style={[s.zone, { right: '10%', bottom: '15%', width: '42%', height: '28%', backgroundColor: colors.blueBg }]}><Text style={[s.zoneText, { color: colors.blue }]}>Reservoir</Text></View><View style={s.mapPin}><MaterialCommunityIcons name="map-marker" size={25} color={colors.red} /></View></Card>
      <View style={s.metricGrid}><Metric icon="water-percent" label="Soil moisture" value="42%" /><Metric icon="gauge" label="Pressure" value="2.4 bar" tone="blue" /></View>
      <SectionTitle>Manage site</SectionTitle>
      <Row icon="router-wireless" title="Devices" subtitle="4 online · 7 components" badge={<Badge label="4" />} onPress={() => navigate('devices')} />
      <Row icon="view-grid-outline" title="Zones" subtitle="Irrigation zone A · Reservoir" onPress={() => NativeAlert.alert('Zones', 'Zone editor is ready for backend data.')} />
      <Row icon="vector-polyline" title="Physical topology" subtitle="4 components · Validated" onPress={() => navigate('topology')} tone="blue" />
      <Row icon="account-lock-outline" title="Site access" subtitle="6 people with access" onPress={() => navigate('corporateAdmin')} />
      <SectionTitle>Live equipment</SectionTitle>
      <Card style={s.liveCard}><View style={s.inline}><View style={s.pulse} /><Text style={s.smallStrong}>Live · updated 12 sec ago</Text></View><Text style={s.reading}>Pump stopped</Text><Text style={s.cardSub}>Valve A closed · Flow 0.0 L/min</Text></Card>
    </View></ScreenScroll>;
}

export function DevicesScreen({ navigate, back }: ScreenProps) {
  const [items, setItems] = useState(devices.filter(d => d.siteId === 'site-north'));
  useEffect(() => { loadDevices().then(setItems).catch(() => undefined); }, []);
  return <ScreenScroll><Header title="Devices" subtitle="North Field" back={back} action={<RoundIcon name="qrcode-scan" />} />
    <View style={s.pad}><Card style={s.infoCard}><MaterialCommunityIcons name="access-point" size={22} color={colors.green} /><Text style={s.infoText}>4 connected devices · MQTT state is fresh</Text></Card>
      {items.map(device => <Card key={device.id} style={s.deviceCard} onPress={() => navigate('device')} label={`Open ${device.name}`}>
        <IconTile name={device.model.includes('CLIMA') ? 'weather-partly-cloudy' : 'memory'} tone={device.online ? 'green' : 'red'} />
        <View style={{ flex: 1 }}><View style={s.inline}><Text style={s.rowTitle}>{device.name}</Text><Badge label={device.online ? 'ONLINE' : 'OFFLINE'} tone={device.online ? 'green' : 'red'} /></View><Text style={s.cardSub}>{device.model} · Seen {device.lastSeen}</Text><Text style={s.meta}>{device.actuatorCount} actuators · {device.sensorCount} sensors</Text></View><MaterialCommunityIcons name="chevron-right" size={24} color={colors.muted} />
      </Card>)}
      <PrimaryButton icon="plus" label="Claim a device" tone="soft" onPress={() => NativeAlert.alert('Claim device', 'Scan the QR code or enter the serial and one-time claim proof.')} />
    </View></ScreenScroll>;
}

export function DeviceDetailScreen({ navigate, back }: ScreenProps) {
  const device = devices[0];
  return <ScreenScroll><Header title={device.name} subtitle={`${device.model} · ${device.firmware}`} back={back} action={<RoundIcon name="cog-outline" />} />
    <View style={s.pad}>
      <Card style={s.statusPanel}><View style={s.rowBetween}><View style={s.inline}><View style={s.onlineDot} /><Text style={s.onlineText}>Online</Text></View><Text style={s.small}>Seen 12 sec ago</Text></View><Divider /><View style={s.statRow}><Stat value="−67 dBm" label="Signal" /><Stat value="14 d" label="Uptime" /><Stat value="3.4.1" label="Firmware" /></View></Card>
      <SectionTitle>Components</SectionTitle>
      {components.map(component => <Row key={component.id} icon={component.kind === 'pump' ? 'pump' : component.kind === 'valve' ? 'valve' : 'water-percent'} title={component.name} subtitle={`${component.value ?? component.state} · ${component.quality.toLowerCase()}`} badge={<Badge label={component.state} tone={component.state === 'VALID' ? 'blue' : 'green'} />} onPress={() => component.kind === 'pump' ? navigate('control') : navigate('components')} tone={component.kind === 'sensor' ? 'blue' : 'green'} />)}
      <SectionTitle>Diagnostics</SectionTitle><Row icon="chart-line" title="Readings & history" subtitle="Telemetry, quality and freshness" onPress={() => NativeAlert.alert('Readings', 'Historical charts connect to /v1/components/{id}/readings.')} tone="blue" /><Row icon="tools" title="Maintenance" subtitle="Idle · No maintenance lock" onPress={() => NativeAlert.alert('Maintenance', 'Device must be safely idle before maintenance.')} tone="amber" />
    </View></ScreenScroll>;
}

export function ComponentsScreen({ navigate, back }: ScreenProps) {
  return <ScreenScroll><Header title="Components" subtitle="Controller 01 · North Field" back={back} action={<RoundIcon name="plus" />} />
    <View style={s.pad}><Card style={s.infoCard}><MaterialCommunityIcons name="shield-check-outline" size={22} color={colors.green} /><Text style={s.infoText}>Channels mapped · Protection checks active</Text></Card>
      {components.map(component => <Row key={component.id} icon={component.kind === 'pump' ? 'pump' : component.kind === 'valve' ? 'valve' : 'water-percent'} title={component.name} subtitle={`${component.channel} · ${component.quality.toLowerCase()} state`} badge={<Badge label={component.value ?? component.state} tone={component.quality === 'CONFIRMED' ? 'green' : 'amber'} />} onPress={() => component.kind === 'pump' ? navigate('control') : undefined} tone={component.kind === 'sensor' ? 'blue' : 'green'} />)}
    </View></ScreenScroll>;
}

export function ControlScreen({ back }: ScreenProps) {
  const [state, setState] = useState<CommandState>('IDLE');
  const busy = ['ACCEPTED', 'EXECUTING', 'STOPPING'].includes(state);
  const running = state === 'CONFIRMED';
  async function command(action: 'START' | 'SAFE_STOP') {
    if (action === 'START') {
      NativeAlert.alert('Start protected irrigation?', 'Valve A will open and confirm before Pump 01 starts. Maximum runtime is 15 minutes.', [
        { text: 'Cancel', style: 'cancel' }, { text: 'Start safely', onPress: async () => { setState('ACCEPTED'); await sendComponentCommand('pump-01', action); setTimeout(() => setState('EXECUTING'), 700); setTimeout(() => setState('CONFIRMED'), 1900); } },
      ]);
    } else {
      setState('STOPPING'); await sendComponentCommand('pump-01', action); setTimeout(() => setState('STOPPED'), 1600);
    }
  }
  const stepState = (index: number) => state === 'IDLE' ? 'waiting' : state === 'ACCEPTED' ? (index === 0 ? 'active' : 'waiting') : state === 'EXECUTING' ? (index < 2 ? 'done' : index === 2 ? 'active' : 'waiting') : running ? 'done' : 'waiting';
  return <ScreenScroll><Header title="Manual control" subtitle="North Field · Protected operation" back={back} />
    <View style={s.pad}>
      <View style={s.equipmentHero}><IconTile name="pump" size={34} /><Text style={s.equipmentTitle}>Pump 01</Text><Badge label={running ? 'RUNNING · CONFIRMED' : state === 'STOPPING' ? 'STOPPING…' : 'STOPPED · CONFIRMED'} tone={running ? 'blue' : state === 'STOPPING' ? 'amber' : 'green'} /><Text style={s.cardSub}>Physical feedback updated 12 seconds ago</Text></View>
      <Card style={s.interlockCard}><View style={s.inline}><MaterialCommunityIcons name="shield-check-outline" size={22} color={colors.green} /><Text style={s.interlockTitle}>Protected start sequence</Text></View><Text style={s.copy}>The valve must physically confirm open before the motor can energise.</Text></Card>
      <SectionTitle>Activation sequence</SectionTitle>
      {['Check controller and resource lock', 'Open Valve A and confirm feedback', 'Start Pump 01 and confirm running', 'Monitor pressure, flow and runtime'].map((label, i) => <Step key={label} index={i + 1} label={label} state={stepState(i)} />)}
      {busy && <Card style={s.pendingCard}><ActivityIndicator color={colors.amber} /><View><Text style={s.warningTitle}>{state === 'STOPPING' ? 'Stopping safely…' : state === 'ACCEPTED' ? 'Command accepted' : 'Controller is executing'}</Text><Text style={s.warningCopy}>Do not close the app; status is durable.</Text></View></Card>}
      <PrimaryButton disabled={busy} icon={running ? 'stop-circle-outline' : 'play-circle-outline'} label={running ? 'Safe stop' : state === 'STOPPED' ? 'Start again' : 'Start safely'} tone={running ? 'danger' : 'primary'} onPress={() => command(running ? 'SAFE_STOP' : 'START')} />
      <Text style={s.safetyCopy}>Remote safe stop is not an emergency stop. Use the physical emergency stop when required.</Text>
    </View></ScreenScroll>;
}

export function FlowsScreen({ navigate }: ScreenProps) {
  const [items, setItems] = useState(flows);
  useEffect(() => { loadFlows().then(setItems).catch(() => undefined); }, []);
  return <ScreenScroll><Header title="Flows" subtitle="Validated automation" action={<RoundIcon name="plus" />} />
    <View style={s.pad}>{items.map(flow => <Card key={flow.id} style={s.flowCard}>
      <View style={s.rowBetween}><IconTile name="transit-connection-variant" tone={flow.status.includes('review') ? 'amber' : 'green'} /><Badge label={flow.status.toUpperCase()} tone={flow.status.includes('review') ? 'amber' : 'green'} /></View>
      <Text style={s.cardTitle}>{flow.name}</Text><Text style={s.cardSub}>{flow.site} · {flow.components} components</Text>{flow.nextRun && <Text style={s.meta}>Next: {flow.nextRun}</Text>}
      <View style={s.buttonRow}><Pressable style={s.smallButton} onPress={() => navigate('topology')}><MaterialCommunityIcons name="vector-polyline" size={19} color={colors.forest} /><Text style={s.smallButtonLabel}>Topology</Text></Pressable><Pressable style={s.smallButton} onPress={() => navigate('sequence')}><MaterialCommunityIcons name="format-list-numbered" size={19} color={colors.forest} /><Text style={s.smallButtonLabel}>Sequence</Text></Pressable></View>
    </Card>)}</View></ScreenScroll>;
}

export function TopologyScreen({ navigate, back }: ScreenProps) {
  return <ScreenScroll><Header title="Physical topology" subtitle="North Field · Water path" back={back} action={<RoundIcon name="check-decagram-outline" />} />
    <View style={s.pad}><Card style={s.canvas}>
      <TopologyNode icon="cup-water" label="Reservoir" style={{ left: 18, top: 120 }} />
      <Connector style={{ left: 94, top: 151, width: 45 }} />
      <TopologyNode icon="pump" label="Pump 01" style={{ left: 135, top: 120 }} />
      <Connector style={{ left: 211, top: 151, width: 42 }} />
      <TopologyNode icon="valve" label="Valve A" style={{ left: 248, top: 120 }} />
      <View style={[s.verticalConnector, { left: 287, top: 194, height: 56 }]} />
      <TopologyNode icon="sprout-outline" label="Zone A" style={{ left: 248, top: 250 }} />
      <View style={s.canvasTools}><RoundIcon name="plus" /><RoundIcon name="minus" /><RoundIcon name="fit-to-page-outline" /></View>
    </Card>
      <Card style={s.infoCard}><MaterialCommunityIcons name="check-circle-outline" size={22} color={colors.green} /><Text style={s.infoText}>All ports and connection types are compatible</Text></Card>
      <SectionTitle>Accessible connection list</SectionTitle>
      {['Reservoir outlet → Pump 01 inlet', 'Pump 01 outlet → Valve A inlet', 'Valve A outlet → Irrigation zone A'].map((x, i) => <Row key={x} icon="arrow-right" title={`Path ${i + 1}`} subtitle={x} tone="blue" />)}
      <PrimaryButton label="Edit activation sequence" icon="format-list-numbered" onPress={() => navigate('sequence')} />
    </View></ScreenScroll>;
}

export function SequenceScreen({ back }: ScreenProps) {
  const [published, setPublished] = useState(false);
  const steps = [
    ['shield-search', 'Preflight', 'Fresh state · controller ready · acquire lock'],
    ['valve', 'Open Valve A', 'Require confirmed OPEN within 8 seconds'],
    ['pump', 'Start Pump 01', 'Require running feedback within 5 seconds'],
    ['timer-outline', 'Run irrigation', '15 minute maximum · monitor protection'],
    ['stop-circle-outline', 'Stop motor', 'Require confirmed STOPPED'],
    ['valve-closed', 'Close Valve A', 'Only after safe motor stop'],
  ] as const;
  return <ScreenScroll><Header title="Activation sequence" subtitle="Morning irrigation · Draft v4" back={back} />
    <View style={s.pad}><Card style={s.infoCard}><MaterialCommunityIcons name="shield-check-outline" size={22} color={colors.green} /><Text style={s.infoText}>Safe-stop path is complete</Text></Card>
      {steps.map((step, i) => <View key={step[1]} style={s.sequenceRow}><View style={s.sequenceRail}>{i < steps.length - 1 && <View style={s.railLine} />}<View style={s.stepNumber}><Text style={s.stepNumberText}>{i + 1}</Text></View></View><Card style={s.sequenceCard}><View style={s.inline}><MaterialCommunityIcons name={step[0]} size={23} color={colors.green} /><Text style={s.rowTitle}>{step[1]}</Text></View><Text style={s.cardSub}>{step[2]}</Text></Card></View>)}
      <Card style={s.validationCard}><MaterialCommunityIcons name={published ? 'check-decagram' : 'check-decagram-outline'} size={28} color={colors.green} /><View style={{ flex: 1 }}><Text style={s.rowTitle}>{published ? 'Published as version 4' : 'Ready to validate'}</Text><Text style={s.cardSub}>{published ? 'Existing schedules remain pinned to v3.' : 'Topology, feedback, limits and shutdown policy pass.'}</Text></View></Card>
      <PrimaryButton label={published ? 'Published' : 'Validate & publish'} icon="check-decagram-outline" disabled={published} onPress={() => setPublished(true)} />
    </View></ScreenScroll>;
}

export function SchedulesScreen(): React.ReactElement {
  const [items, setItems] = useState<Schedule[]>(initialSchedules);
  useEffect(() => { loadSchedules().then(setItems).catch(() => undefined); }, []);
  const toggle = (id: string) => setItems(v => v.map(item => {
    if (item.id !== id) return item;
    const enabled = !item.enabled; updateSchedule(id, enabled).catch(() => undefined); return { ...item, enabled };
  }));
  return <ScreenScroll><Header title="Schedules" subtitle="Asia/Colombo · No surprise catch-up" action={<RoundIcon name="plus" />} />
    <View style={s.pad}><Card style={s.scheduleSummary}><IconTile name="calendar-check-outline" /><View><Text style={s.summaryValue}>2 active</Text><Text style={s.cardSub}>Next run tomorrow at 06:00</Text></View></Card>
      {items.map(item => <Card key={item.id} style={s.scheduleCard}><View style={s.rowBetween}><View style={s.inline}><IconTile name={item.rule.includes('<') ? 'water-percent-alert' : 'calendar-clock-outline'} tone={item.enabled ? 'green' : 'amber'} /><View><Text style={s.rowTitle}>{item.name}</Text><Text style={s.cardSub}>{item.rule}</Text></View></View><Switch accessibilityLabel={`${item.enabled ? 'Pause' : 'Enable'} ${item.name}`} value={item.enabled} onValueChange={() => toggle(item.id)} trackColor={{ false: colors.line, true: colors.lime }} thumbColor={item.enabled ? colors.forest : colors.muted} /></View><Divider /><View style={s.inline}><MaterialCommunityIcons name="clock-outline" size={18} color={colors.muted} /><Text style={s.meta}>{item.enabled ? item.nextRun : 'Paused · future runs disabled'}</Text></View></Card>)}
      <Card style={s.warningCard}><MaterialCommunityIcons name="weather-lightning" size={25} color={colors.amber} /><View style={{ flex: 1 }}><Text style={s.warningTitle}>Weather condition active</Text><Text style={s.warningCopy}>Scheduled irrigation skips when rainfall exceeds 8 mm.</Text></View></Card>
    </View></ScreenScroll>;
}

export function AlertsScreen(): React.ReactElement {
  const [items, setItems] = useState<Alert[]>(initialAlerts);
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  useEffect(() => { loadAlerts().then(setItems).catch(() => undefined); }, []);
  const shown = filter === 'open' ? items.filter(a => !a.acknowledged) : items;
  return <ScreenScroll><Header title="Alerts" subtitle={`${items.filter(a => !a.acknowledged).length} need attention`} />
    <View style={s.pad}><View style={s.segment}><Segment label="Open" active={filter === 'open'} onPress={() => setFilter('open')} /><Segment label="All" active={filter === 'all'} onPress={() => setFilter('all')} /></View>
      {shown.map(alert => <Card key={alert.id} style={s.alertCard}><IconTile name={alert.severity === 'critical' ? 'alert-octagon-outline' : alert.severity === 'warning' ? 'access-point-network-off' : 'tools'} tone={alert.severity === 'critical' ? 'red' : alert.severity === 'warning' ? 'amber' : 'blue'} /><View style={{ flex: 1 }}><View style={s.rowBetween}><Text style={s.rowTitle}>{alert.title}</Text><Badge label={alert.severity.toUpperCase()} tone={alert.severity === 'critical' ? 'red' : alert.severity === 'warning' ? 'amber' : 'blue'} /></View><Text style={s.cardSub}>{alert.detail}</Text><Text style={s.meta}>{alert.time}</Text>{!alert.acknowledged && <Pressable onPress={() => { acknowledgeAlert(alert.id).catch(() => undefined); setItems(v => v.map(a => a.id === alert.id ? { ...a, acknowledged: true } : a)); }} style={s.ackButton}><Text style={s.ackLabel}>Acknowledge</Text></Pressable>}</View></Card>)}
      {!shown.length && <EmptyState icon="check-circle-outline" title="All clear" copy="No open alerts need your attention." />}
    </View></ScreenScroll>;
}

export function MoreScreen({ navigate, role = 'OPERATOR', setRole }: ScreenProps) {
  const roles: Role[] = ['OPERATOR', 'SITE_MANAGER', 'CORPORATE_ADMIN', 'SUPER_ADMIN', 'VIEWER'];
  return <ScreenScroll><Header title="More" subtitle="Profile, settings and administration" />
    <View style={s.pad}><Card style={s.profileCard}><View style={s.avatar}><Text style={s.avatarText}>AK</Text></View><View style={{ flex: 1 }}><Text style={s.cardTitle}>Anjali Kumar</Text><Text style={s.cardSub}>GreenRoot Agriculture</Text></View><Badge label={role.replaceAll('_', ' ')} tone="green" /></Card>
      <Text style={s.label}>Demo role</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>{roles.map(r => <Chip key={r} label={r.replaceAll('_', ' ')} active={r === role} onPress={() => setRole?.(r)} />)}</ScrollView>
      <SectionTitle>Workspace</SectionTitle><Row icon="office-building-outline" title="Switch workspace" subtitle="GreenRoot Agriculture" /><Row icon="account-outline" title="Profile & security" subtitle="MFA, password and sessions" /><Row icon="bell-outline" title="Notifications" subtitle="Critical alerts enabled" /><Row icon="ruler-square" title="Units & language" subtitle="Metric · English" />
      {(role === 'CORPORATE_ADMIN' || role === 'SITE_MANAGER') && <><SectionTitle>Administration</SectionTitle><Row icon="account-group-outline" title="People & access" subtitle="Roles, invitations and site grants" onPress={() => navigate('corporateAdmin')} /><Row icon="text-box-search-outline" title="Audit history" subtitle="Configuration and control events" /></>}
      {role === 'SUPER_ADMIN' && <><SectionTitle>Platform</SectionTitle><Row icon="view-dashboard-outline" title="Platform overview" subtitle="Corporations, fleet and workers" onPress={() => navigate('superAdmin')} /></>}
      <PrimaryButton label="Sign out" icon="logout" tone="soft" onPress={() => navigate('welcome')} />
    </View></ScreenScroll>;
}

export function CorporateAdminScreen({ back }: ScreenProps) {
  return <ScreenScroll><Header title="Your organisation" subtitle="GreenRoot Agriculture" back={back} action={<RoundIcon name="cog-outline" />} />
    <View style={s.pad}><View style={s.metricGrid}><Metric icon="account-group-outline" label="Active users" value="18" /><Metric icon="map-marker-multiple-outline" label="Managed sites" value="3" tone="blue" /></View>
      <SectionTitle>People & access</SectionTitle><Row icon="account-plus-outline" title="Invite user" subtitle="Choose role and site grants" onPress={() => NativeAlert.alert('Invite user', 'Invitation creation is available at /v1/corporations/{id}/invitations.')} /><Row icon="shield-account-outline" title="Site managers" subtitle="3 people · 5 grants" /><Row icon="account-eye-outline" title="Operators & viewers" subtitle="14 people across 3 sites" />
      <SectionTitle>Recent invitations</SectionTitle><Row icon="email-fast-outline" title="Nimal Perera" subtitle="Operator · North Field · Expires in 5 days" badge={<Badge label="PENDING" tone="amber" />} /><Row icon="email-check-outline" title="Maya Silva" subtitle="Site manager · Accepted yesterday" badge={<Badge label="ACCEPTED" />} />
      <SectionTitle>Governance</SectionTitle><Row icon="clipboard-text-clock-outline" title="Audit history" subtitle="Last change 26 minutes ago" /><Row icon="database-export-outline" title="Exports" subtitle="Bounded, permission-checked exports" />
    </View></ScreenScroll>;
}

export function SuperAdminScreen({ back }: ScreenProps) {
  return <ScreenScroll><Header title="Platform overview" subtitle="AgroThulir operations" back={back} action={<RoundIcon name="bell-outline" badge />} />
    <View style={s.pad}><View style={s.metricGrid}><Metric icon="office-building-outline" label="Corporations" value="24" /><Metric icon="access-point" label="Devices online" value="1,842" tone="blue" /><Metric icon="message-alert-outline" label="Open critical" value="7" tone="red" /><Metric icon="clock-check-outline" label="Scheduler health" value="Healthy" /></View>
      <SectionTitle>Platform health</SectionTitle><Card style={s.healthCard}>{[['API', '99.99%', 'green'], ['Telemetry lag', '1.4 sec', 'green'], ['Outbox backlog', '12', 'amber'], ['Unknown commands', '3', 'red']].map(([label, value, tone]) => <View key={label} style={s.healthRow}><Text style={s.cardSub}>{label}</Text><Badge label={value} tone={tone as 'green' | 'amber' | 'red'} /></View>)}</Card>
      <SectionTitle>Companies</SectionTitle><Row icon="sprout-outline" title="GreenRoot Agriculture" subtitle="3 sites · 7 devices · Active" badge={<Badge label="HEALTHY" />} /><Row icon="office-building-outline" title="Coastal Growers" subtitle="6 sites · 24 devices · Active" badge={<Badge label="2 ALERTS" tone="amber" />} /><Row icon="office-building-remove-outline" title="Old Mill Estates" subtitle="Suspended · Monitoring preserved" badge={<Badge label="SUSPENDED" tone="red" />} />
      <PrimaryButton label="Add corporation" icon="plus" onPress={() => NativeAlert.alert('Add corporation', 'Create a tenant and invite its first corporate administrator.')} />
    </View></ScreenScroll>;
}

function ScreenScroll({ children }: { children: React.ReactNode }) { return <ScrollView style={s.screen} contentContainerStyle={s.screenContent} showsVerticalScrollIndicator={false}>{children}</ScrollView>; }
function RoundIcon({ name, badge, onPress }: { name: React.ComponentProps<typeof MaterialCommunityIcons>['name']; badge?: boolean; onPress?: () => void }) { return <Pressable accessibilityRole="button" accessibilityLabel={name} onPress={onPress} style={s.roundIcon}><MaterialCommunityIcons name={name} size={23} color={colors.ink} />{badge && <View style={s.notificationDot} />}</Pressable>; }
function Search({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) { return <View style={s.search}><MaterialCommunityIcons name="magnify" size={22} color={colors.muted} /><TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.muted} style={s.input} /></View>; }
function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) { return <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]}><Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text></Pressable>; }
function HealthBadge({ health }: { health: string }) { return <Badge label={health.toUpperCase()} tone={health === 'healthy' ? 'green' : health === 'warning' ? 'amber' : 'red'} />; }
function QuickAction({ icon, title, subtitle, onPress }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; title: string; subtitle: string; onPress: () => void }) { return <Pressable style={s.quickAction} onPress={onPress}><IconTile name={icon} /><Text style={s.quickTitle}>{title}</Text><Text style={s.cardSub}>{subtitle}</Text></Pressable>; }
function Stat({ value, label }: { value: string; label: string }) { return <View style={s.stat}><Text style={s.statValue}>{value}</Text><Text style={s.cardSub}>{label}</Text></View>; }
function Step({ index, label, state }: { index: number; label: string; state: string }) { const done = state === 'done'; const active = state === 'active'; return <View style={s.controlStep}><View style={[s.controlStepIcon, (done || active) && s.controlStepActive]}>{done ? <MaterialCommunityIcons name="check" size={18} color={colors.white} /> : active ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={s.controlStepText}>{index}</Text>}</View><Text style={[s.controlStepLabel, (done || active) && { color: colors.ink }]}>{label}</Text></View>; }
function Connector({ style }: { style: object }) { return <View style={[s.connector, style]}><MaterialCommunityIcons name="chevron-right" size={18} color={colors.blue} style={{ position: 'absolute', right: -8, top: -8 }} /></View>; }
function TopologyNode({ icon, label, style }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string; style: object }) { return <View style={[s.topologyNode, style]}><MaterialCommunityIcons name={icon} size={27} color={colors.green} /><Text style={s.topologyText}>{label}</Text></View>; }
function Segment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[s.segmentButton, active && s.segmentActive]}><Text style={[s.segmentLabel, active && s.segmentLabelActive]}>{label}</Text></Pressable>; }
function EmptyState({ icon, title, copy }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; title: string; copy: string }) { return <View style={s.empty}><IconTile name={icon} /><Text style={s.cardTitle}>{title}</Text><Text style={s.cardSub}>{copy}</Text></View>; }

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ivory }, screenContent: { paddingBottom: 112 }, pad: { paddingHorizontal: space.lg, gap: space.sm },
  welcome: { flexGrow: 1, backgroundColor: colors.ivory, padding: space.lg, justifyContent: 'center', alignItems: 'center' }, brandMark: { width: 78, height: 78, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.forest, position: 'relative' }, brandNode: { position: 'absolute', width: 9, height: 9, borderRadius: 5, backgroundColor: colors.lime, right: 17, top: 17, borderWidth: 2, borderColor: colors.white }, brand: { fontSize: 32, fontWeight: '900', color: colors.forest, marginTop: 14, letterSpacing: -1 }, tagline: { color: colors.muted, fontSize: 14, marginTop: 3, marginBottom: 24 },
  loginCard: { width: '100%', padding: space.lg, gap: space.md }, loginTitle: { fontSize: 22, fontWeight: '800', color: colors.ink }, copy: { fontSize: 13, color: colors.muted, lineHeight: 20 }, label: { fontSize: 12, fontWeight: '800', color: colors.ink, marginTop: 3 }, inputWrap: { minHeight: 52, flexDirection: 'row', alignItems: 'center', borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, backgroundColor: colors.ivory, paddingHorizontal: 14, gap: 10 }, input: { flex: 1, color: colors.ink, fontSize: 15, minHeight: 48 }, textButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center' }, textButtonLabel: { color: colors.green, fontWeight: '800' }, securityNote: { flexDirection: 'row', gap: 7, alignItems: 'center', marginTop: 18 }, securityText: { color: colors.green, fontSize: 12, fontWeight: '700' },
  roundIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line }, notificationDot: { position: 'absolute', width: 9, height: 9, borderRadius: 5, backgroundColor: colors.red, right: 10, top: 9, borderWidth: 2, borderColor: colors.white },
  heroCard: { minHeight: 160, backgroundColor: colors.sage, borderColor: colors.sage, flexDirection: 'row', padding: space.lg }, heroTitle: { fontSize: 21, lineHeight: 26, fontWeight: '900', color: colors.forest, marginTop: 14, maxWidth: 210 }, heroCopy: { color: colors.muted, fontSize: 12, marginTop: 7, lineHeight: 17 }, heroIcon: { alignSelf: 'center', opacity: .85 }, metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: '4%', rowGap: 12 }, quickGrid: { flexDirection: 'row', gap: 12 }, quickAction: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: space.md }, quickTitle: { fontWeight: '800', color: colors.ink, fontSize: 15, marginTop: 11 }, link: { color: colors.green, fontWeight: '800', fontSize: 13 },
  warningCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.amberBg, borderColor: '#F2DDAF', marginTop: 4 }, warningTitle: { color: colors.ink, fontWeight: '800', fontSize: 14 }, warningCopy: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  search: { height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 }, chips: { flexDirection: 'row', gap: 8, paddingVertical: 4 }, chip: { minHeight: 40, borderRadius: 20, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white }, chipActive: { backgroundColor: colors.forest, borderColor: colors.forest }, chipText: { color: colors.muted, fontSize: 12, fontWeight: '800' }, chipTextActive: { color: colors.white },
  siteCard: { marginBottom: 4, padding: space.lg }, rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, inline: { flexDirection: 'row', alignItems: 'center', gap: 7 }, cardTitle: { color: colors.ink, fontWeight: '900', fontSize: 18, marginTop: 10 }, cardSub: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 2 }, small: { color: colors.muted, fontSize: 12 }, smallStrong: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  mapCard: { height: 220, overflow: 'hidden', padding: 0, backgroundColor: '#EDF2E8' }, mapGrid: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: .35, borderWidth: 20, borderColor: '#DDE8D5', transform: [{ rotate: '-8deg' }] }, zone: { position: 'absolute', borderRadius: 14, borderWidth: 2, borderColor: colors.green, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' }, zoneText: { color: colors.green, fontWeight: '800', fontSize: 12 }, mapPin: { position: 'absolute', left: '48%', top: '43%' }, liveCard: { backgroundColor: colors.forest, borderColor: colors.forest, padding: space.lg }, pulse: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.lime }, reading: { color: colors.white, fontSize: 24, fontWeight: '900', marginTop: 18 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.sage, borderColor: colors.sage }, infoText: { flex: 1, color: colors.forest, fontSize: 12, lineHeight: 17, fontWeight: '700' }, deviceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }, rowTitle: { color: colors.ink, fontWeight: '800', fontSize: 15, flexShrink: 1 }, meta: { color: colors.muted, fontSize: 11, marginTop: 7 }, statusPanel: { padding: space.lg }, onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.green }, onlineText: { color: colors.green, fontWeight: '900' }, statRow: { flexDirection: 'row' }, stat: { flex: 1 }, statValue: { color: colors.ink, fontWeight: '900', fontSize: 16 },
  equipmentHero: { alignItems: 'center', paddingVertical: 16 }, equipmentTitle: { fontSize: 23, fontWeight: '900', color: colors.ink, marginVertical: 10 }, interlockCard: { backgroundColor: colors.sage, borderColor: colors.sage }, interlockTitle: { color: colors.forest, fontWeight: '900', fontSize: 15 }, controlStep: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 }, controlStepIcon: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white }, controlStepActive: { backgroundColor: colors.green, borderColor: colors.green }, controlStepText: { color: colors.muted, fontWeight: '800' }, controlStepLabel: { color: colors.muted, fontSize: 13, fontWeight: '700', flex: 1 }, pendingCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.amberBg, borderColor: colors.amberBg, marginVertical: 5 }, safetyCopy: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 5 },
  flowCard: { marginBottom: 5, padding: space.lg }, buttonRow: { flexDirection: 'row', gap: 8, marginTop: 14 }, smallButton: { flex: 1, minHeight: 44, borderRadius: 13, backgroundColor: colors.sage, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, smallButtonLabel: { color: colors.forest, fontSize: 12, fontWeight: '800' },
  canvas: { height: 390, backgroundColor: '#FBFCF7', position: 'relative', overflow: 'hidden' }, topologyNode: { position: 'absolute', width: 78, height: 76, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', zIndex: 2 }, topologyText: { color: colors.ink, fontWeight: '800', fontSize: 10, marginTop: 5 }, connector: { position: 'absolute', height: 2, backgroundColor: colors.blue, zIndex: 1 }, verticalConnector: { position: 'absolute', width: 2, backgroundColor: colors.blue, zIndex: 1 }, canvasTools: { position: 'absolute', right: 10, top: 10, gap: 7 },
  sequenceRow: { flexDirection: 'row', alignItems: 'stretch' }, sequenceRail: { width: 42, alignItems: 'center' }, railLine: { position: 'absolute', top: 36, bottom: -18, width: 2, backgroundColor: colors.line }, stepNumber: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center', marginTop: 18, zIndex: 2 }, stepNumberText: { color: colors.white, fontWeight: '900', fontSize: 12 }, sequenceCard: { flex: 1, marginBottom: 9 }, validationCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.sage, borderColor: colors.sage, marginVertical: 8 },
  scheduleSummary: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.forest, borderColor: colors.forest }, summaryValue: { color: colors.white, fontSize: 20, fontWeight: '900' }, scheduleCard: { padding: space.lg, marginBottom: 5 },
  segment: { flexDirection: 'row', backgroundColor: '#E9ECE5', borderRadius: 15, padding: 4 }, segmentButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }, segmentActive: { backgroundColor: colors.white }, segmentLabel: { color: colors.muted, fontSize: 13, fontWeight: '800' }, segmentLabelActive: { color: colors.forest }, alertCard: { flexDirection: 'row', gap: 12, marginBottom: 5 }, ackButton: { minHeight: 42, alignSelf: 'flex-start', justifyContent: 'center', marginTop: 5 }, ackLabel: { color: colors.green, fontWeight: '900', fontSize: 12 }, empty: { alignItems: 'center', paddingVertical: 70 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12 }, avatar: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.forest }, avatarText: { color: colors.white, fontWeight: '900' }, healthCard: { padding: space.lg }, healthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 42 },
});
