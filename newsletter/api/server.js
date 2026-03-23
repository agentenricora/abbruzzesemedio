require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── DATABASE SCHEDE ────────────────────────────────────
const db = new Database(path.join(__dirname, 'schede.db'));
db.prepare('CREATE TABLE IF NOT EXISTS schede (data TEXT NOT NULL)').run();

app.get('/', (req, res) => res.json({ status: 'ok' }));

app.get('/schede', (req, res) => {
  const row = db.prepare('SELECT data FROM schede LIMIT 1').get();
  res.json(row ? JSON.parse(row.data) : []);
});

app.post('/schede', (req, res) => {
  const data = JSON.stringify(req.body);
  const count = db.prepare('SELECT COUNT(*) as c FROM schede').get().c;
  if (count > 0) {
    db.prepare('UPDATE schede SET data = ?').run(data);
  } else {
    db.prepare('INSERT INTO schede (data) VALUES (?)').run(data);
  }
  res.json({ ok: true });
});

app.post('/generate', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurata' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
        'content-type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Errore proxy Anthropic:', err);
    res.status(502).json({ error: 'Errore di comunicazione con Anthropic', detail: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Newsletter API in ascolto su porta ${PORT}`);
});
