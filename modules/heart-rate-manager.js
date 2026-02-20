// 心率数据管理模块

// 全局变量
let currentBPM = null;
let lastBeatTime = 0;
let lastDataTime = 0;
let pulseIntensity = 0;
let packetCount = 0;

// 回调函数列表
let heartRateCallbacks = [];
let connectionStatusCallbacks = [];

/**
 * 注册心率数据更新回调
 * @param {Function} callback - 回调函数，接收心率值作为参数
 */
export function registerHeartRateCallback(callback) {
    if (typeof callback === 'function' && !heartRateCallbacks.includes(callback)) {
        heartRateCallbacks.push(callback);
    }
}

/**
 * 注册连接状态更新回调
 * @param {Function} callback - 回调函数，接收连接状态和状态文本作为参数
 */
export function registerConnectionStatusCallback(callback) {
    if (typeof callback === 'function' && !connectionStatusCallbacks.includes(callback)) {
        connectionStatusCallbacks.push(callback);
    }
}

/**
 * 移除心率数据更新回调
 * @param {Function} callback - 要移除的回调函数
 */
export function removeHeartRateCallback(callback) {
    const index = heartRateCallbacks.indexOf(callback);
    if (index > -1) {
        heartRateCallbacks.splice(index, 1);
    }
}

/**
 * 移除连接状态更新回调
 * @param {Function} callback - 要移除的回调函数
 */
export function removeConnectionStatusCallback(callback) {
    const index = connectionStatusCallbacks.indexOf(callback);
    if (index > -1) {
        connectionStatusCallbacks.splice(index, 1);
    }
}

/**
 * 更新心率数据并通知所有回调
 * @param {number|null} bpm - 心率值，null表示无数据
 */
export function updateHeartRate(bpm) {
    currentBPM = bpm;
    lastDataTime = performance.now() * 0.001;
    
    // 通知所有回调
    heartRateCallbacks.forEach(callback => {
        try {
            callback(bpm);
        } catch (error) {
            console.error('心率回调执行错误:', error);
        }
    });
}

/**
 * 更新连接状态并通知所有回调
 * @param {boolean} isConnected - 是否连接
 * @param {string} statusText - 状态文本
 */
export function updateConnectionStatus(isConnected, statusText) {
    // 通知所有回调
    connectionStatusCallbacks.forEach(callback => {
        try {
            callback(isConnected, statusText);
        } catch (error) {
            console.error('连接状态回调执行错误:', error);
        }
    });
}

/**
 * 获取当前心率
 * @returns {number|null} 当前心率值
 */
export function getCurrentBPM() {
    return currentBPM;
}

/**
 * 获取最后心跳时间
 * @returns {number} 最后心跳时间
 */
export function getLastBeatTime() {
    return lastBeatTime;
}

/**
 * 设置最后心跳时间
 * @param {number} time - 最后心跳时间
 */
export function setLastBeatTime(time) {
    lastBeatTime = time;
}

/**
 * 获取最后数据时间
 * @returns {number} 最后数据时间
 */
export function getLastDataTime() {
    return lastDataTime;
}

/**
 * 获取脉冲强度
 * @returns {number} 脉冲强度
 */
export function getPulseIntensity() {
    return pulseIntensity;
}

/**
 * 设置脉冲强度
 * @param {number} intensity - 脉冲强度
 */
export function setPulseIntensity(intensity) {
    pulseIntensity = intensity;
}

/**
 * 增加数据包计数
 * @returns {number} 增加后的数据包计数
 */
export function incrementPacketCount() {
    packetCount++;
    return packetCount;
}

/**
 * 获取数据包计数
 * @returns {number} 数据包计数
 */
export function getPacketCount() {
    return packetCount;
}

/**
 * 重置所有数据
 */
export function resetData() {
    currentBPM = null;
    lastBeatTime = 0;
    lastDataTime = 0;
    pulseIntensity = 0;
    packetCount = 0;
    updateHeartRate(null);
}
