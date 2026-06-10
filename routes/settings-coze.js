const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const { auth } = require('../middleware/coze-auth');

const router = express.Router();
const dbPath = path.join(__dirname, '..', 'db', 'database.sqlite');
function getDb() { return new Database(dbPath); }

router.get('/all', auth, (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM settings').all();
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);
  db.close();
  res.json({ code: 0, data: settings });
});

router.put('/update', auth, (req, res) => {
  const db = getDb();
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const runMany = db.transaction((obj) => { for (const [k, v] of Object.entries(obj)) { upsert.run(k, String(v)); } });
  runMany(req.body);
  db.close();
  res.json({ code: 0, msg: '设置已保存' });
});

router.get('/devices', auth, (req, res) => {
  const db = getDb();
  const { online, page = 1, pageSize = 20 } = req.query;
  let sql = 'SELECT d.*, s.tag_number FROM devices d LEFT JOIN sheep s ON d.sheep_id = s.id WHERE 1=1';
  const params = [];
  if (online !== undefined) { sql += ' AND d.online = ?'; params.push(online); }
  const total = db.prepare(`SELECT COUNT(*) as c FROM (${sql})`).get(...params).c;
  sql += ' ORDER BY d.device_id LIMIT ? OFFSET ?';
  params.push(+pageSize, (+page - 1) * +pageSize);
  const list = db.prepare(sql).all(...params);
  db.close();
  res.json({ code: 0, data: { list, total, page: +page, pageSize: +pageSize } });
});

router.get('/device-stats', auth, (req, res) => {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as c FROM devices').get().c;
  const online = db.prepare('SELECT COUNT(*) as c FROM devices WHERE online = 1').get().c;
  const lowBattery = db.prepare('SELECT COUNT(*) as c FROM devices WHERE battery < 20').get().c;
  const offline = db.prepare('SELECT COUNT(*) as c FROM devices WHERE online = 0').get().c;
  db.close();
  res.json({ code: 0, data: { total, online, lowBattery, offline } });
});

module.exports = router;
