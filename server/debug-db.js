const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'data.db');
const db = new sqlite3.Database(dbPath);

console.log('--- Boletas Summary ---');
db.all('SELECT templateId, COUNT(*) as count FROM boletas GROUP BY templateId', [], (err, rows) => {
  if (err) { console.error(err); return; }
  console.log('Rows grouped by template:', rows);
  
  console.log('--- Templates ---');
  db.all('SELECT id, name FROM templates', [], (err, tRows) => {
    if (err) { console.error(err); return; }
    console.log('Templates:', tRows);
    db.close();
  });
});
