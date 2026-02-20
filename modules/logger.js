// 日志管理模块

// 日志设置
let logSettings = {
    level: 'basic', // none, basic, detailed
    modules: {
        bluetooth: true,
        audio: true,
        ecg: true,
        three: true,
        style: true
    }
};

// 日志内容容器
let logContentElement = null;

/**
 * 初始化日志模块
 * @param {HTMLElement} logContent - 日志内容容器元素
 */
export function initLogger(logContent) {
    logContentElement = logContent;
}

/**
 * 设置日志级别
 * @param {string} level - 日志级别：none, basic, detailed
 */
export function setLogLevel(level) {
    logSettings.level = level;
    log('logger', `日志级别设置为: ${level}`, 'basic');
}

/**
 * 设置模块日志开关
 * @param {string} module - 模块名称
 * @param {boolean} enabled - 是否启用
 */
export function setModuleLog(module, enabled) {
    logSettings.modules[module] = enabled;
    log('logger', `${module} 模块日志 ${enabled ? '启用' : '禁用'}`, 'basic');
}

/**
 * 获取日志设置
 * @returns {Object} 日志设置
 */
export function getLogSettings() {
    return { ...logSettings };
}

/**
 * 输出日志
 * @param {string} module - 模块名称
 * @param {string} message - 日志消息
 * @param {string} level - 日志级别：basic, detailed
 */
export function log(module, message, level = 'basic') {
    // 检查日志级别
    if (logSettings.level === 'none') {
        return;
    }
    
    // 检查模块是否启用日志
    if (!logSettings.modules[module]) {
        return;
    }
    
    // 检查日志级别是否符合要求
    if (level === 'detailed' && logSettings.level !== 'detailed') {
        return;
    }
    
    // 获取当前时间
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    
    // 创建日志项
    const logItem = document.createElement('div');
    logItem.className = 'log-item';
    logItem.innerHTML = `
        <span class="log-time">${timeString}</span>
        <span class="log-module">${module}</span>
        <span class="log-message">${message}</span>
    `;
    
    // 添加到日志容器
    if (logContentElement) {
        logContentElement.insertBefore(logItem, logContentElement.firstChild);
        
        // 限制日志数量
        const maxLogItems = 50;
        while (logContentElement.children.length > maxLogItems) {
            logContentElement.removeChild(logContentElement.lastChild);
        }
    }
    
    // 同时输出到控制台
    console.log(`[${timeString}] [${module}] ${message}`);
}

/**
 * 清空日志
 */
export function clearLogs() {
    if (logContentElement) {
        logContentElement.innerHTML = '';
    }
    log('logger', '日志已清空', 'basic');
}

/**
 * 日志级别常量
 */
export const LOG_LEVELS = {
    NONE: 'none',
    BASIC: 'basic',
    DETAILED: 'detailed'
};

/**
 * 模块名称常量
 */
export const LOG_MODULES = {
    BLUETOOTH: 'bluetooth',
    AUDIO: 'audio',
    ECG: 'ecg',
    THREE: 'three',
    STYLE: 'style',
    LOGGER: 'logger'
};
