/* ============================================
   AI 旅遊規劃工作坊 - 共用 JavaScript
   ============================================ */

// --- Progress State Management ---
const WorkshopState = {
    currentPhase: 1,
    completedPhases: [],
    surveySubmitted: false,
    gasUrl: '',

    // Load state from localStorage
    load() {
        const saved = localStorage.getItem('workshop_state');
        if (saved) {
            const data = JSON.parse(saved);
            this.currentPhase = data.currentPhase || 1;
            this.completedPhases = data.completedPhases || [];
            this.surveySubmitted = data.surveySubmitted || false;
            this.gasUrl = data.gasUrl || '';
        }
    },

    // Save state to localStorage
    save() {
        localStorage.setItem('workshop_state', JSON.stringify({
            currentPhase: this.currentPhase,
            completedPhases: this.completedPhases,
            surveySubmitted: this.surveySubmitted,
            gasUrl: this.gasUrl
        }));
    },

    // Mark a phase as completed
    completePhase(phaseNum) {
        if (!this.completedPhases.includes(phaseNum)) {
            this.completedPhases.push(phaseNum);
            this.save();
        }
    },

    // Set current phase
    setCurrentPhase(phaseNum) {
        this.currentPhase = phaseNum;
        this.save();
    },

    // Check if phase is completed
    isCompleted(phaseNum) {
        return this.completedPhases.includes(phaseNum);
    },

    // Reset all progress (for testing)
    reset() {
        this.currentPhase = 1;
        this.completedPhases = [];
        this.surveySubmitted = false;
        localStorage.removeItem('workshop_state');
    }
};

// Initialize state on load
WorkshopState.load();

// --- Navigation ---
function navigateTo(page) {
    window.location.href = page;
}

function goToPhase(phaseNum) {
    WorkshopState.setCurrentPhase(phaseNum);
    navigateTo(`pages/phase${phaseNum}.html`);
}

function goToPhaseFromSubpage(phaseNum) {
    WorkshopState.setCurrentPhase(phaseNum);
    navigateTo(`phase${phaseNum}.html`);
}

function goHome() {
    navigateTo('../index.html');
}

function goHomeFromRoot() {
    navigateTo('index.html');
}

// --- Clipboard Functions ---
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.value || element.innerText;
    fallbackCopy(text);
}

function copyText(text) {
    fallbackCopy(text);
}

function fallbackCopy(text) {
    if (!navigator.clipboard) {
        // Fallback for older browsers
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try {
            document.execCommand('copy');
            showCopyToast('已複製到剪貼簿！');
        } catch (e) {
            showCopyToast('複製失敗，請手動複製', true);
        }
        document.body.removeChild(ta);
    } else {
        navigator.clipboard.writeText(text).then(() => {
            showCopyToast('已複製到剪貼簿！');
        }).catch(() => {
            showCopyToast('複製失敗，請手動複製', true);
        });
    }
}

// --- Toast Notifications ---
let toastTimeout;

function showCopyToast(message, isError = false) {
    // Remove existing toast if any
    let toast = document.querySelector('.copy-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'copy-toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.background = isError ? '#ef4444' : '#292524';

    // Show toast
    clearTimeout(toastTimeout);
    setTimeout(() => toast.classList.add('show'), 10);

    // Hide after 2 seconds
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// --- Google Sheets Submission ---
async function submitToGoogleSheets(data, onSuccess, onError) {
    // 優先使用寫死的 URL，次之為 localStorage
    const HARDCODED_GAS_URL = 'https://script.google.com/macros/s/AKfycbxOi_q-LhAj56riAhb_ufn2Ks_-t_a6Cw3-13SyDFj2uRFMo66S719OM5cLQKCxXVC1/exec';
    const scriptURL = HARDCODED_GAS_URL || WorkshopState.gasUrl || localStorage.getItem('workshop_gas_url');

    if (!scriptURL) {
        if (onError) onError('錯誤：未設定 Google Sheets 連結。');
        return;
    }

    try {
        await fetch(scriptURL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (onSuccess) onSuccess();
    } catch (error) {
        console.error('Submission error:', error);
        if (onError) onError('發生錯誤，請截圖此畫面傳給工作人員。');
    }
}

// --- Prompt Generator Utilities ---
function generateTravelPrompt(options) {
    const { destination, style, customRequests, role } = options;

    let roleText = role ? `你是一位${role}。` : '你是一位專業的日本旅遊規劃師。';
    let customText = customRequests
        ? `\n3. **特別需求與限制**：${customRequests}`
        : '\n3. **特別需求**：無，請依照一般大眾建議即可。';

    return `${roleText}請幫我規劃一個 5 天 4 夜的 **${destination}** 行程。

我的旅行條件如下：
1. **旅行風格**：${style}
2. **主要目標**：體驗當地最道地的氛圍。${customText}

請幫我生成一份詳細的行程表，格式要求如下：
- 請以**表格**方式呈現。
- 欄位包含：日期、時間（上午/下午/晚上）、景點/活動、交通方式（含預估時間與轉乘建議）、以及推薦的當地美食。
- 在表格下方，請額外列出這個行程的 **3 個必去亮點** 與 **1 個在地人須知的小提醒**。`;
}

// Map style data
const mapStyles = {
    claymorphism: {
        name: '親子黏土風',
        emoji: '🧸',
        target: '親子族群',
        desc: '馬卡龍色、微縮模型感',
        prompt: '藝術風格: 3D 等距視角、黏土擬真質感 (Claymorphism)、馬卡龍色調，像微縮模型玩具。所有元素都像用黏土捏製而成，圓潤可愛。'
    },
    pixel: {
        name: '像素復古風',
        emoji: '👾',
        target: '動漫/年輕族群',
        desc: '超級瑪利歐地圖感',
        prompt: '藝術風格: 16-bit 復古像素藝術 (Pixel Art)。類似 90 年代 RPG 遊戲畫面或超級瑪利歐地圖，將景點設為關卡。色彩鮮豔明快，邊緣鋸齒狀，帶有可愛與懷舊的感覺。'
    },
    ukiyo: {
        name: '浮世繪風',
        emoji: '🎎',
        target: '長輩/文青族群',
        desc: '葛飾北齋、高質感',
        prompt: '藝術風格: 日本傳統浮世繪風格 (Ukiyo-e)。模仿葛飾北齋或歌川廣重的筆觸。使用大膽的輪廓線、平塗的色彩（普魯士藍、朱紅、赭黃）。背景加入海浪或富士山紋樣。泛黃紙張質感、靛藍與米色主調。'
    },
    cyberpunk: {
        name: '賽博龐克',
        emoji: '🌃',
        target: '都會/年輕人',
        desc: '霓虹燈光、未來感',
        prompt: '藝術風格: 賽博龐克 (Cyberpunk) 與未來主義。深色背景，搭配高對比的霓虹光（粉紅、青色、紫色）。建築物帶有科技感與發光招牌，營造東京夜景的科幻氛圍。'
    },
    minimalist: {
        name: '極簡線條',
        emoji: '✏️',
        target: '文青/極簡控',
        desc: 'Kinfolk 雜誌風',
        prompt: '藝術風格: 現代極簡主義 (Minimalist Line Art)。類似 Kinfolk 雜誌風格。大量留白，使用黑色細線條描繪輪廓，僅在重點處點綴低飽和度的莫蘭迪色系。'
    },
    watercolor: {
        name: '日式水彩',
        emoji: '🌸',
        target: '溫馨旅遊',
        desc: '經典櫻花電車',
        prompt: '藝術風格: 溫暖、迷人、手繪水彩插畫。絕非照片寫實風格。使用柔和的輪廓線、溫潤的紋理，以及舒適的色調（粉彩、暖黃、藍色與粉色，並帶有花卉裝飾）。氛圍：營造浪漫溫馨的感覺。'
    }
};

function generateMapPrompt(styleKey, itinerary = '[在此處貼上你剛剛生成的文字行程...]') {
    const style = mapStyles[styleKey];
    if (!style) return '';

    return `# 角色與目標
你是一位專業的插畫家。請將以下文字行程轉化為一幅資訊圖表地圖。

# 視覺風格要求 (關鍵)
- ${style.prompt}
- 版面與動線: 一條蜿蜒的路徑，從上而下。使用虛線連接事件。

# 內容元素
1. 時間: 清晰的時鐘圖示。
2. 地點/活動: 具體的交通工具、建築外觀。
3. 食物: 美味的食物插畫。

# 行程內容：
${itinerary}`;
}

// Social post generator
function generateSocialPost(options) {
    const { platform, style, destination, hashtags } = options;

    const styleText = {
        '炫耀型': '活潑有趣、充滿驚嘆號',
        '實用分享': '實用資訊為主、條列式',
        '文青低調': '文藝氣息、簡潔優雅',
        '邀約朋友': '輕鬆邀約、互動式'
    };

    return `請幫我寫一篇 ${platform} 貼文，內容要包含：
1. 我正在學用 AI 規劃${destination || '日本'}旅遊
2. 這是我用 Gemini 生成的手繪地圖（超有質感！）
3. 這個工作坊真的很好玩
4. 邀請朋友來按讚支持我

風格：${styleText[style] || '活潑有趣'}
請加上 5 個相關 emoji 和以下 hashtag：
${hashtags || '#AI旅遊規劃 #Gemini #日本自由行 #我的AI地圖 #工作坊'}`;
}

// Animation prompt generator
const animationEffects = {
    sakura: { name: '櫻花飄落', prompt: '櫻花花瓣緩緩從上方飄落，隨風輕輕擺動。' },
    clouds: { name: '雲朵移動', prompt: '天空中的雲朵緩緩向右飄移。' },
    train: { name: '電車駛過', prompt: '一輛電車從畫面左側駛向右側，帶有鐵軌聲效。' },
    walking: { name: '人物走動', prompt: '地圖上的小人物沿著路線行走。' },
    lights: { name: '燈光閃爍', prompt: '夜景中的霓虹燈有微微閃爍的動態效果。' }
};

function generateAnimationPrompt(effectKey, description = '') {
    const effect = animationEffects[effectKey];
    if (!effect) return '';

    return `請將這張靜態圖片轉換為動畫。

動畫效果：${effect.prompt}
${description ? `額外說明：${description}` : ''}

輸出格式：MP4 或 GIF
長度：3-5 秒循環`;
}

// --- UI Helpers ---
function updateProgressDots(currentPhase, totalPhases = 6) {
    const dotsContainer = document.querySelector('.progress-dots');
    if (!dotsContainer) return;

    dotsContainer.innerHTML = '';

    const phaseNames = ['靈感發想', '深度規劃', '驗證防幻覺', '視覺地圖+社群', '現場生存', '商業變現'];

    for (let i = 1; i <= totalPhases; i++) {
        const dot = document.createElement('div');
        dot.className = 'progress-dot';
        dot.title = `跳轉至階段 ${i}: ${phaseNames[i - 1]}`;

        if (WorkshopState.isCompleted(i)) {
            dot.classList.add('completed');
        } else if (i === currentPhase) {
            dot.classList.add('active');
        }

        // Add navigation functionality
        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof goToPhase === 'function') {
                goToPhase(i);
            } else if (typeof goToPhaseFromSubpage === 'function') {
                goToPhaseFromSubpage(i);
            }
        });

        dotsContainer.appendChild(dot);
    }
}

function setButtonLoading(button, loading = true) {
    if (loading) {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = '<div class="spinner"></div> 處理中...';
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || button.innerHTML;
    }
}

// --- Time Display ---
function updateCurrentTime() {
    const timeElement = document.getElementById('current-time');
    if (!timeElement) return;

    const now = new Date();
    const options = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    };
    timeElement.textContent = now.toLocaleTimeString('zh-TW', options);
}

// Update time every minute
setInterval(updateCurrentTime, 60000);

// --- Initialize Page ---
document.addEventListener('DOMContentLoaded', () => {
    updateCurrentTime();

    // Load GAS URL if exists
    const savedGasUrl = localStorage.getItem('workshop_gas_url');
    if (savedGasUrl) {
        WorkshopState.gasUrl = savedGasUrl;
    }

    // 全域動態櫻花效果
    if (!document.querySelector('.no-sakura')) {
        function createSakura() {
            // 如果頁面在背景隱藏狀態，不產生櫻花，防止回到頁面時大噴發
            if (document.hidden) return;

            const sakura = document.createElement('div');
            sakura.className = 'sakura';
            sakura.innerHTML = '🌸';

            // 隨機屬性設置
            sakura.style.left = Math.random() * 100 + 'vw';
            sakura.style.fontSize = (Math.random() * 15 + 10) + 'px';
            sakura.style.animationDuration = (Math.random() * 5 + 8) + 's';
            sakura.style.opacity = Math.random() * 0.6 + 0.4;

            // 使用 animationend 事件自動清理
            sakura.addEventListener('animationend', () => {
                sakura.remove();
            });

            document.body.appendChild(sakura);
        }
        setInterval(createSakura, 2000); // 稍微加快生成速度
    }
});

// --- Export for modules (if needed) ---
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        WorkshopState,
        copyToClipboard,
        copyText,
        submitToGoogleSheets,
        generateTravelPrompt,
        generateMapPrompt,
        generateSocialPost,
        generateAnimationPrompt,
        mapStyles,
        animationEffects
    };
}
