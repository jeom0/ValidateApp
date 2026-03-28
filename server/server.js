const express = require('express');
const cors = require('cors');
const db = require('./database');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Login simple
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
    if (row) {
      res.json({ token: 'mock-jwt-token', user: { id: row.id, username: row.username } });
    } else {
      res.status(401).json({ error: 'Credenciales inválidas' });
    }
  });
});

// Recent activity for dashboard
app.get('/api/activity', (req, res) => {
  const query = `
    SELECT 
      l.id, 
      l.resultado, 
      l.fecha_hora, 
      b.consecutivo, 
      c.name as clientName, 
      e.name as eventName
    FROM scan_logs l
    LEFT JOIN boletas b ON l.ticketId = b.id OR l.ticketId = b.code
    LEFT JOIN clients c ON b.clientId = c.id
    LEFT JOIN events e ON b.eventId = e.id
    ORDER BY l.fecha_hora DESC
    LIMIT 10
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});


app.put('/api/admin/credentials', (req, res) => {
  const { currentPassword, newUsername, newPassword } = req.body;
  db.get("SELECT * FROM users WHERE id = '1'", [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row || row.password !== currentPassword) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }
    const updateUsername = newUsername || row.username;
    const updatePassword = newPassword || row.password;
    db.run("UPDATE users SET username = ?, password = ? WHERE id = '1'", [updateUsername, updatePassword], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Credenciales actualizadas' });
    });
  });
});

// Events
app.get('/api/events', (req, res) => {
  db.all('SELECT * FROM events', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Auto-update status based on time
    const now = new Date();
    const updatedRows = rows.map(event => {
      const eventDate = new Date(`${event.date}T${event.startTime}`);
      const eventEnd = new Date(`${event.date}T${event.endTime}`);
      
      let status = 'pendiente';
      if (now > eventEnd) status = 'terminado';
      else if (now >= eventDate) status = 'en curso';
      
      return { ...event, status };
    });
    res.json(updatedRows);
  });
});

app.post('/api/events', (req, res) => {
  const id = crypto.randomUUID();
  const { name, date, startTime, endTime, imageUrl } = req.body;
  db.run(
    'INSERT INTO events (id, name, date, startTime, endTime, imageUrl, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, name, date, startTime, endTime, imageUrl, 'pendiente'],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id, name, date, startTime, endTime, imageUrl, status: 'pendiente' });
    }
  );
});

app.put('/api/events/:id', (req, res) => {
  const { name, date, startTime, endTime, imageUrl, status } = req.body;
  db.run(
    'UPDATE events SET name = ?, date = ?, startTime = ?, endTime = ?, imageUrl = ?, status = ? WHERE id = ?',
    [name, date, startTime, endTime, imageUrl, status, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: req.params.id, name, date, startTime, endTime, imageUrl, status });
    }
  );
});

app.delete('/api/events/:id', (req, res) => {
  db.run('DELETE FROM events WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Evento eliminado' });
  });
});

// Clients
app.get('/api/clients', (req, res) => {
  db.all('SELECT c.*, (SELECT COUNT(id) FROM boletas WHERE clientId = c.id) as totalTickets FROM clients c', [], (err, rows) => {
    res.json(rows);
  });
});

app.get('/api/clients/:id/boletas', (req, res) => {
  db.all('SELECT b.*, e.name as eventName, e.imageUrl as eventImageUrl FROM boletas b LEFT JOIN events e ON b.eventId = e.id WHERE b.clientId = ?', [req.params.id], (err, rows) => {
    res.json(rows);
  });
});

app.post('/api/clients', (req, res) => {
  const id = crypto.randomUUID();
  const { name, email, ticketCount, templateId, eventId, cedula } = req.body;
  
  db.run('INSERT INTO clients (id, name, email, cedula) VALUES (?, ?, ?, ?)', [id, name, email, cedula], (err) => {
    if(err) return res.status(500).json({error: err.message});
    
    db.get('SELECT MAX(consecutivo) as max_cons FROM boletas', [], (err, row) => {
      let startConsecutive = (row && row.max_cons) ? row.max_cons + 1 : 1;
      
      const tickets = [];
      const stmt = db.prepare('INSERT INTO boletas (id, code, consecutivo, used, clientId, templateId, eventId) VALUES (?, ?, ?, 0, ?, ?, ?)');
      
      for(let i=0; i<ticketCount; i++) {
        const ticketId = crypto.randomUUID();
        const code = crypto.randomBytes(8).toString('hex');
        const cons = startConsecutive + i;
        stmt.run([ticketId, code, cons, id, templateId || null, eventId || null]);
        tickets.push({ id: ticketId, code, consecutivo: cons, clientId: id, eventId });
      }
      stmt.finalize();
      
      res.json({ id, name, email, generatedTickets: tickets });
    });
  });
});

app.put('/api/clients/:id', (req, res) => {
  const { name, email, addTickets, eventId, cedula } = req.body;
  const { id } = req.params;
  
  db.run('UPDATE clients SET name = ?, email = ?, cedula = ? WHERE id = ?', [name, email, cedula, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    if (addTickets && addTickets > 0) {
      db.get('SELECT MAX(consecutivo) as max_cons FROM boletas', [], (err, row) => {
        let startConsecutive = (row && row.max_cons) ? row.max_cons + 1 : 1;
        const stmt = db.prepare('INSERT INTO boletas (id, code, consecutivo, used, clientId, eventId) VALUES (?, ?, ?, 0, ?, ?)');
        for(let i=0; i<addTickets; i++) {
          stmt.run([crypto.randomUUID(), crypto.randomBytes(8).toString('hex'), startConsecutive + i, id, eventId || null]);
        }
        stmt.finalize();
        res.json({ id, name, email, message: `Se agregaron ${addTickets} boletas` });
      });
    } else {
      res.json({ id, name, email });
    }
  });
});

app.delete('/api/clients/:id', (req, res) => {
  const { id } = req.params;
  // Delete boletas first to maintain integrity (though not enforced by foreign keys in this simple setup)
  db.run('DELETE FROM boletas WHERE clientId = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    db.run('DELETE FROM clients WHERE id = ?', [id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
      res.json({ message: 'Cliente y sus boletas eliminados correctamente' });
    });
  });
});

// Templates
app.get('/api/templates', (req, res) => {
  const { eventId } = req.query;
  let query = 'SELECT * FROM templates';
  let params = [];
  if (eventId) {
    query += ' WHERE eventId = ?';
    params.push(eventId);
  }
  db.all(query, params, (err, rows) => {
    res.json(rows);
  });
});

app.post('/api/templates', (req, res) => {
  const id = req.body.id || crypto.randomUUID();
  const { name, imageUrl, qrX, qrY, qrWidth, qrHeight, eventId } = req.body;
  db.run(
    'INSERT OR REPLACE INTO templates (id, name, imageUrl, qrX, qrY, qrWidth, qrHeight, eventId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
    [id, name, imageUrl, qrX, qrY, qrWidth, qrHeight, eventId || null], 
    (err) => {
      if(err) return res.status(500).json({error: err.message});
      res.json({ id, name, imageUrl, qrX, qrY, qrWidth, qrHeight, eventId });
    }
  );
});

app.delete('/api/templates/:id', (req, res) => {
  db.run('DELETE FROM templates WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Plantilla eliminada' });
  });
});

app.put('/api/templates/:id', (req, res) => {
  const { name, imageUrl, qrX, qrY, qrWidth, qrHeight, eventId } = req.body;
  db.run(
    'UPDATE templates SET name=?, imageUrl=?, qrX=?, qrY=?, qrWidth=?, qrHeight=?, eventId=? WHERE id=?',
    [name, imageUrl, qrX, qrY, qrWidth, qrHeight, eventId || null, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: req.params.id, name, imageUrl, qrX, qrY, qrWidth, qrHeight, eventId });
    }
  );
});

// Boletas
app.get('/api/boletas', (req, res) => {
  db.all('SELECT * FROM boletas', [], (err, rows) => {
    res.json(rows);
  });
});

app.post('/api/boletas', (req, res) => {
  const id = crypto.randomUUID();
  const { code, clientId, templateId } = req.body;
  db.run('INSERT INTO boletas (id, code, used, clientId, templateId) VALUES (?, ?, 0, ?, ?)', [id, code, clientId, templateId], (err) => {
    if(err) return res.status(500).json({error: err.message});
    res.json({ id, code, used: 0, clientId, templateId });
  });
});

// Edit individual boleta (reassign event)
app.put('/api/boletas/:id', (req, res) => {
  const { eventId } = req.body;
  db.run('UPDATE boletas SET eventId = ? WHERE id = ?', [eventId || null, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: req.params.id, eventId });
  });
});

// Delete individual boleta
app.delete('/api/boletas/:id', (req, res) => {
  db.run('DELETE FROM boletas WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Boleta eliminada' });
  });
});


// Validar y consumir boleta (Scanner)
app.post('/api/scan', (req, res) => {
  const { code } = req.body;
  db.get('SELECT * FROM boletas WHERE code = ?', [code], (err, row) => {
    if (!row) {
      db.run('INSERT INTO scan_logs(ticketId, resultado, fecha_hora) VALUES(?, ?, ?)', [code, 'no_valida', new Date().toISOString()]);
      return res.status(404).json({ valid: false, message: 'Boleta no encontrada / Inválida' });
    }
    if (row.used) {
      db.run('INSERT INTO scan_logs(ticketId, resultado, fecha_hora) VALUES(?, ?, ?)', [row.id, 'ya_usada', new Date().toISOString()]);
      return res.json({ valid: false, used: true, message: 'Boleta ya utilizada' });
    }
    
    // Mark as used atomically
    db.run('UPDATE boletas SET used = 1, fecha_uso = ? WHERE id = ? AND used = 0', [new Date().toISOString(), row.id], function(err) {
      if(err) return res.status(500).json({error: err.message});
      if (this.changes === 0) {
        db.run('INSERT INTO scan_logs(ticketId, resultado, fecha_hora) VALUES(?, ?, ?)', [row.id, 'ya_usada', new Date().toISOString()]);
        return res.json({ valid: false, used: true, message: 'Boleta ya utilizada' });
      }
      db.run('INSERT INTO scan_logs(ticketId, resultado, fecha_hora) VALUES(?, ?, ?)', [row.id, 'valida', new Date().toISOString()]);
      
      db.get('SELECT * FROM clients WHERE id = ?', [row.clientId], (err, clientRow) => {
         res.json({ 
           valid: true, 
           message: 'Boleta válida',
           ticket: {
             consecutivo: row.consecutivo,
             fecha_uso: new Date().toISOString(),
             client: clientRow || {}
           }
         });
      });
    });
  });
});

// ==========================================
// SERVE FRONTEND (FOR HOSTINGER PRODUCTION)
// ==========================================
const path = require('path');
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
