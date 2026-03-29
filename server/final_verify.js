
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function finalVerify() {
    const SQL = await initSqlJs();
    const dbData = fs.readFileSync(path.join(__dirname, 'data.db'));
    const db = new SQL.Database(new Uint8Array(dbData));
    
    console.log('--- RESTORED DATABASE STATUS ---');
    try {
        const events = db.exec("SELECT name FROM events")[0].values.flat();
        console.log('Events:', events);
    } catch(e) { console.log('Events: 0'); }
    
    try {
        const clients = db.exec("SELECT COUNT(*) FROM clients")[0].values[0][0];
        console.log('Clients:', clients);
    } catch(e) { console.log('Clients: 0'); }

    try {
        const boletas = db.exec("SELECT COUNT(*) FROM boletas")[0].values[0][0];
        console.log('Boletas:', boletas);
    } catch(e) { console.log('Boletas: 0'); }
}

finalVerify().catch(console.error);
