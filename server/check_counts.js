
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function checkDB() {
    const SQL = await initSqlJs();
    const dbPath = path.join(__dirname, 'data.db');
    const dbData = fs.readFileSync(dbPath);
    const db = new SQL.Database(dbData);

    const counts = {
        users: db.exec("SELECT COUNT(*) FROM users")[0].values[0][0],
        events: db.exec("SELECT COUNT(*) FROM events")[0].values[0][0],
        clients: db.exec("SELECT COUNT(*) FROM clients")[0].values[0][0],
        activities: db.exec("SELECT COUNT(*) FROM activities")[0].values[0][0]
    };

    console.log("DB Counts:", counts);
}

checkDB().catch(console.error);
