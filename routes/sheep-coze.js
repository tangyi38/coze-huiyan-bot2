const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const { auth: cozeAuth } = require('../middleware/coze-auth');

const router = express.Router();
const dbPath = path.join(__dirname, '..', 'db', 'database.sqlite');
function getDb() { return new Database(dbPath); }

// 羊群列表
router.get('/herds', cozeAuth, (req, res) => {
  const db = getDb();
  const herds = db.prepare('SELECT * FROM herds ORDER BY code').all();
  db.close();
  res.json({ code: 0, data: herds });
});

// 羊只列表
router.get('/', cozeAuth, (req, res) => {
  const db = getDb();
  const { keyword, breed, health_status, herd_id, page = 1, pageSize = 20 } = req.query;
  let sql = 'SELECT s.*, h.code as herd_code FROM sheep s LEFT JOIN herds h ON s.herd_id = h.id WHERE 1=1';
  const params = [];
  if (keyword) { sql += ' AND (s.tag_number LIKE ? OR s.breed LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
  if (breed) { sql += ' AND s.breed = ?'; params.push(breed); }
  if (health_status) { sql += ' AND s.health_status = ?'; params.push(health_status); }
  if (herd_id) { sql += ' AND s.herd_id = ?'; params.push(herd_id); }
  const total = db.prepare(`SELECT COUNT(*) as c FROM (${sql})`).get(...params).c;
  sql += ' ORDER BY s.id DESC LIMIT ? OFFSET ?';
  params.push(+pageSize, (+page - 1) * +pageSize);
  const list = db.prepare(sql).all(...params);
  db.close();
  res.json({ code: 0, data: { list, total, page: +page, pageSize: +pageSize } });
});

// 羊只详情
router.get('/stats', cozeAuth, (req, res) => {
  const db = getDb();
  const totalSheep = db.prepare('SELECT COUNT(*) as c FROM sheep').get().c;
  const onlineDevices = db.prepare('SELECT COUNT(*) as c FROM devices WHERE online = 1').get().c;
  const totalDevices = db.prepare('SELECT COUNT(*) as c FROM devices').get().c;
  const pendingAlerts = db.prepare("SELECT COUNT(*) as c FROM alerts WHERE status = '待处理'").get().c;
  const healthyCount = db.prepare("SELECT COUNT(*) as c FROM sheep WHERE health_status = '健康'").get().c;
  const watchCount = db.prepare("SELECT COUNT(*) as c FROM sheep WHERE health_status = '观察中'").get().c;
  const abnormalCount = db.prepare("SELECT COUNT(*) as c FROM sheep WHERE health_status = '异常'").get().c;
  db.close();
  res.json({ code: 0, data: { totalSheep, onlineDevices, totalDevices, pendingAlerts, healthyCount, watchCount, abnormalCount } });
});

router.get('/:id', cozeAuth, (req, res) => {
  const db = getDb();
  const sheep = db.prepare('SELECT s.*, h.code as herd_code, h.name as herd_name FROM sheep s LEFT JOIN herds h ON s.herd_id = h.id WHERE s.id = ?').get(req.params.id);
  if (!sheep) { db.close(); return res.status(404).json({ code: 1, msg: '羊只不存在' }); }
  db.close();
  res.json({ code: 0, data: sheep });
});

router.post('/', cozeAuth, (req, res) => {
  const db = getDb();
  const { tag_number, breed, age, weight, gender, health_status, herd_id, pasture, birth_date } = req.body;
  try {
    db.prepare('INSERT INTO sheep (tag_number, breed, age, weight, gender, health_status, herd_id, pasture, birth_date) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(tag_number, breed, age, weight, gender || '雄', health_status || '健康', herd_id, pasture, birth_date);
    db.close();
    res.json({ code: 0, msg: '添加成功' });
  } catch (e) {
    db.close();
    if (e.message.includes('UNIQUE')) return res.status(400).json({ code: 1, msg: '耳标号已存在' });
    res.status(500).json({ code: 1, msg: e.message });
  }
});

router.put('/:id', cozeAuth, (req, res) => {
  const db = getDb();
  const { tag_number, breed, age, weight, gender, health_status, herd_id, pasture, birth_date } = req.body;
  db.prepare('UPDATE sheep SET tag_number=?, breed=?, age=?, weight=?, gender=?, health_status=?, herd_id=?, pasture=?, birth_date=? WHERE id=?')
    .run(tag_number, breed, age, weight, gender, health_status, herd_id, pasture, birth_date, req.params.id);
  db.close();
  res.json({ code: 0, msg: '更新成功' });
});

router.delete('/:id', cozeAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM sheep WHERE id = ?').run(req.params.id);
  db.close();
  res.json({ code: 0, msg: '删除成功' });
});

module.exports = router;
