const path = require('path');
const fs = require('fs');

// --- 🛡️ BLINDAJE DE DATOS ABSOLUTO (HOSTINGER u351811476) ---
// Esta ruta está FUERA de tu repositorio de Git. Hostinger NUNCA la borrará.
const DB_DIR = '/home/u351811476/data_validate';
const DB_PATH = path.join(DB_DIR, 'data.db');

// Intentamos crear la carpeta si no existe (solo en el primer arranque)
if (!fs.existsSync(DB_DIR)) {
  try { 
    fs.mkdirSync(DB_DIR, { recursive: true }); 
    console.log('✅ Carpeta persistente creada en:', DB_DIR);
  } catch (e) {
    console.error('⚠️ No se pudo crear la carpeta persistente, usando local como backup.');
  }
}

// Determinamos la ruta final (preferimos la persistente)
const FINAL_DB_PATH = fs.existsSync(DB_DIR) ? DB_PATH : path.resolve(__dirname, 'data.db');

console.log('--- 🛡️ ESTADO DE PERSISTENCIA ---');
console.log('Ruta Activa:', FINAL_DB_PATH);
console.log('---------------------------------');

// ─── sql.js wrapper ──────────────────────────────────────────────────────────
let sqlJs;
let sqlDb; 

function persist() {
  try {
    const data = sqlDb.export();
    fs.writeFileSync(FINAL_DB_PATH, Buffer.from(data));
  } catch (e) {
    console.error('❌ Error al guardar datos en disco:', e.message);
  }
}

function initDb() {
  sqlJs = require('sql.js');
  const SQL = sqlJs({ locateFile: () => path.join(__dirname, 'node_modules/sql.js/dist/sql-wasm.wasm') });
  if (SQL && typeof SQL.then === 'function') return SQL;
  return Promise.resolve(SQL);
}

let _ready = false;
let _queue = [];
function enqueue(fn) { if (_ready) fn(); else _queue.push(fn); }

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
        else console.error('db.run error:', e.message);
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
      } catch (e) { if (cb) cb(e, null); }
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
      } catch (e) { if (cb) cb(e, []); }
    });
  },
  prepare: (sql) => {
    return {
      run: (params) => { enqueue(() => { try { sqlDb.run(sql, params); persist(); } catch (e) {} }); },
      finalize: () => {} 
    };
  }
};

// ─── Bootstrap con LÓGICA ANTI-BORRADO ───────────────────────────────────────
initDb().then((SQL) => {
  if (fs.existsSync(FINAL_DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(FINAL_DB_PATH);
      if (fileBuffer.length > 0) {
        sqlDb = new SQL.Database(new Uint8Array(fileBuffer));
        console.log('✅ Base de datos cargada correctamente (', fileBuffer.length, 'bytes)');
      } else {
        // Si el archivo existe pero está vacío, podría ser un error de escritura previo
        throw new Error('Archivo de base de datos vacío');
      }
    } catch (err) {
      console.error('🚨 ERROR CRÍTICO AL CARGAR DB:', err.message);
      // BLOQUEO: No creamos una DB vacía si el archivo ya existía pero falló la carga
      // Esto previene que se sobrescriban datos reales con una DB vacía
      process.exit(1); 
    }
  } else {
    sqlDb = new SQL.Database();
    console.log('🆕 Nueva base de datos creada en:', FINAL_DB_PATH);
  }

  _ready = true;
  _queue.forEach(fn => fn());
  _queue = [];
}).catch((err) => {
  console.error('❌ Error fatal en sql.js:', err.message);
  process.exit(1);
});

// ─── Esquema ───
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE, password TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, name TEXT, email TEXT, cedula TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS templates (id TEXT PRIMARY KEY, name TEXT, imageUrl TEXT, qrX REAL, qrY REAL, qrWidth REAL, qrHeight REAL, eventId TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, name TEXT, date TEXT, startTime TEXT, endTime TEXT, status TEXT DEFAULT 'pendiente', imageUrl TEXT, location TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS boletas (id TEXT PRIMARY KEY, code TEXT UNIQUE, consecutivo INTEGER, used INTEGER DEFAULT 0, fecha_uso TEXT, clientId TEXT, templateId TEXT, eventId TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS scan_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, ticketId TEXT, resultado TEXT, fecha_hora TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS activity_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, message TEXT, timestamp TEXT, details TEXT, consecutivo INTEGER, clientName TEXT, eventName TEXT)`);

  // Migraciones seguras
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

  // Semilla admin
  db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (err || (row && row.count === 0) || !row) {
      db.run("INSERT OR REPLACE INTO users (id, username, password) VALUES ('1', 'admin1@admin.com', 'admin@qwerty')");
    } else {
      db.run("UPDATE users SET username = 'admin1@admin.com', password = 'admin@qwerty' WHERE id = '1'");
    }
  });
});

module.exports = db;
