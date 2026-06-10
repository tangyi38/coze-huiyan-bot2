const API = '';

async function api(url, opts = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  try {
    const res = await fetch(API + url, { ...opts, headers });
    const data = await res.json();
    if (res.status === 401) { localStorage.clear(); location.href = 'login.html'; return; }
    return data;
  } catch (e) { return { code: 1, msg: '网络错误' }; }
}
const GET = url => api(url);
const POST = (url, b) => api(url, { method: 'POST', body: JSON.stringify(b) });
const PUT = (url, b) => api(url, { method: 'PUT', body: JSON.stringify(b) });
const DEL = url => api(url, { method: 'DELETE' });

// Toast
function toast(msg, ok = true) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.style.cssText = 'position:fixed;top:24px;right:24px;z-index:9999;padding:14px 22px;border-radius:10px;color:#fff;font-size:14px;font-weight:500;box-shadow:0 8px 24px rgba(0,0,0,.2);transition:transform .4s;transform:translateX(120%)'; document.body.appendChild(t); }
  t.textContent = (ok ? '✅ ' : '⚠️ ') + msg;
  t.style.background = ok ? '#2e7d32' : '#d32f2f';
  t.style.display = 'flex'; t.style.transform = 'translateX(0)';
  setTimeout(() => { t.style.transform = 'translateX(120%)'; setTimeout(() => t.style.display = 'none', 400); }, 2500);
}

// Modal
function modal(title, body, onOk) {
  let ov = document.getElementById('m-ov'); if (ov) ov.remove();
  ov = document.createElement('div'); ov.id = 'm-ov';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:9000;display:flex;align-items:center;justify-content:center';
  ov.innerHTML = `<div style="background:#fff;border-radius:12px;padding:28px;min-width:420px;max-width:90vw;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)">
    <h3 style="font-size:17px;font-weight:600;margin-bottom:16px">${title}</h3>
    <div id="m-body" style="margin-bottom:20px">${body}</div>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button onclick="document.getElementById('m-ov').remove()" style="padding:8px 20px;border:1px solid #e0e0e0;border-radius:8px;background:#fff;cursor:pointer;font-size:13px">取消</button>
      <button id="m-ok" style="padding:8px 20px;border:none;border-radius:8px;background:#2e7d32;color:#fff;cursor:pointer;font-size:13px;font-weight:500">确定</button>
    </div></div>`;
  document.body.appendChild(ov);
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  if (onOk) document.getElementById('m-ok').onclick = onOk;
}
function closeModal() { const o = document.getElementById('m-ov'); if (o) o.remove(); }

// Tag
function tag(s) {
  let c = 'green';
  if (['越界','异常','待处理','紧急'].includes(s)) c = 'red';
  else if (['观察中','关注','处理中','警告','即将到期'].includes(s)) c = 'yellow';
  else if (['设备','计划中'].includes(s)) c = 'blue';
  return `<span class="tag ${c}">${s}</span>`;
}

// Pagination
function pagi(total, page, ps, fn) {
  const pages = Math.ceil(total / ps); if (pages <= 1) return '';
  let h = `<div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;font-size:12px;color:#607d8b"><span>共 ${total} 条</span><div style="display:flex;gap:6px">`;
  h += `<button class="btn btn-outline" style="padding:4px 10px;font-size:12px" onclick="${fn}(${page-1})" ${page<=1?'disabled':''}>上一页</button>`;
  for (let i = Math.max(1,page-2); i <= Math.min(pages,page+2); i++)
    h += `<button class="btn ${i===page?'btn-primary':'btn-outline'}" style="padding:4px 10px;font-size:12px" onclick="${fn}(${i})">${i}</button>`;
  h += `<button class="btn btn-outline" style="padding:4px 10px;font-size:12px" onclick="${fn}(${page+1})" ${page>=pages?'disabled':''}>下一页</button></div></div>`;
  return h;
}

// Input helper
function inp(id, label, val, ph, type) {
  return `<div style="margin-bottom:14px"><label style="display:block;font-size:13px;font-weight:500;margin-bottom:4px">${label}</label><input id="${id}" type="${type||'text'}" value="${val||''}" placeholder="${ph||''}" style="width:100%;padding:8px 12px;border:1px solid #e0e0e0;border-radius:6px;font-size:13px;outline:none"></div>`;
}
function sel(id, label, options, val) {
  let h = `<div style="margin-bottom:14px"><label style="display:block;font-size:13px;font-weight:500;margin-bottom:4px">${label}</label><select id="${id}" style="width:100%;padding:8px;border:1px solid #e0e0e0;border-radius:6px;font-size:13px">`;
  options.forEach(o => { const v = typeof o === 'object' ? o.value : o; const l = typeof o === 'object' ? o.label : o; h += `<option value="${v}" ${v==val?'selected':''}>${l}</option>`; });
  h += '</select></div>'; return h;
}

// ===== Dashboard =====
async function loadDashboard() {
  const r = await GET('/api/sheep/stats');
  if (!r || r.code) return;
  const d = r.data;
  const onlineRate = d.totalDevices ? (d.onlineDevices / d.totalDevices * 100).toFixed(1) : 0;
  const healthRate = d.totalSheep ? (d.healthyCount / d.totalSheep * 100).toFixed(1) : 0;
  const watchRate = d.totalSheep ? (d.watchCount / d.totalSheep * 100).toFixed(1) : 0;

  document.getElementById('dash-stats').innerHTML = `
    <div class="stat-card"><div class="stat-icon green">🐑</div><div class="stat-info"><h3>${d.totalSheep.toLocaleString()}</h3><p>羊只总数</p></div></div>
    <div class="stat-card"><div class="stat-icon blue">📡</div><div class="stat-info"><h3>${d.onlineDevices.toLocaleString()}</h3><p>在线设备</p><div class="trend up">在线率 ${onlineRate}%</div></div></div>
    <div class="stat-card"><div class="stat-icon orange">⚠️</div><div class="stat-info"><h3>${d.pendingAlerts}</h3><p>待处理预警</p></div></div>
    <div class="stat-card"><div class="stat-icon red">🚨</div><div class="stat-info"><h3>${d.boundaryAlerts}</h3><p>越界告警</p></div></div>`;

  // 预警列表
  const ar = await GET('/api/alert/list?pageSize=5');
  let alertHtml = '';
  if (ar && ar.code === 0 && ar.data.list.length) {
    ar.data.list.forEach(a => {
      const isDanger = a.level === '紧急';
      alertHtml += `<div class="alert-item ${isDanger?'danger':''}">
        <span class="alert-icon">${isDanger?'🔴':'🟡'}</span>
        <div class="alert-text"><div class="alert-title">${a.type} · ${a.target_type} ${a.target_id}</div><div class="alert-desc">${a.detail}</div></div>
        <span class="alert-time">${a.created_at?.slice(11,16)||''}</span></div>`;
    });
  } else { alertHtml = '<div style="padding:20px;text-align:center;color:#999">暂无预警</div>'; }
  document.getElementById('dash-alerts').innerHTML = alertHtml;

  // 健康概览
  document.getElementById('dash-health').innerHTML = `
    <div class="health-grid">
      <div class="health-item"><div class="val" style="color:var(--primary)">${healthRate}%</div><div class="lbl">健康率</div></div>
      <div class="health-item"><div class="val" style="color:var(--warning)">${watchRate}%</div><div class="lbl">观察中</div></div>
      <div class="health-item"><div class="val" style="color:var(--danger)">${d.abnormalCount}</div><div class="lbl">异常</div></div>
      <div class="health-item"><div class="val" style="color:var(--info)">${d.totalSheep}</div><div class="lbl">总羊只</div></div>
    </div>`;

  // 位置地图点
  const lr = await GET('/api/location/herds-latest');
  let dots = '';
  if (lr && lr.code === 0) {
    lr.data.forEach(h => {
      const left = ((h.lng - 103.1) / 0.5 * 100);
      const top = ((h.lat - 30.3) / 0.4 * 100);
      const cls = h.status === '越界' ? 'map-dot alert' : 'map-dot';
      dots += `<div class="${cls}" style="top:${Math.min(85,Math.max(10,top))}%;left:${Math.min(90,Math.max(5,left))}%" title="${h.code} ${h.name}"></div>`;
    });
  }
  document.getElementById('map-dots-dash').innerHTML = dots;
}

// ===== Sheep Management =====
let sheepPage = 1;
async function loadSheep(page) {
  sheepPage = page || sheepPage;
  const keyword = document.getElementById('sheep-kw')?.value || '';
  const breed = document.getElementById('sheep-breed')?.value || '';
  const health = document.getElementById('sheep-health')?.value || '';
  let url = `/api/sheep?page=${sheepPage}&pageSize=15`;
  if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
  if (breed) url += `&breed=${encodeURIComponent(breed)}`;
  if (health) url += `&health_status=${encodeURIComponent(health)}`;
  const r = await GET(url);
  if (!r || r.code) return;
  const { list, total } = r.data;
  let html = `<table class="data-table"><thead><tr><th>耳标号</th><th>品种</th><th>年龄</th><th>体重(kg)</th><th>性别</th><th>健康</th><th>羊群</th><th>牧场</th><th>出生日期</th><th>操作</th></tr></thead><tbody>`;
  list.forEach(s => {
    html += `<tr><td>${s.tag_number}</td><td>${s.breed}</td><td>${s.age}岁</td><td>${s.weight}</td><td>${s.gender}</td><td>${tag(s.health_status)}</td><td>${s.herd_code||'-'}</td><td>${s.pasture||'-'}</td><td>${s.birth_date||'-'}</td>
    <td><span style="color:var(--primary);cursor:pointer;margin-right:8px" onclick="editSheep(${s.id})">编辑</span><span style="color:var(--danger);cursor:pointer" onclick="deleteSheep(${s.id})">删除</span></td></tr>`;
  });
  html += '</tbody></table>';
  html += pagi(total, sheepPage, 15, 'loadSheep');
  document.getElementById('sheep-table').innerHTML = html;
}

function addSheep() {
  const breeds = ['藏羊','内蒙古细毛羊','小尾寒羊','滩羊'];
  let body = inp('s-tag','耳标号','','如 #0201');
  body += sel('s-breed','品种',breeds,'藏羊');
  body += inp('s-age','年龄','','如 3');
  body += inp('s-weight','体重(kg)','','如 50.5');
  body += sel('s-gender','性别',[{value:'雄',label:'雄'},{value:'雌',label:'雌'}],'雄');
  body += sel('s-health','健康状态',['健康','观察中','异常'],'健康');
  body += inp('s-pasture','牧场','','如 阿坝红原');
  body += inp('s-birth','出生日期','','YYYY-MM-DD','date');
  modal('添加羊只', body, async () => {
    const data = {
      tag_number: document.getElementById('s-tag').value,
      breed: document.getElementById('s-breed').value,
      age: parseInt(document.getElementById('s-age').value) || 1,
      weight: parseFloat(document.getElementById('s-weight').value) || 0,
      gender: document.getElementById('s-gender').value,
      health_status: document.getElementById('s-health').value,
      herd_id: 1, pasture: document.getElementById('s-pasture').value,
      birth_date: document.getElementById('s-birth').value
    };
    const r = await POST('/api/sheep', data);
    if (r && r.code === 0) { toast('添加成功'); closeModal(); loadSheep(); }
    else toast(r?.msg || '添加失败', false);
  });
}

async function editSheep(id) {
  const r = await GET(`/api/sheep/${id}`);
  if (!r || r.code) return;
  const s = r.data;
  const breeds = ['藏羊','内蒙古细毛羊','小尾寒羊','滩羊'];
  let body = inp('s-tag','耳标号',s.tag_number);
  body += sel('s-breed','品种',breeds,s.breed);
  body += inp('s-age','年龄',s.age);
  body += inp('s-weight','体重(kg)',s.weight);
  body += sel('s-gender','性别',[{value:'雄',label:'雄'},{value:'雌',label:'雌'}],s.gender);
  body += sel('s-health','健康状态',['健康','观察中','异常'],s.health_status);
  body += inp('s-pasture','牧场',s.pasture);
  body += inp('s-birth','出生日期',s.birth_date,'YYYY-MM-DD','date');
  modal('编辑羊只', body, async () => {
    const data = {
      tag_number: document.getElementById('s-tag').value,
      breed: document.getElementById('s-breed').value,
      age: parseInt(document.getElementById('s-age').value) || 1,
      weight: parseFloat(document.getElementById('s-weight').value) || 0,
      gender: document.getElementById('s-gender').value,
      health_status: document.getElementById('s-health').value,
      herd_id: s.herd_id, pasture: document.getElementById('s-pasture').value,
      birth_date: document.getElementById('s-birth').value
    };
    const r2 = await PUT(`/api/sheep/${id}`, data);
    if (r2 && r2.code === 0) { toast('更新成功'); closeModal(); loadSheep(); }
    else toast(r2?.msg || '更新失败', false);
  });
}

function deleteSheep(id) {
  if (!confirm('确定删除该羊只记录？')) return;
  DEL(`/api/sheep/${id}`).then(r => {
    if (r && r.code === 0) { toast('删除成功'); loadSheep(); }
    else toast(r?.msg || '删除失败', false);
  });
}

// ===== Location =====
async function loadLocation() {
  const hr = await GET('/api/location/herds-latest');
  let dots = '';
  if (hr && hr.code === 0) {
    hr.data.forEach(h => {
      const left = ((h.lng - 103.1) / 0.5 * 100);
      const top = ((h.lat - 30.3) / 0.4 * 100);
      const cls = h.status === '越界' ? 'map-dot alert' : 'map-dot';
      dots += `<div class="${cls}" style="top:${Math.min(85,Math.max(10,top))}%;left:${Math.min(90,Math.max(5,left))}%" title="${h.code} ${h.name} · ${h.count}只"></div>`;
    });
  }
  document.getElementById('loc-map-dots').innerHTML = dots;

  // 羊群位置表
  let thtml = '<table class="data-table"><thead><tr><th>羊群编号</th><th>名称</th><th>羊只数</th><th>经度</th><th>纬度</th><th>状态</th><th>牧场</th></tr></thead><tbody>';
  if (hr && hr.code === 0) {
    hr.data.forEach(h => {
      thtml += `<tr><td>${h.code}</td><td>${h.name}</td><td>${h.count}</td><td>${h.lng?.toFixed(2)}</td><td>${h.lat?.toFixed(2)}</td><td>${tag(h.status)}</td><td>${h.pasture||'-'}</td></tr>`;
    });
  }
  thtml += '</tbody></table>';
  document.getElementById('loc-table').innerHTML = thtml;

  // 围栏
  const fr = await GET('/api/location/fences');
  let fhtml = '';
  if (fr && fr.code === 0) {
    fr.data.forEach(f => {
      fhtml += `<div style="padding:12px;border-radius:8px;background:#f1f8e9;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">
        <div><strong>${f.name}</strong><br><span style="font-size:12px;color:#607d8b">中心: ${f.center_lng}°, ${f.center_lat}° · 半径: ${f.radius}m · ${f.enabled?'启用':'停用'}</span></div>
        <div><button class="btn btn-outline" style="padding:4px 10px;font-size:11px" onclick="editFence(${f.id})">编辑</button> <button class="btn btn-outline" style="padding:4px 10px;font-size:11px;color:var(--danger)" onclick="deleteFence(${f.id})">删除</button></div></div>`;
    });
  }
  document.getElementById('fence-list').innerHTML = fhtml || '<div style="padding:20px;text-align:center;color:#999">暂无围栏</div>';
}

function addFence() {
  let body = inp('f-name','围栏名称','','如 北区牧场围栏');
  body += inp('f-lng','中心经度','','103.28');
  body += inp('f-lat','中心纬度','','30.48');
  body += inp('f-radius','围栏半径(m)','','5000');
  modal('添加电子围栏', body, async () => {
    const data = { name: document.getElementById('f-name').value, center_lng: parseFloat(document.getElementById('f-lng').value), center_lat: parseFloat(document.getElementById('f-lat').value), radius: parseInt(document.getElementById('f-radius').value) || 5000 };
    const r = await POST('/api/location/fences', data);
    if (r && r.code === 0) { toast('围栏创建成功'); closeModal(); loadLocation(); }
    else toast(r?.msg || '创建失败', false);
  });
}

function editFence(id) {
  GET('/api/location/fences').then(fr => {
    const f = fr?.data?.find(x => x.id === id); if (!f) return;
    let body = inp('f-name','围栏名称',f.name);
    body += inp('f-lng','中心经度',f.center_lng);
    body += inp('f-lat','中心纬度',f.center_lat);
    body += inp('f-radius','围栏半径(m)',f.radius);
    modal('编辑围栏', body, async () => {
      const data = { name: document.getElementById('f-name').value, center_lng: parseFloat(document.getElementById('f-lng').value), center_lat: parseFloat(document.getElementById('f-lat').value), radius: parseInt(document.getElementById('f-radius').value) || 5000, enabled: true };
      const r = await PUT(`/api/location/fences/${id}`, data);
      if (r && r.code === 0) { toast('更新成功'); closeModal(); loadLocation(); }
      else toast(r?.msg || '更新失败', false);
    });
  });
}

function deleteFence(id) {
  if (!confirm('确定删除该围栏？')) return;
  DEL(`/api/location/fences/${id}`).then(r => { if (r?.code===0) { toast('删除成功'); loadLocation(); } });
}

// ===== Detection =====
async function loadDetect() {
  const sr = await GET('/api/detect/stats');
  if (sr && sr.code === 0) {
    const s = sr.data;
    document.getElementById('detect-stats').innerHTML = `
      <div class="stat-card"><div class="stat-icon green">🎯</div><div class="stat-info"><h3>${s.avgConfidence}%</h3><p>平均置信度</p></div></div>
      <div class="stat-card"><div class="stat-icon blue">📸</div><div class="stat-info"><h3>${s.totalToday}</h3><p>识别记录数</p></div></div>
      <div class="stat-card"><div class="stat-icon orange">⚠️</div><div class="stat-info"><h3>${s.misRate}%</h3><p>关注率</p></div></div>
      <div class="stat-card"><div class="stat-icon red">🔬</div><div class="stat-info"><h3>${s.suspectDisease}</h3><p>疑似异常标记</p></div></div>`;
  }

  const dr = await GET('/api/detect/records?pageSize=10');
  let dhtml = '<table class="data-table"><thead><tr><th>羊群</th><th>识别结果</th><th>置信度</th><th>详情</th><th>状态</th><th>检测时间</th></tr></thead><tbody>';
  if (dr && dr.code === 0) {
    dr.data.list.forEach(d => {
      dhtml += `<tr><td>${d.herd_code||'-'}</td><td>${d.result}</td><td>${d.confidence}%</td><td>${d.detail||'-'}</td><td>${tag(d.status)}</td><td>${d.detected_at?.slice(0,16)||'-'}</td></tr>`;
    });
  }
  dhtml += '</tbody></table>';
  document.getElementById('detect-table').innerHTML = dhtml;
}

function reportDetection() {
  let body = sel('d-herd','羊群',[{value:1,label:'A-01 北一群'},{value:2,label:'A-02 北二群'},{value:3,label:'A-03 东一群'},{value:4,label:'B-06 南一群'},{value:5,label:'B-07 南二群'},{value:6,label:'C-10 西一群'}]);
  body += inp('d-result','识别结果','','如 正常活动 · 526只');
  body += inp('d-conf','置信度(%)','','如 96.8');
  body += inp('d-detail','详情','','');
  body += sel('d-status','状态',['正常','关注','异常'],'正常');
  modal('上报识别结果', body, async () => {
    const data = { herd_id: parseInt(document.getElementById('d-herd').value), result: document.getElementById('d-result').value, confidence: parseFloat(document.getElementById('d-conf').value) || 90, detail: document.getElementById('d-detail').value, status: document.getElementById('d-status').value };
    const r = await POST('/api/detect/report', data);
    if (r && r.code === 0) { toast('上报成功'); closeModal(); loadDetect(); }
    else toast(r?.msg || '上报失败', false);
  });
}

// ===== Health =====
let healthPage = 1;
async function loadHealth(page) {
  healthPage = page || healthPage;
  const sr = await GET('/api/health/stats');
  if (sr && sr.code === 0) {
    const s = sr.data;
    document.getElementById('health-stats').innerHTML = `
      <div class="stat-card"><div class="stat-icon green">💚</div><div class="stat-info"><h3>${s.healthy}</h3><p>健康羊只</p></div></div>
      <div class="stat-card"><div class="stat-icon orange">🩺</div><div class="stat-info"><h3>${s.watching}</h3><p>观察中</p></div></div>
      <div class="stat-card"><div class="stat-icon red">🩸</div><div class="stat-info"><h3>${s.abnormal}</h3><p>异常羊只</p></div></div>
      <div class="stat-card"><div class="stat-icon blue">💉</div><div class="stat-info"><h3>${s.vaxCount}</h3><p>已完成疫苗</p></div></div>`;
  }

  const hr = await GET(`/api/health/records?page=${healthPage}&pageSize=15`);
  let hhtml = '<table class="data-table"><thead><tr><th>羊只</th><th>品种</th><th>体温</th><th>心率</th><th>活动量</th><th>反刍(次)</th><th>备注</th><th>时间</th></tr></thead><tbody>';
  if (hr && hr.code === 0) {
    hr.data.list.forEach(h => {
      const tColor = h.temperature >= 39.8 ? 'var(--danger)' : h.temperature >= 39.2 ? 'var(--warning)' : 'inherit';
      const hColor = h.heart_rate > 110 ? 'var(--danger)' : h.heart_rate > 100 ? 'var(--warning)' : 'inherit';
      hhtml += `<tr><td>${h.tag_number||'-'}</td><td>${h.breed||'-'}</td><td style="color:${tColor}">${h.temperature}°C</td><td style="color:${hColor}">${h.heart_rate}bpm</td><td>${h.activity_level}</td><td>${h.rumination||'-'}</td><td>${h.notes||'-'}</td><td>${h.recorded_at?.slice(0,16)||'-'}</td></tr>`;
    });
  }
  hhtml += '</tbody></table>';
  hhtml += pagi(hr?.data?.total||0, healthPage, 15, 'loadHealth');
  document.getElementById('health-table').innerHTML = hhtml;

  // 疫苗
  const vr = await GET('/api/health/vaccinations');
  let vhtml = '';
  if (vr && vr.code === 0) {
    vr.data.forEach(v => {
      let bg = '#e8f5e9', bc = 'var(--primary)', icon = '✅';
      if (v.status === '即将到期') { bg = '#fff8e1'; bc = 'var(--warning)'; icon = '⏰'; }
      else if (v.status === '计划中') { bg = '#e3f2fd'; bc = 'var(--info)'; icon = '📅'; }
      else if (v.status === '已完成') { icon = '✅'; }
      vhtml += `<div style="margin-bottom:10px;padding:10px;border-radius:6px;background:${bg};border-left:3px solid ${bc}">
        <div style="font-size:13px;font-weight:600">${icon} ${v.status}：${v.name}</div>
        <div style="font-size:12px;color:#607d8b;margin-top:2px">批次 ${v.batch_no||'-'} · ${v.herd_code||'全群'} · ${v.status==='已完成'?'完成于 '+(v.done_date||'-'):'计划 '+v.plan_date}</div></div>`;
    });
  }
  document.getElementById('vax-list').innerHTML = vhtml || '<div style="text-align:center;color:#999;padding:20px">暂无疫苗计划</div>';
}

function addHealthRecord() {
  let body = inp('h-sheep','羊只ID','','如 1');
  body += inp('h-temp','体温(°C)','','如 38.5');
  body += inp('h-hr','心率(bpm)','','如 85');
  body += sel('h-act','活动量',['正常','偏低','极低'],'正常');
  body += inp('h-rum','反刍次数','','如 420');
  body += inp('h-notes','备注','','');
  modal('添加健康记录', body, async () => {
    const data = { sheep_id: parseInt(document.getElementById('h-sheep').value), temperature: parseFloat(document.getElementById('h-temp').value), heart_rate: parseInt(document.getElementById('h-hr').value), activity_level: document.getElementById('h-act').value, rumination: parseInt(document.getElementById('h-rum').value) || 0, notes: document.getElementById('h-notes').value };
    const r = await POST('/api/health/records', data);
    if (r && r.code === 0) { toast('记录添加成功'); closeModal(); loadHealth(); }
    else toast(r?.msg || '添加失败', false);
  });
}

// ===== Alerts =====
let alertPage = 1;
async function loadAlerts(page) {
  alertPage = page || alertPage;
  const sr = await GET('/api/alert/stats');
  if (sr && sr.code === 0) {
    const s = sr.data;
    document.getElementById('alert-stats').innerHTML = `
      <div class="alert-card critical"><div class="ac-title">🔴 越界告警</div><div class="ac-count" style="color:var(--danger)">${s.boundary}</div><div class="ac-sub">需立即处理</div></div>
      <div class="alert-card"><div class="ac-title">🟡 设备预警</div><div class="ac-count" style="color:var(--warning)">${s.device}</div><div class="ac-sub">低电量/离线</div></div>
      <div class="alert-card"><div class="ac-title">🟠 健康异常</div><div class="ac-count" style="color:var(--accent)">${s.health}</div><div class="ac-sub">疑似疫病/体温异常</div></div>`;
  }

  const typeFilter = document.getElementById('alert-type-filter')?.value || '';
  const statusFilter = document.getElementById('alert-status-filter')?.value || '';
  let url = `/api/alert/list?page=${alertPage}&pageSize=15`;
  if (typeFilter) url += `&type=${typeFilter}`;
  if (statusFilter) url += `&status=${statusFilter}`;

  const ar = await GET(url);
  let ahtml = '<table class="data-table"><thead><tr><th>预警ID</th><th>类型</th><th>级别</th><th>目标</th><th>详情</th><th>时间</th><th>状态</th><th>操作</th></tr></thead><tbody>';
  if (ar && ar.code === 0) {
    ar.data.list.forEach(a => {
      ahtml += `<tr><td>${a.code}</td><td>${tag(a.type)}</td><td>${tag(a.level)}</td><td>${a.target_type} ${a.target_id}</td><td>${a.detail}</td><td>${a.created_at?.slice(0,16)||'-'}</td><td>${tag(a.status)}</td>`;
      if (a.status === '待处理') ahtml += `<td><button class="btn btn-primary" style="padding:4px 10px;font-size:11px" onclick="handleAlert(${a.id})">处理</button></td>`;
      else if (a.status === '处理中') ahtml += `<td><button class="btn btn-outline" style="padding:4px 10px;font-size:11px" onclick="completeAlert(${a.id})">完成</button></td>`;
      else ahtml += '<td>-</td>';
      ahtml += '</tr>';
    });
  }
  ahtml += '</tbody></table>';
  ahtml += pagi(ar?.data?.total||0, alertPage, 15, 'loadAlerts');
  document.getElementById('alert-table').innerHTML = ahtml;
}

function handleAlert(id) {
  let body = sel('a-status','处理方式',[{value:'处理中',label:'处理中'},{value:'已处理',label:'已处理'}],'处理中');
  body += inp('a-note','处理备注','','');
  modal('处理预警', body, async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const data = { status: document.getElementById('a-status').value, handle_note: document.getElementById('a-note').value, handler: user.real_name || user.username };
    const r = await PUT(`/api/alert/handle/${id}`, data);
    if (r && r.code === 0) { toast('处理成功'); closeModal(); loadAlerts(); }
    else toast(r?.msg || '处理失败', false);
  });
}

function completeAlert(id) {
  let body = inp('a-note','完成备注','','');
  modal('完成预警', body, async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const data = { status: '已处理', handle_note: document.getElementById('a-note').value, handler: user.real_name || user.username };
    const r = await PUT(`/api/alert/handle/${id}`, data);
    if (r && r.code === 0) { toast('已标记完成'); closeModal(); loadAlerts(); }
    else toast(r?.msg || '操作失败', false);
  });
}

// ===== Traceability =====
async function queryTrace() {
  const code = document.getElementById('trace-code').value.trim();
  if (!code) { toast('请输入溯源码', false); return; }
  const r = await GET(`/api/trace/query?code=${encodeURIComponent(code)}`);
  if (!r || r.code !== 0 || !r.data) {
    document.getElementById('trace-result').innerHTML = '<div style="padding:40px;text-align:center;color:#999">未找到溯源信息，请检查溯源码</div>';
    return;
  }
  const { sheep, records } = r.data;
  let html = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">`;
  html += `<div class="health-item"><div class="val" style="font-size:14px;color:var(--primary)">${sheep?.breed||'-'}</div><div class="lbl">品种</div></div>`;
  html += `<div class="health-item"><div class="val" style="font-size:14px;color:var(--primary)">${sheep?.age||'-'}岁</div><div class="lbl">年龄</div></div>`;
  html += `<div class="health-item"><div class="val" style="font-size:14px;color:var(--primary)">${sheep?.herd_code||'-'}</div><div class="lbl">羊群</div></div>`;
  html += `<div class="health-item"><div class="val" style="font-size:14px;color:var(--primary)">${sheep?.pasture||'-'}</div><div class="lbl">牧场</div></div></div>`;

  html += '<div class="trace-timeline">';
  const icons = { '出生':'🏷️', '疫苗':'💉', '体检':'📋', '定位':'📍', '质检':'✅', '出栏':'🏷️', '加工':'🏭', '运输':'🚚', '销售':'🛒' };
  (records || []).forEach(rec => {
    html += `<div class="trace-node"><div class="tn-title">${icons[rec.event_type]||'📌'} ${rec.event_title}</div><div class="tn-desc">${rec.event_desc||''}</div><div class="tn-time">${rec.event_time||''}</div></div>`;
  });
  html += '</div>';
  document.getElementById('trace-result').innerHTML = html;
}

// ===== Settings =====
async function loadSettings() {
  const dr = await GET('/api/settings/device-stats');
  if (dr && dr.code === 0) {
    const d = dr.data;
    const rate = d.total ? (d.online / d.total * 100).toFixed(1) : 0;
    document.getElementById('dev-stats').innerHTML = `
      <div class="form-row"><span class="form-label">定位终端数量</span><input class="form-input" value="${d.total} 台" readonly></div>
      <div class="form-row"><span class="form-label">在线率</span><input class="form-input" value="${rate}%" readonly></div>
      <div class="form-row"><span class="form-label">低电量设备</span><input class="form-input" value="${d.lowBattery} 台" readonly></div>
      <div class="form-row"><span class="form-label">离线设备</span><input class="form-input" value="${d.offline} 台" readonly></div>`;
  }

  const sr = await GET('/api/settings/all');
  if (sr && sr.code === 0) {
    const s = sr.data;
    document.getElementById('alert-rules').innerHTML = `
      <div class="form-row"><span class="form-label">越界告警阈值</span><input class="form-input" id="s-fence" value="${s.fence_threshold||100}m"></div>
      <div class="form-row"><span class="form-label">低电量阈值</span><input class="form-input" id="s-battery" value="${s.battery_threshold||15}%"></div>
      <div class="form-row"><span class="form-label">体温异常阈值</span><input class="form-input" id="s-temp" value="${s.temp_threshold||39.8}°C"></div>
      <div class="form-row"><span class="form-label">离线超时阈值</span><input class="form-input" id="s-offline" value="${s.offline_timeout||30}分钟"></div>
      <div style="margin-top:8px"><button class="btn btn-primary" onclick="saveSettings()">保存规则</button> <button class="btn btn-outline" onclick="resetSettings()">恢复默认</button></div>`;
  }
}

async function saveSettings() {
  const data = {
    fence_threshold: document.getElementById('s-fence')?.value?.replace('m',''),
    battery_threshold: document.getElementById('s-battery')?.value?.replace('%',''),
    temp_threshold: document.getElementById('s-temp')?.value?.replace('°C',''),
    offline_timeout: document.getElementById('s-offline')?.value?.replace('分钟','')
  };
  const r = await PUT('/api/settings/update', data);
  if (r && r.code === 0) toast('设置已保存');
  else toast(r?.msg || '保存失败', false);
}

function resetSettings() {
  if (document.getElementById('s-fence')) document.getElementById('s-fence').value = '100m';
  if (document.getElementById('s-battery')) document.getElementById('s-battery').value = '15%';
  if (document.getElementById('s-temp')) document.getElementById('s-temp').value = '39.8°C';
  if (document.getElementById('s-offline')) document.getElementById('s-offline').value = '30分钟';
  saveSettings();
}

// ===== Page Navigation =====
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (event?.currentTarget) event.currentTarget.classList.add('active');
  const titles = {
    dashboard: ['数据看板','首页 / 数据看板'], location: ['定位追踪','核心业务 / 定位追踪'],
    sheep: ['羊只管理','核心业务 / 羊只管理'], detect: ['识别检测','核心业务 / 识别检测'],
    health: ['健康监测','核心业务 / 健康监测'], alert: ['异常预警','运营 / 异常预警'],
    trace: ['产品溯源','运营 / 产品溯源'], settings: ['系统设置','运营 / 系统设置']
  };
  const t = titles[page] || ['数据看板','首页'];
  document.getElementById('page-title').textContent = t[0];
  document.getElementById('breadcrumb').textContent = t[1];

  // Load data for page
  const loaders = { dashboard: loadDashboard, location: loadLocation, sheep: () => loadSheep(1), detect: loadDetect, health: () => loadHealth(1), alert: () => loadAlerts(1), trace: () => {}, settings: loadSettings };
  if (loaders[page]) loaders[page]();
}

// ===== Init =====
function init() {
  if (!localStorage.getItem('token')) { location.href = 'login.html'; return; }
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const avatar = document.getElementById('user-avatar');
  if (avatar) avatar.textContent = (user.real_name || user.username || '管')[0];
  loadDashboard();
}

document.addEventListener('DOMContentLoaded', init);
