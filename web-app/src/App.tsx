import {useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode} from 'react';
import {Activity, ArrowRight, Bell, Building2, CalendarDays, ChevronDown, CircleHelp, ClipboardList, Cloud, Cpu, Droplets, LayoutDashboard, Leaf, LogOut, Menu, Plus, RefreshCw, Search, ShieldCheck, Users, X} from 'lucide-react';
import {api, BASE_URL, hasToken, login, setToken, type Alert, type Audit, type Corporation, type Device, type Me, type Overview, type Schedule, type Site, type User} from './api';
import SiteFlowManager from './SiteFlowManager';

type Section = 'overview' | 'corporations' | 'users' | 'sites' | 'devices' | 'schedules' | 'alerts' | 'audit';
type Modal = 'corporation' | 'user' | 'site' | 'device' | null;
const navigation: {id: Section; label: string; icon: typeof LayoutDashboard}[] = [
  {id: 'overview', label: 'Overview', icon: LayoutDashboard},
  {id: 'corporations', label: 'Corporations', icon: Building2},
  {id: 'users', label: 'Team & access', icon: Users},
  {id: 'sites', label: 'Sites', icon: Droplets},
  {id: 'devices', label: 'Devices', icon: Cpu},
  {id: 'schedules', label: 'Schedules', icon: CalendarDays},
  {id: 'alerts', label: 'Alerts', icon: Bell},
  {id: 'audit', label: 'Activity log', icon: ClipboardList},
];

const readable = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const shortDate = (value?: string | null) => value ? new Date(value).toLocaleString('en-LK', {dateStyle: 'medium', timeStyle: 'short'}) : '—';
function Badge({value}: {value: string}) { return <span className={`badge badge-${value.toLowerCase()}`}>{readable(value)}</span>; }

function Login({onSuccess}: {onSuccess: () => void}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { const session = await login(email, password); setToken(session.token); onSuccess(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Sign-in failed.'); }
    finally { setBusy(false); }
  }
  return <div className="login-page">
    <div className="login-visual"><div className="brand brand-light"><span className="brand-mark"><Leaf size={25} /></span><span>Kirish<span className="brand-dot">.</span></span></div>
      <div className="login-visual-content"><span className="eyebrow light">CONNECTED AGRICULTURE</span><h1>Every site.<br />One clear view.</h1><p>Manage your people, equipment, and operations with live data from the Kirish platform.</p><div className="visual-line"><span /><span /><span /></div></div>
      <div className="visual-footer"><Cloud size={16} /> Connected to {BASE_URL}</div></div>
    <div className="login-panel"><div className="mobile-brand brand"><span className="brand-mark"><Leaf size={25} /></span><span>Kirish<span className="brand-dot">.</span></span></div>
      <div className="login-card"><span className="eyebrow">ADMIN PORTAL</span><h2>Welcome back</h2><p>Sign in to your workspace to continue.</p>
        <form onSubmit={submit}><label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="username" /></label>
          <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required autoComplete="current-password" /></label>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="primary full" disabled={busy}>{busy ? 'Signing in…' : <>Sign in <ArrowRight size={17} /></>}</button></form>
        <div className="login-note"><ShieldCheck size={18} /><span>Access is verified by the backend and tied to your workspace.</span></div>
      </div><div className="panel-footer">© 2026 Kirish Corp · Operations platform</div></div>
  </div>;
}

export default function App() {
  const [signedIn, setSignedIn] = useState(hasToken());
  const [me, setMe] = useState<Me | null>(null);
  const [section, setSection] = useState<Section>('overview');
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [corporations, setCorporations] = useState<Corporation[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState<Modal>(null);
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [revision, setRevision] = useState(0);

  const refresh = useCallback(async () => {
    if (!signedIn) return;
    setLoading(true); setError('');
    try {
      const profile = await api<Me>('/v1/me'); setMe(profile);
      const [siteRows, alertRows, scheduleRows, auditRows] = await Promise.all([
        api<Site[]>('/v1/sites'), api<Alert[]>('/v1/alerts'), api<Schedule[]>('/v1/schedules'), api<Audit[]>('/v1/audit-events')]);
      setSites(siteRows); setAlerts(alertRows); setSchedules(scheduleRows); setAudit(auditRows);
      setDevices((await Promise.all(siteRows.map(site => api<Device[]>(`/v1/devices?siteId=${encodeURIComponent(site.id)}`)))).flat());
      if (profile.role === 'SUPER_ADMIN' || profile.role === 'CORPORATE_ADMIN') setUsers(await api<User[]>('/v1/admin/users'));
      else setUsers([]);
      if (profile.role === 'SUPER_ADMIN') {
        const [corporationRows, counts] = await Promise.all([api<Corporation[]>('/v1/platform/corporations'), api<Overview>('/v1/platform/overview')]);
        setCorporations(corporationRows); setOverview(counts);
      } else { setCorporations([]); setOverview(null); }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not load workspace data.';
      setError(message);
      if (message.includes('Sign in again') || message.includes('Sign in to access')) { setToken(null); setSignedIn(false); }
    } finally { setLoading(false); }
  }, [signedIn]);
  useEffect(() => { void refresh(); }, [refresh, revision]);

  async function signOut() {
    try { await api('/v1/auth/logout', {method: 'POST'}); } catch { /* local session still ends */ }
    setToken(null); setSignedIn(false); setMe(null);
  }
  const visibleNav = navigation.filter(item => item.id !== 'corporations' || me?.role === 'SUPER_ADMIN').filter(item => item.id !== 'users' || me?.role === 'SUPER_ADMIN' || me?.role === 'CORPORATE_ADMIN');
  const canCorporate = me?.role === 'SUPER_ADMIN' || me?.role === 'CORPORATE_ADMIN';
  const canManage = canCorporate || me?.role === 'SITE_MANAGER';
  const siteName = (id: string) => sites.find(site => site.id === id)?.name ?? id;
  const filter = <T extends object>(rows: T[]) => rows.filter(row => JSON.stringify(row).toLowerCase().includes(search.toLowerCase()));
  const metrics = useMemo(() => [
    {label: 'Sites monitored', value: sites.length, icon: Droplets, tone: 'mint', detail: 'Across your workspace'},
    {label: 'Devices online', value: devices.filter(device => device.status === 'ONLINE').length, icon: Cpu, tone: 'blue', detail: `${devices.length} devices visible`},
    {label: 'Open alerts', value: alerts.filter(alert => !alert.acknowledged_at).length, icon: Bell, tone: 'amber', detail: 'Require attention'},
    {label: 'Active schedules', value: schedules.filter(schedule => schedule.enabled).length, icon: CalendarDays, tone: 'lavender', detail: 'Currently enabled'},
  ], [sites, devices, alerts, schedules]);

  if (!signedIn) return <Login onSuccess={() => setSignedIn(true)} />;
  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-top"><div className="brand"><span className="brand-mark"><Leaf size={24} /></span><span>Kirish<span className="brand-dot">.</span></span></div><button className="icon-button mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={20} /></button></div>
      <button className="workspace-card" onClick={() => setWorkspaceOpen(value => !value)}><div className="workspace-icon"><Building2 size={19} /></div><div><strong>{corporations.find(corp => corp.id === me?.activeCorporationId)?.name ?? 'Kirish Workspace'}</strong><small>{readable(me?.role ?? 'loading')}</small></div><ChevronDown size={16} /></button>
      {workspaceOpen && me?.role === 'SUPER_ADMIN' && <div className="workspace-menu">{corporations.map(corp => <button key={corp.id} className={corp.id === me.activeCorporationId ? 'selected' : ''} onClick={async () => {try {await api('/v1/auth/context', {method: 'POST', body: {corporationId: corp.id}}); setWorkspaceOpen(false); setSection('overview'); setRevision(value => value + 1);} catch (cause) {setError(String(cause));}}}>{corp.name}</button>)}</div>}
      <div className="nav-caption">WORKSPACE</div><nav className="nav-list">{visibleNav.map(item => <button key={item.id} className={section === item.id ? 'nav-item active' : 'nav-item'} onClick={() => {setSection(item.id); setSearch(''); setMenuOpen(false);}}><item.icon size={19} strokeWidth={1.9} />{item.label}{item.id === 'alerts' && alerts.filter(alert => !alert.acknowledged_at).length > 0 && <span className="nav-count">{alerts.filter(alert => !alert.acknowledged_at).length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><CircleHelp size={20} /><strong>Service connection</strong><small>{BASE_URL}</small><span className="connected"><span /> API configured</span></div><button className="nav-item signout" onClick={() => void signOut()}><LogOut size={19} />Sign out</button></div>
    </aside>
    {menuOpen && <button className="mobile-overlay" onClick={() => setMenuOpen(false)} aria-label="Close menu" />}
    <main className="main-area"><header className="topbar"><button className="icon-button menu-button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={22} /></button><div className="breadcrumbs">Workspace <span>/</span> <strong>{navigation.find(item => item.id === section)?.label}</strong></div><div className="topbar-actions"><span className="live-pill"><span /> Live backend</span><button className="icon-button" onClick={() => setRevision(value => value + 1)} title="Refresh data" aria-label="Refresh data"><RefreshCw size={18} className={loading ? 'spin' : ''} /></button><div className="avatar" title={me?.display_name}>{me?.display_name?.split(' ').map(part => part[0]).slice(0, 2).join('') ?? 'K'}</div></div></header>
      <div className="content"><div className="page-heading"><div><span className="eyebrow">KIRISH OPERATIONS</span><h1>{section === 'overview' ? 'Overview' : navigation.find(item => item.id === section)?.label}</h1><p>{section === 'overview' ? `Good to see you, ${me?.display_name ?? 'admin'}. Here is what is happening across your workspace.` : `Current information from your connected workspace.`}</p></div><div className="heading-actions">{section === 'corporations' && me?.role === 'SUPER_ADMIN' && <button className="primary" onClick={() => setModal('corporation')}><Plus size={17} /> Add corporation</button>}{section === 'users' && canCorporate && <button className="primary" onClick={() => setModal('user')}><Plus size={17} /> Add member</button>}{section === 'sites' && canCorporate && <button className="primary" onClick={() => setModal('site')}><Plus size={17} /> Add site</button>}{section === 'devices' && canManage && <button className="primary" onClick={() => setModal('device')}><Plus size={17} /> Register device</button>}</div></div>
        {error && <div className="form-error page-error" role="alert">{error}<button onClick={() => setRevision(value => value + 1)}>Retry</button></div>}
        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={17} /></button></div>}
        {section === 'overview' && <>{overview && <div className="platform-strip"><Building2 size={17} /><span>Platform-wide: <strong>{overview.corporations} corporations</strong> · {overview.sites} sites · {overview.devicesOnline} devices online</span><Badge value={overview.health} /></div>}<div className="metrics-grid">{metrics.map(metric => <div className="metric-card" key={metric.label}><div className={`metric-icon ${metric.tone}`}><metric.icon size={23} /></div><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.detail}</small></div>)}</div>
          <div className="overview-grid"><div className="panel"><div className="panel-heading"><div><h2>Sites at a glance</h2><p>Health and field conditions</p></div><button className="text-button" onClick={() => setSection('sites')}>View all <ArrowRight size={16} /></button></div><div className="site-list">{sites.slice(0, 4).map(site => <div className="site-row" key={site.id}><div className="site-symbol"><Droplets size={20} /></div><div className="site-text"><strong>{site.name}</strong><small>{site.location} · {readable(site.type)}</small></div><Badge value={site.health} /></div>)}{sites.length === 0 && <Empty message="No sites are available for this account." />}</div></div>
            <div className="panel"><div className="panel-heading"><div><h2>Attention needed</h2><p>Latest alerts in your workspace</p></div><button className="text-button" onClick={() => setSection('alerts')}>View all <ArrowRight size={16} /></button></div><div className="attention-list">{alerts.slice(0, 4).map(alert => <div className="attention-row" key={alert.id}><span className={`alert-dot ${alert.severity.toLowerCase()}`} /><div><strong>{alert.title}</strong><small>{siteName(alert.site_id)} · {shortDate(alert.raised_at)}</small></div><Badge value={alert.severity} /></div>)}{alerts.length === 0 && <Empty message="No alerts are currently recorded." />}</div></div></div>
          <div className="panel activity-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Actions recorded by the platform</p></div><button className="text-button" onClick={() => setSection('audit')}>View log <ArrowRight size={16} /></button></div><div className="activity-list">{audit.slice(0, 5).map(event => <div className="activity-row" key={event.id}><div className="activity-icon"><Activity size={17} /></div><div><strong>{readable(event.operation)}</strong><small>{event.summary || event.target}</small></div><time>{shortDate(event.occurred_at)}</time></div>)}{audit.length === 0 && <Empty message="No activity has been recorded yet." />}</div></div></>}
        {section !== 'overview' && <div className="panel table-panel"><div className="table-toolbar"><div><h2>{navigation.find(item => item.id === section)?.label}</h2><p>Showing records available to your role</p></div><div className="search-box"><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search records" aria-label="Search records" /></div></div>
          {section === 'corporations' && <Table headers={['Corporation', 'Workspace code', 'Status', 'Timezone']} rows={filter(corporations).map(corp => [<CellTitle icon={<Building2 size={18} />} title={corp.name} subtitle={corp.id} />, corp.workspace_code, <Badge value={corp.status} />, corp.default_timezone])} />}
          {section === 'users' && <Table headers={['Member', 'Role', 'Status']} rows={filter(users).map(user => [<CellTitle icon={<Users size={18} />} title={user.display_name} subtitle={user.email} />, <Badge value={user.corporate_role} />, <Badge value={user.account_status} />])} />}
          {section === 'sites' && <Table headers={['Site', 'Type', 'Health', 'Moisture', 'Pressure', 'Operations']} rows={filter(sites).map(site => [<CellTitle icon={<Droplets size={18} />} title={site.name} subtitle={site.location} />, readable(site.type), <Badge value={site.health} />, site.moisture == null ? '—' : `${site.moisture}%`, site.pressure == null ? '—' : `${site.pressure} bar`, <button className="secondary small" onClick={() => setSelectedSiteId(site.id)}><ArrowRight size={15} /> Open site</button>])} />}
          {section === 'devices' && <Table headers={['Device', 'Site', 'Model', 'Status', 'Last seen']} rows={filter(devices).map(device => [<CellTitle icon={<Cpu size={18} />} title={device.name} subtitle={device.serial ?? device.id} />, siteName(device.site_id), device.model, <Badge value={device.status} />, shortDate(device.last_seen_at)])} />}
          {section === 'schedules' && <Table headers={['Schedule', 'Site', 'Recurrence', 'Next due', 'State']} rows={filter(schedules).map(schedule => [<CellTitle icon={<CalendarDays size={18} />} title={schedule.name} subtitle={schedule.id} />, siteName(schedule.site_id), schedule.recurrence, shortDate(schedule.next_due_at), <button className={`toggle ${schedule.enabled ? 'on' : ''}`} disabled={!canManage} onClick={async () => {try {await api(`/v1/schedules/${schedule.id}`, {method: 'PATCH', body: {enabled: !schedule.enabled}}); setNotice('Schedule updated.'); setRevision(value => value + 1);} catch (cause) {setError(String(cause));}}} aria-label={`${schedule.enabled ? 'Pause' : 'Enable'} ${schedule.name}`}><span /></button>])} />}
          {section === 'alerts' && <Table headers={['Alert', 'Site', 'Severity', 'Raised', 'Action']} rows={filter(alerts).map(alert => [<CellTitle icon={<Bell size={18} />} title={alert.title} subtitle={alert.detail} />, siteName(alert.site_id), <Badge value={alert.severity} />, shortDate(alert.raised_at), alert.acknowledged_at ? <Badge value="ACKNOWLEDGED" /> : <button className="secondary small" onClick={async () => {try {await api(`/v1/alerts/${alert.id}/acknowledgements`, {method: 'POST'}); setNotice('Alert acknowledged.'); setRevision(value => value + 1);} catch (cause) {setError(String(cause));}}}>Acknowledge</button>])} />}
          {section === 'audit' && <Table headers={['Operation', 'Actor', 'Target', 'When']} rows={filter(audit).map(event => [<CellTitle icon={<Activity size={18} />} title={readable(event.operation)} subtitle={event.summary} />, event.actor_id, event.target, shortDate(event.occurred_at)])} />}
        </div>}
        {section === 'sites' && selectedSiteId && sites.find(site => site.id === selectedSiteId) && <SiteFlowManager key={selectedSiteId} site={sites.find(site => site.id === selectedSiteId)!} devices={devices} canManage={Boolean(canManage)} onChanged={() => setRevision(value => value + 1)} onClose={() => setSelectedSiteId(null)} />}
        <footer className="content-footer"><span>Data served by {BASE_URL}</span><span><span className="footer-dot" /> Connected workspace</span></footer>
      </div></main>
    {modal && <CreateModal type={modal} sites={sites} platformAdmin={me?.role === 'SUPER_ADMIN'} onClose={() => setModal(null)} onCreated={() => {setModal(null); setNotice('Record created successfully.'); setRevision(value => value + 1);}} />}
  </div>;
}

function Empty({message}: {message: string}) { return <div className="empty">{message}</div>; }
function CellTitle({icon, title, subtitle}: {icon: ReactNode; title: string; subtitle?: string | null}) { return <div className="cell-title"><span className="cell-icon">{icon}</span><span><strong>{title}</strong><small>{subtitle || '—'}</small></span></div>; }
function Table({headers, rows}: {headers: string[]; rows: ReactNode[][]}) { return <div className="table-scroll"><table><thead><tr>{headers.map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table>{rows.length === 0 && <Empty message="No matching records found." />}</div>; }

function CreateModal({type, sites, platformAdmin, onClose, onCreated}: {type: Exclude<Modal, null>; sites: Site[]; platformAdmin: boolean; onClose: () => void; onCreated: () => void}) {
  const [fields, setFields] = useState<Record<string, string>>({role: 'OPERATOR', siteId: sites[0]?.id ?? '', type: 'FARM', defaultTimezone: 'Asia/Colombo'});
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const set = (field: string) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFields(current => ({...current, [field]: event.target.value}));
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const path = type === 'corporation' ? '/v1/platform/corporations' : `/v1/admin/${type === 'user' ? 'users' : type === 'site' ? 'sites' : 'devices'}`;
      await api(path, {method: 'POST', body: fields}); onCreated();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create record.'); }
    finally { setBusy(false); }
  }
  const title = {corporation: 'Add corporation', user: 'Add team member', site: 'Add site', device: 'Register device'}[type];
  const input = (label: string, field: string, required = true, inputType = 'text') => <label>{label}<input value={fields[field] ?? ''} onChange={set(field)} required={required} type={inputType} /></label>;
  return <div className="modal-backdrop" onMouseDown={event => {if (event.target === event.currentTarget) onClose();}}><div className="modal-card" role="dialog" aria-modal="true" aria-label={title}><div className="modal-heading"><div><span className="eyebrow">WORKSPACE SETUP</span><h2>{title}</h2><p>This record will be saved in the backend database.</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={21} /></button></div>
    <form onSubmit={submit} className="modal-form">{type === 'corporation' && <>{input('Corporation name', 'name')}{input('Workspace code', 'workspaceCode')}{input('Timezone', 'defaultTimezone')}</>}
      {type === 'user' && <>{input('Display name', 'displayName')}{input('Email address', 'email', true, 'email')}{input('Initial password', 'password', true, 'password')}<label>Role<select value={fields.role} onChange={set('role')}><option value="OPERATOR">Operator</option><option value="SITE_MANAGER">Site manager</option><option value="VIEWER">Viewer</option>{platformAdmin && <option value="CORPORATE_ADMIN">Corporate admin</option>}</select></label>{fields.role !== 'CORPORATE_ADMIN' && <label>Site access<select value={fields.siteId} onChange={set('siteId')} required>{sites.map(site => <option value={site.id} key={site.id}>{site.name}</option>)}</select></label>}</>}
      {type === 'site' && <>{input('Site name', 'name')}<label>Site type<select value={fields.type} onChange={set('type')}><option value="FARM">Farm</option><option value="GREENHOUSE">Greenhouse</option><option value="BUILDING">Building</option></select></label>{input('Location', 'location')}</>}
      {type === 'device' && <><label>Site<select value={fields.siteId} onChange={set('siteId')} required>{sites.map(site => <option value={site.id} key={site.id}>{site.name}</option>)}</select></label>{input('Device name', 'name')}{input('Serial number', 'serial')}{input('Model', 'model')}</>}
      {error && <div className="form-error" role="alert">{error}</div>}<div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Create record'}</button></div></form></div></div>;
}
