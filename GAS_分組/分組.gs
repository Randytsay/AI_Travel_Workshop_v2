const MAX_LIMIT = 80;

function initialSetup() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  // 更新後的標題列：姓名是指「參加者姓名」，介紹人則是「填表夥伴」
  const headers = ["填寫時間", "姓名", "介紹人", "所屬大C"]; 
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground("#f3f3f3")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
  }
}

// 供前端呼叫剩餘名額
function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  let count = sheet.getLastRow() - 1; // 扣除標題
  if (count < 0) count = 0;
  
  return ContentService.createTextOutput(JSON.stringify({
    count: count,
    limit: MAX_LIMIT,
    remaining: MAX_LIMIT - count > 0 ? MAX_LIMIT - count : 0
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const headers = ["填寫時間", "姓名", "介紹人", "所屬大C"];
    
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setBackground("#f3f3f3").setFontWeight("bold");
    }
    
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch(parseErr) {
      data = e.parameter;
    }
    
    const partnerName = (data.name || "").trim(); // 填表的夥伴
    const friendsStr = (data.friends || "").trim(); // 新朋友名單字串
    const inputBigC = (data.bigc || "").trim();
    const timestamp = new Date();
    
    // 1. 整理出所有要報名的人名清單（包含夥伴本人 + 所有朋友）
    let registrants = [partnerName]; 
    if (friendsStr) {
      // 支援用「、」或「,」或「 」拆分名單
      const friendsArray = friendsStr.split(/[、,，\s]+/).map(f => f.trim()).filter(f => f);
      registrants = registrants.concat(friendsArray);
    }
    
    // 🔍 簡單重複檢查 (在同一張表單中，夥伴不能重複幫同一個人報名太多次，這裡針對本次提交清單去重)
    registrants = [...new Set(registrants)];
    
    // 2. 檢查名額是否足夠一次塞入這麼多人
    let currentCount = sheet.getLastRow() - 1;
    if (currentCount + registrants.length > MAX_LIMIT) {
      return ContentService.createTextOutput(JSON.stringify({ 
        "status": "error", 
        "message": `名額不足！目前剩餘 ${MAX_LIMIT - currentCount} 位，但您這筆報名共計 ${registrants.length} 位。` 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 3. 逐一寫入每一行
    registrants.forEach((name, index) => {
      // 如果是第一個人且名字等於夥伴名，介紹人填「夥伴」
      // 否則介紹人填「夥伴姓名」
      const referrer = (index === 0 && name === partnerName) ? "夥伴" : partnerName;
      sheet.appendRow([timestamp, name, referrer, inputBigC]);
    });
    
    return ContentService.createTextOutput(JSON.stringify({ 
      "status": "success", 
      "message": `報名成功！已為您及夥伴共 ${registrants.length} 位完成登記。` 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      "status": "error", 
      "message": err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 處理預檢請求 (CORS)
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}
