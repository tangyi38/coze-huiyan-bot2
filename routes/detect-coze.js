const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const { auth } = require('../middleware/coze-auth');

const router = express.Router();
const dbPath = path.join(__dirname, '..', 'db', 'database.sqlite');
function getDb() { return new Database(dbPath); }

router.get('/records', auth, (req, res) => {
  const db = getDb();
  const { herd_id, status, page = 1, pageSize = 20 } = req.query;
  let sql = `SELECT d.*, h.code as herd_code, h.name as herd_name FROM detections d LEFT JOIN herds h ON d.herd_id = h.id WHERE 1=1`;
  const params = [];
  if (herd_id) { sql += ' AND d.herd_id = ?'; params.push(herd_id); }
  if (status) { sql += ' AND d.status = ?'; params.push(status); }
  const total = db.prepare(`SELECT COUNT(*) as c FROM (${sql})`).get(...params).c;
  sql += ' ORDER BY d.detected_at DESC LIMIT ? OFFSET ?';
  params.push(+pageSize, (+page - 1) * +pageSize);
  const list = db.prepare(sql).all(...params);
  db.close();
  res.json({ code: 0, data: { list, total, page: +page, pageSize: +pageSize } });
});

router.get('/stats', auth, (req, res) => {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as c FROM detections').get().c;
  const avgConf = db.prepare('SELECT AVG(confidence) as v FROM detections').get().v;
  const abnormal = db.prepare("SELECT COUNT(*) as c FROM detections WHERE status = '异常'").get().c;
  const suspect = db.prepare("SELECT COUNT(*) as c FROM detections WHERE status = '关注'").get().c;
  db.close();
  res.json({ code: 0, data: { totalToday: total, avgConfidence: (avgConf || 0).toFixed(1), misRate: (suspect / Math.max(total, 1) * 100).toFixed(1), suspectDisease: abnormal } });
});

module.exports = router;
