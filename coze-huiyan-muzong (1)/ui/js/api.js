const API = '';

async function request(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  try {
    const res = await fetch(API + url, { ...options, headers });
    const data = await res.json();
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
      return;
    }
    return data;
  } catch (e) {
    console.error('请求失败:', e);
    return { code: 1, msg: '网络请求失败' };
  }
}

const get = (url) => request(url, { method: 'GET' });
const post = (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) });
const put = (url, body) => request(url, { method: 'PUT', body: JSON.stringify(body) });
const del = (url) => request(url, { method: 'DELETE' });

// ===== Toast =====
function showToast(msg, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = 'position:fixed;top:24px;right:24px;z-index:9999;padding:14px 22px;border-radius:10px;color:#fff;font-size:14px;font-weight:500;display:none;align-items:center;gap:8px;box-shadow:0 8px 24px rgba(0,0,0,.2);transition:.4s;transform:translateX(120%)';
    document.body.appendChild(toast);
  }
  toast.textContent = (type === 'success' ? '✅ ' : '⚠️ ') + msg;
  toast.style.background = type === 'success' ? '#2e7d32' : '#d32f2f';
  toast.style.display = 'flex';
  toast.style.transform = 'translateX(0)';
  setTimeout(() => { toast.style.transform = 'translateX(120%)'; setTimeout(() => toast.style.display = 'none', 400); }, 2500);
}

// ===== Modal =====
function showModal(title, bodyHtml, onConfirm) {
  let overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.remove();
  overlay = document.createElement('div');
  overlay.id = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:9000;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:12px;padding:28px;min-width:400px;max-width:90vw;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)">
      <h3 style="font-size:17px;font-weight:600;margin-bottom:16px">${title}</h3>
      <div style="margin-bottom:20px">${bodyHtml}</div>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button id="modal-cancel" style="padding:8px 20px;border:1px solid #e0e0e0;border-radius:8px;background:#fff;cursor:pointer;font-size:13px">取消</button>
        <button id="modal-confirm" style="padding:8px 20px;border:none;border-radius:8px;background:#2e7d32;color:#fff;cursor:pointer;font-size:13px;font-weight:500">确定</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('modal-cancel').onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  if (onConfirm) document.getElementById('modal-confirm').onclick = () => { onConfirm(); };
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.remove();
}

// ===== Auth =====
function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = 'login.html'; return false; }
  return true;
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

// ===== Format =====
function formatTime(str) {
  if (!str) return '-';
  return str.replace('T', ' ').slice(0, 16);
}

function tagClass(status) {
  if (status === '健康' || status === '正常' || status === '在线' || status === '已完成') return 'green';
  if (status === '越界' || status === '异常' || status === '待处理' || status === '紧急') return 'red';
  if (status === '观察中' || status === '关注' || status === '处理中' || status === '警告' || status === '即将到期') return 'yellow';
  if (status === '设备' || status === '计划中') return 'blue';
  return 'green';
}

// ===== Pagination =====
function renderPagination(total, page, pageSize, onPageChange) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return '';
  let html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;font-size:12px;color:#607d8b">';
  html += `<span>共 ${total} 条记录</span><div style="display:flex;gap:6px">`;
  html += `<button class="btn btn-outline" style="padding:4px 10px;font-size:12px" onclick="${onPageChange}(${page-1})" ${page<=1?'disabled':''}>上一页</button>`;
  const start = Math.max(1, page - 2);
  const end = Math.min(pages, page + 2);
  for (let i = start; i <= end; i++) {
    html += `<button class="btn ${i===page?'btn-primary':'btn-outline'}" style="padding:4px 10px;font-size:12px" onclick="${onPageChange}(${i})">${i}</button>`;
  }
  if (end < pages) html += '<span>...</span>';
  html += `<button class="btn btn-outline" style="padding:4px 10px;font-size:12px" onclick="${onPageChange}(${page+1})" ${page>=pages?'disabled':''}>下一页</button>`;
  html += '</div></div>';
  return html;
}

export { get, post, put, del, showToast, showModal, closeModal, checkAuth, getUser, logout, formatTime, tagClass, renderPagination };
