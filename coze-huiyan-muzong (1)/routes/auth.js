const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const path = require('path');

const router = express.Router();
const dbPath = path.join(__dirname, '..', 'db', 'database.sqlite');

function getDb() {
  return new Database(dbPath, { readonly: false });
}

const JWT_SECRET = 'huiyan-muzong-secret-2026';
const JWT_EXPIRES = '24h';

// 登录
router.post('/login', (req, res) => {
  try {
    const db = getDb();
    const { username, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ code: 1, msg: '请输入用户名和密码' });

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) { db.close(); return res.status(401).json({ code: 1, msg: '用户不存在' }); }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) { db.close(); return res.status(401).json({ code: 1, msg: '密码错误' }); }

    if (role && user.role !== role) { db.close(); return res.status(403).json({ code: 1, msg: `该账号角色为${user.role}，非${role}` }); }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    db.close();
    res.json({ code: 0, msg: '登录成功', data: { token, user: { id: user.id, username: user.username, role: user.role, real_name: user.real_name } } });
  } catch (e) {
    res.status(500).json({ code: 1, msg: '服务器错误: ' + e.message });
  }
});

// 注册
router.post('/register', (req, res) => {
  try {
    const db = getDb();
    const { username, password, role, real_name, phone } = req.body;
    if (!username || !password) return res.status(400).json({ code: 1, msg: '请输入用户名和密码' });

    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (exists) { db.close(); return res.status(400).json({ code: 1, msg: '用户名已存在' }); }

    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (username, password, role, real_name, phone) VALUES (?,?,?,?,?)').run(username, hash, role || '牧民', real_name || '', phone || '');
    db.close();
    res.json({ code: 0, msg: '注册成功' });
  } catch (e) {
    res.status(500).json({ code: 1, msg: '服务器错误: ' + e.message });
  }
});

// 获取用户信息
router.get('/info', auth, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, username, role, real_name, phone, created_at FROM users WHERE id = ?').get(req.user.id);
    db.close();
    res.json({ code: 0, data: user });
  } catch (e) {
    res.status(500).json({ code: 1, msg: e.message });
  }
});

// 用户列表
router.get('/list', auth, (req, res) => {
  try {
    const db = getDb();
    const users = db.prepare('SELECT id, username, role, real_name, phone, created_at FROM users').all();
    db.close();
    res.json({ code: 0, data: users });
  } catch (e) {
    res.status(500).json({ code: 1, msg: e.message });
  }
});

function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ code: 1, msg: '未登录' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ code: 1, msg: '登录已过期' });
  }
}

module.exports = { router, auth, JWT_SECRET };
