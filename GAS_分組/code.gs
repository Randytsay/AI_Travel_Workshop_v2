const CONFIG = {
  SOURCE_SHEET_NAME: "表單回覆 1",
  LIST_SHEET_PREFIX: "分組結果_清單檢視",
  VISUAL_SHEET_PREFIX: "分組結果_視覺化看板",
  COL: { TIMESTAMP: 1, NAME: 2, TEAM: 3, LEVEL: 4, IS_TA: 5, FORCE_TA: 7 }
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('⚡ 分組系統')
    .addItem('🚀 智慧分組系統', 'runAutoGrouping')
    .addItem('👁️ 檢視目前分組頁面', 'showCurrentResultHtml')
    .addToUi();
}

// ================= 主流程 =================
function runAutoGrouping() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const srcSheet = ss.getSheetByName(CONFIG.SOURCE_SHEET_NAME);

  if (!srcSheet) {
    ui.alert("❌ 錯誤：找不到來源工作表！");
    return;
  }

  // --- Step 1: 詢問起算日期 ---
  const currentYear = new Date().getFullYear();
  const dateResp = ui.prompt(
    '📅 日期篩選',
    `請輸入報名起算日期（含當天），預設 ${currentYear} 年\n格式：月/日，例如 2/16`,
    ui.ButtonSet.OK_CANCEL
  );
  if (dateResp.getSelectedButton() !== ui.Button.OK) return;

  const dateInput = dateResp.getResponseText().trim();
  let cutoffDate;
  if (dateInput.includes('/') && dateInput.split('/').length === 2) {
    // M/D 格式 → 自動補年份
    const [m, d] = dateInput.split('/').map(Number);
    cutoffDate = new Date(currentYear, m - 1, d);
  } else {
    cutoffDate = new Date(dateInput);
  }

  if (isNaN(cutoffDate.getTime())) {
    ui.alert("❌ 日期格式錯誤，請使用 月/日（如 2/16）");
    return;
  }
  cutoffDate.setHours(0, 0, 0, 0);

  // --- Step 2: 詢問每組人數 ---
  const sizeResp = ui.prompt(
    '👥 每組人數',
    '請輸入每組最大人數（預設 6）：',
    ui.ButtonSet.OK_CANCEL
  );
  if (sizeResp.getSelectedButton() !== ui.Button.OK) return;

  const maxPerTable = parseInt(sizeResp.getResponseText().trim(), 10) || 6;
  if (maxPerTable < 2 || maxPerTable > 20) {
    ui.alert("❌ 每組人數請介於 2 ~ 20 之間");
    return;
  }

  // --- Step 3: 讀取資料 ---
  const lastRow = srcSheet.getLastRow();
  if (lastRow < 2) {
    ui.alert("⚠️ 沒有任何回覆資料");
    return;
  }

  // 讀取 A~E 欄 + G 欄
  const dataAE = srcSheet.getRange(2, 1, lastRow - 1, 5).getValues();
  const lastCol = srcSheet.getLastColumn();
  let dataG = [];
  if (lastCol >= 7) {
    dataG = srcSheet.getRange(2, 7, lastRow - 1, 1).getValues();
  }

  // --- Step 4: 日期篩選 ---
  let filtered = [];
  for (let i = 0; i < dataAE.length; i++) {
    const timestamp = new Date(dataAE[i][0]);
    if (isNaN(timestamp.getTime())) continue;
    if (timestamp < cutoffDate) continue;

    filtered.push({
      timestamp: timestamp,
      name: (dataAE[i][1] || "").toString().trim(),
      team: (dataAE[i][2] || "未填寫").toString().trim(),
      levelStr: (dataAE[i][3] || "").toString().trim(),
      isTaWilling: (dataAE[i][4] || "").toString().trim(),
      forceTa: dataG[i] ? (dataG[i][0] || "").toString().trim().toUpperCase() === "V" : false
    });
  }

  if (filtered.length === 0) {
    ui.alert(`⚠️ ${cutoffDate.toLocaleDateString()} 之後沒有任何回覆`);
    return;
  }

  // --- Step 5: 重複檢查（大C + 姓名 組合，保留最新） ---
  const dedupMap = new Map();
  const duplicates = [];

  filtered.forEach(row => {
    if (!row.name) return;
    const key = `${row.team}|||${row.name}`;
    if (dedupMap.has(key)) {
      duplicates.push(`${row.name}（${row.team}）`);
    }
    // 無論是否重複，都以最新的蓋掉（因為 filtered 已按時間戳排序）
    dedupMap.set(key, row);
  });

  if (duplicates.length > 0) {
    ui.alert(
      `⚠️ 偵測到重複報名（已自動保留最新筆）：\n\n${[...new Set(duplicates)].join('\n')}`
    );
  }

  const uniqueRows = [...dedupMap.values()];

  // --- Step 6: 分類人員 ---
  let qualifiedTAs = [];
  let highLevelPool = [];
  let midLevelPool = [];
  let lowLevelPool = [];

  uniqueRows.forEach(row => {
    let weight = 1;
    if (row.levelStr.includes("Lv 2")) weight = 2;
    if (row.levelStr.includes("Lv 3")) weight = 3;
    if (row.levelStr.includes("Lv 4")) weight = 4;

    const isTaWilling = row.isTaWilling.includes("YES");
    const isQualifiedTa = (row.forceTa) || (isTaWilling && weight > 1);

    const person = {
      name: row.name,
      team: row.team,
      levelStr: row.levelStr.split("：")[0],
      weight: weight,
      isQualifiedTa: isQualifiedTa,
      forceTa: row.forceTa,
      roleType: "student"
    };

    if (isQualifiedTa) {
      qualifiedTAs.push(person);
    } else if (weight >= 3) {
      highLevelPool.push(person);
    } else if (weight === 2) {
      midLevelPool.push(person);
    } else {
      lowLevelPool.push(person);
    }
  });

  // --- Step 7: 決定桌數與桌長 ---
  const totalPeople = qualifiedTAs.length + highLevelPool.length + midLevelPool.length + lowLevelPool.length;
  const totalTables = Math.ceil(totalPeople / maxPerTable);

  // 助教排序：手動指定的優先，再按 weight 高→低
  qualifiedTAs.sort((a, b) => {
    if (a.forceTa !== b.forceTa) return b.forceTa ? 1 : -1;
    return b.weight - a.weight;
  });

  let tables = Array.from({ length: totalTables }, (_, i) => ({
    id: i + 1,
    ta: null,
    members: [],
    teamCounts: {}, // 追蹤每桌各大C人數，用於拆散
    currentWeight: 0 // 追蹤整桌總實力，用於平衡戰力
  }));

  // 分配桌長
  qualifiedTAs.forEach((person, i) => {
    if (i < totalTables) {
      person.roleType = "leader";
      tables[i].ta = person;
      tables[i].teamCounts[person.team] = (tables[i].teamCounts[person.team] || 0) + 1;
      tables[i].currentWeight += person.weight;
    } else {
      person.roleType = "backup_ta";
      highLevelPool.push(person);
    }
  });

  // --- Step 8: 執行分配（含大C拆散） ---

  // 8.1 高手進弱桌 (平衡戰力)
  // 先洗牌確保隨機性，再依 Weight 降序分配，優先補足戰力最低的桌子
  highLevelPool.sort((a, b) => b.weight - a.weight);
  shuffleArray(highLevelPool); // 雖然排序了，但在相同 weight 間洗牌
  highLevelPool.sort((a, b) => b.weight - a.weight); 
  distributeSmartly(highLevelPool, tables, maxPerTable, "strength_balance");

  // 8.2 小白進強桌 (平衡戰力)
  // 優先補足戰力最高的桌子，拉低平均
  lowLevelPool.sort((a, b) => a.weight - b.weight);
  shuffleArray(lowLevelPool);
  lowLevelPool.sort((a, b) => a.weight - b.weight);
  distributeSmartly(lowLevelPool, tables, maxPerTable, "inverse_strength_balance");

  // 8.3 中手填空
  shuffleArray(midLevelPool);
  distributeSmartly(midLevelPool, tables, maxPerTable, "population_balance");

  // --- Step 9: 輸出（分頁名含日期，同梯次獨立分頁）---
  const dateSuffix = `_${String(cutoffDate.getMonth() + 1).padStart(2, '0')}${String(cutoffDate.getDate()).padStart(2, '0')}`;
  const listSheetName = CONFIG.LIST_SHEET_PREFIX + dateSuffix;
  const visualSheetName = CONFIG.VISUAL_SHEET_PREFIX + dateSuffix;
  outputListView(ss, tables, listSheetName);
  outputVisualView(ss, tables, visualSheetName);
  showHtmlModal(tables, cutoffDate);
}

// ================= 分配輔助函式 =================

// 智慧分配函式：整合大C拆散、人數平均與戰力平衡
function distributeSmartly(pool, tables, maxPerTable, strategy) {
  pool.forEach(person => {
    let bestTable = null;
    let bestScore = Infinity;

    tables.forEach(table => {
      const currentCount = (table.ta ? 1 : 0) + table.members.length;
      if (currentCount >= maxPerTable) return;

      const teamConflict = table.teamCounts[person.team] || 0;
      
      let score = 0;
      // 權重設計：
      // 1. 大C衝突最高優先 (1000000)
      // 2. 人數平衡次之 (10000)
      // 3. 戰力平衡最後 (依策略決定正負)
      
      score += teamConflict * 1000000;
      score += currentCount * 10000;
      
      if (strategy === "strength_balance") {
        // 戰力平衡：分到目前總實力越低的桌子，score 越低越好
        score += table.currentWeight * 10;
      } else if (strategy === "inverse_strength_balance") {
        // 逆向平衡：分到目前總實力越高的桌子，以稀釋實力
        score -= table.currentWeight * 10;
      } else {
        // 純人數平衡
        score += table.currentWeight * 1;
      }

      if (score < bestScore) {
        bestScore = score;
        bestTable = table;
      }
    });

    if (bestTable) {
      bestTable.members.push(person);
      bestTable.teamCounts[person.team] = (bestTable.teamCounts[person.team] || 0) + 1;
      bestTable.currentWeight += person.weight;
    }
  });
}

// Fisher-Yates 洗牌（同等級內隨機化，避免每次結果相同）
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ================= 輸出邏輯 (清單) =================
function outputListView(ss, tables, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  sheet.clear();

  let data = [["桌號", "角色", "姓名", "大C團隊", "AI等級", "報到"]];
  let groupRanges = [];

  tables.forEach((t, index) => {
    const groupStartRow = data.length + 1;

    if (t.ta) {
      data.push([t.id, "👑 助教 (桌長)", t.ta.name, t.ta.team, t.ta.levelStr, ""]);
    } else {
      data.push([t.id, "⚠️ 缺桌長", "-", "-", "-", ""]);
    }

    t.members.forEach(m => {
      let roleName = "學員";
      if (m.roleType === "backup_ta") roleName = "❤️ 有熱忱的心";
      if (m.weight >= 3 && m.roleType !== "backup_ta") roleName = "⭐ 高手學員";
      if (m.weight === 1) roleName = "🌱 需協助 (Lv1)";

      data.push([t.id, roleName, m.name, m.team, m.levelStr, ""]);
    });

    const groupEndRow = data.length;
    groupRanges.push({ start: groupStartRow, end: groupEndRow });

    if (index < tables.length - 1) {
      data.push(["", "", "", "", "", ""]);
    }
  });

  const range = sheet.getRange(1, 1, data.length, 6);
  range.setValues(data);

  sheet.getRange(1, 1, 1, 6)
    .setBackground("#4a86e8")
    .setFontColor("white")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setBorder(true, true, true, true, true, true, "black", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  groupRanges.forEach(r => {
    sheet.getRange(r.start, 1, r.end - r.start + 1, 6)
      .setBorder(true, true, true, true, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);
  });

  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(6, 80);
  sheet.getRange(1, 6, data.length, 1).setHorizontalAlignment("center");
}

// ================= 輸出邏輯 (看板) =================
function outputVisualView(ss, tables, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  sheet.clear();

  const cardsPerRow = 3;
  const cardWidth = 3;
  const cardHeight = 9;
  const gapCol = 1;
  const gapRow = 1;

  tables.forEach((table, idx) => {
    const rowPos = 1 + Math.floor(idx / cardsPerRow) * (cardHeight + gapRow);
    const colPos = 1 + (idx % cardsPerRow) * (cardWidth + gapCol);

    const count = (table.ta ? 1 : 0) + table.members.length;
    sheet.getRange(rowPos, colPos, 1, cardWidth).merge()
      .setValue(`🏁 第 ${table.id} 桌 (${count}人)`)
      .setBackground("#1155cc").setFontColor("white").setFontWeight("bold").setHorizontalAlignment("center");

    if (table.ta) {
      sheet.getRange(rowPos + 1, colPos).setValue("👑");
      sheet.getRange(rowPos + 1, colPos + 1).setValue(table.ta.name);
      sheet.getRange(rowPos + 1, colPos + 2).setValue(table.ta.levelStr).setFontSize(8);
      sheet.getRange(rowPos + 1, colPos, 1, 3).setBackground("#cfe2f3");
    }

    table.members.forEach((m, mIdx) => {
      const r = rowPos + 2 + mIdx;

      let icon = mIdx + 2; // 桌長是 1，成員從 2 起算
      if (m.roleType === "backup_ta") icon = "❤️";
      if (m.weight === 1) icon = "🌱";

      sheet.getRange(r, colPos).setValue(icon);
      sheet.getRange(r, colPos + 1).setValue(m.name);

      let cell = sheet.getRange(r, colPos + 2);
      cell.setValue(m.levelStr).setFontSize(8);

      if (m.weight === 1) cell.setFontColor("red").setFontWeight("bold");
      else if (m.roleType === "backup_ta" || m.weight >= 3) cell.setFontColor("#1c4587").setFontWeight("bold");
      else cell.setFontColor("#666");
    });

    sheet.getRange(rowPos, colPos, cardHeight - 1, cardWidth)
      .setBorder(true, true, true, true, true, true, "black", SpreadsheetApp.BorderStyle.SOLID);
  });

  for (let i = 1; i <= 20; i++) {
    const mod = (i - 1) % 4;
    if (mod === 0) sheet.setColumnWidth(i, 30);
    if (mod === 1) sheet.setColumnWidth(i, 100);
    if (mod === 2) sheet.setColumnWidth(i, 80);
    if (mod === 3) sheet.setColumnWidth(i, 20);
  }
}

// ================= 輔助功能：從現有工作表檢視 HTML =================
function showCurrentResultHtml() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const sheetName = sheet.getName();

  if (!sheetName.startsWith(CONFIG.LIST_SHEET_PREFIX)) {
    SpreadsheetApp.getUi().alert("❌ 請先切換到『分組結果_清單檢視』的工作表再執行此功能");
    return;
  }

  // 嘗試從分頁名稱提取日期 (格式如 _0220)
  let displayDate = new Date();
  const match = sheetName.match(/_(\d{2})(\d{2})$/);
  if (match) {
    const month = parseInt(match[1], 10);
    const day = parseInt(match[2], 10);
    displayDate = new Date(new Date().getFullYear(), month - 1, day);
  }

  const data = sheet.getDataRange().getValues();
  let tables = [];
  let currentTable = null;

  // 從第二行開始解析 (跳過標題)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const id = row[0];
    const role = (row[1] || "").toString();
    const name = (row[2] || "").toString();
    const team = (row[3] || "").toString();
    const levelStr = (row[4] || "").toString();

    if (!name || name === "-" || name === "") continue;

    // 發現新桌號
    if (id !== "" && (!currentTable || currentTable.id !== id)) {
      if (currentTable) tables.push(currentTable);
      currentTable = { id: id, ta: null, members: [], teamCounts: {}, currentWeight: 0 };
    }

    if (!currentTable) continue;

    const person = { name: name, team: team, levelStr: levelStr, weight: 0 };
    // 簡單判斷實力權重以便 HTML 顯示圖標
    if (levelStr.includes("Lv 1")) person.weight = 1;
    if (levelStr.includes("Lv 2")) person.weight = 2;
    if (levelStr.includes("Lv 3")) person.weight = 3;
    if (levelStr.includes("Lv 4")) person.weight = 4;

    if (role.indexOf("助教") !== -1) {
      currentTable.ta = person;
    } else {
      if (role.indexOf("熱忱") !== -1) person.roleType = "backup_ta";
      currentTable.members.push(person);
    }
  }
  if (currentTable) tables.push(currentTable);

  if (tables.length === 0) {
    SpreadsheetApp.getUi().alert("⚠️ 找不到有效的分組資料，請確認工作表內容是否正確。");
    return;
  }

  showHtmlModal(tables, displayDate);
}

// ================= 輸出邏輯 (HTML) =================
function showHtmlModal(tables, cutoffDate) {
  const dateStr = cutoffDate.toLocaleDateString('zh-TW');

  let htmlString = `
    <html>
      <head>
        <script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
        <style>
          body { font-family: 'Segoe UI', 'Noto Sans TC', sans-serif; background: #f3f3f3; padding: 20px; }
          .no-print-area { text-align: center; margin-bottom: 20px; display: flex; justify-content: center; gap: 10px; }
          .btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px; transition: 0.2s; }
          .btn-print { background: #4285f4; color: white; }
          .btn-image { background: #34a853; color: white; }
          .btn:hover { opacity: 0.9; transform: translateY(-1px); }
          
          .summary { text-align: center; color: #555; margin-bottom: 15px; font-size: 0.9em; }
          .container { display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; }
          .card { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 260px; overflow: hidden; border: 1px solid #ddd; }
          .card-header { background: #4285f4; color: white; padding: 12px; text-align: center; font-weight: bold; font-size: 1.2em; }
          .list-group { padding: 0; margin: 0; list-style: none; }
          .list-item { padding: 10px 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
          .role-icon { margin-right: 8px; width:20px; text-align:center; display:inline-block; }
          .ta-row { background-color: #e8f0fe; font-weight: bold; }
          .backup-row { background-color: #f1f8e9; }
          .high-row { background-color: #e3f2fd; }
          .level-badge { font-size: 0.75em; padding: 2px 6px; border-radius: 4px; background: #eee; color: #555; }
          .lv1-badge { background: #fce8e6; color: #c5221f; font-weight:bold; }
          .high-badge { background: #dcedc8; color: #33691e; font-weight:bold; }
          .team-badge { font-size: 0.65em; padding: 1px 5px; border-radius: 3px; background: #f0e6ff; color: #7b1fa2; margin-left: 4px; }

          @media print {
            .no-print-area { display: none; }
            body { background: white; padding: 0; }
            .card { break-inside: avoid; border: 1px solid #eee; box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print-area">
          <button class="btn btn-print" onclick="window.print()">🖨️ 列印 / 存為 PDF</button>
          <button class="btn btn-image" onclick="exportImage()">📸 下載分組圖片 (PNG)</button>
        </div>

        <div id="export-area">
          <h2 style="text-align:center; color:#333;">🚀 AI 工作坊分組表</h2>
          <div class="summary">📅 起算日期：${dateStr} ｜ 共 ${tables.reduce((s, t) => s + (t.ta ? 1 : 0) + t.members.length, 0)} 人 ／ ${tables.length} 桌</div>
          <div class="container">
            ${tables.map(t => `
              <div class="card">
                <div class="card-header">第 ${t.id} 桌 <span style="font-size:0.8em; opacity:0.9">(${(t.ta ? 1 : 0) + t.members.length}人)</span></div>
                <ul class="list-group">
                  ${t.ta ? `
                    <li class="list-item ta-row">
                      <div><span class="role-icon">👑</span>${t.ta.name}<span class="team-badge">${t.ta.team}</span></div>
                      <span class="level-badge high-badge">${t.ta.levelStr}</span>
                    </li>
                  ` : `<li class="list-item" style="color:red; text-align:center;">⚠️ 缺助教</li>`}
                  
                  ${t.members.map(m => {
                    let rowClass = "list-item";
                    let badgeClass = "level-badge";
                    let icon = m.membersIdx + 2; // Default index

                    // Reuse the existing role logic
                    let roleIcon = "";
                    if (m.roleType === "backup_ta") {
                        rowClass += " backup-row";
                        badgeClass += " high-badge";
                        roleIcon = "❤️";
                    } else if (m.weight === 1) {
                        badgeClass += " lv1-badge";
                        roleIcon = "🌱";
                    }

                    return `
                      <li class="${rowClass}">
                        <div><span class="role-icon">${roleIcon || (t.members.indexOf(m) + 2)}</span>${m.name}<span class="team-badge">${m.team}</span></div>
                        <span class="${badgeClass}">${m.levelStr}</span>
                      </li>`;
                  }).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
        </div>

        <script>
          function exportImage() {
            const btn = document.querySelector('.btn-image');
            const originalText = btn.innerText;
            btn.innerText = '⌛ 處理中...';
            btn.disabled = true;

            const exportArea = document.getElementById('export-area');
            
            html2canvas(exportArea, {
              useCORS: true,
              scale: 2, // 高解析度
              backgroundColor: '#f3f3f3'
            }).then(canvas => {
              const link = document.createElement('a');
              link.download = 'AI_Workshop_Grouping_${dateStr.replace(/\//g, '')}.png';
              link.href = canvas.toDataURL('image/png');
              link.click();
              
              btn.innerText = originalText;
              btn.disabled = false;
            }).catch(err => {
              alert('圖片匯出失敗：' + err);
              btn.innerText = originalText;
              btn.disabled = false;
            });
          }
        </script>
      </body>
    </html>
  `;

  const htmlOutput = HtmlService.createHtmlOutput(htmlString).setWidth(1000).setHeight(800);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, '✨ 分組結果');
}