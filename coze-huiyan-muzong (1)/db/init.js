const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ========== 建表 ==========
db.exec(`
  -- 用户表
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT '牧民',
    real_name TEXT,
    phone TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  -- 羊群表
  CREATE TABLE IF NOT EXISTS herds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    pasture TEXT,
    lng REAL,
    lat REAL,
    status TEXT DEFAULT '在线',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  -- 羊只表
  CREATE TABLE IF NOT EXISTS sheep (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tag_number TEXT UNIQUE NOT NULL,
    breed TEXT,
    age INTEGER,
    weight REAL,
    gender TEXT DEFAULT '雄',
    health_status TEXT DEFAULT '健康',
    herd_id INTEGER,
    pasture TEXT,
    birth_date TEXT,
    entry_date TEXT DEFAULT (date('now','localtime')),
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (herd_id) REFERENCES herds(id)
  );

  -- 定位记录表
  CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sheep_id INTEGER,
    herd_id INTEGER,
    lng REAL,
    lat REAL,
    altitude REAL,
    speed REAL,
    device_id TEXT,
    battery INTEGER DEFAULT 100,
    signal_strength INTEGER DEFAULT 90,
    recorded_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (sheep_id) REFERENCES sheep(id),
    FOREIGN KEY (herd_id) REFERENCES herds(id)
  );

  -- 电子围栏表
  CREATE TABLE IF NOT EXISTS fences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    center_lng REAL,
    center_lat REAL,
    radius REAL DEFAULT 5000,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  -- 越界记录表
  CREATE TABLE IF NOT EXISTS boundary_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    herd_id INTEGER,
    sheep_id INTEGER,
    fence_id INTEGER,
    distance REAL,
    lng REAL,
    lat REAL,
    status TEXT DEFAULT '待处理',
    handler TEXT,
    handle_time TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (herd_id) REFERENCES herds(id),
    FOREIGN KEY (fence_id) REFERENCES fences(id)
  );

  -- 健康监测记录表
  CREATE TABLE IF NOT EXISTS health_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sheep_id INTEGER,
    temperature REAL,
    heart_rate INTEGER,
    activity_level TEXT DEFAULT '正常',
    rumination INTEGER,
    notes TEXT,
    recorded_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (sheep_id) REFERENCES sheep(id)
  );

  -- 疫苗接种表
  CREATE TABLE IF NOT EXISTS vaccinations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    batch_no TEXT,
    target_herd_id INTEGER,
    target_sheep_ids TEXT,
    plan_date TEXT,
    done_date TEXT,
    status TEXT DEFAULT '计划中',
    operator TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  -- AI识别记录表
  CREATE TABLE IF NOT EXISTS detections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    herd_id INTEGER,
    result TEXT,
    confidence REAL,
    detail TEXT,
    image_path TEXT,
    status TEXT DEFAULT '正常',
    detected_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (herd_id) REFERENCES herds(id)
  );

  -- 预警表
  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    type TEXT NOT NULL,
    level TEXT DEFAULT '警告',
    target_type TEXT,
    target_id TEXT,
    detail TEXT,
    status TEXT DEFAULT '待处理',
    handler TEXT,
    handle_note TEXT,
    handle_time TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  -- 溯源记录表
  CREATE TABLE IF NOT EXISTS trace_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sheep_id INTEGER,
    trace_code TEXT,
    event_type TEXT NOT NULL,
    event_title TEXT NOT NULL,
    event_desc TEXT,
    event_time TEXT DEFAULT (datetime('now','localtime')),
    operator TEXT,
    FOREIGN KEY (sheep_id) REFERENCES sheep(id)
  );

  -- 设备表
  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT UNIQUE NOT NULL,
    type TEXT DEFAULT '定位终端',
    sheep_id INTEGER,
    firmware TEXT DEFAULT 'v2.4.1',
    battery INTEGER DEFAULT 100,
    online INTEGER DEFAULT 1,
    last_active TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (sheep_id) REFERENCES sheep(id)
  );

  -- 系统设置表
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// ========== 插入初始数据 ==========
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (userCount === 0) {
  const pwd = bcrypt.hashSync('123456', 10);
  const insertUser = db.prepare('INSERT INTO users (username, password, role, real_name, phone) VALUES (?,?,?,?,?)');
  insertUser.run('admin', pwd, '管理员', '唐毅', '13800001109');
  insertUser.run('herdsman', pwd, '牧民', '陈智', '13800001084');
  insertUser.run('consumer', pwd, '消费者', '杨帅', '13800001087');

  // 围栏
  const insertFence = db.prepare('INSERT INTO fences (name, center_lng, center_lat, radius) VALUES (?,?,?,?)');
  insertFence.run('北区牧场围栏', 103.28, 30.48, 5000);
  insertFence.run('东区牧场围栏', 103.35, 30.50, 4000);
  insertFence.run('南区牧场围栏', 103.25, 30.42, 6000);

  // 羊群
  const insertHerd = db.prepare('INSERT INTO herds (code, name, count, pasture, lng, lat, status) VALUES (?,?,?,?,?,?,?)');
  insertHerd.run('A-01', '北一群', 526, '阿坝红原', 103.25, 30.47, '在线');
  insertHerd.run('A-02', '北二群', 412, '阿坝红原', 103.31, 30.52, '在线');
  insertHerd.run('A-03', '东一群', 389, '阿坝若尔盖', 103.40, 30.49, '越界');
  insertHerd.run('B-06', '南一群', 298, '甘孜色达', 103.22, 30.55, '在线');
  insertHerd.run('B-07', '南二群', 355, '甘孜色达', 103.45, 30.38, '越界');
  insertHerd.run('C-10', '西一群', 268, '凉山昭觉', 103.18, 30.60, '在线');

  // 羊只
  const breeds = ['藏羊', '内蒙古细毛羊', '小尾寒羊', '滩羊'];
  const statuses = ['健康', '健康', '健康', '健康', '健康', '健康', '健康', '健康', '观察中', '异常'];
  const insertSheep = db.prepare('INSERT INTO sheep (tag_number, breed, age, weight, gender, health_status, herd_id, pasture, birth_date) VALUES (?,?,?,?,?,?,?,?,?)');
  for (let i = 1; i <= 200; i++) {
    const tag = String(i).padStart(4, '0');
    const breed = breeds[i % breeds.length];
    const age = 1 + (i % 6);
    const weight = (35 + Math.random() * 30).toFixed(1);
    const gender = i % 3 === 0 ? '雌' : '雄';
    const status = statuses[i % statuses.length];
    const herdId = 1 + (i % 6);
    const pasture = ['阿坝红原', '阿坝若尔盖', '甘孜色达', '凉山昭觉'][i % 4];
    const birthYear = 2020 + (i % 5);
    insertSheep.run(`#${tag}`, breed, age, weight, gender, status, herdId, pasture, `${birthYear}-03-${String(10 + i % 20).padStart(2, '0')}`);
  }

  // 定位记录
  const insertLoc = db.prepare('INSERT INTO locations (sheep_id, herd_id, lng, lat, altitude, speed, device_id, battery, signal_strength) VALUES (?,?,?,?,?,?,?,?,?)');
  for (let i = 1; i <= 60; i++) {
    const herdId = 1 + (i % 6);
    const baseLng = 103.15 + Math.random() * 0.35;
    const baseLat = 30.35 + Math.random() * 0.30;
    insertLoc.run(i, herdId, baseLng, baseLat, 3200 + Math.random() * 800, Math.random() * 2, `D-${String(2000 + i).padStart(4, '0')}`, 10 + Math.floor(Math.random() * 90), 60 + Math.floor(Math.random() * 40));
  }

  // 设备
  const insertDevice = db.prepare('INSERT INTO devices (device_id, type, sheep_id, firmware, battery, online) VALUES (?,?,?,?,?,?)');
  for (let i = 1; i <= 100; i++) {
    const did = `D-${String(2000 + i).padStart(4, '0')}`;
    insertDevice.run(did, '定位终端', i, 'v2.4.1', 10 + Math.floor(Math.random() * 90), Math.random() > 0.02 ? 1 : 0);
  }

  // 健康记录
  const insertHealth = db.prepare('INSERT INTO health_records (sheep_id, temperature, heart_rate, activity_level, rumination, notes) VALUES (?,?,?,?,?,?)');
  for (let i = 1; i <= 50; i++) {
    const temp = (38.0 + Math.random() * 2.5).toFixed(1);
    const hr = 70 + Math.floor(Math.random() * 50);
    const act = temp > 39.8 ? '极低' : temp > 39.2 ? '偏低' : '正常';
    const rum = 300 + Math.floor(Math.random() * 200);
    insertHealth.run(i, temp, hr, act, rum, temp > 39.8 ? '体温偏高，需关注' : '');
  }

  // 疫苗
  const insertVax = db.prepare('INSERT INTO vaccinations (name, batch_no, target_herd_id, plan_date, done_date, status, operator) VALUES (?,?,?,?,?,?,?)');
  insertVax.run('口蹄疫疫苗', 'V2026-FMD-015', 1, '2026-06-05', null, '即将到期', '陈智');
  insertVax.run('炭疽疫苗', 'V2026-ANT-008', 4, '2026-05-28', '2026-05-28', '已完成', '陈智');
  insertVax.run('布鲁氏菌疫苗', 'V2026-BRU-012', null, '2026-06-15', null, '计划中', '待安排');
  insertVax.run('口蹄疫疫苗', 'V2026-FMD-016', 2, '2026-06-10', null, '计划中', '待安排');

  // AI识别
  const insertDet = db.prepare('INSERT INTO detections (herd_id, result, confidence, detail, status) VALUES (?,?,?,?,?)');
  const detData = [
    [1, '正常活动 · 526只', 96.8, '全部个体行为正常', '正常'],
    [3, '检测到离群个体', 89.2, '1只羊偏离主群约200m', '关注'],
    [4, '疑似跛行个体 #0284', 91.5, '步态异常，建议人工确认', '异常'],
    [2, '正常活动 · 412只', 97.1, '全部个体行为正常', '正常'],
    [5, '疑似体温异常 #0384', 88.7, '红外热成像显示体温偏高', '异常'],
    [6, '正常活动 · 268只', 95.3, '全部个体行为正常', '正常'],
  ];
  detData.forEach(d => insertDet.run(...d));

  // 预警
  const insertAlert = db.prepare('INSERT INTO alerts (code, type, level, target_type, target_id, detail, status) VALUES (?,?,?,?,?,?,?)');
  const alertData = [
    ['W-20260604-001', '越界', '紧急', '羊群', 'A-03', '超出围栏320m', '待处理'],
    ['W-20260604-002', '越界', '紧急', '羊群', 'B-07', '超出围栏150m', '待处理'],
    ['W-20260604-003', '设备', '警告', '设备', 'D-0217', '低电量 15%', '处理中'],
    ['W-20260604-004', '健康', '警告', '羊只', '#0038', '体温 40.2°C', '处理中'],
    ['W-20260604-005', '设备', '警告', '设备', 'D-0183', '离线 >30min', '已处理'],
    ['W-20260604-006', '健康', '紧急', '羊只', '#0091', '体温 40.5°C，心率异常', '待处理'],
    ['W-20260604-007', '越界', '警告', '羊群', 'A-03', '超出围栏80m（已回归）', '已处理'],
  ];
  alertData.forEach(a => insertAlert.run(...a));

  // 溯源
  const insertTrace = db.prepare('INSERT INTO trace_records (sheep_id, trace_code, event_type, event_title, event_desc, event_time, operator) VALUES (?,?,?,?,?,?,?)');
  const traceData = [
    [1, 'HYMZ-2026-A01-0001', '出生', '出生登记', '藏羊 · 雄性 · 出生体重3.2kg · 牧场：阿坝红原牧场', '2023-03-15 08:30', '系统'],
    [1, 'HYMZ-2026-A01-0001', '疫苗', '疫苗接种', '口蹄疫疫苗（批次 V2023-FMD-015）· 炭疽疫苗（批次 V2023-ANT-008）', '2023-04-20 10:00', '陈智'],
    [1, 'HYMZ-2026-A01-0001', '体检', '健康检查', '体温38.5°C · 心率84bpm · 体重48.2kg · 状态：健康', '2026-05-15 14:00', '系统'],
    [1, 'HYMZ-2026-A01-0001', '定位', '定位记录', '全程在围栏内活动 · 无越界记录 · 活动范围正常', '2026-03-01 00:00', '系统'],
    [1, 'HYMZ-2026-A01-0001', '质检', '质检合格', '肉质检测合格 · 无药物残留 · 符合食品安全标准', '2026-06-01 09:00', '质检员'],
  ];
  traceData.forEach(t => insertTrace.run(...t));

  // 设置
  const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?,?)');
  insertSetting.run('fence_threshold', '100');
  insertSetting.run('battery_threshold', '15');
  insertSetting.run('temp_threshold', '39.8');
  insertSetting.run('offline_timeout', '30');
  insertSetting.run('db_info', 'SQLite 3 / MySQL 8.0');
  insertSetting.run('backup_time', '每日 23:00');
  insertSetting.run('backup_interval', '6');
  insertSetting.run('backup_retention', '30');
}

console.log('数据库初始化完成！');
console.log('用户: admin / 123456 (管理员)');
console.log('用户: herdsman / 123456 (牧民)');
console.log('用户: consumer / 123456 (消费者)');

db.close();
