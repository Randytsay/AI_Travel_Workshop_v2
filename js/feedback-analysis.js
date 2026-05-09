
const data = window.FEEDBACK_ANALYSIS_DATA;
const $ = (sel) => document.querySelector(sel);
const fmt = (v, suffix = '') => v === null || v === undefined ? '—' : `${v}${suffix}`;

function initials(name) {
  const clean = String(name || '').trim();
  return clean.slice(0, 2).toUpperCase();
}
function avatarHtml(record) {
  if (record.avatar) return `<img class="avatar" src="${record.avatar}" alt="${record.name} 頭像">`;
  return `<div class="avatar" aria-label="${record.name} 頭像占位">${initials(record.name)}</div>`;
}
function renderHero() {
  $('#hero-subtitle').textContent = `有效回覆 ${data.summary.validRows} 份，其中新朋友 ${data.summary.newFriends} 位、夥伴 ${data.summary.partners} 位；已自動配對 ${data.summary.avatarMatched} 位頭像。`;
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
    ['Shop 暖名單', data.summary.shopWarmLeadRate + '%', '想了解或先聽制度'],
    ['夥伴流程分', data.summary.avgPartnerFlow, '/ 5 平均分'],
    ['頭像配對', data.summary.avatarMatched, '位可放入評語旁'],
  ];
  $('#metric-grid').innerHTML = items.map(([label,value,note]) => `<article class="metric-card"><span>${label}</span><strong>${value}</strong><span>${note}</span></article>`).join('');
  $('#insight-grid').innerHTML = `<article class="insight-card"><h3>一句話結論</h3><p>${data.analysis.headline}</p></article><article class="insight-card"><h3>資料清理</h3><p>原始表格 ${data.summary.rawRows} 列，含空白列；有填答 ${data.summary.answeredRows} 列，排除 ${data.summary.excludedRows} 筆明顯測試資料後納入分析。</p></article>`;
}
function chart(title, rows, wide=false) {
  const max = Math.max(...rows.map(r => r.value), 1);
  return `<article class="chart-card ${wide ? 'wide' : ''}"><h3>${title}</h3>${rows.map(r => `<div class="bar-row"><div class="bar-label">${r.label}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(5, r.value / max * 100)}%"></div></div><strong>${r.value}</strong></div>`).join('')}</article>`;
}
function renderCharts() {
  $('#chart-grid').innerHTML = [
    chart('新朋友整體滿意度', data.charts.satisfaction),
    chart('新朋友吸收程度', data.charts.newAbsorption),
    chart('推薦意願', data.charts.recommend),
    chart('夥伴流程順暢度', data.charts.partnerFlow),
    chart('最有感 Wow Moment', data.charts.wow, true),
    chart('想延伸學習的 AI 主題', data.charts.aiInterest, true),
    chart('Shop / 店主興趣溫度', data.charts.shopInterest, true),
    chart('邀請來源分布', data.charts.invites, true),
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
renderCharts();
renderVoices();
renderActions();
bind();
