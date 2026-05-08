// analysis.js - Workshop Analysis Data Processing and Chart Generation

// Global variables
let surveyData = [];
let processedData = {};
let charts = {};

// Google Sheets configuration
const SHEET_ID = '1c8WH8f5Pqm9TQxQIuAqaD2FvTm70RZtxX2dPSdZHGpc';
const SHEET_NAME = '問卷回饋';
const API_KEY = 'AIzaSyCgdPZNCSLSCbvVvnyi2QjqgPbVE2ju-AE';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    updateData();
});

// Update data from Google Sheets
async function updateData() {
    try {
        showLoading();
        const data = await fetchSurveyData();
        surveyData = data;
        processedData = processData(data);
        renderAllCharts();
        updateStatCards();
        renderTables();
        renderActionList();
        renderReactionKeywords();
        renderSuggestionsRaw();
        updateFutureInterestStats();
        renderCourseRecommendations();
        document.getElementById('update-time').textContent = new Date().toLocaleString('zh-TW');
        hideLoading();
    } catch (error) {
        console.error('更新數據失敗:', error);
        alert('更新數據失敗，請稍後再試');
    }
}

// Fetch data from Google Sheets
async function fetchSurveyData() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}?key=${API_KEY}`;
    const response = await fetch(url);
    const result = await response.json();
    const rows = result.values;

    // Convert to objects
    const headers = rows[0];
    const data = rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index] || '';
        });
        return obj;
    });

    return data;
}

// Process raw data
function processData(data) {
    const processed = {
        total: data.length,
        aiLevelDistribution: {},
        inviterSourceDistribution: {},
        absorptionDistribution: {},
        satisfactionDistribution: {},
        recommendationDistribution: {},
        levelAnalysis: {},
        wowMoments: {},
        aiInterests: {},
        shopInterests: {},
        flowSmoothness: {},
        transitions: {},
        suggestions: [],
        reactions: []
    };

    // Initialize distributions
    ['Lv 1', 'Lv 2', 'Lv 3', 'Lv 4'].forEach(level => {
        processed.aiLevelDistribution[level] = 0;
        processed.levelAnalysis[level] = {
            count: 0,
            absorption: [],
            satisfaction: [],
            recommendation: []
        };
    });

    // Process each response
    data.forEach(row => {
        const name = row['姓名'];
        const role = row['身份'];
        const aiLevel = preSurveyData[name] || 'Lv 2'; // Default to Lv 2 if not found

        // AI Level distribution
        processed.aiLevelDistribution[aiLevel] = (processed.aiLevelDistribution[aiLevel] || 0) + 1;

        // Inviter source (只計算新朋友視角)
        if (role === '新朋友') {
            const inviter = row['1. 邀請人'];
            processed.inviterSourceDistribution[inviter] = (processed.inviterSourceDistribution[inviter] || 0) + 1;
        }

        //吸收度 (合併兩個視角)
        const absorption = parseInt(row['2. 吸收程度 (新朋友版)'] || row['2. 吸收程度 (夥伴版)']) || 0;
        if (absorption > 0) {
            processed.absorptionDistribution[absorption] = (processed.absorptionDistribution[absorption] || 0) + 1;
            processed.levelAnalysis[aiLevel].absorption.push(absorption);
        }

        // 滿意度 (新朋友版)
        const satisfaction = parseInt(row['3. 整體滿意度']) || 0;
        if (satisfaction > 0) {
            processed.satisfactionDistribution[satisfaction] = (processed.satisfactionDistribution[satisfaction] || 0) + 1;
            processed.levelAnalysis[aiLevel].satisfaction.push(satisfaction);
        }

        // 推薦意願 (新朋友版)
        const recommendation = parseInt(row['7. 推薦意願']) || 0;
        if (recommendation > 0) {
            processed.recommendationDistribution[recommendation] = (processed.recommendationDistribution[recommendation] || 0) + 1;
            processed.levelAnalysis[aiLevel].recommendation.push(recommendation);
        }

        processed.levelAnalysis[aiLevel].count++;

        // Wow Moment
        const wowMoment = row['4. Wow Moment'];
        if (wowMoment) {
            processed.wowMoments[wowMoment] = (processed.wowMoments[wowMoment] || 0) + 1;
        }

        // AI Interests (多選)
        const aiInterests = row['5. AI 興趣'];
        if (aiInterests) {
            aiInterests.split(',').forEach(interest => {
                const trimmed = interest.trim();
                if (trimmed) {
                    processed.aiInterests[trimmed] = (processed.aiInterests[trimmed] || 0) + 1;
                }
            });
        }

        // Shop Interest
        const shopInterest = row['6. Shop 興趣'];
        if (shopInterest) {
            processed.shopInterests[shopInterest] = (processed.shopInterests[shopInterest] || 0) + 1;
        }

        // Flow Smoothness (夥伴版)
        const flowSmoothness = row['1. 流程順暢度'];
        if (flowSmoothness) {
            processed.flowSmoothness[flowSmoothness] = (processed.flowSmoothness[flowSmoothness] || 0) + 1;
        }

        // Transitions (夥伴版)
        const transition = row['3. 轉場回饋'];
        if (transition) {
            processed.transitions[transition] = (processed.transitions[transition] || 0) + 1;
        }

        // Suggestions
        const suggestion = row['5. 下次建議'];
        if (suggestion) {
            processed.suggestions.push({ name, suggestion });
        }

        // Reactions
        const reaction = row['4. 新朋友反應'];
        if (reaction) {
            processed.reactions.push(reaction);
        }
    });

    return processed;
}

// Update stat cards
function updateStatCards() {
    const data = processedData;

    // Total
    document.getElementById('stat-total').textContent = data.total;

    // Average Satisfaction
    const satisfactionScores = Object.entries(data.satisfactionDistribution)
        .flatMap(([score, count]) => Array(count).fill(parseInt(score)));
    const avgSatisfaction = (satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length).toFixed(1);
    document.getElementById('stat-satisfaction').textContent = avgSatisfaction;

    // Average Absorption
    const absorptionScores = Object.entries(data.absorptionDistribution)
        .flatMap(([score, count]) => Array(count).fill(parseInt(score)));
    const avgAbsorption = (absorptionScores.reduce((a, b) => a + b, 0) / absorptionScores.length).toFixed(1);
    document.getElementById('stat-absorption').textContent = avgAbsorption;

    // NPS
    const recommendationScores = Object.entries(data.recommendationDistribution)
        .flatMap(([score, count]) => Array(count).fill(parseInt(score)));
    const promoters = recommendationScores.filter(s => s === 5).length;
    const passives = recommendationScores.filter(s => s === 4).length;
    const detractors = recommendationScores.filter(s => s <= 3).length;
    const nps = Math.round(((promoters - detractors) / recommendationScores.length) * 100);
    document.getElementById('stat-nps').textContent = nps;

    // Lv 1 Success Rate
    const lv1Data = data.levelAnalysis['Lv 1'];
    if (lv1Data && lv1Data.absorption.length > 0) {
        const lv1SuccessRate = Math.round((lv1Data.absorption.filter(s => s >= 4).length / lv1Data.absorption.length) * 100);
        document.getElementById('stat-lv1-success').textContent = lv1SuccessRate + '%';
    }

    // Difficulty Rating
    const levels = ['Lv 1', 'Lv 2', 'Lv 3', 'Lv 4'];
    const avgAbsorptions = levels.map(level => {
        const scores = data.levelAnalysis[level].absorption;
        return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    }).filter(a => a > 0);

    const maxDiff = Math.max(...avgAbsorptions) - Math.min(...avgAbsorptions);
    let rating, ratingText;
    if (maxDiff < 0.8) {
        rating = '🟢';
        ratingText = '適配良好';
    } else if (maxDiff < 1.5) {
        rating = '🟡';
        ratingText = '需微調';
    } else {
        rating = '🔴';
        ratingText = '需分班';
    }
    document.getElementById('stat-difficulty-rating').textContent = rating;
    document.getElementById('stat-difficulty-text').textContent = ratingText;

    // Class Division Necessity
    const classDivisionNeeded = maxDiff >= 1.5;
    document.getElementById('stat-class-division').textContent = classDivisionNeeded ? '是' : '否';
    document.getElementById('stat-class-division-text').textContent = classDivisionNeeded
        ? '程度差異大'
        : '程度適配';
}

// Render all charts
function renderAllCharts() {
    renderAILevelChart();
    renderInviterSourceChart();
    renderAbsorptionChart();
    renderRecommendationChart();
    renderLevelAbsorptionChart();
    renderLevelSatisfactionChart();
    renderWowMomentChart();
    renderAIInterestsChart();
    renderShopInterestChart();
    renderFlowSmoothnessChart();
    renderTransitionChart();
    renderFutureInterestsChart();
    renderLevelInterestsChart();
}

// Chart: AI Level Distribution
function renderAILevelChart() {
    const ctx = document.getElementById('chart-ai-level');
    if (charts['aiLevel']) charts['aiLevel'].destroy();

    const data = processedData.aiLevelDistribution;
    charts['aiLevel'] = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(data).map(k => `${k} - ${aiLevels[k]}` || k),
            datasets: [{
                data: Object.values(data),
                backgroundColor: ['#FCA5A5', '#FBBF24', '#60A5FA', '#A78BFA'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Chart: Inviter Source Distribution  
function renderInviterSourceChart() {
    const ctx = document.getElementById('chart-inviter-source');
    if (charts['inviterSource']) charts['inviterSource'].destroy();

    const data = processedData.inviterSourceDistribution;
    const sortedData = Object.entries(data).sort((a, b) => b[1] - a[1]);

    charts['inviterSource'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sortedData.map(d => d[0]),
            datasets: [{
                data: sortedData.map(d => d[1]),
                backgroundColor: ['#C41E3A', '#4D96FF', '#10B981', '#F59E0B', '#8B5CF6'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Chart: Absorption Distribution
function renderAbsorptionChart() {
    const ctx = document.getElementById('chart-absorption');
    if (charts['absorption']) charts['absorption'].destroy();

    const data = processedData.absorptionDistribution;
    charts['absorption'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['1分', '2分', '3分', '4分', '5分'],
            datasets: [{
                label: '人數',
                data: [1, 2, 3, 4, 5].map(score => data[score] || 0),
                backgroundColor: '#4D96FF',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Chart: Recommendation Distribution
function renderRecommendationChart() {
    const ctx = document.getElementById('chart-recommendation');
    if (charts['recommendation']) charts['recommendation'].destroy();

    const data = processedData.recommendationDistribution;
    charts['recommendation'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['1分', '2分', '3分', '4分', '5分'],
            datasets: [{
                label: '人數',
                data: [1, 2, 3, 4, 5].map(score => data[score] || 0),
                backgroundColor: '#10B981',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Chart: Level vs Absorption
function renderLevelAbsorptionChart() {
    const ctx = document.getElementById('chart-level-absorption');
    if (charts['levelAbsorption']) charts['levelAbsorption'].destroy();

    const levels = ['Lv 1', 'Lv 2', 'Lv 3', 'Lv 4'];
    const data = levels.map(level => {
        const scores = processedData.levelAnalysis[level].absorption;
        return scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
    });

    charts['levelAbsorption'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: levels.map(l => aiLevels[l]),
            datasets: [{
                label: '平均吸收度',
                data: data,
                backgroundColor: ['#FCA5A5', '#FBBF24', '#60A5FA', '#A78BFA'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5
                }
            }
        }
    });
}

// Chart: Level vs Satisfaction  
function renderLevelSatisfactionChart() {
    const ctx = document.getElementById('chart-level-satisfaction');
    if (charts['levelSatisfaction']) charts['levelSatisfaction'].destroy();

    const levels = ['Lv 1', 'Lv 2', 'Lv 3', 'Lv 4'];
    const data = levels.map(level => {
        const scores = processedData.levelAnalysis[level].satisfaction;
        return scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
    });

    charts['levelSatisfaction'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: levels.map(l => aiLevels[l]),
            datasets: [{
                label: '平均滿意度',
                data: data,
                backgroundColor: ['#FCA5A5', '#FBBF24', '#60A5FA', '#A78BFA'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5
                }
            }
        }
    });
}

// Chart: Wow Moment
function renderWowMomentChart() {
    const ctx = document.getElementById('chart-wow-moment');
    if (charts['wowMoment']) charts['wowMoment'].destroy();

    const data = processedData.wowMoments;
    const sortedData = Object.entries(data).sort((a, b) => b[1] - a[1]);

    charts['wowMoment'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedData.map(d => d[0]),
            datasets: [{
                label: '選擇人數',
                data: sortedData.map(d => d[1]),
                backgroundColor: '#C41E3A',
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Chart: AI Interests
function renderAIInterestsChart() {
    const ctx = document.getElementById('chart-ai-interests');
    if (charts['aiInterests']) charts['aiInterests'].destroy();

    const data = processedData.aiInterests;
    const sortedData = Object.entries(data).sort((a, b) => b[1] - a[1]);

    charts['aiInterests'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedData.map(d => d[0]),
            datasets: [{
                label: '選擇人數',
                data: sortedData.map(d => d[1]),
                backgroundColor: '#4D96FF',
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Chart: Shop Interest
function renderShopInterestChart() {
    const ctx = document.getElementById('chart-shop-interest');
    if (charts['shopInterest']) charts['shopInterest'].destroy();

    const data = processedData.shopInterests;
    charts['shopInterest'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data),
                backgroundColor: ['#10B981', '#F59E0B', '#60A5FA', '#8B5CF6'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Chart: Flow Smoothness
function renderFlowSmoothnessChart() {
    const ctx = document.getElementById('chart-flow-smoothness');
    if (charts['flowSmoothness']) charts['flowSmoothness'].destroy();

    const data = processedData.flowSmoothness;
    charts['flowSmoothness'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['1分', '2分', '3分', '4分', '5分'],
            datasets: [{
                label: '人數',
                data: [1, 2, 3, 4, 5].map(score => data[score] || 0),
                backgroundColor: '#8B5CF6',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Chart: Transition
function renderTransitionChart() {
    const ctx = document.getElementById('chart-transition');
    if (charts['transition']) charts['transition'].destroy();

    const data = processedData.transitions;
    charts['transition'] = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data),
                backgroundColor: ['#10B981', '#FBBF24', '#EF4444'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Render Tables
function renderTables() {
    const tbody = document.getElementById('level-analysis-table');
    const levels = ['Lv 1', 'Lv 2', 'Lv 3', 'Lv 4'];

    tbody.innerHTML = levels.map(level => {
        const levelData = processedData.levelAnalysis[level];
        const avgAbsorption = levelData.absorption.length > 0
            ? (levelData.absorption.reduce((a, b) => a + b, 0) / levelData.absorption.length).toFixed(1)
            : '--';
        const avgSatisfaction = levelData.satisfaction.length > 0
            ? (levelData.satisfaction.reduce((a, b) => a + b, 0) / levelData.satisfaction.length).toFixed(1)
            : '--';
        const avgRecommendation = levelData.recommendation.length > 0
            ? (levelData.recommendation.reduce((a, b) => a + b, 0) / levelData.recommendation.length).toFixed(1)
            : '--';

        return `
            <tr>
                <td><strong>${aiLevels[level]}</strong></td>
                <td>${levelData.count}</td>
                <td>${avgAbsorption}</td>
                <td>${avgSatisfaction}</td>
                <td>${avgRecommendation}</td>
            </tr>
        `;
    }).join('');
}

// Render Action List
function renderActionList() {
    const actionList = document.getElementById('action-list');
    const suggestions = processedData.suggestions;

    // Analyze suggestions
    const networkIssues = suggestions.filter(s => s.suggestion.includes('網路') || s.suggestion.includes('網速')).length;
    const peopleIssues = suggestions.filter(s => s.suggestion.includes('人數')).length;
    const contentIssues = suggestions.filter(s => s.suggestion.includes('課程') || s.suggestion.includes('內容')).length;

    const actions = [];

    if (networkIssues >= 3) {
        actions.push({ priority: 'urgent', text: `網路穩定性問題（${networkIssues} 次提及）- 需確保場地網路品質或建議學員使用手機熱點` });
    }

    if (peopleIssues >= 2) {
        actions.push({ priority: 'important', text: `人數控制建議（${peopleIssues} 次提及）- 考慮限制單場人數上限以提升教學品質` });
    }

    if (contentIssues >= 2) {
        actions.push({ priority: 'important', text: `課程內容調整（${contentIssues} 次提及）- 考慮簡化內容或分多堂課進行` });
    }

    actions.push({ priority: 'future', text: '建立助教培訓機制 - 確保每桌都有熟悉流程的助教協助' });
    actions.push({ priority: 'future', text: '前置作業要求 - 報名時要求學員完成 Google 帳號與 Gemini 登入' });

    actionList.innerHTML = actions.map(action => `
        <li class="action-item ${action.priority}">
            <span class="priority-badge ${action.priority}">
                ${action.priority === 'urgent' ? '🔴 緊急' : action.priority === 'important' ? '🟡 重要' : '🟢 長期'}
            </span>
            ${action.text}
        </li>
    `).join('');
}

// Render Reaction Keywords
function renderReactionKeywords() {
    const container = document.getElementById('reaction-keywords');
    const reactions = processedData.reactions;

    if (reactions.length === 0) {
        container.innerHTML = '<div class="text-stone-500">暫無數據</div>';
        return;
    }

    // Simple keyword extraction
    const keywords = {};
    reactions.forEach(reaction => {
        const words = reaction.split(/[，。、\s]+/);
        words.forEach(word => {
            if (word.length >= 2) {
                keywords[word] = (keywords[word] || 0) + 1;
            }
        });
    });

    const sortedKeywords = Object.entries(keywords)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);

    container.innerHTML = `
        <div style="display: flex; flex-wrap: wrap; gap: 0.75rem;">
            ${sortedKeywords.map(([word, count]) => `
                <span style="background: linear-gradient(135deg, #4D96FF 0%, #6BBBFF 100%); 
                             color: white; padding: 0.5rem 1rem; border-radius: 20px; 
                             font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    ${word} (${count})
                </span>
            `).join('')}
        </div>
    `;
}

// Render Suggestions Raw
function renderSuggestionsRaw() {
    const container = document.getElementById('suggestions-raw');
    const suggestions = processedData.suggestions;

    if (suggestions.length === 0) {
        container.innerHTML = '<div class="text-stone-500">暫無建議</div>';
        return;
    }

    container.innerHTML = suggestions.map(s => `
        <div style="padding: 0.75rem; margin-bottom: 0.5rem; background: #F9FAFB; border-radius: 8px;">
            <div style="font-weight: 600; color: #C41E3A; margin-bottom: 0.25rem;">${s.name}</div>
            <div style="color: #374151;">${s.suggestion}</div>
        </div>
    `).join('');
}

// Tab switching
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active from all buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(`tab-${tabName}`).classList.add('active');

    // Add active to clicked button
    event.target.classList.add('active');
}

// Toggle meeting section
function toggleMeeting(id) {
    const content = document.getElementById(`content-${id}`);
    const icon = document.getElementById(`icon-${id}`);

    if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        icon.classList.remove('rotated');
    } else {
        content.classList.add('collapsed');
        icon.classList.add('rotated');
    }
}

// Export PDF
function exportPDF() {
    const element = document.querySelector('main');
    const opt = {
        margin: 10,
        filename: 'AI工作坊分析報告.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
}

// Loading helpers
function showLoading() {
    document.querySelectorAll('.loading').forEach(el => {
        el.style.display = 'block';
    });
}

function hideLoading() {
    document.querySelectorAll('.loading').forEach(el => {
        el.style.display = 'none';
    });
}

// Future Course Interest Stats
function updateFutureInterestStats() {
    const data = processedData.aiInterests;
    const sortedData = Object.entries(data).sort((a, b) => b[1] - a[1]);

    if (sortedData.length > 0) {
        // Top interest
        const topInterest = sortedData[0];
        document.getElementById('stat-top-interest').textContent = topInterest[0];
        document.getElementById('stat-top-interest-count').textContent = `${topInterest[1]} 人感興趣`;

        // Total responses
        const totalResponses = surveyData.filter(row => row['5. AI 興趣']).length;
        document.getElementById('stat-interest-total').textContent = totalResponses;

        // Average selections
        const totalSelections = sortedData.reduce((sum, [, count]) => sum + count, 0);
        const avgSelections = (totalSelections / totalResponses).toFixed(1);
        document.getElementById('stat-interest-avg').textContent = avgSelections;
    }
}

// Chart: Future Interests
function renderFutureInterestsChart() {
    const ctx = document.getElementById('chart-future-interests');
    if (!ctx) return;
    if (charts['futureInterests']) charts['futureInterests'].destroy();

    const data = processedData.aiInterests;
    const sortedData = Object.entries(data).sort((a, b) => b[1] - a[1]);

    charts['futureInterests'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedData.map(d => d[0]),
            datasets: [{
                label: '感興趣人數',
                data: sortedData.map(d => d[1]),
                backgroundColor: ['#C41E3A', '#4D96FF', '#10B981', '#F59E0B'],
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Chart: Level vs Interests Cross Analysis
function renderLevelInterestsChart() {
    const ctx = document.getElementById('chart-level-interests');
    if (!ctx) return;
    if (charts['levelInterests']) charts['levelInterests'].destroy();

    // Calculate interest breakdown by level
    const levels = ['Lv 1', 'Lv 2', 'Lv 3', 'Lv 4'];
    const interests = Object.keys(processedData.aiInterests);

    const levelInterestData = {};
    interests.forEach(interest => {
        levelInterestData[interest] = {
            'Lv 1': 0,
            'Lv 2': 0,
            'Lv 3': 0,
            'Lv 4': 0
        };
    });

    surveyData.forEach(row => {
        const name = row['姓名'];
        const aiLevel = preSurveyData[name] || 'Lv 2';
        const aiInterests = row['5. AI 興趣'];

        if (aiInterests) {
            aiInterests.split(',').forEach(interest => {
                const trimmed = interest.trim();
                if (trimmed && levelInterestData[trimmed]) {
                    levelInterestData[trimmed][aiLevel]++;
                }
            });
        }
    });

    const datasets = levels.map((level, index) => ({
        label: aiLevels[level],
        data: interests.map(interest => levelInterestData[interest][level]),
        backgroundColor: ['#FCA5A5', '#FBBF24', '#60A5FA', '#A78BFA'][index],
        borderRadius: 4
    }));

    charts['levelInterests'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: interests,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Render Course Recommendations
function renderCourseRecommendations() {
    const container = document.getElementById('course-recommendations');
    if (!container) return;

    const data = processedData.aiInterests;
    const sortedData = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const totalResponses = surveyData.filter(row => row['5. AI 興趣']).length;

    let recommendations = '<div style="display: flex; flex-direction: column; gap: 1rem;">';

    sortedData.forEach(([interest, count], index) => {
        const percentage = Math.round((count / totalResponses) * 100);
        let priority = '';
        let priorityClass = '';
        let recommendation = '';

        if (percentage >= 50) {
            priority = '🔴 高優先級';
            priorityClass = 'urgent';
            recommendation = '建議優先規劃，已超過半數學員感興趣';
        } else if (percentage >= 30) {
            priority = '🟡 中優先級';
            priorityClass = 'important';
            recommendation = '值得考慮開課，有相當數量的學員需求';
        } else {
            priority = '🟢 低優先級';
            priorityClass = 'future';
            recommendation = '可作為長期規劃項目，觀察後續需求';
        }

        recommendations += `
            <div class="action-item ${priorityClass}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <span style="font-weight: 700; font-size: 1.1rem;">${interest}</span>
                    <span class="priority-badge ${priorityClass}">${priority}</span>
                </div>
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <div style="flex: 1;">
                        <div style="background: var(--color-stone-200); height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="background: var(--color-primary); height: 100%; width: ${percentage}%; transition: width 0.3s ease;"></div>
                        </div>
                    </div>
                    <div style="font-weight: 600; min-width: 60px; text-align: right;">${count} 人 (${percentage}%)</div>
                </div>
                <div style="margin-top: 0.5rem; color: var(--color-stone-600); font-size: 0.9rem;">${recommendation}</div>
            </div>
        `;
    });

    recommendations += '</div>';
    container.innerHTML = recommendations;
}
