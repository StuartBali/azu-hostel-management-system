import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowUpRight, BedDouble, Bell, Building2,
  CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp,
  ClipboardList, CreditCard, Download, FileBarChart, GraduationCap, LayoutDashboard,
  History, LogOut, Menu, Plus, Search, Settings, ShieldCheck, SlidersHorizontal, UserRound,
  Users, Wrench, X,
} from 'lucide-react';

const configuredApiUrl = (import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`).replace(/\/+$/, '');
const API = configuredApiUrl.endsWith('/api') ? configuredApiUrl : `${configuredApiUrl}/api`;
const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Students', icon: Users },
  { label: 'Hostels', icon: Building2 },
  { label: 'Rooms', icon: BedDouble },
  { label: 'Allocations', icon: ClipboardList },
  { label: 'Payments', icon: CreditCard },
  { label: 'Maintenance', icon: Wrench },
  { label: 'Reports', icon: FileBarChart },
  { label: 'Audit Log', icon: History },
  { label: 'User management', icon: ShieldCheck },
  { label: 'Settings', icon: Settings },
];
const RESOURCE = {
  Students: 'students', Hostels: 'hostels', Rooms: 'rooms', Allocations: 'allocations',
  Payments: 'payments', Maintenance: 'maintenance', 'User management': 'users',
};
const ROLE_READS = {
  Administrator: Object.values(RESOURCE),
  'Hostel Officer': ['students', 'hostels', 'rooms', 'allocations', 'maintenance'],
  'Finance Officer': ['students', 'hostels', 'rooms', 'allocations', 'payments'],
  Warden: ['students', 'hostels', 'rooms', 'allocations', 'maintenance'],
};
const ROLE_WRITES = {
  Administrator: Object.values(RESOURCE),
  'Hostel Officer': ['students', 'hostels', 'rooms', 'allocations', 'maintenance'],
  'Finance Officer': ['payments'],
  Warden: ['maintenance'],
};
const COLUMNS = {
  Students: [['name', 'Student name'], ['regNo', 'Registration no.'], ['department', 'Department'], ['year', 'Year'], ['phone', 'Phone']],
  Hostels: [['name', 'Hostel name'], ['location', 'Location'], ['totalRooms', 'Total rooms'], ['warden', 'Warden']],
  Rooms: [['hostel', 'Hostel'], ['roomNo', 'Room no.'], ['capacity', 'Capacity'], ['occupied', 'Occupied'], ['status', 'Status']],
  Allocations: [['student', 'Student'], ['room', 'Room'], ['hostel', 'Hostel'], ['date', 'Date allocated'], ['term', 'Academic year']],
  Payments: [['student', 'Student'], ['amount', 'Amount (SSP)'], ['method', 'Method'], ['date', 'Date'], ['status', 'Status']],
  Maintenance: [['requestBy', 'Requested by'], ['issue', 'Issue'], ['location', 'Location'], ['date', 'Date'], ['status', 'Status']],
  'User management': [['name', 'Name'], ['email', 'Email'], ['role', 'Role'], ['status', 'Status']],
};
const EMPTY_FIELDS = {
  Students: { name: '', regNo: '', department: '', year: 'Year 1', phone: '' },
  Hostels: { name: '', location: '', totalRooms: 0, warden: '' },
  Rooms: { hostel: '', roomNo: '', capacity: 2, occupied: 0, status: 'Available' },
  Allocations: { student: '', room: '', hostel: '', date: new Date().toISOString().slice(0, 10), term: '2025/2026' },
  Payments: { student: '', amount: 0, method: 'Mobile Money', date: new Date().toISOString().slice(0, 10), status: 'Paid' },
  Maintenance: { requestBy: '', issue: '', location: '', date: new Date().toISOString().slice(0, 10), status: 'Pending' },
  'User management': { name: '', email: '', role: 'Hostel Officer', status: 'Active' },
};

async function request(path, options = {}) {
  let token;
  try { token = JSON.parse(localStorage.getItem('azu-session') || 'null')?.token; } catch { token = null; }
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && path !== '/auth/login' ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401 && path !== '/auth/login') {
    localStorage.removeItem('azu-session');
    window.dispatchEvent(new Event('azu-session-expired'));
  }
  if (!response.ok) throw new Error(body.error || 'The request could not be completed.');
  return body;
}

function Brand({ compact = false }) {
  return <div className={`brand ${compact ? 'brand-compact' : ''}`}>
    <img className="brand-logo" src="/azu-logo.png" alt="Africa Zeal University logo" />
    {!compact && <div><strong>Africa Zeal University</strong><small>HOSTEL MANAGEMENT</small></div>}
  </div>;
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@azu.ac.ug');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError('');
    try { const result = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); onLogin(result); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <main className="login-page">
    <div className="login-photo"><div className="login-photo-overlay"><Brand /><div className="welcome-copy">
      <span className="eyebrow">WELCOME TO YOUR HOME AWAY FROM HOME</span>
      <h1>Better living.<br />Brighter learning.</h1>
      <p>A safe, supportive place to make the most of your university journey.</p>
    </div><div className="login-foot">SAFE <i /> SMART <i /> CONNECTED</div></div></div>
    <section className="login-form-wrap"><div className="login-form">
      <Brand compact /><span className="eyebrow">AZU HOSTEL PORTAL</span><h2>Welcome back</h2>
      <p className="muted">Sign in to manage campus accommodation.</p>
      <form onSubmit={submit}>
        <label>Email address<input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
        {error && <div className="error-box">{error}</div>}
        <button className="button button-primary login-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <ChevronRight size={17} /></button>
      </form>
      <div className="login-hint"><CircleHelp size={15} /> Use the account credentials provided by your administrator.</div>
    </div><span className="login-copyright">© 2026 Africa Zeal University</span></section>
  </main>;
}

function Sidebar({ active, setActive, user, onLogout, open, onClose }) {
  return <>
    {open && <button className="mobile-backdrop" onClick={onClose} aria-label="Close navigation" />}
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="sidebar-brand"><Brand /></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav>{NAV.filter(({ label }) => label === 'Settings' || label === 'Audit Log'
        ? user?.role === 'Administrator'
        : !RESOURCE[label] || ROLE_READS[user?.role]?.includes(RESOURCE[label]))
        .map(({ label, icon: Icon }) => <button key={label} onClick={() => { setActive(label); onClose(); }} className={`nav-item ${active === label ? 'nav-active' : ''}`}><Icon size={18} /><span>{label}</span>{label === 'Maintenance' && <b className="nav-count">3</b>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="help-card"><div className="help-icon"><CircleHelp size={17} /></div><strong>Need a hand?</strong><span>Our support team is here to help.</span><button onClick={() => setActive('Help & support')}>Get support <ChevronRight size={14} /></button></div>
        <div className="profile"><div className="avatar avatar-navy">{user?.name?.split(' ').map(x => x[0]).join('').slice(0, 2) || 'AD'}</div><span className="profile-info"><strong>{user?.name || 'Admin User'}</strong><small>{user?.role || 'Administrator'}</small></span></div>
        <button className="logout-button" onClick={onLogout}><LogOut size={16} /><span>Log out</span></button>
      </div>
    </aside>
  </>;
}

function Header({ title, user, onMenu }) {
  return <header className="topbar"><button className="mobile-menu icon-button" onClick={onMenu} aria-label="Open navigation"><Menu size={21} /></button>
    <div className="breadcrumbs">AZU Portal <ChevronRight size={14} /> <strong>{title}</strong></div>
    <div className="topbar-actions"><div className="academic-year"><CalendarDays size={15} /><span>2025 / 2026</span><ChevronDown size={14} /></div>
      <button className="icon-button notification-button" aria-label="Notifications"><Bell size={19} /><i /></button>
      <div className="top-user"><div className="avatar avatar-gold">{user?.name?.split(' ').map(x => x[0]).join('').slice(0, 2) || 'AD'}</div><div><strong>{user?.name || 'Admin User'}</strong><small>{user?.role || 'Administrator'}</small></div><ChevronDown size={14} /></div>
    </div>
  </header>;
}

function PageHeading({ eyebrow = 'OVERVIEW', title, subtitle, action }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>;
}

function StatCard({ title, value, note, icon: Icon, tone, trend }) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19} /></div><span className="stat-title">{title}</span>
    <div className="stat-value">{value}</div><div className="stat-note"><span className={trend === 'down' ? 'trend-down' : 'trend-up'}>{trend === 'down' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}{note.split(' ')[0]}</span> {note.split(' ').slice(1).join(' ')}</div>
  </article>;
}

function OccupancyChart({ data }) {
  const max = Math.max(...data.map(x => x.value), 1);
  return <div className="chart-area"><div className="chart-y-labels"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div>
    <div className="chart-main"><div className="chart-grid">{[0, 1, 2, 3, 4].map(x => <i key={x} />)}</div><div className="bar-row">{data.map((item, index) => <div className="bar-column" key={item.label}><div className="bar-wrap"><div className={`bar bar-${index % 4}`} style={{ height: `${Math.max(8, item.value / max * 100)}%` }} title={`${item.value}% occupied`} /></div><span>{item.label}</span></div>)}</div></div>
  </div>;
}

function Dashboard({ data, user, onNavigate, canWrite, canRead, canViewPayments }) {
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there';
  const students = data.students || [], rooms = data.rooms || [], payments = data.payments || [], maintenance = data.maintenance || [];
  const totalCapacity = rooms.reduce((sum, room) => sum + Number(room.capacity || 0), 0);
  const occupied = rooms.reduce((sum, room) => sum + Number(room.occupied || 0), 0);
  const pct = totalCapacity ? Math.round(occupied / totalCapacity * 100) : 0;
  const paid = payments.filter(x => x.status === 'Paid').reduce((sum, x) => sum + Number(x.amount || 0), 0);
  const occupancy = useMemo(() => (data.hostels || []).map(h => {
    const hostelRooms = rooms.filter(r => r.hostel === h.name);
    const capacity = hostelRooms.reduce((s, r) => s + Number(r.capacity || 0), 0);
    const beds = hostelRooms.reduce((s, r) => s + Number(r.occupied || 0), 0);
    return { label: h.name.replace(' Hostel', ''), value: capacity ? Math.round(beds / capacity * 100) : 0 };
  }), [data.hostels, rooms]);
  return <><PageHeading eyebrow="MONDAY, 15 SEPTEMBER 2025" title={`Good morning, ${firstName}`} subtitle={`Signed in as ${user?.role || 'User'}. Here’s what’s happening across your campus accommodation today.`} action={<button className="button button-outline" onClick={() => onNavigate('Reports')}><Download size={16} /> Export overview</button>} />
    <section className={`stats-grid ${canViewPayments ? '' : 'stats-grid-three'}`}>
      <StatCard title="Registered students" value={students.length.toLocaleString()} note="+12% this semester" icon={GraduationCap} tone="blue" />
      <StatCard title="Total bed capacity" value={totalCapacity.toLocaleString()} note={`${rooms.length} rooms across campus`} icon={BedDouble} tone="violet" />
      <StatCard title="Occupancy rate" value={`${pct}%`} note={`${occupied} beds currently occupied`} icon={Building2} tone="gold" />
      {canViewPayments && <StatCard title="Payments received" value={`SSP ${(paid / 1000000).toFixed(1)}m`} note="This academic year" icon={CreditCard} tone="green" />}
    </section>
    <section className="dashboard-grid">
      <article className="panel occupancy-panel"><div className="panel-heading"><div><h2>Hostel occupancy</h2><p>Bed utilization by residence</p></div><button className="select-button" onClick={() => onNavigate('Reports')}>This semester <ChevronDown size={14} /></button></div><OccupancyChart data={occupancy} />
        <div className="chart-footer"><span><i className="legend-dot" /> Current occupancy</span><strong>{pct}% <small>average</small></strong></div></article>
      <article className="panel activity-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Latest updates from your campus</p></div>{canRead.Maintenance && <button className="text-button" onClick={() => onNavigate('Maintenance')}>View all <ChevronRight size={15} /></button>}</div>
        <div className="activity-list">{[
          { icon: UserRound, color: 'blue', title: 'New student registered', desc: students.at(-1)?.name || 'New student account created', time: 'Just now' },
          { icon: BedDouble, color: 'violet', title: 'Room allocation updated', desc: data.allocations?.at(-1)?.room ? `${data.allocations.at(-1).room} · ${data.allocations.at(-1).student}` : 'A room has been allocated', time: '24 min ago' },
          ...(canViewPayments ? [{ icon: CreditCard, color: 'green', title: 'Payment received', desc: payments.at(-1) ? `SSP ${Number(payments.at(-1).amount).toLocaleString()} · ${payments.at(-1).student}` : 'Hostel payment recorded', time: '1 hr ago' }] : []),
          { icon: Wrench, color: 'gold', title: 'Maintenance request', desc: maintenance.at(-1)?.issue || 'New maintenance request received', time: '2 hrs ago' },
        ].map((item, i) => <div className="activity-item" key={i}><div className={`activity-icon ${item.color}`}><item.icon size={16} /></div><div className="activity-copy"><strong>{item.title}</strong><span>{item.desc}</span></div><time>{item.time}</time></div>)}</div>
      </article>
    </section>
    <section className="dashboard-bottom">
      <article className="panel quick-panel"><div className="panel-heading"><div><h2>Quick actions</h2><p>Common tasks, one click away</p></div></div><div className="quick-actions">
        {[['Students', UserRound, 'Add a student'], ['Allocations', ClipboardList, 'Allocate a room'], ['Payments', CreditCard, 'Record payment'], ['Maintenance', Wrench, 'New maintenance request']].filter(([page]) => canWrite[page]).map(([page, Icon, label]) => <button key={page} className="quick-action" onClick={() => onNavigate(page)}><span><Icon size={18} /></span>{label}<ChevronRight size={15} /></button>)}
      </div></article>
      <article className="panel occupancy-summary"><div className="panel-heading"><div><h2>Room availability</h2><p>Live room status</p></div><button className="text-button" onClick={() => onNavigate('Rooms')}>All rooms <ChevronRight size={15} /></button></div>
        <div className="availability-list"><div><span><i className="status-dot available" /> Available</span><strong>{rooms.filter(r => r.status === 'Available').length}</strong></div><div><span><i className="status-dot occupied" /> Fully occupied</span><strong>{rooms.filter(r => r.status === 'Occupied').length}</strong></div><div><span><i className="status-dot progress" /> Partially occupied</span><strong>{rooms.filter(r => r.status === 'Partially occupied').length}</strong></div></div>
        <div className="availability-bar">{rooms.map(r => <i key={r.id} className={r.status === 'Available' ? 'available' : r.status === 'Occupied' ? 'occupied' : 'progress'} />)}</div>
      </article>
    </section>
  </>;
}

function Badge({ value }) {
  const key = String(value || '').toLowerCase();
  const cls = ['paid', 'active', 'available', 'resolved'].includes(key) ? 'badge-success'
    : ['pending', 'partially occupied'].includes(key) ? 'badge-warning'
      : ['overdue', 'inactive', 'occupied'].includes(key) ? 'badge-danger' : 'badge-neutral';
  return <span className={`badge ${cls}`}><i />{value || '—'}</span>;
}

function DataPage({ page, items, allData, onRefresh, notify, canWrite }) {
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const fields = COLUMNS[page] || [];
  const resource = RESOURCE[page];
  const filtered = items.filter(row => fields.some(([key]) => String(row[key] ?? '').toLowerCase().includes(search.toLowerCase())));
  const formFields = [
    ...Object.keys(EMPTY_FIELDS[page] || {}).map(name => [name, fields.find(([key]) => key === name)?.[1] || name.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())]),
    ...(page === 'User management' ? [['password', 'Password']] : []),
  ];
  const recordLabel = page === 'User management' ? 'user' : page === 'Maintenance' ? 'maintenance request' : page.slice(0, -1).toLowerCase();
  async function save(values) {
    setBusy(true);
    try {
      await request(`/${resource}${modal?.id ? `/${modal.id}` : ''}`, { method: modal?.id ? 'PUT' : 'POST', body: JSON.stringify(values) });
      setModal(null); await onRefresh(); notify(`${recordLabel} ${modal?.id ? 'updated' : 'added'} successfully.`);
    } catch (error) { notify(error.message, 'error'); }
    finally { setBusy(false); }
  }
  async function remove(row) {
    if (!window.confirm(`Delete ${row.name || row.roomNo || row.student || row.issue || 'this record'}? This cannot be undone.`)) return;
    try { await request(`/${resource}/${row.id}`, { method: 'DELETE' }); await onRefresh(); notify('Record deleted.'); }
    catch (error) { notify(error.message, 'error'); }
  }
  const titleMap = { Students: 'Student directory', Hostels: 'Hostel residences', Rooms: 'Room directory', Allocations: 'Room allocations', Payments: 'Payment records', Maintenance: 'Maintenance requests', 'User management': 'System users' };
  const subtitleMap = { Students: 'Manage student profiles, registration details and contact information.', Hostels: 'Manage university residences and their capacity.', Rooms: 'Track room availability and occupancy across all hostels.', Allocations: 'Assign students to rooms and manage their accommodation.', Payments: 'Review and record student hostel fee payments.', Maintenance: 'Track and resolve campus maintenance requests.', 'User management': 'Manage staff access to the hostel management portal.' };
  return <>
    <PageHeading eyebrow="ACCOMMODATION" title={titleMap[page] || page} subtitle={subtitleMap[page] || `Manage ${page.toLowerCase()} for Africa Zeal University.`} action={canWrite && <button className="button button-primary" onClick={() => setModal({})}><Plus size={17} /> {page === 'Maintenance' ? 'New request' : page === 'Payments' ? 'Record payment' : page === 'Allocations' ? 'New allocation' : `Add ${page === 'Students' ? 'student' : page === 'Hostels' ? 'hostel' : page === 'Rooms' ? 'room' : 'user'}`}</button>} />
    <section className="panel data-panel"><div className="data-toolbar"><div className="search-field"><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${page.toLowerCase()}…`} /></div><button className="button button-outline filter-button" onClick={() => setSearch('')}><SlidersHorizontal size={16} /> Clear filters</button><span className="record-count">{filtered.length} records</span></div>
      <div className="table-scroll"><table><thead><tr>{fields.map(([, label]) => <th key={label}>{label}</th>)}{canWrite && <th className="actions-heading">Actions</th>}</tr></thead><tbody>
        {filtered.map(row => <tr key={row.id}>{fields.map(([key]) => <td key={key}>{key === 'status' ? <Badge value={row[key]} /> : key === 'amount' ? `SSP ${Number(row[key] || 0).toLocaleString()}` : row[key] ?? '—'}</td>)}{canWrite && <td><div className="row-actions"><button title="Edit record" onClick={() => setModal(row)}><Settings size={15} /></button><button title="Delete record" className="delete-action" onClick={() => remove(row)}><X size={15} /></button></div></td>}</tr>)}
        {!filtered.length && <tr><td colSpan={fields.length + (canWrite ? 1 : 0)} className="empty-state"><div><Search size={24} /><strong>No records found</strong><span>Try a different search or add a new record.</span></div></td></tr>}
      </tbody></table></div>
      <div className="table-footer"><span>Showing <strong>{filtered.length ? 1 : 0}–{filtered.length}</strong> of <strong>{items.length}</strong> records</span><div><button className="pagination-button" disabled><ChevronLeft size={16} /></button><button className="pagination-button current-page">1</button><button className="pagination-button" disabled><ChevronRight size={16} /></button></div></div>
    </section>
    {modal && <RecordModal page={page} fields={formFields} initial={modal} allData={allData} busy={busy} onClose={() => setModal(null)} onSave={save} />}
  </>;
}

function RecordModal({ page, fields, initial, allData, busy, onClose, onSave }) {
  const [values, setValues] = useState(() => ({ ...EMPTY_FIELDS[page], ...initial }));
  const selectOptions = {
    year: ['Year 1', 'Year 2', 'Year 3', 'Year 4'], hostel: (allData.hostels || []).map(x => x.name),
    student: (allData.students || []).map(x => x.name), room: (allData.rooms || []).map(x => x.roomNo),
    method: ['Bank', 'Mobile Money', 'Cash'], status: page === 'Payments' ? ['Paid', 'Pending', 'Overdue'] : page === 'Maintenance' ? ['Pending', 'In Progress', 'Resolved'] : page === 'User management' ? ['Active', 'Inactive'] : ['Available', 'Partially occupied', 'Occupied'],
    role: ['Administrator', 'Hostel Officer', 'Finance Officer', 'Warden'],
  };
  function submit(e) {
    e.preventDefault();
    const record = { ...values };
    if (page === 'User management' && initial.id && !record.password) delete record.password;
    onSave(record);
  }
  return <div className="modal-backdrop" onClick={onClose}><section className="record-modal" onClick={e => e.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow">{initial.id ? 'UPDATE RECORD' : 'NEW RECORD'}</span><h2>{initial.id ? 'Edit' : 'Add'} {page === 'Students' ? 'student' : page === 'Hostels' ? 'hostel' : page === 'Rooms' ? 'room' : page === 'Allocations' ? 'allocation' : page === 'Payments' ? 'payment' : page === 'Maintenance' ? 'maintenance request' : 'user'}</h2></div><button className="icon-button" onClick={onClose}><X size={19} /></button></div>
    <form onSubmit={submit}><div className="modal-fields">{fields.map(([key, label]) => <label key={key}>{key === 'password' && initial.id ? 'New password (optional)' : label}{selectOptions[key] ? <select required value={values[key] ?? ''} onChange={e => setValues({ ...values, [key]: e.target.value })}><option value="">Select {label.toLowerCase()}</option>{selectOptions[key].map(option => <option key={option} value={option}>{option}</option>)}</select> : <input required={key === 'password' ? !initial.id : key !== 'phone'} type={key === 'password' ? 'password' : ['date'].includes(key) ? 'date' : ['amount', 'capacity', 'occupied', 'totalRooms'].includes(key) ? 'number' : key === 'email' ? 'email' : 'text'} autoComplete={key === 'password' ? 'new-password' : undefined} minLength={key === 'password' ? 8 : undefined} placeholder={key === 'password' && initial.id ? 'Leave blank to keep current password' : undefined} min={['amount', 'capacity', 'occupied', 'totalRooms'].includes(key) ? 0 : undefined} value={values[key] ?? ''} onChange={e => setValues({ ...values, [key]: ['amount', 'capacity', 'occupied', 'totalRooms'].includes(key) ? Number(e.target.value) : e.target.value })} />}</label>)}</div>
      <div className="modal-actions"><button type="button" className="button button-outline" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : <><Check size={16} /> {initial.id ? 'Save changes' : 'Create record'}</>}</button></div></form></section></div>;
}

function Reports({ data, canViewPayments }) {
  const students = data.students || [], hostels = data.hostels || [], rooms = data.rooms || [], payments = data.payments || [];
  const totalCapacity = rooms.reduce((sum, r) => sum + Number(r.capacity || 0), 0);
  const occupied = rooms.reduce((sum, r) => sum + Number(r.occupied || 0), 0);
  return <><PageHeading eyebrow="INSIGHTS & ANALYTICS" title="Reports" subtitle="A clear picture of hostel operations across the university." action={<button className="button button-outline" onClick={() => window.print()}><Download size={16} /> Print report</button>} />
    <div className="report-stats"><StatCard title="Total students" value={students.length} note="Across all programmes" icon={GraduationCap} tone="blue" /><StatCard title="Overall occupancy" value={`${totalCapacity ? Math.round(occupied / totalCapacity * 100) : 0}%`} note={`${occupied} of ${totalCapacity} beds`} icon={Building2} tone="gold" /><StatCard title="Total collected" value={`SSP ${(payments.filter(p => p.status === 'Paid').reduce((s, p) => s + Number(p.amount), 0) / 1000000).toFixed(1)}m`} note="Confirmed payments" icon={CreditCard} tone="green" /></div>
    <div className="report-grid"><article className="panel report-panel"><div className="panel-heading"><div><h2>Occupancy by hostel</h2><p>Current utilization against available bed capacity</p></div></div><div className="report-bars">{hostels.map((h, i) => { const hostelRooms = rooms.filter(r => r.hostel === h.name); const capacity = hostelRooms.reduce((s, r) => s + Number(r.capacity), 0); const beds = hostelRooms.reduce((s, r) => s + Number(r.occupied), 0); const value = capacity ? Math.round(beds / capacity * 100) : 0; return <div className="report-bar-item" key={h.id}><div><strong>{h.name}</strong><span>{value}%</span></div><div className="report-track"><i className={`report-fill bar-${i % 4}`} style={{ width: `${value}%` }} /></div><small>{beds} of {capacity} beds occupied</small></div>; })}</div></article>
      {canViewPayments && <article className="panel report-panel"><div className="panel-heading"><div><h2>Payment summary</h2><p>Payment status breakdown</p></div></div><div className="payment-summary">{['Paid', 'Pending', 'Overdue'].map(status => { const count = payments.filter(x => x.status === status).length; const amount = payments.filter(x => x.status === status).reduce((s, x) => s + Number(x.amount), 0); return <div key={status}><Badge value={status} /><span>{count} payments</span><strong>SSP {amount.toLocaleString()}</strong></div>; })}</div></article>}</div>
  </>;
}

function AuditLog() {
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [resource, setResource] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ limit: '500' });
      if (search.trim()) params.set('search', search.trim());
      if (action) params.set('action', action);
      if (resource) params.set('resource', resource);
      try {
        const result = await request(`/audit-logs?${params}`);
        if (!cancelled) setEntries(result);
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, action, resource, reload]);

  const actionLabels = {
    login_success: 'Signed in',
    login_failed: 'Failed sign-in',
    logout: 'Signed out',
    create: 'Created',
    update: 'Updated',
    delete: 'Deleted',
  };
  const resourceLabels = {
    authentication: 'Authentication',
    settings: 'System settings',
    students: 'Students',
    hostels: 'Hostels',
    rooms: 'Rooms',
    allocations: 'Allocations',
    payments: 'Payments',
    maintenance: 'Maintenance',
    users: 'User management',
  };
  function formatDate(value) {
    const date = new Date(`${String(value).replace(' ', 'T')}Z`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  return <>
    <PageHeading eyebrow="ADMINISTRATION" title="Audit Log" subtitle="Review sign-ins and changes made by staff across the system." action={<button className="button button-outline" onClick={() => setReload(value => value + 1)}><History size={16} /> Refresh</button>} />
    <section className="panel data-panel audit-panel">
      <div className="data-toolbar audit-toolbar">
        <div className="search-field"><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search users, records or activity" /></div>
        <select aria-label="Filter by action" value={action} onChange={event => setAction(event.target.value)}>
          <option value="">All actions</option><option value="login_success">Signed in</option><option value="login_failed">Failed sign-in</option><option value="logout">Signed out</option><option value="create">Created</option><option value="update">Updated</option><option value="delete">Deleted</option>
        </select>
        <select aria-label="Filter by module" value={resource} onChange={event => setResource(event.target.value)}>
          <option value="">All modules</option>{Object.entries(resourceLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <span className="record-count">{entries.length} events</span>
      </div>
      {error ? <div className="audit-error"><p>{error}</p><button className="button button-outline" onClick={() => setReload(value => value + 1)}>Try again</button></div> :
        <div className="table-scroll"><table className="audit-table"><thead><tr><th>Date & time</th><th>User</th><th>Action</th><th>Module</th><th>Record / changed fields</th></tr></thead><tbody>
          {loading ? <tr><td colSpan="5" className="empty-state">Loading audit activity…</td></tr> :
            entries.map(entry => <tr key={entry.id}>
              <td>{formatDate(entry.createdAt)}</td>
              <td><strong>{entry.actorName || 'Unknown user'}</strong><small>{entry.actorEmail || 'Unrecognized account'}{entry.actorRole ? ` · ${entry.actorRole}` : ''}</small></td>
              <td><span className={`audit-action audit-${entry.action}`}>{actionLabels[entry.action] || entry.action}</span><small>{entry.summary}</small></td>
              <td>{resourceLabels[entry.resource] || entry.resource || '—'}</td>
              <td>{entry.recordId || '—'}{entry.changedFields?.length > 0 && <small>Fields: {entry.changedFields.join(', ')}</small>}</td>
            </tr>)}
          {!loading && !entries.length && <tr><td colSpan="5" className="empty-state"><div><History size={24} /><strong>No activity found</strong><span>Try changing the search or filters.</span></div></td></tr>}
        </tbody></table></div>}
      {!error && <div className="table-footer"><span>Showing <strong>{entries.length}</strong> most recent events (up to 500)</span></div>}
    </section>
  </>;
}

function SettingsPage({ initial, onSave, notify }) {
  const [settings, setSettings] = useState(initial || {});
  useEffect(() => setSettings(initial || {}), [initial]);
  async function submit(e) { e.preventDefault(); try { await onSave(settings); notify('Settings saved successfully.'); } catch (error) { notify(error.message, 'error'); } }
  return <><PageHeading eyebrow="PREFERENCES" title="System settings" subtitle="Configure the university details and academic year." />
    <section className="panel settings-panel"><div className="settings-title"><div className="settings-icon"><Settings size={20} /></div><div><h2>General settings</h2><p>These details are used across your hostel portal.</p></div></div><form onSubmit={submit} className="settings-form">
      <label>University name<input required value={settings.universityName || ''} onChange={e => setSettings({ ...settings, universityName: e.target.value })} /></label>
      <label>Academic year<input required value={settings.academicYear || ''} onChange={e => setSettings({ ...settings, academicYear: e.target.value })} /></label>
      <label>Default hostel<select value={settings.defaultHostel || ''} onChange={e => setSettings({ ...settings, defaultHostel: e.target.value })}>{(settings.hostelOptions || []).map(option => <option key={option}>{option}</option>)}</select></label>
      <label>Contact email<input type="email" value={settings.contactEmail || ''} onChange={e => setSettings({ ...settings, contactEmail: e.target.value })} /></label>
      <div className="settings-submit"><button className="button button-primary"><Check size={16} /> Save changes</button></div>
    </form></section></>;
}

function Toast({ toast, onClose }) {
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(onClose, 3400); return () => clearTimeout(timer); }, [toast, onClose]);
  if (!toast) return null;
  return <div className={`toast ${toast.type === 'error' ? 'toast-error' : ''}`}><span>{toast.type === 'error' ? <X size={16} /> : <Check size={16} />}</span>{toast.message}<button onClick={onClose}><X size={16} /></button></div>;
}

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('azu-session') || 'null');
      if (saved?.token && saved?.user) return saved;
    } catch { /* Invalid saved session is cleared below. */ }
    localStorage.removeItem('azu-session');
    localStorage.removeItem('azu-user');
    return null;
  });
  const user = session?.user || null;
  const [active, setActive] = useState('Dashboard');
  const [data, setData] = useState({});
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const notify = useCallback((message, type = 'success') => setToast({ message, type }), []);
  const clearSession = useCallback(() => {
    setSession(null);
    localStorage.removeItem('azu-session');
    localStorage.removeItem('azu-user');
    setActive('Dashboard');
  }, []);
  const logout = useCallback(async () => {
    try { await request('/auth/logout', { method: 'POST' }); }
    catch (error) { console.error('Unable to record the sign-out event.', error); }
    finally { clearSession(); }
  }, [clearSession]);
  const refresh = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const [nextData, nextSettings] = await Promise.all([
        Promise.all((ROLE_READS[user?.role] || [])
          .map(async resource => [resource, await request(`/${resource}`)])),
        request('/settings'),
      ]);
      setData({ users: [], ...Object.fromEntries(nextData) }); setSettings(nextSettings);
    } catch (error) { setLoadError(error.message); }
    finally { setLoading(false); }
  }, [user?.role]);
  useEffect(() => { if (user) refresh(); }, [user, refresh]);
  useEffect(() => {
    window.addEventListener('azu-session-expired', clearSession);
    return () => window.removeEventListener('azu-session-expired', clearSession);
  }, [clearSession]);
  function handleLogin(result) {
    const nextSession = { user: result.user, token: result.token };
    setSession(nextSession);
    localStorage.setItem('azu-session', JSON.stringify(nextSession));
  }
  async function saveSettings(next) { const result = await request('/settings', { method: 'PUT', body: JSON.stringify(next) }); setSettings(result); }
  if (!user) return <Login onLogin={handleLogin} />;
  const isAdministrator = user.role === 'Administrator';
  const currentPage = active in RESOURCE && !ROLE_READS[user.role]?.includes(RESOURCE[active]) ||
    ((active === 'Settings' || active === 'Audit Log') && !isAdministrator) ? 'Dashboard' : active;
  const canWrite = Object.fromEntries(Object.entries(RESOURCE).map(([page, resource]) => [page, ROLE_WRITES[user.role]?.includes(resource) || false]));
  const canRead = Object.fromEntries(Object.entries(RESOURCE).map(([page, resource]) => [page, ROLE_READS[user.role]?.includes(resource) || false]));
  const canViewPayments = ROLE_READS[user.role]?.includes('payments') || false;
  return <div className="app-shell"><Sidebar active={currentPage} setActive={setActive} user={user} onLogout={logout} open={mobileOpen} onClose={() => setMobileOpen(false)} />
    <main className="main-area"><Header title={currentPage} user={user} onMenu={() => setMobileOpen(true)} /><div className="page-content">
      {loading ? <div className="loading-state"><div className="spinner" /><span>Loading your campus overview…</span></div> : loadError ? <div className="error-state"><div className="error-icon"><Activity size={21} /></div><h2>Couldn’t load your campus data</h2><p>{loadError}. Make sure the backend server is running.</p><button className="button button-primary" onClick={refresh}>Try again</button></div> :
        currentPage === 'Dashboard' ? <Dashboard data={data} user={user} onNavigate={setActive} canWrite={canWrite} canRead={canRead} canViewPayments={canViewPayments} /> :
          currentPage === 'Reports' ? <Reports data={data} canViewPayments={canViewPayments} /> :
            currentPage === 'Audit Log' ? <AuditLog /> :
            currentPage === 'Settings' ? <SettingsPage initial={settings} onSave={saveSettings} notify={notify} /> :
              currentPage === 'Help & support' ? <><PageHeading eyebrow="SUPPORT" title="Help & support" subtitle="Get assistance with your Africa Zeal University hostel portal." /><div className="panel help-page"><div className="help-icon"><CircleHelp size={20} /></div><h2>We’re here to help.</h2><p>Contact the university accommodation office for assistance with the hostel management portal.</p><a href="mailto:hostels@azu.ac.ug">hostels@azu.ac.ug</a></div></> :
                <DataPage key={currentPage} page={currentPage} items={data[RESOURCE[currentPage]] || []} allData={data} onRefresh={refresh} notify={notify} canWrite={canWrite[currentPage]} />}
      <footer className="app-footer"><span>© 2026 Africa Zeal University</span><span>Hostel Management System <i /> Safe · Smart · Connected</span></footer>
    </div></main><Toast toast={toast} onClose={() => setToast(null)} /></div>;
}
