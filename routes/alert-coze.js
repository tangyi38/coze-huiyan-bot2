const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const { auth } = require('../middleware/coze-auth');

const router = express.Router();
const dbPath = path.join(__dirname, '..', 'db', 'database.sqlite');
function getDb() { return new Database(dbPath); }

router.get('/list', auth, (req, res) => {
  const db = getDb();
  const { type, status, page = 1, pageSize = 20 } = req.query;
  let sql = 'SELECT * FROM alerts WHERE 1=1';
  const params = [];
  if (type) { sql += ' AND type = ?'; params.push(type); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  const total = db.prepare(`SELECT COUNT(*) as c FROM (${sql})`).get(...params).c;
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(+pageSize, (+page - 1) * +pageSize);
  const list = db.prepare(sql).all(...params);
  db.close();
  res.json({ code: 0, data: { list, total, page: +page, pageSize: +pageSize } });
});

router.get('/stats', auth, (req, res) => {
  const db = getDb();
  const boundary = db.prepare("SELECT COUNT(*) as c FROM alerts WHERE type = '越界' AND status = '待处理'").get().c;
  const device = db.prepare("SELECT COUNT(*) as c FROM alerts WHERE type = '设备' AND status != '已处理'").get().c;
  const health = db.prepare("SELECT COUNT(*) as c FROM alerts WHERE type = '健康' AND status != '已处理'").get().c;
  const pending = db.prepare("SELECT COUNT(*) as c FROM alerts WHERE status = '待处理'").get().c;
  const processing = db.prepare("SELECT COUNT(*) as c FROM alerts WHERE status = '处理中'").get().c;
  const done = db.prepare("SELECT COUNT(*) as c FROM alerts WHERE status = '已处理'").get().c;
  db.close();
  res.json({ code: 0, data: { boundary, device, health, pending, processing, done } });
});

router.put('/handle/:id', auth, (req, res) => {
  const db = getDb();
  const { status, handle_note, handler } = req.body;
  db.prepare('UPDATE alerts SET status=?, handle_note=?, handler=?, handle_time=datetime("now","localtime") WHERE id=?')
    .run(status, handle_note, handler, req.params.id);
  db.close();
  res.json({ code: 0, msg: '预警处理成功' });
});

router.post('/create', auth, (req, res) => {
  const db = getDb();
  const { type, level, target_type, target_id, detail } = req.body;
  const count = db.prepare('SELECT COUNT(*) as c FROM alerts').get().c;
  const code = `W-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(count + 1).padStart(3, '0')}`;
  db.prepare('INSERT INTO alerts (code, type, level, target_type, target_id, detail) VALUES (?,?,?,?,?,?)')
    .run(code, type, level, target_type, target_id, detail);
  db.close();
  res.json({ code: 0, msg: '预警创建成功', data: { code } });
});

module.exports = router;
