const db = require('./database');
db.all('SELECT id, name, LENGTH(imageUrl) as imgLen FROM templates', [], (err, rows) => {
  if (err) console.error(err);
  console.log('Templates data:', rows);
  process.exit(0);
});
