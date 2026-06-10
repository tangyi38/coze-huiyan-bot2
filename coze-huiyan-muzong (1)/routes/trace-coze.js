const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const { auth } = require('../middleware/coze-auth');

const router = express.Router();
const dbPath = path.join(__dirname, '..', 'db', 'database.sqlite');
function getDb() { return new Database(dbPath); }

router.get('/query', auth, (req, res) => {
  const db = getDb();
  const { code } = req.query;
  if (!code) { db.close(); return res.status(400).json({ code: 1, msg: '请输入溯源码' }); }
  const records = db.prepare('SELECT * FROM trace_records WHERE trace_code = ? ORDER BY event_time').all(code);
  if (records.length === 0) {
    const sheep = db.prepare('SELECT * FROM sheep WHERE tag_number = ?').get(code);
    if (sheep) {
      const sheepTraces = db.prepare('SELECT * FROM trace_records WHERE sheep_id = ? ORDER BY event_time').all(sheep.id);
      db.close();
      return res.json({ code: 0, data: { sheep, records: sheepTraces } });
    }
    db.close();
    return res.json({ code: 0, data: null });
  }
  const sheep = db.prepare('SELECT * FROM sheep WHERE id = ?').get(records[0].sheep_id);
  db.close();
  res.json({ code: 0, data: { sheep, records } });
});

router.post('/add', auth, (req, res) => {
  const db = getDb();
  const { sheep_id, trace_code, event_type, event_title, event_desc, operator } = req.body;
  db.prepare('INSERT INTO trace_records (sheep_id, trace_code, event_type, event_title, event_desc, operator) VALUES (?,?,?,?,?,?)')
    .run(sheep_id, trace_code, event_type, event_title, event_desc, operator);
  db.close();
  res.json({ code: 0, msg: '溯源记录添加成功' });
});

router.get('/sheep-code/:id', auth, (req, res) => {
  const db = getDb();
  const sheep = db.prepare('SELECT s.*, h.code as herd_code FROM sheep s LEFT JOIN herds h ON s.herd_id = h.id WHERE s.id = ?').get(req.params.id);
  if (!sheep) { db.close(); return res.status(404).json({ code: 1, msg: '羊只不存在' }); }
  const traceCode = `HYMZ-2026-${sheep.herd_code || 'XX'}-${sheep.tag_number.replace('#', '')}`;
  db.close();
  res.json({ code: 0, data: { traceCode, sheep } });
});

module.exports = router;
