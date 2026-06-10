const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Coze 专用 API Key（在 Railway 环境变量中设置 COZE_API_KEY）
const COZE_API_KEY = process.env.COZE_API_KEY || 'coze-huiyan-muzong-2026';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件（前端UI）
app.use(express.static(path.join(__dirname, 'ui')));

// Coze API Key 认证中间件（支持 JWT 和 Coze API Key 双模式）
const { auth } = require('./routes/auth');
function cozeAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ code: 1, msg: '未提供认证信息' });

  const token = authHeader.replace('Bearer ', '');

  // 优先检查 Coze API Key
  if (token === COZE_API_KEY) {
    req.user = { id: 1, username: 'coze-agent', role: '管理员' };
    return next();
  }

  // 否则走 JWT 验证
  const jwt = require('jsonwebtoken');
  try {
    req.user = jwt.verify(token, require('./routes/auth').JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ code: 1, msg: '认证失败' });
  }
}

// API 路由（使用 cozeAuth 替代原有 auth 中间件）
const { router: authRouter } = require('./routes/auth');
const sheepRouter = require('./routes/sheep-coze');
const locationRouter = require('./routes/location-coze');
const healthRouter = require('./routes/health-coze');
const detectRouter = require('./routes/detect-coze');
const alertRouter = require('./routes/alert-coze');
const traceRouter = require('./routes/trace-coze');
const settingsRouter = require('./routes/settings-coze');

app.use('/api/auth', authRouter);
app.use('/api/sheep', sheepRouter);
app.use('/api/location', locationRouter);
app.use('/api/health', healthRouter);
app.use('/api/detect', detectRouter);
app.use('/api/alert', alertRouter);
app.use('/api/trace', traceRouter);
app.use('/api/settings', settingsRouter);

// SPA fallback
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, 'ui', 'index.html'), err => { if (err) next(err); });
  } else {
    next();
  }
});

app.listen(PORT, () => {
  console.log(`\n🐑 慧眼牧踪智能养殖管理系统已启动`);
  console.log(`   地址: http://localhost:${PORT}`);
  console.log(`   登录: admin / 123456 (管理员)`);
  console.log(`         herdsman / 123456 (牧民)`);
  console.log(`         consumer / 123456 (消费者)`);
  console.log(`   Coze API Key: ${COZE_API_KEY}\n`);
});
