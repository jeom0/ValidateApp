const express = require('express');
const cors = require('cors');
const db = require('./database');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Log every request
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Helper for unified activity logs
const logActivity = (data) => {
  const { type, message, details = null, consecutivo = null, clientName = null, eventName = null } = data;
  const timestamp = new Date().toISOString();
  console.log('Logging activity:', type, message);
  db.run(
    'INSERT INTO activity_logs (type, message, timestamp, details, consecutivo, clientName, eventName) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [type, message, timestamp, details, consecutivo, clientName, eventName],
    (err) => {
      if (err) console.error('Error logging activity:', err.message);
      else console.log('Activity logged successfully');
    }
  );
};

// Login simple
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  console.log(`Login attempt for username: "${username}" with password: "${password}"`);
  
  db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
    if (err) {
      console.error('Login error:', err.message);
      return res.status(500).json({ error: 'Error en el servidor' });
    }
    if (row) {
      console.log('Login successful for user:', row.username);
      res.json({ success: true, user: { id: row.id, username: row.username } });
    } else {
      console.log('Login failed: Invalid credentials for', username);
      res.status(401).json({ error: 'Credenciales incorrectas' });
    }
  });
});

// EMERGENCY ROUTE TO FORCE SEED
app.get('/api/force-admin', (req, res) => {
  db.run("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE, password TEXT)", () => {
    db.run("INSERT OR REPLACE INTO users (id, username, password) VALUES ('1', 'admin1@admin.com', 'admin@qwerty')", (err) => {
      if (err) res.send('<h1 style="color:red; font-family:sans-serif;">Error inyectando: ' + err.message + '</h1>');
      else res.send('<h1 style="color:green; font-family:sans-serif;">ADMINISTRADOR INYECTADO AL 100% CORRECTAMENTE</h1><br><a href="/">Volver al Login</a>');
    });
  });
});

// DB INSPECTOR - muestra el contenido de todas las tablas
app.get('/api/db-inspect', (req, res) => {
  const tables = ['users', 'clients', 'events', 'templates', 'boletas', 'activity_logs', 'scan_logs'];
  let html = `<html><head><meta charset="utf-8"><title>DB Inspector</title>
  <style>body{font-family:sans-serif;background:#111;color:#eee;padding:2rem}
  table{border-collapse:collapse;width:100%;margin-bottom:2rem;font-size:0.85rem}
  th{background:#333;padding:8px;text-align:left}td{padding:6px;border-bottom:1px solid #333}
  h2{color:#60a5fa;margin-top:2rem}pre{background:#222;padding:1rem;border-radius:8px;overflow:auto}</style>
  </head><body><h1>🗄️ DB Inspector en Vivo</h1>`;
  
  let pending = tables.length;
  const results = {};
  
  tables.forEach(table => {
    db.all(`SELECT * FROM ${table} LIMIT 50`, [], (err, rows) => {
      results[table] = err ? { error: err.message } : rows;
      pending--;
      if (pending === 0) {
        tables.forEach(t => {
          const data = results[t];
          html += `<h2>📋 ${t}</h2>`;
          if (data.error) {
            html += `<p style="color:red">Error: ${data.error}</p>`;
          } else if (data.length === 0) {
            html += `<p style="color:#888">Tabla vacía</p>`;
          } else {
            const cols = Object.keys(data[0]);
            html += `<table><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>`;
            data.forEach(row => {
              html += `<tr>${cols.map(c => `<td>${row[c] ?? ''}</td>`).join('')}</tr>`;
            });
            html += `</table>`;
          }
        });
        html += `</body></html>`;
        res.send(html);
      }
    });
  });
});

// Recent activity for dashboard
app.get('/api/activity', (req, res) => {
  const query = `
    SELECT * FROM activity_logs 
    ORDER BY timestamp DESC 
    LIMIT 15
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
  const isCompact = req.query.compact === 'true';
  const fields = isCompact ? 'id, name, date, startTime, endTime, status, location, (SELECT COUNT(*) FROM boletas WHERE eventId = events.id) as ticketCount' : '*, (SELECT COUNT(*) FROM boletas WHERE eventId = events.id) as ticketCount';
  const query = `SELECT ${fields} FROM events`;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
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
  const { name, date, startTime, endTime, status, imageUrl, location } = req.body;
  db.run(
    'INSERT INTO events (id, name, date, startTime, endTime, status, imageUrl, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, name, date, startTime, endTime, status || 'pendiente', imageUrl, location],
    (err) => {
      if(err) return res.status(500).json({error: err.message});
      logActivity({ type: 'event_created', message: `📅 Nuevo evento: ${name}`, eventName: name });
      res.json({ id, name, date, startTime, endTime, status: status || 'pendiente', imageUrl, location });
    }
  );
});

app.put('/api/events/:id', (req, res) => {
  const { id } = req.params;
  const { name, date, startTime, endTime, imageUrl, status, location } = req.body;
  
  // 🛡️ Lógica resiliente: Buscar valores actuales si faltan en la petición
  db.get('SELECT * FROM events WHERE id = ?', [id], (err, current) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!current) return res.status(404).json({ error: 'Evento no encontrado' });

    const finalName = name || current.name;
    const finalDate = date || current.date;
    const finalStart = startTime || current.startTime;
    const finalEnd = endTime || current.endTime;
    const finalImg = imageUrl || current.imageUrl;
    const finalStatus = status || current.status || 'pendiente';
    const finalLoc = location !== undefined ? location : current.location;

    db.run(
      'UPDATE events SET name = ?, date = ?, startTime = ?, endTime = ?, imageUrl = ?, status = ?, location = ? WHERE id = ?',
      [finalName, finalDate, finalStart, finalEnd, finalImg, finalStatus, finalLoc, id],
      function(updErr) {
        if (updErr) return res.status(500).json({ error: updErr.message });
        logActivity({ type: 'event_updated', message: `Evento editado: ${finalName}`, eventName: finalName });
        res.json({ id, name: finalName, date: finalDate, status: finalStatus });
      }
    );
  });
});

app.delete('/api/events/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT name FROM events WHERE id = ?', [id], (err, row) => {
    const eventName = row ? row.name : 'Desconocido';
    db.serialize(() => {
      db.run('DELETE FROM boletas WHERE eventId = ?', [id]);
      db.run('DELETE FROM templates WHERE eventId = ?', [id]);
      db.run('DELETE FROM events WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        logActivity({ type: 'event_deleted', message: `🗑️ Evento eliminado: ${eventName} (completo)`, eventName: eventName });
        res.json({ message: 'Evento y todos sus datos vinculados eliminados' });
      });
    });
  });
});

// Mass Link Template to Event Boletas
app.put('/api/events/:id/link-template', (req, res) => {
  const { id } = req.params;
  const { templateId } = req.body;
  
  db.run('UPDATE boletas SET templateId = ? WHERE eventId = ?', [templateId, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    // Get event name for logging
    const affectedRows = this.changes;
    db.get('SELECT name FROM events WHERE id = ?', [id], (eErr, row) => {
      const eventName = row ? row.name : 'Desconocido';
      logActivity({ 
        type: 'event_updated', 
        message: `🔗 Vinculación Masiva: Diseño aplicado a ${affectedRows} boletas del evento ${eventName}`,
        eventName: eventName,
        details: JSON.stringify({ templateId, affectedRows })
      });
      res.json({ message: 'Diseño vinculado correctamente', affectedRows });
    });
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
  const { name, email, ticketCount, templateId, eventId, cedula } = req.body;
  
  db.get('SELECT id FROM clients WHERE cedula = ?', [cedula], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const isUpdate = !!row;
    const id = isUpdate ? row.id : crypto.randomUUID();
    
    const clientAction = isUpdate 
      ? () => db.run('UPDATE clients SET name = ?, email = ? WHERE id = ?', [name, email, id])
      : () => db.run('INSERT INTO clients (id, name, email, cedula) VALUES (?, ?, ?, ?)', [id, name, email, cedula]);
      
    clientAction();
    
    db.get('SELECT MAX(consecutivo) as max_cons FROM boletas', [], (err, bRow) => {
      let startConsecutive = (bRow && bRow.max_cons) ? bRow.max_cons + 1 : 1;
      const tickets = [];
      const stmt = db.prepare('INSERT INTO boletas (id, code, consecutivo, used, clientId, templateId, eventId) VALUES (?, ?, ?, 0, ?, ?, ?)');
      
      for(let i=0; i<ticketCount; i++) {
        const tid = crypto.randomUUID();
        const code = crypto.randomBytes(8).toString('hex');
        const cons = startConsecutive + i;
        stmt.run([tid, code, cons, id, templateId || null, eventId || null]);
        tickets.push({ id: tid, code, consecutivo: cons, clientId: id, eventId });
      }
      stmt.finalize();
      
      logActivity({ 
        type: isUpdate ? 'client_updated' : 'client_created', 
        message: isUpdate ? `🎟️ Boletas agregadas: ${ticketCount} a ${name}` : `Registro: ${name} (${ticketCount} boletas)`, 
        clientName: name,
        details: JSON.stringify({ ticketCount, eventId })
      });
      
      res.json({ id, name, email, generatedTickets: tickets });
    });
  });
});

app.put('/api/clients/:id', (req, res) => {
  const { name, email, addTickets, eventId, cedula, templateId } = req.body;
  const { id } = req.params;
  
  db.run('UPDATE clients SET name = ?, email = ?, cedula = ? WHERE id = ?', [name, email, cedula, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    logActivity({ type: 'client_updated', message: `Cliente editado: ${name}`, clientName: name });

    if (addTickets && addTickets > 0) {
      db.get('SELECT MAX(consecutivo) as max_cons FROM boletas', [], (err, row) => {
        let startConsecutive = (row && row.max_cons) ? row.max_cons + 1 : 1;
        const stmt = db.prepare('INSERT INTO boletas (id, code, consecutivo, used, clientId, templateId, eventId) VALUES (?, ?, ?, 0, ?, ?, ?)');
        for(let i=0; i<addTickets; i++) {
          stmt.run([crypto.randomUUID(), crypto.randomBytes(8).toString('hex'), startConsecutive + i, id, templateId || null, eventId || null]);
        }
        stmt.finalize();
        logActivity({ type: 'client_updated', message: `Se agregaron ${addTickets} boletas a ${name}`, clientName: name });
        res.json({ id, name, email, message: `Se agregaron ${addTickets} boletas` });
      });
    } else {
      res.json({ id, name, email });
    }
  });
});

app.delete('/api/clients/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT name FROM clients WHERE id = ?', [id], (err, row) => {
    const clientName = row ? row.name : 'Desconocido';
    db.run('DELETE FROM boletas WHERE clientId = ?', [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.run('DELETE FROM clients WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        logActivity({ type: 'client_deleted', message: `🗑️ Cliente eliminado: ${clientName}`, clientName: clientName });
        res.json({ message: 'Cliente y sus boletas eliminados correctamente' });
      });
    });
  });
});

// Templates
app.get('/api/templates', (req, res) => {
  const { eventId, compact } = req.query;
  const isCompact = compact === 'true';
  const fields = isCompact ? 't.id, t.name, t.qrX, t.qrY, t.qrWidth, t.qrHeight, t.eventId, e.name as eventName' : 't.*, e.name as eventName';
  
  let query = `
    SELECT ${fields}, 
    (SELECT COUNT(*) FROM boletas b WHERE b.templateId = t.id) as clientCount
    FROM templates t
    LEFT JOIN events e ON t.eventId = e.id
  `;
  let params = [];
  if (eventId) {
    query += ' WHERE t.eventId = ?';
    params.push(eventId);
  }
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
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
      logActivity({ type: 'template_created', message: `🎨 Nuevo diseño: ${name}` });
      res.json({ id, name, imageUrl, qrX, qrY, qrWidth, qrHeight, eventId });
    }
  );
});

app.delete('/api/templates/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT name FROM templates WHERE id = ?', [id], (err, row) => {
    const templateName = row ? row.name : 'Desconocida';
    db.run('DELETE FROM boletas WHERE templateId = ?', [id], function(err) {
      const deletedQty = this.changes;
      db.run('DELETE FROM templates WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        logActivity({ type: 'template_deleted', message: `🗑️ Plantilla eliminada: ${templateName} (${deletedQty} boletas)` });
        res.json({ message: 'Plantilla y sus boletas eliminadas' });
      });
    });
  });
});

app.put('/api/templates/:id', (req, res) => {
  const { id } = req.params;
  const { name, imageUrl, qrX, qrY, qrWidth, qrHeight, eventId } = req.body;
  
  db.get('SELECT * FROM templates WHERE id = ?', [id], (err, current) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!current) return res.status(404).json({ error: 'Plantilla no encontrada' });

    const finalName = name || current.name;
    const finalImg = imageUrl || current.imageUrl;
    const finalX = qrX !== undefined ? qrX : current.qrX;
    const finalY = qrY !== undefined ? qrY : current.qrY;
    const finalW = qrWidth !== undefined ? qrWidth : current.qrWidth;
    const finalH = qrHeight !== undefined ? qrHeight : current.qrHeight;
    const finalEvId = eventId !== undefined ? eventId : current.eventId;

    db.run(
      'UPDATE templates SET name=?, imageUrl=?, qrX=?, qrY=?, qrWidth=?, qrHeight=?, eventId=? WHERE id=?',
      [finalName, finalImg, finalX, finalY, finalW, finalH, finalEvId, id],
      function(updErr) {
        if (updErr) return res.status(500).json({ error: updErr.message });
        logActivity({ type: 'template_updated', message: `Plantilla editada: ${finalName}` });
        res.json({ id, name: finalName, qrX: finalX, qrY: finalY });
      }
    );
  });
});

// Batch Link Templates to an Event
app.put('/api/templates/batch-link', (req, res) => {
  const { eventId, templateIds } = req.body; // Array of IDs
  
  if (!eventId) return res.status(400).json({ error: 'ID de evento requerido' });

  db.serialize(() => {
    // 1. Unlink templates currently associated with this event
    db.run('UPDATE templates SET eventId = NULL WHERE eventId = ?', [eventId]);
    
    // 2. Link the new set of templates
    if (templateIds && Array.isArray(templateIds) && templateIds.length > 0) {
      const placeholders = templateIds.map(() => '?').join(',');
      const sql = `UPDATE templates SET eventId = ? WHERE id IN (${placeholders})`;
      db.run(sql, [eventId, ...templateIds], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        logActivity({ 
          type: 'template_updated', 
          message: `🔗 Galería Actualizada: ${this.changes} diseños vinculados al evento`,
          details: JSON.stringify({ eventId, templateIds })
        });
        res.json({ success: true, linkedCount: this.changes });
      });
    } else {
      res.json({ success: true, linkedCount: 0 });
    }
  });
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
  const { id } = req.params;
  db.get('SELECT b.consecutivo, c.name FROM boletas b LEFT JOIN clients c ON b.clientId = c.id WHERE b.id = ?', [id], (err, row) => {
    const clientName = row ? row.name : 'Desconocido';
    const cons = row ? row.consecutivo : '??';
    db.run('DELETE FROM boletas WHERE id = ?', [id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      logActivity({ type: 'boleta_deleted', message: `🗑️ Boleta #${cons} eliminada (Asignada a ${clientName})`, clientName: clientName });
      res.json({ message: 'Boleta eliminada' });
    });
  });
});


// 🛡️ V4.8 - LOGICA DE ESCANEO ROBUSTA (ANTICORRUPCIÓN)
app.post('/api/scan', (req, res) => {
  const { code } = req.body;
  
  // 1. Buscamos la boleta y su estado actual
  db.get('SELECT b.*, c.name as clientName, e.name as eventName FROM boletas b LEFT JOIN clients c ON b.clientId = c.id LEFT JOIN events e ON b.eventId = e.id WHERE b.code = ?', [code], (err, row) => {
    if (!row) {
      logActivity({ type: 'scan_failed', message: `❌ Código Inválido: ${code}`, details: code });
      db.run('INSERT INTO scan_logs(ticketId, resultado, fecha_hora) VALUES(?, ?, ?)', [code, 'no_valida', new Date().toISOString()]);
      return res.status(404).json({ valid: false, message: 'Boleta no encontrada / Inválida' });
    }
    
    // 2. Si ya fue usada, devolvemos error inmediatamente (Verificación directa del campo 'used')
    if (row.used === 1) {
      logActivity({ 
        type: 'scan_failed', 
        message: `⚠️ Intento Fallido: Boleta #${row.consecutivo} ya usada`, 
        consecutivo: row.consecutivo, 
        clientName: row.clientName, 
        eventName: row.eventName 
      });
      db.run('INSERT INTO scan_logs(ticketId, resultado, fecha_hora) VALUES(?, ?, ?)', [row.id, 'ya_usada', new Date().toISOString()]);
      return res.json({ valid: false, used: true, message: 'Boleta ya utilizada anteriormente' });
    }
    
    // 3. Mark as used - NO CONFIAMOS EN THIS.CHANGES
    // Simplemente ejecutamos el UPDATE y si no hay error de base de datos, procedemos.
    const usageTime = new Date().toISOString();
    db.run('UPDATE boletas SET used = 1, fecha_uso = ? WHERE id = ?', [usageTime, row.id], (updErr) => {
      if (updErr) {
        console.error('Update error in scan:', updErr.message);
        return res.status(500).json({ error: 'Error al procesar la boleta' });
      }
      
      // 4. Éxito confirmado por lógica de flujo (Si llegó aquí y used era 0, ahora es 1)
      logActivity({ 
        type: 'scan_success', 
        message: `Acceso Concedido: ${row.clientName}`, 
        consecutivo: row.consecutivo, 
        clientName: row.clientName, 
        eventName: row.eventName 
      });
      db.run('INSERT INTO scan_logs(ticketId, resultado, fecha_hora) VALUES(?, ?, ?)', [row.id, 'valida', usageTime]);
      
      res.json({ 
        valid: true, 
        message: 'Boleta válida',
        ticket: {
          consecutivo: row.consecutivo,
          fecha_uso: usageTime,
          client: { name: row.clientName }
        }
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
