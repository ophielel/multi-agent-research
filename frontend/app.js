// ==================== 全局状态 ====================
let currentResearchId = null;
let statusCheckInterval = null;
let logEntryCount = 0;

// ==================== DOM 元素 ====================
const researchTopic = document.getElementById('research-topic');
const btnStartResearch = document.getElementById('btn-start-research');
const progressSection = document.getElementById('research-progress');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const currentPhase = document.getElementById('current-phase');
const researchLogContent = document.getElementById('research-log-content');
const logCount = document.getElementById('log-count');
const currentResearchSection = document.getElementById('current-research');
const btnViewReport = document.getElementById('btn-view-report');
const reportsList = document.getElementById('reports-list');
const reportModal = document.getElementById('report-modal');
const reportContent = document.getElementById('report-content');
const reportTitle = document.getElementById('report-title');
const btnDownloadReport = document.getElementById('btn-download-report');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// API 基础 URL
const API_BASE = '/api';

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initConfig();
    loadReports();
    console.log('Deep Research Launcher 初始化完成');
});

// ==================== 标签页切换 ====================
function initTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const tabId = tab.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            const targetContent = document.getElementById(`tab-${tabId}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            if (tabId === 'reports') {
                loadReports();
            }
        });
    });
}

// ==================== 开始研究 ====================
btnStartResearch.addEventListener('click', async () => {
    const topic = researchTopic.value.trim();
    if (!topic) {
        showToast('请输入研究主题', 'error');
        return;
    }

    try {
        btnStartResearch.disabled = true;
        btnStartResearch.classList.add('loading');
        researchTopic.disabled = true;

        // 获取配置
        const config = await fetchConfig();

        const response = await fetch(`${API_BASE}/research/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, config })
        });

        const result = await response.json();

        if (result.success) {
            currentResearchId = result.researchId;
            progressSection.classList.remove('hidden');
            currentResearchSection.classList.add('hidden');
            logEntryCount = 0;
            updateLogCount();
            clearLog();

            // 开始轮询状态
            startStatusCheck(result.researchId);
            showToast('研究已启动，请稍候...', 'success');
        } else {
            showToast(result.message || '启动失败', 'error');
            btnStartResearch.disabled = false;
            btnStartResearch.classList.remove('loading');
            researchTopic.disabled = false;
        }
    } catch (error) {
        console.error('启动研究失败:', error);
        showToast('启动研究失败: ' + error.message, 'error');
        btnStartResearch.disabled = false;
        btnStartResearch.classList.remove('loading');
        researchTopic.disabled = false;
    }
});

// ==================== 状态轮询 ====================
function startStatusCheck(researchId) {
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
    }

    statusCheckInterval = setInterval(async () => {
        try {
            const response = await fetch(`${API_BASE}/research/status/${researchId}`);
            if (!response.ok) {
                console.error('状态检查失败:', response.status);
                return;
            }

            const status = await response.json();

            updateProgress(status);

            if (status.status === 'completed' || status.status === 'failed') {
                clearInterval(statusCheckInterval);
                statusCheckInterval = null;

                if (status.status === 'completed') {
                    currentResearchSection.classList.remove('hidden');
                    btnViewReport.onclick = () => viewReport(researchId);
                    addLogEntry('✓ 研究完成！点击"查看报告"查看结果。');
                    showToast('研究完成', 'success');
                    loadReports();
                } else if (status.status === 'failed') {
                    showToast('研究失败: ' + (status.error || '未知错误'), 'error');
                    btnStartResearch.disabled = false;
                    btnStartResearch.classList.remove('loading');
                    researchTopic.disabled = false;
                }
            }
        } catch (error) {
            console.error('获取状态失败:', error);
        }
    }, 2000);
}

// ==================== 更新进度 ====================
function updateProgress(status) {
    // 更新进度条
    if (status.progress !== undefined) {
        progressFill.style.width = `${status.progress}%`;
        progressText.textContent = `${status.progress}%`;
    }

    // 更新当前阶段
    if (status.currentPhase) {
        currentPhase.textContent = status.currentPhase;
        addLogEntry(status.currentPhase);
    }

    // 更新指示器点
    if (status.progress !== undefined) {
        const totalDots = 4;
        const activeDots = Math.ceil((status.progress / 100) * totalDots);
        for (let i = 1; i <= totalDots; i++) {
            const dot = document.getElementById(`dot-${i}`);
            if (dot) {
                if (i <= activeDots) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            }
        }
    }
}

// ==================== 添加日志条目 ====================
function addLogEntry(message) {
    if (!message) return;

    const timestamp = new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${escapeHtml(message)}`;
    researchLogContent.appendChild(entry);
    researchLogContent.scrollTop = researchLogContent.scrollHeight;

    logEntryCount++;
    updateLogCount();
}

function clearLog() {
    researchLogContent.innerHTML = '';
}

function updateLogCount() {
    if (logCount) {
        logCount.textContent = `${logEntryCount} 条`;
    }
}

// ==================== 加载报告列表 ====================
async function loadReports() {
    try {
        reportsList.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>加载中...</p></div>';

        const response = await fetch(`${API_BASE}/research/list`);

        if (!response.ok) {
            reportsList.innerHTML = '<div class="loading-state"><p>加载失败</p></div>';
            return;
        }

        const result = await response.json();

        if (result.success) {
            renderReportsList(result.reports);
        } else {
            reportsList.innerHTML = '<div class="loading-state"><p>加载失败</p></div>';
        }
    } catch (error) {
        console.error('加载报告列表失败:', error);
        reportsList.innerHTML = '<div class="loading-state"><p>加载失败: ' + error.message + '</p></div>';
    }
}

// ==================== 渲染报告列表 ====================
function renderReportsList(reports) {
    if (!reports || reports.length === 0) {
        reportsList.innerHTML = '<div class="loading-state"><p>暂无研究报告</p></div>';
        return;
    }

    reportsList.innerHTML = reports.map(report => `
        <div class="report-card">
            <div class="report-card-header">
                <div class="report-card-title" title="${escapeHtml(report.topic)}">${escapeHtml(report.topic)}</div>
                <span class="report-card-status status-${report.status}">
                    ${getStatusText(report.status)}
                </span>
            </div>
            <div class="report-card-meta">
                <span>${formatDate(report.timestamp)}</span>
                ${report.progress !== undefined ? `<span>进度: ${report.progress}%</span>` : ''}
            </div>
            <div class="report-card-actions">
                <button class="btn btn-secondary" onclick="viewReport('${report.id}')">
                    <span class="btn-icon">📄</span>
                    ${report.status === 'completed' ? '查看' : '状态'}
                </button>
                <button class="btn btn-secondary" onclick="deleteReport('${report.id}')">
                    <span class="btn-icon">🗑️</span>
                    删除
                </button>
            </div>
        </div>
    `).join('');
}

// ==================== 查看报告 ====================
async function viewReport(reportId) {
    try {
        const response = await fetch(`${API_BASE}/research/report/${reportId}`);

        if (!response.ok) {
            showToast('获取报告失败', 'error');
            return;
        }

        const result = await response.json();

        if (result.success) {
            reportTitle.textContent = '研究报告';
            reportContent.innerHTML = marked.parse(result.content);
            reportModal.classList.add('active');

            btnDownloadReport.onclick = () => downloadReport(result.content, reportId);
        } else {
            showToast(result.message || '获取报告失败', 'error');
        }
    } catch (error) {
        console.error('获取报告失败:', error);
        showToast('获取报告失败: ' + error.message, 'error');
    }
}

// ==================== 下载报告 ====================
function downloadReport(content, reportId) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research-report-${reportId}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('报告已下载', 'success');
}

// ==================== 删除报告 ====================
async function deleteReport(reportId) {
    if (!confirm('确定要删除这份报告吗？')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/research/${reportId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            showToast('删除失败', 'error');
            return;
        }

        const result = await response.json();

        if (result.success) {
            showToast('报告已删除', 'success');
            loadReports();
        } else {
            showToast(result.message || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除报告失败:', error);
        showToast('删除失败: ' + error.message, 'error');
    }
}

// ==================== 刷新报告列表 ====================
document.getElementById('btn-refresh-reports')?.addEventListener('click', () => {
    loadReports();
    showToast('正在刷新...', 'success');
});

// ==================== 配置管理 ====================
async function initConfig() {
    const config = await fetchConfig();

    document.getElementById('config-provider').value = config.provider || 'openai';
    document.getElementById('config-api-key').value = config.apiKey || '';
    document.getElementById('config-endpoint').value = config.apiEndpoint || 'https://api.openai.com/v1';
    document.getElementById('config-model').value = config.model || 'gpt-4o';
    document.getElementById('config-max-iterations').value = config.maxIterations || 5;
    document.getElementById('config-search-depth').value = config.searchDepth || 3;
}

async function fetchConfig() {
    try {
        const response = await fetch(`${API_BASE}/config`);
        return await response.json();
    } catch (error) {
        console.error('获取配置失败:', error);
        return {};
    }
}

async function saveConfig() {
    const config = {
        provider: document.getElementById('config-provider').value,
        apiKey: document.getElementById('config-api-key').value.trim(),
        apiEndpoint: document.getElementById('config-endpoint').value.trim(),
        model: document.getElementById('config-model').value.trim(),
        maxIterations: parseInt(document.getElementById('config-max-iterations').value),
        searchDepth: parseInt(document.getElementById('config-search-depth').value)
    };

    // 验证配置
    if (!config.apiKey) {
        showToast('请输入 API Key', 'error');
        return;
    }

    if (!config.apiEndpoint) {
        showToast('请输入 API 端点', 'error');
        return;
    }

    if (!config.model) {
        showToast('请输入模型名称', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        const result = await response.json();

        if (result.success) {
            showToast('配置保存成功', 'success');
        } else {
            showToast(result.message || '保存失败', 'error');
        }
    } catch (error) {
        console.error('保存配置失败:', error);
        showToast('保存失败: ' + error.message, 'error');
    }
}

document.getElementById('btn-save-config')?.addEventListener('click', saveConfig);

// ==================== 模态框关闭 ====================
document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        reportModal.classList.remove('active');
    });
});

// 点击遮罩层也可以关闭
document.querySelector('.modal-overlay')?.addEventListener('click', () => {
    reportModal.classList.remove('active');
});

// ESC 键关闭模态框
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && reportModal.classList.contains('active')) {
        reportModal.classList.remove('active');
    }
});

// ==================== Toast 通知 ====================
let toastTimeout;

function showToast(message, type = 'success') {
    toastMessage.textContent = message;

    // 设置图标
    const icon = document.getElementById('toast-icon');
    if (type === 'success') {
        icon.textContent = '✓';
        icon.style.color = 'var(--success)';
    } else if (type === 'error') {
        icon.textContent = '✕';
        icon.style.color = 'var(--error)';
    } else {
        icon.textContent = 'ℹ';
        icon.style.color = 'var(--accent-primary)';
    }

    toast.classList.add('show');

    // 清除之前的定时器
    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }

    // 3秒后自动隐藏
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ==================== 辅助函数 ====================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // 如果是今天
    if (diff < 86400000) {
        return date.toLocaleString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        }) + ' 今天';
    }

    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getStatusText(status) {
    const statusMap = {
        'completed': '已完成',
        'running': '进行中',
        'failed': '失败',
        'not_found': '未找到'
    };
    return statusMap[status] || status;
}
