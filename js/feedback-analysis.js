
const data = window.FEEDBACK_ANALYSIS_DATA;
const $ = (sel) => document.querySelector(sel);
const fmt = (v, suffix = '') => v === null || v === undefined ? '—' : `${v}${suffix}`;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
}[char]));

function initials(name) {
  const clean = String(name || '').trim();
  return clean.slice(0, 2).toUpperCase();
}
function avatarHtml(record) {
  if (record.avatar) return `<img class="avatar" src="${record.avatar}" alt="${record.name} 頭像">`;
  return `<div class="avatar" aria-label="${record.name} 頭像占位">${initials(record.name)}</div>`;
}
function renderHero() {
  $('#hero-subtitle').textContent = `有效回覆 ${data.summary.validRows} 份，其中新朋友 ${data.summary.newFriends} 位、夥伴 ${data.summary.partners} 位；可直接看見邀請成效、續課興趣與後續追蹤名單。`;
  const withAvatars = data.records.filter(r => r.avatar).slice(0, 24);
  $('#hero-mosaic').innerHTML = withAvatars.map(r => `<div class="mosaic-item"><img src="${r.avatar}" alt="${r.name}"></div>`).join('');
}
function renderMetrics() {
  const items = [
    ['有效回覆', data.summary.validRows, '份正式問卷'],
    ['新朋友', data.summary.newFriends, '位現場體驗者'],
    ['整體滿意度', data.summary.avgSatisfaction, '/ 5 平均分'],
    ['推薦滿分率', data.summary.highRecommendRate + '%', '新朋友給 5 分比例'],
    ['吸收程度', data.summary.avgNewAbsorption, '/ 5 新朋友平均'],
    ['評估名單', data.summary.shopWarmLeadRate + '%', '想了解或先聽制度'],
    ['夥伴流程分', data.summary.avgPartnerFlow, '/ 5 平均分'],
    ['續課興趣', continuationStats().courseInterested, '位留下 AI 主題興趣'],
  ];
  $('#metric-grid').innerHTML = items.map(([label,value,note]) => `<article class="metric-card"><span>${label}</span><strong>${value}</strong><span>${note}</span></article>`).join('');
  $('#insight-grid').innerHTML = `<article class="insight-card"><h3>一句話結論</h3><p>${data.analysis.headline}</p></article><article class="insight-card"><h3>資料清理</h3><p>原始表格 ${data.summary.rawRows} 列，含空白列；有填答 ${data.summary.answeredRows} 列，排除 ${data.summary.excludedRows} 筆明顯測試資料後納入分析。</p></article>`;
}
function newFriends() {
  return data.records.filter(r => r.identity === '新朋友');
}
function isShopWarm(record) {
  return ['非常有興趣，想了解如何開始', '有點興趣，想先聽聽看制度'].includes(record.newFriend.shopInterest);
}
function continuationStats() {
  const rows = newFriends();
  const warm = rows.filter(isShopWarm);
  const courseInterested = rows.filter(r => r.newFriend.aiInterest).length;
  const consumer = rows.filter(r => r.newFriend.shopInterest === '只想當消費者，賺現金回饋就好').length;
  const aiOnly = rows.filter(r => r.newFriend.shopInterest === '目前先專注學習 AI 技能就好').length;
  return { total: rows.length, warm: warm.length, courseInterested, consumer, aiOnly };
}
function shortTopic(text) {
  return String(text || '')
    .split(/[,，、]/)
    .map(x => x.replace(/\s*\(.+?\)\s*/g, '').trim())
    .filter(Boolean)
    .slice(0, 3)
    .join('、') || '尚未填寫';
}
function followupLevel(record) {
  if (record.newFriend.shopInterest === '非常有興趣，想了解如何開始') return ['優先評估', 'hot'];
  if (record.newFriend.shopInterest === '有點興趣，想先聽聽看制度') return ['可約制度說明', 'warm'];
  if (record.newFriend.aiInterest) return ['邀約下次主題課', 'course'];
  return ['先維持互動', 'soft'];
}
function renderFollowup() {
  const stats = continuationStats();
  $('#followup-summary').innerHTML = [
    ['Shop/制度評估', stats.warm, `${Math.round(stats.warm / stats.total * 100)}% 新朋友可後續評估`],
    ['下次課程興趣', stats.courseInterested, `${Math.round(stats.courseInterested / stats.total * 100)}% 留下 AI 主題`],
    ['消費者回饋', stats.consumer, '可從現金回饋切入'],
    ['先學 AI 技能', stats.aiOnly, '適合先邀約進階實作課'],
  ].map(([label, value, note]) => `<article class="followup-stat"><span>${label}</span><strong>${value}</strong><em>${note}</em></article>`).join('');

  const groups = new Map();
  newFriends().forEach(record => {
    const inviter = record.inviter || '未填邀請人';
    if (!groups.has(inviter)) groups.set(inviter, []);
    groups.get(inviter).push(record);
  });
  const sorted = [...groups.entries()].sort((a, b) => {
    const warmDiff = b[1].filter(isShopWarm).length - a[1].filter(isShopWarm).length;
    return warmDiff || b[1].length - a[1].length || a[0].localeCompare(b[0], 'zh-Hant');
  });
  $('#followup-grid').innerHTML = sorted.map(([inviter, rows]) => {
    const warmCount = rows.filter(isShopWarm).length;
    const avgRecommend = rows.filter(r => r.newFriend.recommend !== null).reduce((sum, r, _, arr) => sum + r.newFriend.recommend / arr.length, 0);
    const people = rows.map(r => {
      const [label, cls] = followupLevel(r);
      return `<li><div><strong>${r.name}</strong><span>${shortTopic(r.newFriend.aiInterest)}</span></div><mark class="${cls}">${label}</mark></li>`;
    }).join('');
    return `<article class="followup-card"><div class="followup-card-head"><div><span>邀請人</span><h3>${inviter}</h3></div><strong>${rows.length} 位</strong></div><div class="followup-card-metrics"><span>評估 ${warmCount}</span><span>推薦均分 ${avgRecommend ? avgRecommend.toFixed(1) : '—'}</span></div><ul>${people}</ul></article>`;
  }).join('');
}
function topicList(text) {
  return String(text || '').split(/[,，、]/).map(x => x.trim()).filter(Boolean);
}
function namesForChart(chartKey, label) {
  const allNew = newFriends();
  const partners = data.records.filter(r => r.identity === '夥伴');
  const lookup = {
    satisfaction: () => allNew.filter(r => String(r.newFriend.satisfaction) === String(label)),
    newAbsorption: () => allNew.filter(r => String(r.newFriend.absorption) === String(label)),
    recommend: () => allNew.filter(r => String(r.newFriend.recommend) === String(label)),
    partnerFlow: () => partners.filter(r => String(r.partner.flow) === String(label)),
    wow: () => allNew.filter(r => r.newFriend.wow === label),
    aiInterest: () => allNew.filter(r => topicList(r.newFriend.aiInterest).includes(label)),
    shopInterest: () => allNew.filter(r => r.newFriend.shopInterest === label),
    invites: () => allNew.filter(r => (r.inviter || '未填邀請人') === label),
  };
  return (lookup[chartKey]?.() || []).map(r => r.name);
}
function chart(title, rows, chartKey, wide=false) {
  const max = Math.max(...rows.map(r => r.value), 1);
  return `<article class="chart-card ${wide ? 'wide' : ''}"><h3>${title}</h3><p class="chart-hint">滑過或點一下長條，可查看填寫這一項的人名。</p>${rows.map(r => {
    const names = namesForChart(chartKey, r.label);
    const nameText = names.join('、') || '沒有可對應名單';
    return `<details class="bar-row" title="${escapeHtml(nameText)}"><summary><span class="bar-label">${escapeHtml(r.label)}</span><span class="bar-track"><span class="bar-fill" style="width:${Math.max(5, r.value / max * 100)}%"></span></span><strong>${r.value}</strong></summary><div class="bar-people"><b>填寫名單</b><div>${names.map(name => `<span>${escapeHtml(name)}</span>`).join('') || '<span>沒有可對應名單</span>'}</div></div></details>`;
  }).join('')}</article>`;
}
function renderCharts() {
  $('#chart-grid').innerHTML = [
    chart('新朋友整體滿意度', data.charts.satisfaction, 'satisfaction'),
    chart('新朋友吸收程度', data.charts.newAbsorption, 'newAbsorption'),
    chart('推薦意願', data.charts.recommend, 'recommend'),
    chart('夥伴流程順暢度', data.charts.partnerFlow, 'partnerFlow'),
    chart('最有感 Wow Moment', data.charts.wow, 'wow', true),
    chart('想延伸學習的 AI 主題', data.charts.aiInterest, 'aiInterest', true),
    chart('Shop / 店主興趣溫度', data.charts.shopInterest, 'shopInterest', true),
    chart('邀請來源分布', data.charts.invites, 'invites', true),
  ].join('');
}
function voiceText(record) {
  if (record.identity === '新朋友') {
    const nf = record.newFriend;
    return {
      scores: [`吸收 ${fmt(nf.absorption)}`, `滿意 ${fmt(nf.satisfaction)}`, `推薦 ${fmt(nf.recommend)}`],
      quote: nf.wow ? `最有感：${nf.wow}` : '尚未留下 Wow Moment',
      meta: [`邀請人：${record.inviter || '未填'}`, nf.aiInterest ? `想學：${nf.aiInterest}` : '', nf.shopInterest ? `Shop：${nf.shopInterest}` : ''].filter(Boolean)
    };
  }
  const p = record.partner;
  return {
    scores: [`流程 ${fmt(p.flow)}`, `吸收 ${fmt(p.absorption)}`],
    quote: p.transition || p.reaction || p.nextSuggestion || '夥伴已留下評分回饋',
    meta: [`新朋友反應：${p.reaction || '未填'}`, `下次建議：${p.nextSuggestion || '未填'}`]
  };
}
function renderVoices(filter='all', keyword='') {
  const key = keyword.trim().toLowerCase();
  const rows = data.records.filter(r => (filter === 'all' || r.identity === filter) && (!key || JSON.stringify(r).toLowerCase().includes(key)));
  $('#voice-grid').innerHTML = rows.map(r => {
    const t = voiceText(r);
    return `<article class="voice-card"><div class="voice-head">${avatarHtml(r)}<div><h3>${r.name}</h3><span class="tag">${r.identity}</span></div></div><div class="voice-body"><div class="score-row">${t.scores.map(x => `<span class="score-pill">${x}</span>`).join('')}</div><p class="quote">${t.quote}</p>${t.meta.map(m => `<p class="meta-line">${m}</p>`).join('')}</div></article>`;
  }).join('') || '<p class="meta-line">沒有符合條件的回饋。</p>';
}
function renderActions() {
  $('#wins').innerHTML = data.analysis.wins.map(x => `<li>${x}</li>`).join('');
  $('#risks').innerHTML = data.analysis.risks.map(x => `<li>${x}</li>`).join('');
  $('#actions').innerHTML = data.analysis.actions.map(x => `<li>${x}</li>`).join('');
}
function bind() {
  let current = 'all';
  document.querySelectorAll('.filter-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    current = btn.dataset.filter;
    renderVoices(current, $('#voice-search').value);
  }));
  $('#voice-search').addEventListener('input', e => renderVoices(current, e.target.value));
}
renderHero();
renderMetrics();
renderFollowup();
renderCharts();
renderVoices();
renderActions();
bind();
