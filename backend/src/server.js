const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const store = require('./store');

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-development-secret-change-before-deployment');
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const resources = new Set(['students', 'hostels', 'rooms', 'allocations', 'payments', 'maintenance', 'users']);
const RESOURCE_ROLES = {
  students: { read: ['Administrator', 'Hostel Officer', 'Finance Officer', 'Warden'], write: ['Administrator', 'Hostel Officer'] },
  hostels: { read: ['Administrator', 'Hostel Officer', 'Finance Officer', 'Warden'], write: ['Administrator', 'Hostel Officer'] },
  rooms: { read: ['Administrator', 'Hostel Officer', 'Finance Officer', 'Warden'], write: ['Administrator', 'Hostel Officer'] },
  allocations: { read: ['Administrator', 'Hostel Officer', 'Finance Officer', 'Warden'], write: ['Administrator', 'Hostel Officer'] },
  payments: { read: ['Administrator', 'Finance Officer'], write: ['Administrator', 'Finance Officer'] },
  maintenance: { read: ['Administrator', 'Hostel Officer', 'Warden'], write: ['Administrator', 'Hostel Officer', 'Warden'] },
  users: { read: ['Administrator'], write: ['Administrator'] },
};
const asyncHandler = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

if (JWT_SECRET.length < 32) {
  throw new Error('Set JWT_SECRET to a secret of at least 32 characters before starting the server.');
}

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'azu-hostel-api' }));

app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    await store.logAuthentication({
      email: typeof email === 'string' ? email.slice(0, 190) : null,
      success: false,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  const user = await store.authenticate(email, password);
  if (!user) {
    await store.logAuthentication({
      email: email.slice(0, 190),
      success: false,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  await store.logAuthentication({
    user,
    success: true,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  const token = jwt.sign({ role: user.role }, JWT_SECRET, { subject: user.id, expiresIn: '8h' });
  return res.json({ user, token });
}));

app.use('/api', asyncHandler(async (req, res, next) => {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: 'Sign in to access this resource.' });

  let claims;
  try {
    claims = jwt.verify(match[1], JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
  if (typeof claims === 'string' || typeof claims.sub !== 'string') {
    return res.status(401).json({ error: 'Your session is invalid. Please sign in again.' });
  }

  const user = await store.getActiveUser(claims.sub);
  if (!user) return res.status(401).json({ error: 'Your account is no longer active. Please contact an administrator.' });
  req.user = user;
  return next();
}));

app.post('/api/auth/logout', asyncHandler(async (req, res) => {
  await store.logAuthentication({
    user: req.user,
    success: true,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    action: 'logout',
  });
  return res.status(204).end();
}));

app.get('/api/audit-logs', asyncHandler(async (req, res) => {
  if (req.user.role !== 'Administrator') {
    return res.status(403).json({ error: 'Only administrators can view the audit log.' });
  }
  const { search = '', action = '', resource = '', limit = '250' } = req.query;
  const validActions = new Set(['login_success', 'login_failed', 'logout', 'create', 'update', 'delete']);
  const validResources = new Set([...resources, 'settings', 'authentication']);
  if (
    typeof search !== 'string' || search.length > 100 ||
    (action && (typeof action !== 'string' || !validActions.has(action))) ||
    (resource && (typeof resource !== 'string' || !validResources.has(resource))) ||
    !/^\d+$/.test(String(limit))
  ) {
    return res.status(400).json({ error: 'Invalid audit log filters.' });
  }
  return res.json(await store.listAuditLogs({ search: search.trim(), action, resource, limit: Number(limit) }));
}));

app.get('/api/settings', asyncHandler(async (_req, res) => res.json(await store.getSettings())));
app.put('/api/settings', asyncHandler(async (req, res) => {
  if (req.user.role !== 'Administrator') {
    return res.status(403).json({ error: 'Only administrators can change system settings.' });
  }
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Settings must be a JSON object.' });
  }
  return res.json(await store.updateSettings(req.body, req.user, {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  }));
}));

app.get('/api/:resource', asyncHandler(async (req, res, next) => {
  if (!resources.has(req.params.resource)) return next();
  if (!RESOURCE_ROLES[req.params.resource].read.includes(req.user.role)) {
    return res.status(403).json({ error: 'Your account does not have permission to view this resource.' });
  }
  return res.json(await store.list(req.params.resource));
}));

app.post('/api/:resource', asyncHandler(async (req, res, next) => {
  if (!resources.has(req.params.resource)) return next();
  if (!RESOURCE_ROLES[req.params.resource].write.includes(req.user.role)) {
    return res.status(403).json({ error: 'Your account does not have permission to create this record.' });
  }
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Record must be a JSON object.' });
  }
  return res.status(201).json(await store.create(req.params.resource, req.body, req.user, {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  }));
}));

app.put('/api/:resource/:id', asyncHandler(async (req, res, next) => {
  if (!resources.has(req.params.resource)) return next();
  if (!RESOURCE_ROLES[req.params.resource].write.includes(req.user.role)) {
    return res.status(403).json({ error: 'Your account does not have permission to update this record.' });
  }
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Record must be a JSON object.' });
  }
  const record = await store.update(req.params.resource, req.params.id, req.body, req.user, {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  return record ? res.json(record) : res.status(404).json({ error: 'Record not found.' });
}));

app.delete('/api/:resource/:id', asyncHandler(async (req, res, next) => {
  if (!resources.has(req.params.resource)) return next();
  if (!RESOURCE_ROLES[req.params.resource].write.includes(req.user.role)) {
    return res.status(403).json({ error: 'Your account does not have permission to delete this record.' });
  }
  return (await store.remove(req.params.resource, req.params.id, req.user, {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  }))
      ? res.status(204).end()
      : res.status(404).json({ error: 'Record not found.' });
}));

app.use((_req, res) => res.status(404).json({ error: 'API route not found.' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'Request body contains invalid JSON.' });
  }
  return res.status(error.statusCode || 500).json({
    error: error.statusCode ? error.message : 'An unexpected server error occurred.',
  });
});

store.initialize()
  .then(() => app.listen(PORT, () => console.log(`AZU Hostel API listening on http://localhost:${PORT}`)))
  .catch(error => {
    console.error('Unable to initialize the MySQL database.', error);
    process.exitCode = 1;
  });
