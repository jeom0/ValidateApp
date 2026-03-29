const path = require('path');
let sqlite3;
let db;
try {
  sqlite3 = require('sqlite3').verbose();
  const dbPath = path.resolve(__dirname, 'data.db');
  console.log('Database path:', dbPath);
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Database connection error:', err.message);
    else console.log('Connected to SQLite database');
  });
} catch (err) {
  console.warn('\n======================================================');
  console.warn('⚠️  SQLite3 binary missing - Running in Dummy Mode ⚠️');
  console.warn('Hostinger auto-deploy blocked the native module download.');
  console.warn('Please run "npm install" via Hostinger Terminal to fix.');
  console.warn('======================================================\n');
  
  // Create a dummy db object that won't crash the server.js initialization
  db = {
    serialize: (cb) => {
        try { cb(); } catch(e){}
    },
    run: () => {},
    get: (q, p, cb) => { if(cb) cb(null, null); else if(typeof p === 'function') p(null, null); },
    all: (q, p, cb) => { if(cb) cb(null, []); else if(typeof p === 'function') p(null, []); },
    prepare: () => ({ run: () => {}, finalize: () => {} })
  };
}

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
  )`, (err) => { if (err) console.error("Error creating templates:", err.message); });
  
  db.run(`CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT,
    date TEXT,
    startTime TEXT,
    endTime TEXT,
    status TEXT DEFAULT 'pendiente',
    imageUrl TEXT,
    location TEXT
  )`, (err) => { if (err) console.error("Error creating events:", err.message); });

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
  
  // Try to add missing columns if upgrading DB
  db.run(`ALTER TABLE boletas ADD COLUMN consecutivo INTEGER`, (err) => {});
  db.run(`ALTER TABLE boletas ADD COLUMN fecha_uso TEXT`, (err) => {});
  db.run(`ALTER TABLE boletas ADD COLUMN eventId TEXT`, (err) => {});
  db.run(`ALTER TABLE clients ADD COLUMN cedula TEXT`, (err) => {});
  db.run(`ALTER TABLE templates ADD COLUMN eventId TEXT`, (err) => {});
  db.run(`ALTER TABLE events ADD COLUMN location TEXT`, (err) => {});

  db.run(`CREATE TABLE IF NOT EXISTS scan_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticketId TEXT,
    resultado TEXT,
    fecha_hora TEXT
  )`, (err) => { if (err) console.error("Error creating scan_logs:", err.message); });

  db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    message TEXT,
    timestamp TEXT,
    details TEXT,
    consecutivo INTEGER,
    clientName TEXT,
    eventName TEXT
  )`, (err) => { 
    if (err) console.error("Error creating activity_logs:", err.message); 
    else console.log("Table activity_logs ready");
  });
  // Seed data if empty (moved inside serialize to ensure table exists first)
  db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (row && row.count === 0) {
      db.run("INSERT INTO users (id, username, password) VALUES ('1', 'admin1@admin.com', 'admin@qwerty')");
      console.log('First-time admin initialized');
    } else if (err) {
      console.error('Error seeding admin user:', err.message);
    } else {
      // Also perform a "force" update for ID 1 to ensure existing DBs get the new credentials
      db.run("UPDATE users SET username = ?, password = ? WHERE id = '1'", ['admin1@admin.com', 'admin@qwerty']);
    }
  });
});

module.exports = db;
