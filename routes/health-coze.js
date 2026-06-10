const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const { auth } = require('../middleware/coze-auth');

const router = express.Router();
const dbPath = path.join(__dirname, '..', 'db', 'database.sqlite');
function getDb() { return new Database(dbPath); }

router.get('/records', auth, (req, res) => {
  const db = getDb();
  const { sheep_id, page = 1, pageSize = 20 } = req.query;
  let sql = `SELECT hr.*, s.tag_number, s.breed, s.health_status FROM health_records hr LEFT JOIN sheep s ON hr.sheep_id = s.id WHERE 1=1`;
  const params = [];
  if (sheep_id) { sql += ' AND hr.sheep_id = ?'; params.push(sheep_id); }
  const total = db.prepare(`SELECT COUNT(*) as c FROM (${sql})`).get(...params).c;
  sql += ' ORDER BY hr.recorded_at DESC LIMIT ? OFFSET ?';
  params.push(+pageSize, (+page - 1) * +pageSize);
  const list = db.prepare(sql).all(...params);
  db.close();
  res.json({ code: 0, data: { list, total, page: +page, pageSize: +pageSize } });
});

router.post('/records', auth, (req, res) => {
  const db = getDb();
  const { sheep_id, temperature, heart_rate, activity_level, rumination, notes } = req.body;
  db.prepare('INSERT INTO health_records (sheep_id, temperature, heart_rate, activity_level, rumination, notes) VALUES (?,?,?,?,?,?)')
    .run(sheep_id, temperature, heart_rate, activity_level, rumination, notes);
  const temp = parseFloat(temperature);
  let status = '健康';
  if (temp >= 39.8) status = '异常';
  else if (temp >= 39.2) status = '观察中';
  db.prepare('UPDATE sheep SET health_status = ? WHERE id = ?').run(status, sheep_id);
  db.close();
  res.json({ code: 0, msg: '记录添加成功' });
});

router.get('/stats', auth, (req, res) => {
  const db = getDb();
  const healthy = db.prepare("SELECT COUNT(*) as c FROM sheep WHERE health_status = '健康'").get().c;
  const watching = db.prepare("SELECT COUNT(*) as c FROM sheep WHERE health_status = '观察中'").get().c;
  const abnormal = db.prepare("SELECT COUNT(*) as c FROM sheep WHERE health_status = '异常'").get().c;
  const vaxCount = db.prepare("SELECT COUNT(*) as c FROM vaccinations WHERE status = '已完成'").get().c;
  db.close();
  res.json({ code: 0, data: { healthy, watching, abnormal, vaxCount } });
});

router.get('/vaccinations', auth, (req, res) => {
  const db = getDb();
  const list = db.prepare('SELECT v.*, h.code as herd_code FROM vaccinations v LEFT JOIN herds h ON v.target_herd_id = h.id ORDER BY v.plan_date').all();
  db.close();
  res.json({ code: 0, data: list });
});

router.post('/vaccinations', auth, (req, res) => {
  const db = getDb();
  const { name, batch_no, target_herd_id, plan_date, operator, notes } = req.body;
  db.prepare('INSERT INTO vaccinations (name, batch_no, target_herd_id, plan_date, operator, notes) VALUES (?,?,?,?,?,?)')
    .run(name, batch_no, target_herd_id, plan_date, operator, notes);
  db.close();
  res.json({ code: 0, msg: '疫苗计划创建成功' });
});

module.exports = router;
