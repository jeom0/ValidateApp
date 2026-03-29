/**
 * database.js — sql.js wrapper with sqlite3-compatible callback API
 * Uses WebAssembly SQLite (sql.js) — no native binaries, works on any server.
 */

const path = require('path');
const fs = require('fs');

const DB_PATH = path.resolve(__dirname, 'data.db');

// ─── sql.js shim that mimics the sqlite3 callback API ─────────────────────────
// We load sql.js synchronously, build the in-memory DB from file (if it exists),
// and expose run / get / all / prepare / serialize that match the sqlite3 API.

let sqlJs;
let sqlDb; // the sql.js Database instance

// Persist the in-memory DB back to disk after every write
function persist() {
  try {
    const data = sqlDb.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (e) {
    console.error('persist error:', e.message);
  }
}

function initDb() {
  sqlJs = require('sql.js');
  // sql.js 1.x exports a factory function
  const SQL = sqlJs({ locateFile: () => path.join(__dirname, 'node_modules/sql.js/dist/sql-wasm.wasm') });
  // SQL is actually a promise in some versions; handle both
  if (SQL && typeof SQL.then === 'function') {
    return SQL;
  }
  // Synchronous mode (older versions)
  return Promise.resolve(SQL);
}

// Synchronous-style wrapper around the async sql.js init
// We'll wire everything up after init resolves

let _ready = false;
let _queue = [];

function enqueue(fn) {
  if (_ready) fn();
  else _queue.push(fn);
}

// The public db object — same interface as sqlite3
const db = {
  serialize: (cb) => { enqueue(() => { try { cb(); } catch (e) {} }); },
  run: (sql, params, cb) => {
    if (typeof params === 'function') { cb = params; params = []; }
    params = params || [];
    enqueue(() => {
      try {
        sqlDb.run(sql, params);
        persist();
        if (cb) cb.call({ changes: sqlDb.getRowsModified() }, null);
      } catch (e) {
        if (cb) cb.call({ changes: 0 }, e);
        else console.error('db.run error:', e.message, '| SQL:', sql);
      }
    });
  },
  get: (sql, params, cb) => {
    if (typeof params === 'function') { cb = params; params = []; }
    params = params || [];
    enqueue(() => {
      try {
        const stmt = sqlDb.prepare(sql);
        stmt.bind(params);
        const row = stmt.step() ? stmt.getAsObject() : null;
        stmt.free();
        if (cb) cb(null, row);
      } catch (e) {
        if (cb) cb(e, null);
        else console.error('db.get error:', e.message);
      }
    });
  },
  all: (sql, params, cb) => {
    if (typeof params === 'function') { cb = params; params = []; }
    params = params || [];
    enqueue(() => {
      try {
        const stmt = sqlDb.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        if (cb) cb(null, rows);
      } catch (e) {
        if (cb) cb(e, []);
        else console.error('db.all error:', e.message);
      }
    });
  },
  prepare: (sql) => {
    // Returns a statement-like object compatible with the usage in server.js
    const boundParams = [];
    return {
      run: (params) => {
        enqueue(() => {
          try { sqlDb.run(sql, params); persist(); }
          catch (e) { console.error('stmt.run error:', e.message); }
        });
      },
      finalize: () => {} // no-op
    };
  }
};

// ─── Bootstrap ────────────────────────────────────────────────────────────────
initDb().then((SQL) => {
  // Load from file if exists, else create new DB
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(fileBuffer);
    console.log('Loaded existing SQLite DB from', DB_PATH);
  } else {
    sqlDb = new SQL.Database();
    console.log('Created new SQLite DB at', DB_PATH);
  }

  _ready = true;
  _queue.forEach(fn => fn());
  _queue = [];
}).catch((err) => {
  console.error('FATAL: Could not initialize sql.js:', err.message);
});

// ─── Schema & seed ────────────────────────────────────────────────────────────
db.serialize(() => {
  console.log('Initializing database tables...');

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    cedula TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT,
    imageUrl TEXT,
    qrX REAL,
    qrY REAL,
    qrWidth REAL,
    qrHeight REAL,
    eventId TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT,
    date TEXT,
    startTime TEXT,
    endTime TEXT,
    status TEXT DEFAULT 'pendiente',
    imageUrl TEXT,
    location TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS boletas (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE,
    consecutivo INTEGER,
    used INTEGER DEFAULT 0,
    fecha_uso TEXT,
    clientId TEXT,
    templateId TEXT,
    eventId TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS scan_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticketId TEXT,
    resultado TEXT,
    fecha_hora TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    message TEXT,
    timestamp TEXT,
    details TEXT,
    consecutivo INTEGER,
    clientName TEXT,
    eventName TEXT
  )`);

  // Safe migrations (ignore errors if column exists)
  db.run(`ALTER TABLE boletas ADD COLUMN consecutivo INTEGER`);
  db.run(`ALTER TABLE boletas ADD COLUMN fecha_uso TEXT`);
  db.run(`ALTER TABLE boletas ADD COLUMN eventId TEXT`);
  db.run(`ALTER TABLE clients ADD COLUMN cedula TEXT`);
  db.run(`ALTER TABLE templates ADD COLUMN eventId TEXT`);
  db.run(`ALTER TABLE templates ADD COLUMN qrX REAL`);
  db.run(`ALTER TABLE templates ADD COLUMN qrY REAL`);
  db.run(`ALTER TABLE templates ADD COLUMN qrWidth REAL`);
  db.run(`ALTER TABLE templates ADD COLUMN qrHeight REAL`);
  db.run(`ALTER TABLE events ADD COLUMN location TEXT`);

  // Seed admin user
  db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (err || (row && row.count === 0) || !row) {
      db.run(
        "INSERT OR REPLACE INTO users (id, username, password) VALUES ('1', 'admin1@admin.com', 'admin@qwerty')",
        [],
        (e) => {
          if (e) console.error('Seed error:', e.message);
          else console.log('Admin user seeded: admin1@admin.com / admin@qwerty');
        }
      );
    } else {
      // Force-update existing admin credentials
      db.run("UPDATE users SET username = 'admin1@admin.com', password = 'admin@qwerty' WHERE id = '1'");
      console.log('Admin credentials updated.');
    }
  });
});

module.exports = db;
