import {useCallback, useEffect, useMemo, useState, type FormEvent} from 'react';
import {ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Cpu, Edit3, Gauge, GitBranch, MapPin, Power, Thermometer, X} from 'lucide-react';
import {api, type DeviceComponent, type DeviceDetail, type OperationalFlow, type OperationalFlowDetail,
  type SensorReading, type Site, type Zone, type ZoneDetail} from './api';

type Props = {sites: Site[]; canManage: boolean; canControl: boolean; corporationName: string; onChanged: () => void};
type View = {kind: 'zones'} | {kind: 'zone'; id: string} | {kind: 'device'; id: string};
const readable = (value?: string | null) => (value ?? 'unknown').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

export default function OperationsHierarchy({sites, canManage, canControl, corporationName, onChanged}: Props) {
  const [view, setView] = useState<View>({kind: 'zones'});
  const [zones, setZones] = useState<Zone[]>([]);
  const [zone, setZone] = useState<ZoneDetail | null>(null);
  const [device, setDevice] = useState<DeviceDetail | null>(null);
  const [flows, setFlows] = useState<OperationalFlowDetail[]>([]);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [editing, setEditing] = useState<DeviceComponent | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [readFailed, setReadFailed] = useState(false);
  const grouped = useMemo(() => sites.map(site => ({site, zones: zones.filter(item => item.site_id === site.id)})), [sites, zones]);

  const load = useCallback(async () => {
    setError('');
    try {
      if (view.kind === 'zones') { setZones(await api<Zone[]>('/v1/zones')); setReadFailed(false); return; }
      if (view.kind === 'zone') { setZone(await api<ZoneDetail>(`/v1/zones/${view.id}`)); setReadFailed(false); return; }
      const detail = await api<DeviceDetail>(`/v1/devices/${view.id}`);
      const [flowRows, readingRows] = await Promise.all([
        api<OperationalFlow[]>(`/v1/sites/${detail.site_id}/operational-flows`),
        api<SensorReading[]>(`/v1/sites/${detail.site_id}/readings`),
      ]);
      const allFlows = await Promise.all(flowRows.map(flow => api<OperationalFlowDetail>(`/v1/operational-flows/${flow.id}`)));
      const ids = new Set(detail.components.map(component => component.id));
      setDevice(detail); setFlows(allFlows.filter(flow => flow.steps.some(step => step.device_id === detail.id)));
      setReadings(readingRows.filter(reading => ids.has(reading.component_id)));
      setReadFailed(false);
    } catch (cause) { setReadFailed(true); setError(cause instanceof Error ? cause.message : 'Could not load operations.'); }
  }, [view]);
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), view.kind === 'device' ? 5000 : 15000); return () => window.clearInterval(timer); }, [load, view.kind]);

  async function operate(flow: OperationalFlowDetail, action: 'ON' | 'OFF') {
    const order = action === 'ON' ? flow.steps : [...flow.steps].reverse();
    if (!window.confirm(`${action} ${flow.name}?\n\n${order.map(step => step.component_name).join(' → ')}\n\nEach step waits for device confirmation.`)) return;
    setBusy(flow.id); setError('');
    try { await api(`/v1/operational-flows/${flow.id}/actions`, {method: 'POST', headers: {'Idempotency-Key': crypto.randomUUID()}, body: {action}}); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Operation refused.'); } finally { setBusy(''); }
  }
  async function saveComponent(event: FormEvent) {
    event.preventDefault(); if (!editing) return; setBusy(editing.id); setError('');
    try { await api(`/v1/admin/components/${editing.id}`, {method: 'PUT', body: {kind: editing.kind, name: editing.name,
      hardwareChannel: editing.hardware_channel, displayOrder: editing.display_order}}); setEditing(null); await load(); onChanged(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update component.'); } finally { setBusy(''); }
  }
  async function arrangeComponents(index: number, direction: -1 | 1) {
    if (!device) return; const ordered = [...device.components]; const target = index + direction; if (target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]]; setBusy('components'); setError('');
    try { await Promise.all(ordered.map((item, order) => api(`/v1/admin/components/${item.id}`, {method: 'PUT', body: {
      kind: item.kind, name: item.name, hardwareChannel: item.hardware_channel, displayOrder: order + 1}}))); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not rearrange components.'); } finally { setBusy(''); }
  }
  async function arrangeFlow(flow: OperationalFlowDetail, index: number, direction: -1 | 1) {
    const ids = flow.steps.map(step => step.component_id); const target = index + direction; if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]]; setBusy(flow.id); setError('');
    try { await api(`/v1/admin/operational-flows/${flow.id}`, {method: 'PUT', body: {name: flow.name, componentIds: ids}}); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update operation order.'); } finally { setBusy(''); }
  }

  return <section className="hierarchy-panel panel">
    <div className="hierarchy-head"><div>{view.kind !== 'zones' && <button className="icon-button" onClick={() => setView(view.kind === 'device' && zone ? {kind: 'zone', id: zone.id} : {kind: 'zones'})}><ArrowLeft size={19} /></button>}</div>
      <div><span className="eyebrow">{corporationName}</span><h2>{view.kind === 'zones' ? 'Zones' : view.kind === 'zone' ? zone?.name ?? 'Zone' : device?.name ?? 'Device'}</h2>
        <p>{view.kind === 'zones' ? 'Sites contain zones. Open a zone to reach its devices.' : view.kind === 'zone' ? `${zone?.site_name ?? ''} · Devices in this zone` : `${device?.site_name ?? ''} · ${device?.zone_name ?? ''}`}</p></div>
      <div className="hierarchy-path"><span>Corporation</span><ArrowRight size={13}/><span>Site</span><ArrowRight size={13}/><b>Zone</b><ArrowRight size={13}/><span>Device</span><ArrowRight size={13}/><span>Component</span></div></div>
    {error && <div className="form-error">{error}</div>}
    {view.kind === 'zones' && <div className="site-zone-groups">{grouped.map(group => <div className="site-zone-group" key={group.site.id}>
      <div className="site-label"><MapPin size={18}/><div><h3>{group.site.name}</h3><p>{group.site.location} · {readable(group.site.health)}</p></div></div>
      <div className="zone-card-grid">{group.zones.map(item => <button className="zone-card-web" key={item.id} onClick={() => {setZone(null); setView({kind: 'zone', id: item.id});}}>
        <span className="zone-card-icon"><MapPin size={22}/></span><strong>{item.name}</strong><small>{item.device_count} devices · {item.online_count ?? 0} online</small><span className="zone-open">Open zone <ArrowRight size={14}/></span>
      </button>)}{group.zones.length === 0 && <p className="flow-muted">No zones configured.</p>}</div></div>)}</div>}
    {view.kind === 'zone' && zone && <div><div className="device-stat-row"><Stat value={`${zone.devices.filter(item => item.status === 'ONLINE').length}/${zone.devices.length}`} label="Online devices"/><Stat value={String(zone.devices.reduce((sum, item) => sum + item.actuator_count, 0))} label="Actuators"/><Stat value={String(zone.devices.reduce((sum, item) => sum + item.sensor_count, 0))} label="Sensors"/></div>
      <div className="zone-device-list">{zone.devices.map(item => <button className="zone-device-row" key={item.id} onClick={() => setView({kind: 'device', id: item.id})}>
        <span className="zone-card-icon"><Cpu size={21}/></span><span><strong>{item.name}</strong><small>{item.model} · {item.actuator_count} controls · {item.sensor_count} sensors</small></span><span className={`badge badge-${item.status.toLowerCase()}`}>{readable(item.status)}</span><ArrowRight size={17}/>
      </button>)}</div></div>}
    {view.kind === 'device' && device && <div className="device-workspace">
      <div className="device-hero-web"><div><span>DEVICE STATUS</span><h3>{readable(device.status)}</h3><p>{device.model} · {device.serial} · firmware {device.firmware ?? 'unknown'}</p></div><Cpu size={42}/></div>
      <div className="device-columns"><div><div className="section-label"><Power size={18}/><h3>Device operations</h3></div>{flows.length === 0 && <p className="flow-muted">No operational flow includes this device.</p>}
        {flows.map(flow => {const pending = flow.latestRun && ['ACCEPTED','WAITING_FEEDBACK'].includes(flow.latestRun.state); const ready = canControl && !readFailed && !pending && !busy && flow.online && flow.status === 'PUBLISHED' && flow.steps.every(step => step.feedback_quality === 'CONFIRMED'); return <div className="operation-card-web" key={flow.id}>
          <div className="operation-title"><div><strong>{flow.name}</strong><small>{flow.steps.length} ordered steps · {flow.currentState}</small></div><span className="badge">{flow.currentState}</span></div>
          <div className="operation-actions"><button className="primary" disabled={!ready || busy === flow.id} onClick={() => void operate(flow, 'ON')}><Power size={16}/> ON</button><button className="secondary" disabled={!ready || busy === flow.id} onClick={() => void operate(flow, 'OFF')}><X size={16}/> OFF</button></div>
          {!ready && <p className="operation-warning">{pending ? 'Waiting for device confirmation. A sent request is not a confirmed motor state.' : readFailed ? 'Connection lost. Information may be out of date; controls are disabled.' : 'Operations require control access, online devices, and confirmed feedback.'}</p>}
          {canManage && <div className="order-editor"><span>OPERATION ORDER · OFF runs in reverse</span>{flow.steps.map((step, index) => <div key={step.id}><b>{index + 1}</b><p>{step.component_name}<small>{readable(step.on_action)} · {step.device_name}</small></p><button disabled={index === 0 || busy === flow.id} onClick={() => void arrangeFlow(flow, index, -1)}><ArrowUp size={14}/></button><button disabled={index === flow.steps.length - 1 || busy === flow.id} onClick={() => void arrangeFlow(flow, index, 1)}><ArrowDown size={14}/></button></div>)}</div>}
        </div>})}</div>
        <div><div className="section-label"><GitBranch size={18}/><h3>Component configuration</h3></div><div className="component-table"><div className="component-table-head"><span>Component</span><span>Channel</span><span>State / value</span><span>Arrange</span></div>
          {device.components.map((item, index) => <div className="component-table-row" key={item.id}><span><b>{item.name}</b><small>{item.kind}</small></span><span>{item.hardware_channel}</span><span>{item.latest_value ?? readable(item.reported_state)}</span><span className="component-actions">
            {canManage && <><button disabled={index === 0 || busy === 'components'} onClick={() => void arrangeComponents(index, -1)}><ArrowUp size={14}/></button><button disabled={index === device.components.length - 1 || busy === 'components'} onClick={() => void arrangeComponents(index, 1)}><ArrowDown size={14}/></button><button onClick={() => setEditing({...item})}><Edit3 size={14}/></button></>}</span></div>)}</div></div></div>
      <div className="section-label data-title"><Gauge size={18}/><h3>Device data table</h3></div><div className="table-scroll"><table><thead><tr><th>Sensor</th><th>Value</th><th>Quality</th><th>Measured</th></tr></thead><tbody>{readings.map(reading => <tr key={reading.id}><td><Thermometer size={15}/> {reading.component_name}</td><td><strong>{reading.value} {reading.unit}</strong></td><td>{readable(reading.quality)}</td><td>{new Date(reading.measured_at).toLocaleString('en-LK')}</td></tr>)}</tbody></table>{readings.length === 0 && <p className="flow-muted">No readings for this device.</p>}</div>
    </div>}
    {editing && <div className="inline-editor"><form onSubmit={saveComponent}><div><span className="eyebrow">COMPONENT CONFIGURATION</span><h3>Edit {editing.name}</h3></div><label>Name<input value={editing.name} onChange={event => setEditing({...editing, name: event.target.value})}/></label><label>Type<select value={editing.kind} onChange={event => setEditing({...editing, kind: event.target.value})}>{['VALVE','MOTOR','PUMP','SWITCH','RELAY','SENSOR'].map(kind => <option key={kind}>{kind}</option>)}</select></label><label>Hardware channel<input value={editing.hardware_channel} onChange={event => setEditing({...editing, hardware_channel: event.target.value})}/></label><div><button type="button" className="secondary" onClick={() => setEditing(null)}>Cancel</button><button className="primary" disabled={busy === editing.id}><Check size={15}/> Save</button></div></form></div>}
  </section>;
}

function Stat({value, label}: {value: string; label: string}) { return <div className="device-stat"><strong>{value}</strong><span>{label}</span></div>; }
