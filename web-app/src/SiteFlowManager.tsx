import {useCallback, useEffect, useMemo, useState, type FormEvent} from 'react';
import {ArrowDown, ArrowUp, Check, Cpu, GitBranch, Plus, RefreshCw, Trash2, X} from 'lucide-react';
import {api, type Device, type OperationalFlow, type OperationalFlowDetail, type Site, type SiteComponent, type Zone} from './api';

type Props = {site: Site; devices: Device[]; zones: Zone[]; canManage: boolean; onChanged: () => void; onClose: () => void};

export default function SiteFlowManager({site, devices, zones, canManage, onChanged, onClose}: Props) {
  const [flows, setFlows] = useState<OperationalFlowDetail[]>([]);
  const [components, setComponents] = useState<SiteComponent[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [flowName, setFlowName] = useState('');
  const [stepIds, setStepIds] = useState<string[]>([]);
  const [selectedComponent, setSelectedComponent] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [deviceSerial, setDeviceSerial] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const siteZones = useMemo(() => zones.filter(zone => zone.site_id === site.id), [zones, site.id]);
  const [deviceZone, setDeviceZone] = useState(() => siteZones[0]?.id ?? '');
  const [zoneName, setZoneName] = useState('');
  const [componentDevice, setComponentDevice] = useState('');
  const [componentKind, setComponentKind] = useState('VALVE');
  const [componentName, setComponentName] = useState('');
  const [hardwareChannel, setHardwareChannel] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const siteDevices = useMemo(() => devices.filter(device => device.site_id === site.id), [devices, site.id]);
  const available = components.filter(component => component.kind !== 'SENSOR' && !stepIds.includes(component.id));

  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [flowRows, componentRows] = await Promise.all([
        api<OperationalFlow[]>(`/v1/sites/${site.id}/operational-flows`),
        api<SiteComponent[]>(`/v1/sites/${site.id}/components`),
      ]);
      const details = await Promise.all(flowRows.map(flow => api<OperationalFlowDetail>(`/v1/operational-flows/${flow.id}`)));
      setFlows(details); setComponents(componentRows);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load site operations.'); }
    finally { setLoading(false); }
  }, [site.id]);
  useEffect(() => { void reload(); }, [reload, revision]);

  function resetDraft() { setEditingId(null); setFlowName(''); setStepIds([]); setSelectedComponent(''); }
  function edit(flow: OperationalFlowDetail) {
    setEditingId(flow.id); setFlowName(flow.name); setStepIds(flow.steps.map(step => step.component_id));
    setNotice(''); setError('');
  }
  function move(index: number, direction: -1 | 1) {
    const other = index + direction;
    if (other < 0 || other >= stepIds.length) return;
    setStepIds(current => {
      const reordered = [...current]; [reordered[index], reordered[other]] = [reordered[other], reordered[index]];
      return reordered;
    });
  }
  async function saveFlow(event: FormEvent) {
    event.preventDefault(); if (!stepIds.length) { setError('Add at least one controllable component.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const path = editingId ? `/v1/admin/operational-flows/${editingId}` : `/v1/admin/sites/${site.id}/operational-flows`;
      await api(path, {method: editingId ? 'PUT' : 'POST', body: {name: flowName, componentIds: stepIds}});
      setNotice(editingId ? 'Operational flow updated.' : 'Operational flow created.');
      resetDraft(); setRevision(value => value + 1); onChanged();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the flow.'); }
    finally { setBusy(false); }
  }
  async function createDevice(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await api('/v1/admin/devices', {method: 'POST', body: {siteId: site.id, zoneId: deviceZone, name: deviceName, serial: deviceSerial, model: deviceModel}});
      setDeviceName(''); setDeviceSerial(''); setDeviceModel(''); setNotice('Device registered. Add its components below.');
      onChanged(); setRevision(value => value + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not register the device.'); }
    finally { setBusy(false); }
  }
  async function createZone(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await api(`/v1/admin/sites/${site.id}/zones`, {method: 'POST', body: {name: zoneName}});
      setZoneName(''); setNotice('Zone created.'); onChanged();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create the zone.'); }
    finally { setBusy(false); }
  }
  async function createComponent(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await api(`/v1/admin/devices/${componentDevice}/components`, {method: 'POST', body: {
        kind: componentKind, name: componentName, hardwareChannel,
      }});
      setComponentName(''); setHardwareChannel(''); setNotice('Component added. You can now use it in a flow.');
      setRevision(value => value + 1); onChanged();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not add the component.'); }
    finally { setBusy(false); }
  }
  const step = (id: string) => components.find(component => component.id === id);
  const action = (kind: string, on: boolean) => kind === 'VALVE' ? (on ? 'Open' : 'Close') :
    kind === 'MOTOR' || kind === 'PUMP' ? (on ? 'Start' : 'Stop') : (on ? 'On' : 'Off');

  return <section className="panel flow-manager" aria-label={`${site.name} operations`}>
    <div className="flow-heading"><div><span className="eyebrow">SITE OPERATIONS</span><h2>{site.name}</h2><p>{site.location} · Configure the order in which components operate.</p></div>
      <div className="flow-heading-actions"><button className="secondary small" onClick={() => setRevision(value => value + 1)} aria-label="Refresh operations"><RefreshCw size={15} /> Refresh</button><button className="icon-button" onClick={onClose} aria-label="Close site operations"><X size={19} /></button></div></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {notice && <div className="notice" role="status">{notice}</div>}
    <div className="flow-grid"><div className="flow-column">
      <div className="flow-section-title"><GitBranch size={18} /><h3>Operational flows</h3></div>
      {loading ? <p className="flow-muted">Loading site data…</p> : flows.length === 0 ? <p className="flow-muted">No flows yet. Choose site components to create one.</p> :
        flows.map(flow => <div className="flow-card" key={flow.id}><div className="flow-card-head"><div><strong>{flow.name}</strong><small>{flow.steps.length} steps · {flow.currentState} · {flow.online ? 'Devices online' : 'Device offline'}</small></div>{canManage && <button className="secondary small" onClick={() => edit(flow)}>Edit</button>}</div>
          <div className="flow-step-summary">{flow.steps.map((item, index) => <span key={item.id}>{index + 1}. {item.component_name} <b>{item.on_action}</b></span>)}</div></div>)}
      {canManage && <form className="flow-form" onSubmit={saveFlow}><div className="flow-section-title"><Plus size={18} /><h3>{editingId ? 'Edit flow' : 'Create flow'}</h3></div>
        <label>Flow name<input value={flowName} onChange={event => setFlowName(event.target.value)} required maxLength={120} placeholder="e.g. Farm Motor" /></label>
        <label>Add component<select value={selectedComponent} onChange={event => setSelectedComponent(event.target.value)}><option value="">Select component</option>{available.map(component => <option key={component.id} value={component.id}>{component.name} · {component.device_name} ({component.kind})</option>)}</select></label>
        <button type="button" className="secondary small" disabled={!selectedComponent || stepIds.length >= 16} onClick={() => {setStepIds(current => [...current, selectedComponent]); setSelectedComponent('');}}><Plus size={15} /> Add to flow</button>
        <div className="flow-path"><div className="flow-path-label">ON · executes top to bottom</div>{stepIds.map((id, index) => {const component = step(id); return <div className="flow-path-step" key={id}><span className="flow-step-index">{index + 1}</span><div><strong>{component?.name ?? id}</strong><small>{component?.device_name} · {component && action(component.kind, true)}</small></div><div className="flow-reorder"><button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${component?.name} up`}><ArrowUp size={14} /></button><button type="button" onClick={() => move(index, 1)} disabled={index === stepIds.length - 1} aria-label={`Move ${component?.name} down`}><ArrowDown size={14} /></button><button type="button" onClick={() => setStepIds(current => current.filter(value => value !== id))} aria-label={`Remove ${component?.name}`}><Trash2 size={14} /></button></div></div>;})}
          {stepIds.length > 0 && <div className="flow-path-label">OFF · executes bottom to top: {stepIds.slice().reverse().map(id => {const component = step(id); return component ? `${action(component.kind, false)} ${component.name}` : id;}).join(' → ')}</div>}</div>
        <div className="flow-form-actions">{editingId && <button type="button" className="secondary" onClick={resetDraft}>Cancel edit</button>}<button className="primary" disabled={busy || stepIds.length === 0}><Check size={15} /> {busy ? 'Saving…' : editingId ? 'Save flow' : 'Create flow'}</button></div>
      </form>}
    </div><div className="flow-column">
      <div className="flow-section-title"><Cpu size={18} /><h3>Site devices & components</h3></div>
      {siteDevices.map(device => <div className="flow-device" key={device.id}><strong>{device.name}</strong><small>{device.serial ?? device.id} · {device.status}</small><div>{components.filter(component => component.device_id === device.id).map(component => <span key={component.id}>{component.name} <b>{component.kind}</b></span>)}</div></div>)}
      {siteDevices.length === 0 && <p className="flow-muted">No devices registered at this site.</p>}
      {canManage && <form className="flow-form" onSubmit={createZone}><div className="flow-section-title"><Plus size={18} /><h3>Add zone</h3></div><label>Zone name<input value={zoneName} onChange={event => setZoneName(event.target.value)} required placeholder="e.g. North irrigation" /></label><button className="primary" disabled={busy}>Create zone</button></form>}
      {canManage && <><form className="flow-form" onSubmit={createDevice}><div className="flow-section-title"><Plus size={18} /><h3>Register device</h3></div><label>Zone<select value={deviceZone} onChange={event => setDeviceZone(event.target.value)} required><option value="">Choose zone</option>{siteZones.map(zone => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label><label>Device name<input value={deviceName} onChange={event => setDeviceName(event.target.value)} required /></label><label>Serial number<input value={deviceSerial} onChange={event => setDeviceSerial(event.target.value)} required /></label><label>Model<input value={deviceModel} onChange={event => setDeviceModel(event.target.value)} required /></label><button className="primary" disabled={busy || !deviceZone}>Register device</button></form>
        <form className="flow-form" onSubmit={createComponent}><div className="flow-section-title"><Plus size={18} /><h3>Add device component</h3></div><label>Device<select value={componentDevice} onChange={event => setComponentDevice(event.target.value)} required><option value="">Select device</option>{siteDevices.map(device => <option key={device.id} value={device.id}>{device.name}</option>)}</select></label><label>Component type<select value={componentKind} onChange={event => setComponentKind(event.target.value)}>{['VALVE', 'MOTOR', 'PUMP', 'SWITCH', 'RELAY', 'SENSOR'].map(kind => <option key={kind}>{kind}</option>)}</select></label><label>Component name<input value={componentName} onChange={event => setComponentName(event.target.value)} required /></label><label>Hardware channel<input value={hardwareChannel} onChange={event => setHardwareChannel(event.target.value)} required placeholder="e.g. valve-1" /></label><button className="primary" disabled={busy || !componentDevice}>Add component</button></form></>}
    </div></div>
  </section>;
}
