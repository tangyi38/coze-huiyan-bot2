const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const { auth } = require('../middleware/coze-auth');

const router = express.Router();
const dbPath = path.join(__dirname, '..', 'db', 'database.sqlite');
function getDb() { return new Database(dbPath); }

router.get('/list', auth, (req, res) => {
  const db = getDb();
  const { herd_id } = req.query;
  let sql = `SELECT l.*, s.tag_number, s.health_status, h.code as herd_code FROM locations l LEFT JOIN sheep s ON l.sheep_id = s.id LEFT JOIN herds h ON l.herd_id = h.id WHERE l.id IN (SELECT MAX(id) FROM locations GROUP BY sheep_id)`;
  const params = [];
  if (herd_id) { sql += ' AND l.herd_id = ?'; params.push(herd_id); }
  const list = db.prepare(sql).all(...params);
  db.close();
  res.json({ code: 0, data: list });
});

router.get('/herds-latest', auth, (req, res) => {
  const db = getDb();
  const herds = db.prepare('SELECT * FROM herds ORDER BY code').all();
  db.close();
  res.json({ code: 0, data: herds });
});

router.post('/report', auth, (req, res) => {
  const db = getDb();
  const { sheep_id, herd_id, lng, lat, altitude, speed, device_id, battery, signal_strength } = req.body;
  db.prepare('INSERT INTO locations (sheep_id, herd_id, lng, lat, altitude, speed, device_id, battery, signal_strength) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(sheep_id, herd_id, lng, lat, altitude, speed, device_id, battery, signal_strength);
  db.close();
  res.json({ code: 0, msg: '上报成功' });
});

router.get('/fences', auth, (req, res) => {
  const db = getDb();
  const fences = db.prepare('SELECT * FROM fences ORDER BY id').all();
  db.close();
  res.json({ code: 0, data: fences });
});

router.post('/fences', auth, (req, res) => {
  const db = getDb();
  const { name, center_lng, center_lat, radius } = req.body;
  db.prepare('INSERT INTO fences (name, center_lng, center_lat, radius) VALUES (?,?,?,?)').run(name, center_lng, center_lat, radius);
  db.close();
  res.json({ code: 0, msg: '围栏创建成功' });
});

router.get('/boundary-events', auth, (req, res) => {
  const db = getDb();
  const list = db.prepare(`SELECT b.*, h.code as herd_code, s.tag_number, f.name as fence_name FROM boundary_events b LEFT JOIN herds h ON b.herd_id = h.id LEFT JOIN sheep s ON b.sheep_id = s.id LEFT JOIN fences f ON b.fence_id = f.id ORDER BY b.created_at DESC LIMIT 50`).all();
  db.close();
  res.json({ code: 0, data: list });
});

module.exports = router;
