const db = require('./database');
db.all('PRAGMA table_info(templates)', [], (err, rows) => {
  if (err) console.error(err);
  console.log('Templates columns:', rows);
  process.exit(0);
});
