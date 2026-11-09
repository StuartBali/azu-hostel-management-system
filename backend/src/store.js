const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');

const DATA_FILE = path.join(__dirname, '..', 'data', 'store.json');
const seed = require('./seed');
const database = process.env.DB_NAME || 'azu_hostel_management';
const connectionOptions = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  ...(process.env.DB_SSL === 'true' ? { ssl: {} } : {}),
};
const importJsonData = process.env.IMPORT_JSON_DATA !== 'false';
const RESOURCES = {
  students: {
    columns: { name: 'name', regNo: 'reg_no', department: 'department', year: 'study_year', phone: 'phone' },
    schema: '`name` VARCHAR(160) NOT NULL, `reg_no` VARCHAR(80) NOT NULL, `department` VARCHAR(160) NOT NULL, `study_year` VARCHAR(40) NOT NULL, `phone` VARCHAR(50) NOT NULL DEFAULT \'\'',
  },
  hostels: {
    columns: { name: 'name', location: 'location', totalRooms: 'total_rooms', warden: 'warden' },
    schema: '`name` VARCHAR(160) NOT NULL, `location` VARCHAR(160) NOT NULL, `total_rooms` INT NOT NULL DEFAULT 0, `warden` VARCHAR(160) NOT NULL',
  },
  rooms: {
    columns: { hostel: 'hostel', roomNo: 'room_no', capacity: 'capacity', occupied: 'occupied', status: 'status' },
    schema: '`hostel` VARCHAR(160) NOT NULL, `room_no` VARCHAR(80) NOT NULL, `capacity` INT NOT NULL DEFAULT 0, `occupied` INT NOT NULL DEFAULT 0, `status` VARCHAR(40) NOT NULL',
  },
  allocations: {
    columns: { student: 'student', room: 'room', hostel: 'hostel', date: 'allocation_date', term: 'term' },
    schema: '`student` VARCHAR(160) NOT NULL, `room` VARCHAR(80) NOT NULL, `hostel` VARCHAR(160) NOT NULL, `allocation_date` DATE NULL, `term` VARCHAR(40) NOT NULL',
  },
  payments: {
    columns: { student: 'student', amount: 'amount', method: 'method', date: 'payment_date', status: 'status' },
    schema: '`student` VARCHAR(160) NOT NULL, `amount` BIGINT NOT NULL DEFAULT 0, `method` VARCHAR(80) NOT NULL, `payment_date` DATE NULL, `status` VARCHAR(40) NOT NULL',
  },
  maintenance: {
    columns: { requestBy: 'request_by', issue: 'issue', location: 'location', date: 'request_date', status: 'status' },
    schema: '`request_by` VARCHAR(160) NOT NULL, `issue` VARCHAR(500) NOT NULL, `location` VARCHAR(200) NOT NULL, `request_date` DATE NULL, `status` VARCHAR(40) NOT NULL',
  },
  users: {
    columns: { name: 'name', email: 'email', role: 'role', status: 'status' },
    schema: '`name` VARCHAR(160) NOT NULL, `email` VARCHAR(190) NOT NULL UNIQUE, `role` VARCHAR(80) NOT NULL, `status` VARCHAR(40) NOT NULL, `password_hash` VARCHAR(255) NULL',
  },
};

if (!/^[a-zA-Z0-9_]+$/.test(database)) {
  throw new Error('DB_NAME may contain only letters, numbers, and underscores.');
}

let pool;

function quoteIdentifier(identifier) {
  return `\`${identifier.replace(/`/g, '``')}\``;
}

function toDatabaseRecord(resource, record) {
  const result = {};
  for (const [field, column] of Object.entries(RESOURCES[resource].columns)) {
    if (Object.hasOwn(record, field)) result[column] = record[field] ?? null;
  }
  return result;
}

function fromDatabaseRecord(resource, record) {
  const result = { id: record.id };
  for (const [field, column] of Object.entries(RESOURCES[resource].columns)) {
    result[field] = record[column];
  }
  return result;
}

async function insertRecord(connection, resource, record) {
  const values = toDatabaseRecord(resource, record);
  const entries = Object.entries(values);
  const columns = ['id', ...entries.map(([column]) => quoteIdentifier(column))];
  const placeholders = columns.map(() => '?').join(', ');
  const parameters = [record.id, ...entries.map(([, value]) => value)];
  await connection.execute(
    `INSERT INTO ${quoteIdentifier(resource)} (${columns.join(', ')}) VALUES (${placeholders})`,
    parameters,
  );
}

async function insertAuditLog(connection, event) {
  const actor = event.actor || {};
  await connection.execute(
    `INSERT INTO audit_logs
      (actor_id, actor_name, actor_email, actor_role, action, resource, record_id, summary, changed_fields, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      actor.id || null,
      actor.name || null,
      event.actorEmail || actor.email || null,
      actor.role || null,
      event.action,
      event.resource || null,
      event.recordId || null,
      event.summary,
      JSON.stringify(event.changedFields || []),
      event.ipAddress || null,
      event.userAgent ? event.userAgent.slice(0, 255) : null,
    ],
  );
}

function roomStatus(occupied, capacity) {
  if (occupied === 0) return 'Available';
  return occupied >= capacity ? 'Occupied' : 'Partially occupied';
}

async function getRoom(connection, roomNo, lock = false) {
  const [rooms] = await connection.execute(
    `SELECT id, hostel, room_no, capacity, occupied FROM rooms WHERE room_no = ?${lock ? ' FOR UPDATE' : ''}`,
    [roomNo],
  );
  return rooms[0] || null;
}

async function validateAllocation(connection, roomNo, currentRoomNo) {
  const room = await getRoom(connection, roomNo, true);
  if (!room) {
    const error = new Error('The selected room does not exist.');
    error.statusCode = 400;
    throw error;
  }
  if (currentRoomNo !== roomNo && Number(room.occupied) >= Number(room.capacity)) {
    const error = new Error('The selected room has no available beds.');
    error.statusCode = 400;
    throw error;
  }
  return room;
}

async function changeRoomOccupancy(connection, room, change) {
  const occupied = Math.max(0, Number(room.occupied) + change);
  await connection.execute(
    'UPDATE rooms SET occupied = ?, status = ? WHERE id = ?',
    [occupied, roomStatus(occupied, Number(room.capacity)), room.id],
  );
}

async function initialize() {
  let connection;
  if (process.env.DB_CREATE_DATABASE !== 'false') {
    try {
      connection = await mysql.createConnection(connectionOptions);
      await connection.query(
        `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
    } finally {
      if (connection) await connection.end();
    }
  }

  pool = mysql.createPool({
    ...connectionOptions,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,
    charset: 'utf8mb4',
  });

  try {
    for (const [resource, definition] of Object.entries(RESOURCES)) {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS ${quoteIdentifier(resource)} (
          id VARCHAR(100) NOT NULL PRIMARY KEY,
          ${definition.schema},
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_${resource}_name (${quoteIdentifier(Object.values(definition.columns)[0])})
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );
    }
    const [passwordColumns] = await pool.execute(
      `SELECT COUNT(*) AS count FROM information_schema.columns
       WHERE table_schema = ? AND table_name = 'users' AND column_name = 'password_hash'`,
      [database],
    );
    if (Number(passwordColumns[0].count) === 0) {
      await pool.query('ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL');
    }
    const [emailIndexes] = await pool.execute(
      `SELECT COUNT(*) AS count FROM information_schema.statistics
       WHERE table_schema = ? AND table_name = 'users' AND column_name = 'email' AND non_unique = 0`,
      [database],
    );
    if (Number(emailIndexes[0].count) === 0) {
      await pool.query('ALTER TABLE users ADD UNIQUE INDEX uq_users_email (email)');
    }
    await pool.query(`CREATE TABLE IF NOT EXISTS settings (
      id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
      university_name VARCHAR(190) NOT NULL,
      academic_year VARCHAR(40) NOT NULL,
      default_hostel VARCHAR(160) NOT NULL,
      contact_email VARCHAR(190) NOT NULL,
      hostel_options JSON NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(100) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await pool.query(`CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      actor_id VARCHAR(100) NULL,
      actor_name VARCHAR(160) NULL,
      actor_email VARCHAR(190) NULL,
      actor_role VARCHAR(80) NULL,
      action VARCHAR(40) NOT NULL,
      resource VARCHAR(80) NULL,
      record_id VARCHAR(100) NULL,
      summary VARCHAR(255) NOT NULL,
      changed_fields JSON NOT NULL,
      ip_address VARCHAR(45) NULL,
      user_agent VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_audit_created_at (created_at),
      INDEX idx_audit_actor_email (actor_email),
      INDEX idx_audit_action_resource (action, resource)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await migrateJsonData();
    await bootstrapAdministrator();
  } catch (error) {
    await pool.end();
    pool = undefined;
    throw error;
  }
}

async function migrateJsonData() {
  const migration = 'import-json-store-v1';
  const [migrations] = await pool.execute(
    'SELECT version FROM schema_migrations WHERE version = ?',
    [migration],
  );
  if (migrations.length) return;

  let existingData = seed;
  if (importJsonData && fs.existsSync(DATA_FILE)) {
    try {
      existingData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (error) {
      throw new Error(`Unable to read existing JSON data at ${DATA_FILE}: ${error.message}`);
    }
  }

  const counts = await Promise.all(
    [...Object.keys(RESOURCES).map(resource => pool.query(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(resource)}`)),
      pool.query('SELECT COUNT(*) AS count FROM settings')],
  );
  const isEmpty = counts.every(([rows]) => Number(rows[0].count) === 0);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    if (isEmpty && importJsonData) {
      for (const resource of Object.keys(RESOURCES)) {
        for (const record of existingData[resource] || []) {
          await insertRecord(connection, resource, record);
        }
      }
      const settings = { ...seed.settings, ...(existingData.settings || {}) };
      await connection.execute(
        `INSERT INTO settings (id, university_name, academic_year, default_hostel, contact_email, hostel_options)
         VALUES (1, ?, ?, ?, ?, ?)`,
        [
          settings.universityName,
          settings.academicYear,
          settings.defaultHostel,
          settings.contactEmail,
          JSON.stringify(settings.hostelOptions || []),
        ],
      );
      console.log('Imported existing JSON data into MySQL.');
    } else if (!isEmpty) {
      console.log('MySQL already contains data; skipped the one-time JSON import.');
    }
    await connection.execute('INSERT INTO schema_migrations (version) VALUES (?)', [migration]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function bootstrapAdministrator() {
  const email = process.env.ADMIN_EMAIL || 'admin@azu.ac.ug';
  const password = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'Admin123!');
  const minimumPasswordLength = process.env.NODE_ENV === 'production' ? 12 : 8;
  if (password.length < minimumPasswordLength) {
    throw new Error(`Set ADMIN_PASSWORD to a password of at least ${minimumPasswordLength} characters before starting the server.`);
  }
  const [accounts] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (accounts.length) {
    const [withoutPassword] = await pool.execute(
      'SELECT id FROM users WHERE email = ? AND (password_hash IS NULL OR password_hash = \'\') LIMIT 1',
      [email],
    );
    if (withoutPassword.length) {
      const passwordHash = await bcrypt.hash(password, 12);
      await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, withoutPassword[0].id]);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await pool.execute(
    `INSERT INTO users (id, name, email, role, status, password_hash)
     VALUES (?, ?, ?, 'Administrator', 'Active', ?)`,
    [crypto.randomUUID(), process.env.ADMIN_NAME || 'Admin User', email, passwordHash],
  );
  console.log(`Created initial administrator account for ${email}.`);
}

async function list(resource) {
  const [records] = await pool.query(`SELECT * FROM ${quoteIdentifier(resource)} ORDER BY created_at, id`);
  return records.map(record => fromDatabaseRecord(resource, record));
}

async function authenticate(email, password) {
  const [rows] = await pool.execute(
    `SELECT id, name, email, role, status, password_hash FROM users WHERE email = ? LIMIT 1`,
    [email],
  );
  const user = rows[0];
  if (!user || user.status !== 'Active' || !user.password_hash) return null;
  if (!(await bcrypt.compare(password, user.password_hash))) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

async function logAuthentication({ user, email, success, action, ipAddress, userAgent }) {
  await insertAuditLog(pool, {
    actor: user,
    actorEmail: user?.email || email,
    action: action || (success ? 'login_success' : 'login_failed'),
    resource: 'authentication',
    recordId: user?.id,
    summary: action === 'logout'
      ? 'User signed out.'
      : success ? 'User signed in successfully.' : 'A sign-in attempt failed.',
    ipAddress,
    userAgent,
  });
}

async function listAuditLogs({ search, action, resource, limit = 250 } = {}) {
  const conditions = [];
  const parameters = [];
  if (search) {
    conditions.push('(actor_name LIKE ? OR actor_email LIKE ? OR summary LIKE ? OR record_id LIKE ?)');
    const term = `%${search}%`;
    parameters.push(term, term, term, term);
  }
  if (action) {
    conditions.push('action = ?');
    parameters.push(action);
  }
  if (resource) {
    conditions.push('resource = ?');
    parameters.push(resource);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const safeLimit = Math.min(Math.max(Number(limit) || 250, 1), 500);
  const [rows] = await pool.execute(
    `SELECT id, actor_id, actor_name, actor_email, actor_role, action, resource,
      record_id, summary, changed_fields, ip_address, user_agent, created_at
     FROM audit_logs ${where} ORDER BY id DESC LIMIT ${safeLimit}`,
    parameters,
  );
  return rows.map(row => ({
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorEmail: row.actor_email,
    actorRole: row.actor_role,
    action: row.action,
    resource: row.resource,
    recordId: row.record_id,
    summary: row.summary,
    changedFields: typeof row.changed_fields === 'string' ? JSON.parse(row.changed_fields) : row.changed_fields,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  }));
}

async function getActiveUser(id) {
  const [rows] = await pool.execute(
    'SELECT id, name, email, role FROM users WHERE id = ? AND status = ? LIMIT 1',
    [id, 'Active'],
  );
  return rows[0] || null;
}

async function getSettings() {
  const [rows] = await pool.query('SELECT * FROM settings WHERE id = 1');
  if (!rows.length) return seed.settings;
  const row = rows[0];
  return {
    universityName: row.university_name,
    academicYear: row.academic_year,
    defaultHostel: row.default_hostel,
    contactEmail: row.contact_email,
    hostelOptions: typeof row.hostel_options === 'string' ? JSON.parse(row.hostel_options) : row.hostel_options,
  };
}

async function updateSettings(settings, actor, context = {}) {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO settings (id, university_name, academic_year, default_hostel, contact_email, hostel_options)
       VALUES (1, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE university_name = VALUES(university_name), academic_year = VALUES(academic_year),
         default_hostel = VALUES(default_hostel), contact_email = VALUES(contact_email), hostel_options = VALUES(hostel_options)`,
      [
        updated.universityName,
        updated.academicYear,
        updated.defaultHostel,
        updated.contactEmail,
        JSON.stringify(updated.hostelOptions || []),
      ],
    );
    await insertAuditLog(connection, {
      actor,
      action: 'update',
      resource: 'settings',
      recordId: 'system',
      summary: 'Updated system settings.',
      changedFields: Object.keys(settings),
      ...context,
    });
    await connection.commit();
    return updated;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function create(resource, record, actor, context = {}) {
  const id = `${resource.slice(0, 1)}-${crypto.randomUUID()}`;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { password, ...safeRecord } = record;
    let values = { ...safeRecord, id };
    let passwordHash;
    if (resource === 'users') {
      if (typeof password !== 'string' || password.length < 8) {
        const error = new Error('User passwords must be at least 8 characters long.');
        error.statusCode = 400;
        throw error;
      }
      const [existingUsers] = await connection.execute('SELECT id FROM users WHERE email = ?', [record.email]);
      if (existingUsers.length) {
        const error = new Error('A user with this email already exists.');
        error.statusCode = 409;
        throw error;
      }
      passwordHash = await bcrypt.hash(password, 12);
    }
    if (resource === 'allocations') {
      const room = await validateAllocation(connection, record.room);
      await changeRoomOccupancy(connection, room, 1);
      values.hostel = room.hostel;
    }
    await insertRecord(connection, resource, values);
    if (resource === 'users') {
      await connection.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
    }
    await insertAuditLog(connection, {
      actor,
      action: 'create',
      resource,
      recordId: id,
      summary: `Created a ${resource} record.`,
      changedFields: Object.keys(safeRecord),
      ...context,
    });
    await connection.commit();
    return values;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function update(resource, id, updates, actor, context = {}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existingRows] = await connection.execute(
      `SELECT * FROM ${quoteIdentifier(resource)} WHERE id = ? FOR UPDATE`,
      [id],
    );
    if (!existingRows.length) {
      await connection.rollback();
      return null;
    }

    const current = fromDatabaseRecord(resource, existingRows[0]);
    const { password, ...safeUpdates } = updates;
    const values = { ...current, ...safeUpdates, id };
    let passwordHash;
    if (resource === 'users' && password) {
      if (typeof password !== 'string' || password.length < 8) {
        const error = new Error('User passwords must be at least 8 characters long.');
        error.statusCode = 400;
        throw error;
      }
      passwordHash = await bcrypt.hash(password, 12);
    }
    if (resource === 'users' && updates.email) {
      const [existingUsers] = await connection.execute('SELECT id FROM users WHERE email = ? AND id <> ?', [updates.email, id]);
      if (existingUsers.length) {
        const error = new Error('A user with this email already exists.');
        error.statusCode = 409;
        throw error;
      }
    }
    if (resource === 'allocations') {
      const room = await validateAllocation(connection, values.room, current.room);
      if (current.room !== values.room) {
        const previousRoom = await getRoom(connection, current.room, true);
        if (previousRoom) await changeRoomOccupancy(connection, previousRoom, -1);
        await changeRoomOccupancy(connection, room, 1);
      }
      values.hostel = room.hostel;
    }

    const dbValues = toDatabaseRecord(resource, values);
    const entries = Object.entries(dbValues);
    await connection.execute(
      `UPDATE ${quoteIdentifier(resource)} SET ${entries.map(([column]) => `${quoteIdentifier(column)} = ?`).join(', ')} WHERE id = ?`,
      [...entries.map(([, value]) => value), id],
    );
    if (passwordHash) {
      await connection.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
    }
    await insertAuditLog(connection, {
      actor,
      action: 'update',
      resource,
      recordId: id,
      summary: `Updated a ${resource} record.`,
      changedFields: [...new Set([...Object.keys(safeUpdates), ...(passwordHash ? ['password'] : [])])],
      ...context,
    });
    await connection.commit();
    return values;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function remove(resource, id, actor, context = {}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    if (resource === 'allocations') {
      const [allocations] = await connection.execute(
        'SELECT room FROM allocations WHERE id = ? FOR UPDATE',
        [id],
      );
      if (!allocations.length) {
        await connection.rollback();
        return false;
      }
      const room = await getRoom(connection, allocations[0].room, true);
      if (room) await changeRoomOccupancy(connection, room, -1);
    }
    const [result] = await connection.execute(
      `DELETE FROM ${quoteIdentifier(resource)} WHERE id = ?`,
      [id],
    );
    if (result.affectedRows > 0) {
      await insertAuditLog(connection, {
        actor,
        action: 'delete',
        resource,
        recordId: id,
        summary: `Deleted a ${resource} record.`,
        ...context,
      });
    }
    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function close() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

module.exports = {
  initialize,
  close,
  list,
  authenticate,
  logAuthentication,
  listAuditLogs,
  getActiveUser,
  getSettings,
  updateSettings,
  create,
  update,
  remove,
};
