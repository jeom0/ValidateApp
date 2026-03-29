
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function debugDB() {
    const SQL = await initSqlJs();
    const dbPath = path.join(__dirname, 'data_corrupt_v2.db');
    if (!fs.existsSync(dbPath)) {
        console.log('File not found:', dbPath);
        return;
    }
    const dbData = fs.readFileSync(dbPath);
    console.log('File size:', dbData.length, 'bytes');
    
    try {
        const db = new SQL.Database(new Uint8Array(dbData));
        const tablesRes = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
        if (tablesRes.length === 0) {
            console.log('No tables found in DB.');
            return;
        }
        const tables = tablesRes[0].values.flat();
        console.log('Tables:', tables);
        
        for (const table of tables) {
            const countRes = db.exec(`SELECT COUNT(*) FROM ${table}`);
            console.log(`${table}: ${countRes[0].values[0][0]} rows`);
        }
        
        // Peek at clients if any
        const clientsRes = db.exec("SELECT * FROM clients LIMIT 5");
        if (clientsRes.length > 0) {
            console.log('First 5 clients:', JSON.stringify(clientsRes[0].values, null, 2));
        }

    } catch (e) {
        console.error('Database Error:', e.message);
    }
}

debugDB().catch(console.error);
