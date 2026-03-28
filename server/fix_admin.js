const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data.db');
db.run("UPDATE users SET username = 'admin1@admin.com', password = 'admin@qwerty' WHERE id = '1'", function(err) {
  if (err) console.error(err);
  else console.log('Admin updated:', this.changes);
  db.close();
});
