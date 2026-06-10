const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'huiyan-muzong-secret-2026';
const COZE_API_KEY = process.env.COZE_API_KEY || 'coze-huiyan-muzong-2026';

function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ code: 1, msg: '未提供认证信息' });

  const token = authHeader.replace('Bearer ', '');

  // Coze API Key 认证
  if (token === COZE_API_KEY) {
    req.user = { id: 1, username: 'coze-agent', role: '管理员' };
    return next();
  }

  // JWT 认证
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ code: 1, msg: '认证失败' });
  }
}

module.exports = { auth, JWT_SECRET };
