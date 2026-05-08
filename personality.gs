// ===== 設定區 (從指令碼屬性讀取) =====
let _cachedLineToken = null;
function getLineToken() {
  if (!_cachedLineToken) {
    _cachedLineToken = PropertiesService.getScriptProperties().getProperty('LINE_ACCESS_TOKEN');
  }
  return _cachedLineToken;
}
const LINE_API_URL = 'https://api.line.me/v2/bot/message/reply';
const WORKSHOP_FOLDER_ID = '1y4t-yYFeVxnYsX1EPylqp0-hnMfQqHFS';

// ===== 人格資料 =====
const BASE = {
  A: {
    emoji: '🌿', name: '慢活旅行者', en: 'Slow Living Explorer',
    tags: ['🌿 慢活者', '📚 深度探索', '☕ 咖啡旅人'],
    cartoonStyle: '可愛皮克斯 3D 渲染風格 (Pixar style 3D render)，場景：淺草寺馬卡龍色系，溫暖柔和光影，精緻質感，豐富細節',
    personality: '你是一個懂得在忙碌世界中尋找寧靜的人。對你而言，旅行不是為了抵達目的地，而是享受過程中的每一刻呼吸。你喜歡在陌生的城市尋找一家有質感的咖啡廳，坐下來觀察路人，或是讀一本想看很久的書。你對細節有著敏銳的觀察力，牆角的青苔或午後的陽光都能讓你感動。這種「慢」並非懶散，而是一種對生命品質的堅持，讓你在旅途中獲得真正的療癒與能量。你更傾向於深入感受一個地方的靈魂，而非僅僅在著名標誌前打卡。'
  },
  B: {
    emoji: '🏃', name: '極速旅人', en: 'Speed Demon',
    tags: ['🏃 打卡達人', '📸 九宮格專家', '⚡ 精力旺盛'],
    cartoonStyle: '可愛潮流 3D 渲染風格，場景：澀谷霓虹夜景，繽紛色彩，精緻細節，高品質光影，賽博龐克可愛化',
    personality: '你是效率與行動力的化身，時間對你來說是最珍規的資源。你熱愛達成目標的成就感，看到行程表上的景點一個個被勾選，會讓你感到無比滿足。你的精力旺盛，總能在最短的時間內體驗最精采的活動。你擅長利用各種科技工具來優化路徑，不喜歡任何形式的拖延或浪費。朋友都非常依賴你的策劃與執行能力，因為跟著你走，絕對能玩得最充實、最精彩，在有限的假期間創造出最大化的回憶價值。'
  },
  C: {
    emoji: '🏺', name: '文化沉澱者', en: 'Culture Diver',
    tags: ['🏺 深度文化', '🦋 心靈探索', '🍵 茶道美學'],
    cartoonStyle: '精緻手繪插畫風格 (Exquisite Hand-drawn Illustration)，場景：京都金閣寺，優雅溫潤色彩，富有層次感，高品質質感，文藝氣息',
    personality: '你擁有一顆充滿同理心與好奇心的靈魂，旅行對你來說是一場與土地的靈魂對話。你並不滿足於走馬看花的觀光，而是渴望深入了解當地的歷史、傳統與生活方式。你喜歡逛當地的傳統市場，與小販聊天，或是參與在地的節慶活動。你相信每座城市都有自己的心跳與脈絡，而你的使命就是去傾聽並理解它。你帶回家的不只是照片，更是滿滿的感動與深刻的哲學思考，這種深度的連結讓你的視野變得更寬廣。'
  },
  D: {
    emoji: '⚡', name: '冒險先驅', en: 'Adventure Seeker',
    tags: ['⚡ 挑戰極限', '🧗 攀登者', '🌊 野外探索'],
    cartoonStyle: '可愛冒險 3D 風格，場景：富士山日出雲海，精緻戶外裝備細節，壯麗柔和光影，電影級畫面質感',
    personality: '「挑戰」是你的生命密碼，你拒絕平庸與安逸的生活方式。旅行是你探索世界邊界的一種途徑，越是未知的領域越能激發你的鬥志與生命力。你熱愛體能上的挑戰，無論是攀登陡峭的高山還是潛入神秘的深海，都能讓你感受到生命的真實跳動與脈搏。你不怕困難，反而視挑戰為成長的養分。你有一種天生的領導氣質與勇氣，總能鼓勵身邊的人踏出舒適圈，去發現那個更強大的自己。'
  }
};

const MOD = {
  AA: { suffix: '·科技適應型', tag: '🤖 AI 嚮導', prompt: '必去：高科技景點、AI 互動體驗、科幻博物館', avoid: '避開：偏鄉野外、網路死角', modPersonality: '再加上你對科技的高度敏感度，你是那種會用 AI 把旅程優化到極致的人。手機是你最強的數位旅伴，比起傳統地圖，你更信任數據與即時資訊。你懂得如何利用數位工具避開人群、尋找最高評分的店家，這種智能化的旅行方式，讓你的每一步都走得精準且優雅。' },
  AB: { suffix: '·隨遇而安型', tag: '🦋 彈性大師', prompt: '必去：當地人常去的隱藏版景點、巷弄美食', avoid: '避開：過度商業化的觀光區', modPersonality: '突發狀況對你來說從來不是困擾，反而是驚喜冒險的開端。你擁有一種神奇的心理韌性，總能在計畫外的轉彎處，找到最動人的風景。你不拘泥於刻板的行程，這種靈活的生命態度，讓你的旅行充滿了詩意與未知的喜悅。' },
  AC: { suffix: '·從容探索型', tag: '☕ 從容派', prompt: '必去：質感咖啡廳、文創園區、藝術展覽', avoid: '避開：擁擠排隊名店', modPersonality: '遇到環境的變化，你總是保持著不慌不忙的優雅。你會先找一間安靜的咖啡廳坐下來，讓思緒在香氣中沉澱，等內心平靜後再決定下一步。這份難得的從容感，讓你的旅行永遠比別人多了一份深度與美學品味，這也是你獨特的魅力所在。' },
  AD: { suffix: '·嚴謹慢活型', tag: '📋 精算生活家', prompt: '必去：預約制餐廳、預訂門票的文化遺址', avoid: '避開：現場候補的熱門景點', modPersonality: '你的行囊裡永遠備有 Plan B 甚至 Plan C，因為你相信充分的準備是享受自由的前提。這份嚴謹與細心，讓你的旅程幾乎不會出現令人尷尬的差錯。朋友們都說跟你一起出遊是最放心的，因為你總是能把細節掌控得恰到好處，讓慢活也能過得很精緻。' },
  BA: { suffix: '·打卡爆肝型', tag: '📸 網美獵人', prompt: '必去：IG 熱門打卡點、網美咖啡廳、夕陽觀景台', avoid: '避開：安靜的寺廟或圖書館', modPersonality: '你的社交媒體限時動態，永遠是朋友圈裡最令人羨慕的焦點。你擅長捕捉最完美的角度，並利用最新科技提升打卡效率。對你來說，分享美的事物是一種生活態度，你那敏銳的視覺直覺，讓每張照片都像是精心設計的藝術品。' },
  BB: { suffix: '·狂野隨興型', tag: '🌀 自由靈魂', prompt: '必去：隨機發現的驚喜景點、路邊小吃', avoid: '避開：事先預訂的行程', modPersonality: '你是旅行界真正的自由靈魂，對你來說「沒有計畫」就是最好的計畫。你熱愛那種臨時起意、說走就走的快感。在陌生的十字路口隨性轉個彎，往往就能開啟一段意想不到的精彩故事。這種狂野的生命力，讓你每次旅行都像是一場未知的慶典。' },
  BC: { suffix: '·率真漫遊型', tag: '🌈 隨性玩咖', prompt: '必去：當地夜市、街邊美食、路人推薦的店', avoid: '避開：米其林預約餐廳', modPersonality: '你不需要冷冰冰的星星指南，路邊阿伯熱情推薦的小攤位才是你的真愛。你擁有一份純粹的率真，總能用最直接的方式與在地人連結。這種接地氣的旅行風格，讓你總能品嚐到最有溫度、最道地的生活滋味，這也是最讓你感到充實的時刻。' },
  BD: { suffix: '·精算達人型', tag: '💹 性價比追求者', prompt: '必去：高 CP 值景點、免費博物館、特價商品', avoid: '避開：昂貴的網紅店', modPersonality: '你擁有一雙能瞬間看穿「價值」的利眼。在同樣的預算下，你總能策劃出比別人精彩三倍的體驗，這不僅是省錢，更是一種聰明生活的智慧。你懂得把資源花在刀口上，這種精算的能力讓你的每趟旅程都顯得無比聰明且充滿成就感。' },
  CA: { suffix: '·智能導航型', tag: '🗺️ 智慧行者', prompt: '必去：科技園區、AI 展覽館、智能城市應用展示', avoid: '避開：沒有網路服務的偏遠地區', modPersonality: '你完美地結合了文化探索與現代科技。在古蹟前你會用 AI 查閱歷史，在博物館裡你會利用數位導覽深入理解背景。這種「虛實整合」的旅行方式，讓你的每次參觀都具備了極高的含金量，也讓文化沉澱變得更有效率且現代化。' },
  CB: { suffix: '·直覺冒險型', tag: '🔮 第六感強', prompt: '必去：隨心所欲探索、迷路時發現的秘密基地', avoid: '避開：嚴格的行程表', modPersonality: '你的直覺就是你最好的導航儀。你敢於跟著感覺走，不被繁雜的旅遊手冊所限制。往往在最意想不到的偏僻小巷，你就能發現最有故事的文化寶藏或私人秘境。這種靠著「第六感」引導的冒險，讓你的文化之旅充滿了命運般的奇遇。' },
  CC: { suffix: '·創意漫遊型', tag: '🎨 藝術靈魂', prompt: '必去：街頭藝術、獨立書店、設計師小店', avoid: '避開：連鎖品牌商場', modPersonality: '你的眼睛自帶藝術濾鏡，世界在你眼中是一幅流動的畫作。街頭色彩繽紛的塗鴉、獨立書店特有的紙張氣味、設計師小店裡充滿溫度的手作，都是你旅行中最珍貴的收藏。這種對美的執著與創意，讓你的文化探索充滿了靈性。' },
  CD: { suffix: '·策展達人型', tag: '📐 策劃高手', prompt: '必去：預約制工作坊、導覽行程、文化深度論壇', avoid: '避開：走馬看花的觀光團', modPersonality: '你把每次旅行都視為一場精心策劃的個人展覽。預約制的深度講座、限量的職人工作坊，都是你行程表上的首選。你拒絕走馬看花，追求的是真正的文化沉浸與學術深度，這讓你的旅行經歷在質地上顯得格外厚實且迷人。' },
  DA: { suffix: '·跳島遊走型', tag: '🏝️ 彈性跳島', prompt: '必去：周邊小島一日來回、跳點行程、海上活動', avoid: '避開：定點深度之旅', modPersonality: '你旺盛的冒險精神搭配精準的科技規劃，讓你在最短時間內能完成最多的挑戰。你的旅行地圖上總是佈滿了待開發的標記，這種高效的「跳點」模式，讓你在每次出遊中都能大幅拓寬生命的邊界，體驗多樣化的冒險樂趣。' },
  DB: { suffix: '·荒野達人型', tag: '🛶 荒野冒險', prompt: '必去：無人地帶、露營、極限單車、越野', avoid: '避開：高級飯店、豪華行程', modPersonality: '越是艱困的環境，越能磨練出你堅韌的意志。你享受那種與大自然搏鬥的原始快感，無論是露宿荒野還是穿越叢林，都能讓你感到前所未有的自由。你那無畏的勇氣與卓越的野外生存技能，讓你成為冒險隊伍中不可獲缺的靈魂人物。' },
  DC: { suffix: '·熱血直覺型', tag: '🔥 行動力爆棚', prompt: '必去：極限運動場、熱血音樂節、高難度登山步道', avoid: '避開：需要長時間靜坐的行程', modPersonality: '你是旅行中的一把火，走到哪裡都能燃起熱情。你不需要太多的思考，直覺會告訴你哪裡有最棒的挑戰。你那爆棚的行動力，讓你的冒險旅程永遠充滿了快節奏的驚喜與純粹的熱血，這種活在當下的生命力，極具感染力。' },
  DD: { suffix: '·極限規劃型', tag: '🧗 攀登大師', prompt: '必去：難度最高的挑戰景點、專業訓練場', avoid: '避開：休閒散步行程', modPersonality: '你把冒險視為一種修煉，每一分風險都在你的精密計算之中。你熱愛挑戰極限，但絕不盲目衝動。你對每個細節的極致追求，讓你即使在最危險的環境下，也能保持冷靜並帶領大家安全突圍，這就是你作為極限規劃者的強大實力。' }
};

const QUESTIONS = [
  {
    text: '【第 1 題，共 3 題】\n✈️ 你最嚮往哪種旅行基調？',
    options: [
      { label: '🌿 悠閒慢活', value: 'A', desc: '不趕行程，在咖啡廳坐一下午也無所謂' },
      { label: '🏃 有效率打卡', value: 'B', desc: '精準掌握時間，要把必去景點都集滿' },
      { label: '🏺 深度文化', value: 'C', desc: '走進歷史巷弄，聽當地的故事' },
      { label: '⚡ 極限挑戰', value: 'D', desc: '上山下海，體驗平時不敢做的事' }
    ]
  },
  {
    text: '【第 2 題，共 3 題】\n😅 店家沒開、行程突發狀況，你通常怎麼做？',
    options: [
      { label: '📱 立刻搜尋替代方案', value: 'A', desc: '打開 AI 或地圖找周邊最高評分的地方' },
      { label: '🦋 隨便逛逛看看', value: 'B', desc: '附近走走說不定反而有驚喜' },
      { label: '☕ 先找咖啡廳坐下', value: 'C', desc: '沉澱一下，再慢慢想下一步去哪' },
      { label: '📋 執行備用計畫', value: 'D', desc: '早就準備好 Plan B，直接切換' }
    ]
  },
  {
    text: '【第 3 題，共 3 題】\n🗓️ 你喜歡怎樣安排一天的行程密集度？',
    options: [
      { label: '🌅 佛系節奏', value: 'A', desc: '一天 1-2 個大點就好，其他隨緣' },
      { label: '🚀 特種兵模式', value: 'B', desc: '從早到晚行程填滿滿，體力不是問題' },
      { label: '⚖️ 半糖主義', value: 'C', desc: '早上跑行程，下午留白放空' },
      { label: '📐 精準串聯', value: 'D', desc: '依交通動線安排 3-4 個必去地點' }
    ]
  }
];

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    body.events.forEach(event => {
      if (event.type === 'message') {
        if (event.message.type === 'text') handleTextMessage(event);
        else if (['image', 'audio', 'video', 'file'].includes(event.message.type)) handleFileMessage(event);
      }
      else if (event.type === 'postback') handlePostback(event);
      else if (event.type === 'follow') handleFollow(event);
    });
  } catch (err) { console.log('Error: ' + err.toString()); }
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' })).setMimeType(ContentService.MimeType.JSON);
}

function handleTextMessage(event) {
  const userId = event.source.userId;
  const text = event.message.text.trim().toLowerCase();
  const triggers = ['人格', '測驗', '開始', 'start', '性格'];
  
  if (triggers.some(t => text.includes(t))) {
    resetUserState(userId);
    setUserState(userId, { step: 1, answers: {} });
    sendQuestion(event.replyToken, 0);
  }
}

function handleFollow(event) {
  const name = getUserDisplayName(event);
  replyText(event.replyToken, `${name} 歡迎參加工作坊！✨\n請回覆「人格」開始測驗 🧭`);
}

function handlePostback(event) {
  const userId = event.source.userId;
  const data = parseQueryString(event.postback.data);
  if (!data.q || !data.a) return;

  const qIdx = parseInt(data.q);
  let state = getUserState(userId) || { step: 1, answers: {} };
  state.answers[qIdx] = data.a;

  if (qIdx < 2) {
    // 儲存狀態並發送下一題
    setUserState(userId, state);
    sendQuestion(event.replyToken, qIdx + 1);
  } else {
    // 測驗結束，先抓名字（優化：只抓一次）
    const name = getUserDisplayName(event);
    sendResult(event.replyToken, state.answers, event, name);
    resetUserState(userId); // 測驗結束後徹底清除狀態
  }
}

function handleFileMessage(event) {
  try {
    const userId = event.source.userId;
    const name = getUserDisplayName(event);
    const messageId = event.message.id;
    const type = event.message.type;

    const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
    const res = UrlFetchApp.fetch(url, { headers: { 'Authorization': 'Bearer ' + getLineToken() } });
    const blob = res.getBlob();

    const root = DriveApp.getFolderById(WORKSHOP_FOLDER_ID);
    const it = root.getFoldersByName(name);
    const folder = it.hasNext() ? it.next() : root.createFolder(name);

    const ts = Utilities.formatDate(new Date(), "GMT+8", "MMdd_HHmm");
    let fName = event.message.fileName || `${ts}_${messageId.substring(0, 5)}`;
    
    // 補足副檔名 Bug 修正
    if (!fName.includes('.')) {
      if (type === 'image') fName += '.jpg';
      else if (type === 'audio') fName += '.m4a';
      else if (type === 'video') fName += '.mp4';
    }
    
    folder.createFile(blob).setName(fName);
  } catch (e) { console.log('File Save Error: ' + e.toString()); }
}

function sendQuestion(replyToken, questionIndex) {
  const q = QUESTIONS[questionIndex];
  const progressDots = ['●○○', '●●○', '●●●'];
  
  const optionButtons = q.options.map(opt => ({
    type: 'box',
    layout: 'vertical',
    spacing: 'xs',
    paddingAll: '12px',
    backgroundColor: '#f8fafc',
    cornerRadius: 'md',
    margin: 'sm',
    action: {
      type: 'postback',
      label: opt.label,
      data: `q=${questionIndex}&a=${opt.value}`,
      displayText: opt.label
    },
    contents: [
      { type: 'text', text: opt.label, weight: 'bold', size: 'md', color: '#1e293b' },
      { type: 'text', text: opt.desc, size: 'xs', color: '#64748b' }
    ]
  }));

  const bubbleContents = {
    type: 'bubble',
    header: {
      type: 'box', layout: 'vertical', backgroundColor: '#c41e3a', paddingAll: '20px',
      contents: [
        { type: 'text', text: 'TRAVEL PERSONALITY', weight: 'bold', color: '#ffffff', size: 'sm', opacity: '0.7' },
        { type: 'text', text: '旅遊人格測驗', weight: 'bold', color: '#ffffff', size: 'xl', margin: 'sm' }
      ]
    },
    body: {
      type: 'box', layout: 'vertical', paddingAll: '20px',
      contents: [
        { type: 'text', text: progressDots[questionIndex], color: '#c41e3a', weight: 'bold', size: 'sm' },
        { type: 'text', text: q.text, weight: 'bold', size: 'md', margin: 'md', wrap: true },
        { type: 'box', layout: 'vertical', margin: 'lg', spacing: 'sm', contents: optionButtons }
      ]
    }
  };

  callLineAPI({
    replyToken: replyToken,
    messages: [{
      type: 'flex',
      altText: '旅遊人格測驗 - 第 ' + (questionIndex + 1) + ' 題',
      contents: bubbleContents
    }]
  });
}

function sendResult(replyToken, answers, event, displayName) {
  const userId = event.source.userId;
  sendLoadingAnimation(userId, 3);
  const base = BASE[answers[0]];
  const mod = MOD[answers[1] + answers[2]];
  const fullName = base.name + mod.suffix;
  const fullDesc = `${base.personality}\n\n${mod.modPersonality}`;
  
  const promptText = `🎨 您的專屬生圖指令：\n\n請參考這張照片，生成一張【可愛討喜且極具電影級質感】的 3D 卡通旅遊海報。\n\n🌟 視覺風格：${base.cartoonStyle}。請使用 Pixar 3D 渲染技術，呈現極致柔和的電影級光影、溫潤材質與 8K 高清細節，整體氛圍要溫馨且高級。\n👤 人物設定：請精確保留「附圖中的臉部特徵」，將其轉化為表情生動、比例可愛的討喜 3D 角色。\n✍️ 畫面文字：在合適位置加入精緻藝術字：「${displayName} 的${base.name}之旅」\n🏷️ 隱藏彩蛋：請在畫面某個角落，以「旅行貼紙」、「城市街牌」或「復古印章」的形式，自然融入文字「AI 旅遊工作坊」，風格要像圖的一部分，完全不像廣告。\n比例：1:1`;

  const resultBubble = {
    type: 'bubble',
    header: { type: 'box', layout: 'vertical', backgroundColor: '#1e293b', paddingAll: '20px', contents: [{ type: 'text', text: base.emoji, size: '4xl', align: 'center' }, { type: 'text', text: fullName, weight: 'bold', color: '#ffffff', size: 'xl', align: 'center', margin: 'md' }] },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '20px',
      contents: [
        { type: 'text', text: '✨ 人格深度解析', weight: 'bold', color: '#c41e3a', size: 'md' },
        { type: 'text', text: fullDesc, wrap: true, size: 'md', color: '#334155', margin: 'md' }
      ]
    },
    footer: { type: 'box', layout: 'vertical', contents: [{ type: 'button', action: { type: 'uri', label: '🚀 開啟 ChatGPT App', uri: 'https://chatgpt.com/?openExternalBrowser=1' }, style: 'primary', color: '#7c3aed' }] }
  };

  callLineAPI({
    replyToken: replyToken,
    messages: [
      { type: 'flex', altText: '您的旅遊人格測驗結果', contents: resultBubble },
      { type: 'text', text: promptText }
    ]
  });
}

// ===== 工具函式 (優化版) =====

function getUserState(uId) { 
  const raw = CacheService.getScriptCache().get('user_' + uId); 
  return raw ? JSON.parse(raw) : null; 
}

function setUserState(uId, s) { 
  CacheService.getScriptCache().put('user_' + uId, JSON.stringify(s), 600); // 10分鐘內有效
}

function resetUserState(uId) { 
  CacheService.getScriptCache().remove('user_' + uId); 
}

function replyText(token, txt) { 
  callLineAPI({ replyToken: token, messages: [{ type: 'text', text: txt }] }); 
}

function callLineAPI(p) { 
  UrlFetchApp.fetch(LINE_API_URL, { 
    method: 'post', 
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getLineToken() }, 
    payload: JSON.stringify(p), 
    muteHttpExceptions: true 
  }); 
}

function sendLoadingAnimation(uId, s) { 
  UrlFetchApp.fetch('https://api.line.me/v2/bot/chat/loading/start', { 
    method: 'post', 
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getLineToken() }, 
    payload: JSON.stringify({ chatId: uId, loadingSeconds: s }), 
    muteHttpExceptions: true 
  }); 
}

function getUserDisplayName(event) {
  const uId = event.source.userId;
  const cache = CacheService.getScriptCache();
  const cachedName = cache.get('name_' + uId);
  if (cachedName) return cachedName;

  const sourceType = event.source.type;
  let url = 'https://api.line.me/v2/bot/profile/' + uId;
  if (sourceType === 'group') url = `https://api.line.me/v2/bot/group/${event.source.groupId}/member/${uId}`;
  else if (sourceType === 'room') url = `https://api.line.me/v2/bot/room/${event.source.roomId}/member/${uId}`;
  
  try {
    const res = UrlFetchApp.fetch(url, { headers: { 'Authorization': 'Bearer ' + getLineToken() }, muteHttpExceptions: true });
    const resData = JSON.parse(res.getContentText());
    const name = resData.displayName || '新朋友';
    cache.put('name_' + uId, name, 3600); // 快取 1 小時
    return name;
  } catch (e) { return '新朋友'; }
}

function parseQueryString(qs) {
  const r = {};
  if (!qs) return r;
  qs.split('&').forEach(p => {
    const eqIdx = p.indexOf('=');
    if (eqIdx > -1) {
      const k = decodeURIComponent(p.substring(0, eqIdx));
      const v = decodeURIComponent(p.substring(eqIdx + 1));
      r[k] = v;
    }
  });
  return r;
}
