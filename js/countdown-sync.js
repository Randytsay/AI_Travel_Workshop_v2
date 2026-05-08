// Firebase 配置 - AI Travel Workshop
const firebaseConfig = {
    apiKey: "AIzaSyCLXqbPKDsIdOPCOZq_De5i6F2dQOLbBBk",
    authDomain: "ai-travel-83c71.firebaseapp.com",
    databaseURL: "https://ai-travel-83c71-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ai-travel-83c71",
    storageBucket: "ai-travel-83c71.firebasestorage.app",
    messagingSenderId: "434377574390",
    appId: "1:434377574390:web:2e01a9fbfd4e619cdae9d7"
};

// 倒數計時同步管理器
const CountdownSync = {
    // 使用 BroadcastChannel API 實現跨分頁同步（同一裝置）
    // 使用 Firebase 實現跨裝置同步（需配置）

    channel: null,
    firebase: null,
    callbacks: [],

    init() {
        // 嘗試使用 BroadcastChannel（現代瀏覽器支援）
        if (typeof BroadcastChannel !== 'undefined') {
            this.channel = new BroadcastChannel('workshop_countdown');
            this.channel.onmessage = (e) => {
                this.notifyCallbacks(e.data);
            };
        }

        // 監聽 localStorage 變化（跨分頁同步的後備方案）
        window.addEventListener('storage', (e) => {
            if (e.key === 'workshop_countdown_data') {
                this.notifyCallbacks({
                    type: 'update',
                    ...JSON.parse(e.newValue)
                });
            }
        });

        // 如果有 Firebase 配置，初始化 Firebase
        if (firebaseConfig.apiKey && typeof firebase !== 'undefined') {
            this.initFirebase();
        }
    },

    initFirebase() {
        try {
            firebase.initializeApp(firebaseConfig);
            this.firebase = firebase.database().ref('countdown');
            this.firebase.on('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    this.notifyCallbacks({
                        type: 'update',
                        ...data
                    });
                    // 同步到 localStorage
                    localStorage.setItem('workshop_countdown_data', JSON.stringify(data));
                    if (data.deadline) {
                        localStorage.setItem('workshop_countdown_deadline', data.deadline.toString());
                    } else {
                        localStorage.removeItem('workshop_countdown_deadline');
                    }
                }
            });
            console.log('✅ Firebase 即時同步已啟用');
        } catch (error) {
            console.warn('Firebase 初始化失敗，使用本機模式:', error);
        }
    },

    onUpdate(callback) {
        this.callbacks.push(callback);
    },

    notifyCallbacks(data) {
        this.callbacks.forEach(cb => cb(data));
    },

    setDeadline(deadline, paused = false, remainingTime = null) {
        const data = {
            deadline,
            paused,
            remainingTime,
            updatedAt: Date.now()
        };

        // 儲存到 localStorage
        localStorage.setItem('workshop_countdown_data', JSON.stringify(data));
        if (deadline) {
            localStorage.setItem('workshop_countdown_deadline', deadline.toString());
        } else {
            localStorage.removeItem('workshop_countdown_deadline');
        }

        // 透過 BroadcastChannel 通知其他分頁
        if (this.channel) {
            this.channel.postMessage({ type: 'update', ...data });
        }

        // 透過 Firebase 同步到其他裝置
        if (this.firebase) {
            this.firebase.set(data);
        }
    },

    getData() {
        const stored = localStorage.getItem('workshop_countdown_data');
        return stored ? JSON.parse(stored) : { deadline: null, paused: false, remainingTime: null };
    },

    getDeadline() {
        const data = this.getData();
        return data.deadline;
    },

    pause() {
        const data = this.getData();
        if (data.deadline && !data.paused) {
            const remainingTime = data.deadline - Date.now();
            this.setDeadline(null, true, remainingTime);
        }
    },

    resume() {
        const data = this.getData();
        if (data.paused && data.remainingTime) {
            const newDeadline = Date.now() + data.remainingTime;
            this.setDeadline(newDeadline, false, null);
        }
    },

    clear() {
        this.setDeadline(null, false, null);
    }
};

// 頁面載入時初始化
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        CountdownSync.init();
    });
}
